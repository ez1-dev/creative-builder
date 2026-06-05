
## Objetivo

Permitir que o drill CLIENTE do BI Comercial exiba `código - nome` do cliente, usando uma dimensão `public.bi_cliente` no Cloud, alimentada por sincronização a partir da E085CLI do ERP Senior.

## Escopo

### 1. Cloud — criar tabela `public.bi_cliente`

Migration nova:

- Tabela `public.bi_cliente`:
  - `cd_cliente text primary key`
  - `nm_cliente text`
  - `nm_fantasia text`
  - `atualizado_em timestamptz not null default now()`
- GRANTs: `select` para `authenticated`; `all` para `service_role` (sem `anon` — dado interno).
- RLS habilitada com policy de SELECT para `authenticated` (usuários logados leem; escrita só via service_role usado pelo ETL).
- Índice `btree` em `lower(nm_cliente)` para busca futura.

Sem trigger / sem `updated_at` extra — `atualizado_em` é gerenciado pelo ETL.

### 2. Contrato backend — `docs/backend-bi-comercial-clientes-sincronizar.md` (novo)

Documento para o time da FastAPI cobrindo:

- Rota `POST /api/bi/comercial/clientes/sincronizar`
  - Lê E085CLI (CODCLI, NOMCLI, APECLI).
  - UPSERT em `public.bi_cliente` via service role:
    - `cd_cliente = CODCLI::text`
    - `nm_cliente = NOMCLI`
    - `nm_fantasia = APECLI`
    - `atualizado_em = now()`
  - Resposta: `{ inseridos, atualizados, total, duracao_ms }`.
- Ajuste em `POST /api/bi/comercial/drill` (drill_type `CLIENTE`):
  - `LEFT JOIN public.bi_cliente c ON c.cd_cliente = f.cd_cliente::text`
  - Retornar colunas: `cd_cliente`, `nm_cliente`, `nm_fantasia`, `cliente_label = cd_cliente || ' - ' || coalesce(nm_cliente, '(sem nome)')`.
  - `columns[]` continua expondo a coluna agregada como `cd_cliente` com `label: "Cliente"`; frontend renderiza usando `cliente_label`.
  - `filtros_drill` permanece **apenas** `{ "cd_cliente": "<código>" }`. Nada de label.
- Regra: o filtro técnico em todos os SQLs continua `WHERE cd_cliente = :cd_cliente`.

### 3. Frontend

- `src/lib/bi/comercialDrillApi.ts`: adicionar `nm_fantasia` em `DrillRow` (já tem `nm_cliente` e `cliente_label`).
- `ComercialDrillDrawer.tsx`: já trata `cliente_label` / fallback `${cd_cliente} - ${nm_cliente}` — nenhuma mudança funcional, só conferir que continua válido.
- Página BI Comercial (`src/pages/bi/ComercialPage.tsx`): adicionar botão discreto **"Sincronizar clientes"** (visível só para admin via `is_admin`/`useIsSeniorAdmin`) que faz `POST /api/bi/comercial/clientes/sincronizar` via `api.post`, mostra toast com `inseridos/atualizados/total` e desabilita durante a chamada.
- Atualizar `docs/backend-bi-comercial-drill-cliente-nome.md` apontando para o novo doc de sincronização.

### 4. Memória do projeto

- Atualizar `mem://features/drill-bi-comercial` mencionando dependência da tabela `bi_cliente` e da rota de sincronização.

## Critérios de aceite

- Migration cria `public.bi_cliente` com GRANTs e RLS corretos.
- Documento backend descreve sync + JOIN sem ambiguidade.
- Botão "Sincronizar clientes" disponível para admin no BI Comercial.
- Após o backend implementar o JOIN, o drill CLIENTE mostra `8794 - NOME DO CLIENTE`.
- `filtros_drill` continua contendo apenas `cd_cliente`; clicar em Detalhar não vaza label.

## Detalhes técnicos

- Tipo de `cd_cliente`: `text` no Cloud para tolerar diferenças de tipagem com o ERP (cast `::text` no JOIN).
- ETL roda na FastAPI usando `SUPABASE_SERVICE_ROLE_KEY` (já configurado nos secrets do Cloud — mesmo padrão dos outros ETLs `bi_*`).
- Não criar nenhuma RPC `bi_comercial_drill` no Cloud — o drill permanece 100% na FastAPI.

## Fora de escopo

- Sincronização agendada (cron) — só botão manual neste passo; pode ser adicionada depois.
- Extensão para REVENDA / PRODUTO — segue o mesmo padrão futuro, mas não entra agora.
