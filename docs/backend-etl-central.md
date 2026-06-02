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

### Comportamento esperado da FastAPI
1. Antes de executar a ação, faça `SELECT sql_template, sql_versao FROM etl_acoes WHERE id_acao = :id_acao` no Cloud.
2. Se `sql_template` for **NULL ou vazio**, use o SQL hardcoded de fallback (compatibilidade com o que já está em produção).
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

## `POST /api/etl/acoes/{id_acao}/testar-sql` — preview efêmero

Endpoint usado pelo botão **Testar SQL** no editor. **Não persiste nada** (sem `etl_execucoes`, sem `etl_logs`, sem `bi_*`).

Body:
```json
{
  "sql_template": "SELECT ... $[ANOMES_INI] ...",
  "parametros": { "anomes_ini": 202601, "anomes_fim": 202604 },
  "limite": 50
}
```
- `sql_template` é **opcional**. Se omitido, usa o salvo em `etl_acoes.sql_template`. Permite testar antes de commitar a nova versão.
- `parametros` segue o mesmo contrato de execução (chaves em lowercase: `anomes_ini`, `codemp`, etc.).
- `limite`: default 50, máximo 500.

Regras obrigatórias do backend:
- Bloquear DML/DDL: rejeitar se a SQL contiver `\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|merge|exec)\b` fora de comentários/strings.
- Resolver placeholders pelo mesmo `resolver_placeholders` acima.
- Envelopar a query: `SELECT TOP {limite} * FROM ( <sql_resolvido> ) AS preview` (SQL Server) — preserva `ORDER BY` interno.
- Timeout 15s; abortar se ultrapassar (`HTTP 408`).
- Não gravar em nenhuma tabela do Cloud.

Resposta:
```json
{
  "colunas": [{ "nome": "CD_EMPRESA", "tipo": "varchar" }],
  "linhas":  [{ "CD_EMPRESA": "1" }],
  "qtd_linhas": 50,
  "tempo_ms": 1234,
  "truncado": true
}
```


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
