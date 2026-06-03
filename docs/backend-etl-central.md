# Backend ETL — Central de Integrações

Frontend Lovable só lê metadados do Cloud (Supabase) e dispara execuções via FastAPI.
**Nunca** acessa o ERP Senior direto. **Nunca** usa `service_role_key`.
A FastAPI é responsável por consultar o ERP e gravar nas tabelas `bi_*` e `etl_*` do Cloud usando o service role.

## SQL versionado em `etl_acoes`

Cada ação agora tem 4 colunas extras no Cloud:
- `sql_template text` — SQL a ser executado contra o ERP Senior (placeholders nomeados).
- `sql_versao integer` — incrementado automaticamente por trigger a cada UPDATE de `sql_template`.
- `sql_atualizado_em timestamptz`, `sql_atualizado_por uuid`.

A tela `/etl/tarefas/:nome` (admin) edita esses campos via Cloud. Toda alteração de `sql_template` é arquivada em `etl_acao_sql_versoes(acao_id, versao, sql_template, comentario, criado_por, criado_em)`.

### Templates estáticos (`STATIC:`)

Ações legadas podem ter `comando_sql` (ou `sql_template`) gravado como **ponteiro** para um template hardcoded no backend, no formato `STATIC:NOME_DO_TEMPLATE` (ex.: `STATIC:SQL_VM_FATURAMENTO`).

**Toda rota** que lê `comando_sql`/`sql_template` (`GET /comando-sql`, `POST /testar-sql`, executores) **deve**, antes de qualquer outra coisa (detecção/validação de placeholders, execução, log):

1. Detectar prefixo `STATIC:` (case-insensitive, ignorando espaços em volta).
2. Extrair o nome após `STATIC:` e procurar em `ETL_SQL_TEMPLATES` pelas chaves, nesta ordem: nome literal, `SQL_<nome>`, nome sem prefixo `SQL_`. Para `STATIC:SQL_VM_FATURAMENTO`, casa com `ETL_SQL_TEMPLATES["SQL_VM_FATURAMENTO"]` ou `ETL_SQL_TEMPLATES["VM_FATURAMENTO"]`.
3. Substituir o texto pelo SQL real **antes** de chamar `extrair_placeholders` ou `resolver_placeholders`. Se o nome não existir, retornar `HTTP 422` com `detail="template_estatico_desconhecido: <nome>"`.

`GET /api/etl/acoes/{ref}/comando-sql` **sempre** retorna o SQL já resolvido (nunca devolve `STATIC:...` para o frontend), para que o parser de placeholders detecte `$[ANOMES_INI]` **e** `$[ANOMES_FIM]` corretamente e a tela Testar SQL renderize ambos os inputs.

### Comportamento esperado da FastAPI
1. Antes de executar a ação, faça `SELECT sql_template, sql_versao FROM etl_acoes WHERE id_acao = :id_acao` no Cloud.
2. Se o texto começar com `STATIC:`, resolver pelo `ETL_SQL_TEMPLATES` (regra acima). Se for **NULL ou vazio**, use o SQL hardcoded de fallback (compatibilidade com o que já está em produção).
3. **Resolva os placeholders no padrão UpQuery/Senior `$[NOME]`** antes de enviar ao ERP. Whitelist canônica (validar **antes** do replace para evitar SQL injection):

   | Placeholder        | Regex          | Replace             |
   |--------------------|----------------|---------------------|
   | `$[ANOMES_INI]`    | `^\d{6}$`      | inteiro literal     |
   | `$[ANOMES_FIM]`    | `^\d{6}$`      | inteiro literal     |
   | `$[DATA_INI]`      | `^\d{4}-\d{2}-\d{2}$` | `'YYYY-MM-DD'` (com aspas) |
   | `$[DATA_FIM]`      | `^\d{4}-\d{2}-\d{2}$` | `'YYYY-MM-DD'` (com aspas) |
   | `$[CODEMP]`        | `^\d+$`        | inteiro literal     |
   | `$[CODFIL]`        | `^\d+$`        | inteiro literal     |
   | `$[CODEMP_LIST]`   | `^\d+(,\d+)*$` | lista literal `1,2,5` (use em `IN (...)`) |
   | `$[CODFIL_LIST]`   | `^\d+(,\d+)*$` | lista literal `1,2,5` (use em `IN (...)`) |

   ```python
   import re

   SPECS = {
       "ANOMES_INI":  (re.compile(r"^\d{6}$"),               lambda v: str(int(v))),
       "ANOMES_FIM":  (re.compile(r"^\d{6}$"),               lambda v: str(int(v))),
       "DATA_INI":    (re.compile(r"^\d{4}-\d{2}-\d{2}$"),   lambda v: f"'{v}'"),
       "DATA_FIM":    (re.compile(r"^\d{4}-\d{2}-\d{2}$"),   lambda v: f"'{v}'"),
       "CODEMP":      (re.compile(r"^\d+$"),                 lambda v: str(int(v))),
       "CODFIL":      (re.compile(r"^\d+$"),                 lambda v: str(int(v))),
       "CODEMP_LIST": (re.compile(r"^\d+(,\d+)*$"),          lambda v: v),
       "CODFIL_LIST": (re.compile(r"^\d+(,\d+)*$"),          lambda v: v),
   }

   def resolver_placeholders(sql: str, params: dict) -> str:
       presentes = set(re.findall(r"\$\[([A-Z_][A-Z0-9_]*)\]", sql))
       for nome in presentes:
           if nome not in SPECS:
               raise ValueError(f"placeholder_desconhecido: {nome}")
           regex, fmt = SPECS[nome]
           raw = params.get(nome.lower())
           if raw is None or not regex.match(str(raw)):
               raise ValueError(f"placeholder_invalido: {nome}={raw!r}")
           sql = sql.replace(f"$[{nome}]", fmt(str(raw)))
       restantes = re.findall(r"\$\[([A-Z_][A-Z0-9_]*)\]", sql)
       if restantes:
           raise ValueError(f"placeholder_nao_resolvido: {restantes}")
       return sql
   ```

   **Segurança:** validar com regex **antes** do replace é obrigatório — sem isso, abre injeção. Qualquer `$[...]` remanescente deve abortar a execução e gravar `etl_logs` com `nivel='ERROR'` e `origem=id_acao`.
4. Loga em `etl_logs` a `sql_versao` utilizada (campo `detalhe.sql_versao`) e os parâmetros resolvidos.

## `POST /api/etl/acoes/{acao_ref}/testar-sql` — preview efêmero

Endpoint usado pelo botão **Testar SQL** no editor. **Não persiste nada** (sem `etl_execucoes`, sem `etl_logs`, sem `bi_*`).

`acao_ref` é resolvido na ordem: UUID → `id`; numérico → `id_acao`; texto → `codigo_acao` (case-insensitive) → `nome`. **Nunca** comparar texto contra `id_acao` (bigint) — isso quebra com `invalid input syntax for type bigint`.

Body:
```json
{
  "parametros": { "ANOMES_INI": "202605", "ANOMES_FIM": "202605" },
  "limite": 100
}
```
Ou, ao testar um rascunho do editor:
```json
{
  "sql_template": "SELECT ... $[ANOMES_INI] ... $[ANOMES_FIM] ...",
  "parametros": { "ANOMES_INI": 202605, "ANOMES_FIM": 202605 },
  "limite": 100
}
```

Regras do body:
- **`sql_template` é opcional.** Quando **omitido**, o backend **deve** ler `comando_sql` de `public.etl_acoes` (Supabase novo) e usar esse texto como SQL a executar. Só cair em `sql_template` (legado) se `comando_sql` for NULL/vazio. Nunca usar um SQL hardcoded quando há `comando_sql` preenchido.
- **`parametros` aceita chaves em UPPERCASE** (`ANOMES_INI`, `ANOMES_FIM`, `CODEMP`, ...) — normalizar internamente para o casing esperado pelo `resolver_placeholders`. Manter retrocompat com lowercase.
- `limite`: default 50, máximo 500.

Regras obrigatórias do backend:
- Bloquear DML/DDL: rejeitar se a SQL contiver `\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|merge|exec)\b` fora de comentários/strings.
- Resolver placeholders pelo mesmo `resolver_placeholders` acima.
- Envelopar a query: `SELECT TOP {limite} * FROM ( <sql_resolvido> ) AS preview` (SQL Server) — preserva `ORDER BY` interno.
- Timeout 15s; abortar se ultrapassar (`HTTP 408`).
- Não gravar em nenhuma tabela do Cloud.
- **Preservar o casing das colunas.** `_etl_rows_to_dict` (ou equivalente) precisa usar `cursor.description[i][0]` **exatamente** como veio do driver — **nada de `.lower()` / `.upper()`** no preview. As chaves de cada linha precisam casar 1:1 com `colunas[i].nome` da resposta, senão o frontend renderiza tudo como `null` (caso real: `SELECT 'SERVIÇOS' AS CD_TP_MOVIMENTO` retornando linhas com chave `cd_tp_movimento`).

Resposta:
```json
{
  "colunas": [{ "nome": "CD_TP_MOVIMENTO", "tipo": "varchar" }],
  "linhas":  [{ "CD_TP_MOVIMENTO": "SERVIÇOS" }],
  "qtd_linhas": 50,
  "tempo_ms": 1234,
  "truncado": true
}
```
As chaves de `linhas[i]` **devem** ser idênticas (incluindo caixa) aos `colunas[i].nome`.


## `GET /api/etl/acoes/{acao_ref}/comando-sql` — leitura do SQL real

Usado pelo frontend para pré-carregar o `comando_sql` salvo no backend antes de abrir o editor, garantindo que o parser detecte **todos** os placeholders (`$[ANOMES_INI]`, `$[ANOMES_FIM]`, ...).

Mesma resolução de `acao_ref` do testar-sql. Resposta:
```json
{ "comando_sql": "SELECT ...", "versao": 3, "atualizado_em": "2026-06-01T12:00:00Z" }
```
404 se a ação não existir; 200 com `comando_sql: null` se a coluna estiver vazia.




## Header obrigatório
Todas as chamadas vêm com:
- `Authorization: Bearer <jwt>` — token do usuário logado (o mesmo do resto do app).
- `ngrok-skip-browser-warning: true`.

## Endpoints

### `GET /api/etl/tarefas`
Lista as tarefas (mesmo formato da tabela `public.etl_tarefas`). Pode ser servido a partir do Cloud diretamente — atualmente o frontend lê do Supabase, mas a FastAPI deve expor o endpoint para consumo externo.

### `GET /api/etl/tarefas/{nome_tarefa}/detalhe`
Retorna a tarefa + agregados (última execução, totais, etc.).

### `GET /api/etl/tarefas/{nome_tarefa}/acoes`
Lista as ações daquela tarefa em ordem.

### `POST /api/etl/tarefas/{nome_tarefa}/executar`
Body:
```json
{
  "anomes_ini": 202601,
  "anomes_fim": 202601,
  "acionado_por": "RENATO",
  "parametros": { "anomes_ini": 202601, "anomes_fim": 202601, "codemp": 1 }
}
```
- `anomes_ini`/`anomes_fim` no nível raiz são mantidos por compatibilidade (executores legados).
- **`parametros`** é o dicionário canônico usado pelo `resolver_placeholders`. Inclui replicação de `anomes_ini/fim` em lowercase + qualquer placeholder extra detectado no SQL (`codemp`, `data_ini`, `codemp_list`, etc.).
Comportamento:
1. Cria linha em `etl_execucoes` com `status='EM_EXECUCAO'`, `iniciado_em=now()`, `nome_tarefa`, `acionado_por`, `parametros`.
2. Atualiza `etl_tarefas.status_atual='EM_EXECUCAO'` e `ultima_execucao_em=now()`.
3. Para cada ação ativa (ordem asc):
   - Cria linha em `etl_acao_execucoes` (status `EM_EXECUCAO`).
   - Executa a lógica (consulta SQL no ERP via `cursor.execute`, depois grava no Cloud).
   - Aplica `estrategia_carga`:
     - `REPLACE_PERIODO`: `DELETE FROM <tabela_destino> WHERE anomes_emissao BETWEEN :ini AND :fim` antes do `INSERT` (em lote).
     - `APPEND`: só `INSERT`.
     - `UPSERT`: `INSERT ... ON CONFLICT (id) DO UPDATE`.
   - Loga em `etl_logs` (`nivel` INFO/WARN/ERROR, `origem` = id_acao).
   - Atualiza `etl_acao_execucoes` (status SUCESSO/ERRO, total_linhas, finalizado_em).
   - Em caso de erro: respeita `caso_erro` (`PARAR` aborta a tarefa; `CONTINUAR` segue para a próxima).
4. Fecha `etl_execucoes` com `status` final, `total_linhas` somado, `finalizado_em`, `mensagem`/`erro`.
5. Atualiza `etl_tarefas.status_atual` para SUCESSO/ERRO.

Resposta:
```json
{ "execucao_id": "uuid", "status": "EM_EXECUCAO", "mensagem": "..." }
```
Pode ser síncrono (curto) ou disparar worker em background — o frontend só usa o `execucao_id` para abrir o modal de logs.

### `POST /api/etl/acoes/{id_acao}/executar`
Mesma semântica, mas executa **somente** aquela ação. Cria 1 `etl_execucoes` + 1 `etl_acao_execucoes`.

### `GET /api/etl/execucoes/{execucao_id}/logs`
Retorna:
```json
{
  "execucao": { ...linha de etl_execucoes... },
  "acoes":   [ ...linhas de etl_acao_execucoes em ordem... ],
  "logs":    [ ...linhas de etl_logs em ordem cronológica... ]
}
```
(Se a FastAPI não tiver o endpoint, o frontend faz fallback lendo as 3 tabelas direto no Cloud.)

### `POST /api/etl/comercial/faturamento`
Worker da ação `VM_FATURAMENTO`. Body padrão `{ anomes_ini, anomes_fim, acionado_por, execucao_id?, acao_execucao_id? }`. Lê do ERP Senior a view `VM_FATURAMENTO` filtrando pelo período e grava em `public.bi_faturamento` (estratégia `REPLACE_PERIODO`, `carga_id = execucao_id`).

## Schema atualizado (resumo)

- `etl_tarefas(grupo, nome_tarefa UNIQUE, descricao, ativa, ordem, status_atual, ultima_execucao_em)`
- `etl_acoes(tarefa_id FK, ordem, id_acao, nome_acao, tipo_execucao, tipo_comando, endpoint_api, tabela_destino, estrategia_carga, caso_erro, ativa, timeout_segundos, parametros_padrao)`
- `etl_execucoes(tarefa_id, nome_tarefa, status, acionado_por, parametros, iniciado_em, finalizado_em, total_linhas, mensagem, erro)`
- `etl_acao_execucoes(execucao_id FK, acao_id FK, id_acao, ordem, status, iniciado_em, finalizado_em, total_linhas, mensagem, erro)`
- `etl_logs(execucao_id, acao_execucao_id, nivel, origem, mensagem, detalhe jsonb)`
- `etl_fila_integrador(nome_tarefa, parametros, status, tentativas, mensagem, processado_em)`
- `bi_faturamento(id PK, cd_*, vl_*, anomes_emissao, ..., carga_id, atualizado_em)`

## Status convencionados
`PENDENTE`, `EM_EXECUCAO`, `SUCESSO`, `ERRO` (o frontend também aceita `CONCLUIDA`/`SUCCESS`/`RUNNING`/`ERROR` como sinônimos no badge).
