## Próximos incrementos do editor de SQL ETL

Três melhorias complementares ao `EditarSqlModal` + contrato com a FastAPI.

### 1. Botão "Testar SQL" (preview contra o ERP)

**Frontend (`EditarSqlModal.tsx`)**
- Novo botão `Testar SQL` ao lado de `Salvar`, habilitado quando há `sql_template` não vazio.
- Abre uma seção inline (collapsible) abaixo do editor com:
  - Inputs para cada placeholder detectado (`ANOMES_INI`, `ANOMES_FIM`, etc) — pré-preenchidos com o mês corrente / anterior.
  - Input numérico `Limite` (default 50, máx 500).
  - Botão `Executar preview`.
  - Área de resultado: tabela compacta (shadcn `Table`) com até N linhas, badge mostrando `qtd_linhas` e `tempo_ms`, ou alert de erro.
- Sem persistência: é só uma execução efêmera, não grava em `etl_execucoes` nem em `bi_*`.

**Camada de API (`src/lib/etl/api.ts`)**
- `testarSqlAcao(acaoId, { parametros, limite }) → { colunas, linhas, qtd_linhas, tempo_ms }`.
- Manda o `sql_template` atual do editor (sem precisar salvar antes) no body, pra permitir testar antes de commitar a nova versão.

**Backend FastAPI (`docs/backend-etl-central.md`)**
- Novo endpoint `POST /api/etl/acoes/{id_acao}/testar-sql`:
  ```json
  {
    "sql_template": "SELECT ...",   // opcional; se omitido, usa o salvo no Cloud
    "parametros": { "anomes_ini": 202601, "anomes_fim": 202604 },
    "limite": 50
  }
  ```
  Resposta:
  ```json
  {
    "colunas": [{"nome": "CD_EMPRESA", "tipo": "varchar"}, ...],
    "linhas": [{...}],
    "qtd_linhas": 50,
    "tempo_ms": 1234,
    "truncado": true
  }
  ```
- Regras obrigatórias:
  - Bloquear DML/DDL via regex (`\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|merge|exec)\b`) — só `SELECT` / `WITH`.
  - Validar `anomes_*` como `^\d{6}$` antes do replace dos `$[...]`.
  - Envelopar a query: `SELECT TOP {limite} * FROM ( <sql_resolvido> ) AS preview` (SQL Server).
  - Timeout 15s, abortar se ultrapassar.
  - Nunca gravar em `etl_logs` / `etl_execucoes` (é preview).

### 2. Validador de placeholders no save

Hoje `placeholders.ts` já detecta desconhecidos visualmente. Falta **bloquear save** quando há problema crítico.

**`src/lib/etl/placeholders.ts`**
- Adicionar `validarParaSalvar(sql) → { ok: boolean, erros: string[], avisos: string[] }`:
  - **Erro** (bloqueia): placeholder mal formado, ex.: `$[anomes_ini]` minúsculo, `$[ANOMES INI]` com espaço, `$[]` vazio.
  - **Erro**: placeholder desconhecido fora da whitelist.
  - **Aviso** (não bloqueia): SQL sem nenhum `$[ANOMES_*]` quando a ação tem `estrategia_carga = 'REPLACE_PERIODO'` (faz sentido alertar, mas dá pra salvar).

**`EditarSqlModal.tsx`**
- No `handleSalvar`: chamar `validarParaSalvar`. Se `erros.length > 0`, mostrar toast vermelho com lista e abortar.
- Se só houver `avisos`, abrir `AlertDialog` de confirmação ("Salvar mesmo assim?").

### 3. Placeholders extras (`CODEMP`, `CODFIL`, datas, custom)

**Whitelist canônica em `placeholders.ts`**
```ts
PLACEHOLDERS_SUPORTADOS = [
  'ANOMES_INI', 'ANOMES_FIM',        // já existem
  'DATA_INI', 'DATA_FIM',            // YYYY-MM-DD
  'CODEMP', 'CODFIL',                // inteiros
  'CODEMP_LIST', 'CODFIL_LIST',      // lista CSV para usar em IN (...)
];
```
- Cada um com `tipo` e `validador` próprio:
  - `ANOMES_*`: `/^\d{6}$/`
  - `DATA_*`: `/^\d{4}-\d{2}-\d{2}$/`
  - `CODEMP`, `CODFIL`: `/^\d+$/`
  - `*_LIST`: lista de inteiros separados por vírgula, ex.: `1,2,5`

**Frontend — `ExecutarModal.tsx` e seção de teste**
- Detectar dinamicamente os placeholders do SQL (via `extrairPlaceholders`) e renderizar um input por placeholder, com tipo apropriado (`number`, `date`, `text`).
- `executarTarefa` / `executarAcao` passa `parametros: Record<string, string|number>` (não mais só `anomes_ini/fim`).
- Backwards-compat: continuar enviando `anomes_ini` / `anomes_fim` no nível raiz para tarefas legadas + replicar dentro de `parametros`.

**Backend (`docs/backend-etl-central.md`)**
- Atualizar contrato: payload de execução vira `{ parametros: { ... }, acionado_por }`.
- A FastAPI:
  1. Lê o template do Cloud.
  2. Para cada placeholder presente no SQL, valida o valor recebido com o regex correspondente.
  3. Faz replace literal:
     - Escalares: `$[CODEMP]` → `1`
     - `*_LIST`: `$[CODEMP_LIST]` → `1,2,5` (numeric whitelist já garante segurança)
     - Datas: `$[DATA_INI]` → `'2026-01-01'` (com aspas)
  4. Aborta se sobrar `$[...]` não resolvido.

### Fora de escopo
- Editor visual de parâmetros por ação (cadastro de tipos no Cloud). Por enquanto a whitelist fica hardcoded no frontend + backend.
- Histórico de execuções de preview.

### Arquivos a alterar

- `src/lib/etl/placeholders.ts` — whitelist expandida + `validarParaSalvar`
- `src/lib/etl/api.ts` — `testarSqlAcao`, parâmetros genéricos em `executar*`
- `src/components/etl/EditarSqlModal.tsx` — botão Testar SQL + bloqueio no salvar
- `src/components/etl/ExecutarModal.tsx` — inputs dinâmicos por placeholder
- `docs/backend-etl-central.md` — endpoint `/testar-sql` + novo contrato de parâmetros
- `mem://features/etl-bi` — registrar whitelist e endpoint de teste

### Ordem sugerida de implementação
1. Whitelist expandida + validador (item 2 + base do item 3) — só frontend, baixo risco.
2. Inputs dinâmicos no `ExecutarModal` (item 3) — depende do backend aceitar `parametros`. Documentar contrato; manter fallback.
3. Botão Testar SQL (item 1) — só funciona após FastAPI expor o endpoint novo. Frontend pode ir pronto com feature flag / mensagem "Backend ainda não implementou".

Quer que eu siga essa ordem, ou prefere fazer só um item de cada vez (ex.: começar pelo **2 + 3** que são puramente frontend e o **1** quando a FastAPI estiver pronta)?