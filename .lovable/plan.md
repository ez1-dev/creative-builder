
# Editor de SQL versionado nas ações ETL

Permitir editar pela tela `/etl/tarefas/:nome` o SQL que a FastAPI executa contra o ERP Senior, mantendo as regras: frontend **não** acessa ERP e **não** usa service role. O SQL fica salvo no Cloud, versionado, e a FastAPI passa a lê-lo de lá em cada execução.

## 1. Banco (Cloud)

**Alterar `etl_acoes`:**
- `sql_template text` — SQL atual da ação (com placeholders `:anomes_ini`, `:anomes_fim`, etc.)
- `sql_versao integer not null default 1`
- `sql_atualizado_em timestamptz`
- `sql_atualizado_por uuid` (auth.uid do editor)

**Nova tabela `etl_acao_sql_versoes`** (histórico):
- `id uuid pk`
- `acao_id uuid fk etl_acoes`
- `versao integer`
- `sql_template text`
- `comentario text`
- `criado_por uuid`
- `criado_em timestamptz default now()`
- `unique(acao_id, versao)`

RLS: leitura para `authenticated`; escrita só `is_admin(auth.uid())`. GRANTs padrão.

**Trigger** `etl_acoes_sql_versionar`: quando `sql_template` muda, insere linha em `etl_acao_sql_versoes` com a versão anterior e incrementa `sql_versao`.

## 2. Frontend

**`src/lib/etl/api.ts`** — adicionar:
- `atualizarSqlAcao(acaoId, sql, comentario)` — update no Cloud
- `listarVersoesSql(acaoId)` — histórico
- `restaurarVersaoSql(acaoId, versao)` — copia versão antiga para o atual

**`src/components/etl/EditarSqlModal.tsx`** (novo):
- Editor com Monaco (`@monaco-editor/react`, modo `sql`)
- Campo "Comentário da alteração" (obrigatório)
- Lista lateral de versões anteriores (clique = carrega no editor read-only + botão "Restaurar")
- Botão Salvar (só admin) / Fechar
- Aviso: "O SQL roda na FastAPI contra o ERP Senior. Use placeholders `:anomes_ini`, `:anomes_fim`."

**`EtlTarefaDetalhePage.tsx`** — na tabela de ações:
- Coluna nova "SQL" mostrando badge `v{sql_versao}` ou "—" se vazio
- Botão "Editar SQL" (ícone Code) abre `EditarSqlModal`
- Só habilitado para admins (`useIsSeniorAdmin` ou check de `is_admin`)

## 3. FastAPI (contrato — documentação)

Atualizar `docs/backend-etl-central.md`:
- Antes de executar `VM_FATURAMENTO` (e demais ações), a FastAPI faz `SELECT sql_template, sql_versao FROM etl_acoes WHERE id_acao = :id`
- Se `sql_template` estiver vazio, usa o SQL hardcoded de fallback (compatibilidade)
- Loga em `etl_logs` qual `sql_versao` foi usada na execução
- Aplica os placeholders `:anomes_ini`, `:anomes_fim` via bind parameters (nunca string concat)

**Não há mudança de endpoints** — só comportamento interno de quem busca o SQL.

## 4. Segurança

- Só admin edita (RLS + UI desabilita botão)
- Histórico completo em `etl_acao_sql_versoes` (auditoria)
- Frontend nunca executa o SQL — apenas grava texto no Cloud
- FastAPI continua sendo o único que toca o ERP, com service role

## Fora de escopo

- "Testar SQL" / preview de linhas (precisaria endpoint dedicado na FastAPI — fica para próxima)
- Editor de parâmetros customizados além de `anomes_ini`/`anomes_fim`
- Aprovação em dois passos (workflow)

## Detalhes técnicos

- Dependência nova: `@monaco-editor/react` (~2MB lazy-loaded)
- Migration cria coluna, tabela de versões, trigger, GRANTs e RLS num único arquivo
- Seed: deixar `sql_template` NULL para todas as ações existentes (FastAPI usa fallback até admin colar o SQL pela tela)
