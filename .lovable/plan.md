## Central de Integrações / ETL

Criar módulo para orquestrar cargas do ERP Senior → Supabase/BI, no padrão UpQuery. Frontend só lê/grava metadados no Cloud e dispara a FastAPI; nunca toca no ERP nem usa service role.

### ⚠️ Conflito de schema (decisão necessária)

Já existem no Cloud as tabelas `etl_tarefas`, `etl_execucoes`, `etl_logs`, `etl_fila_integrador` com schema diferente do pedido (ex.: `etl_tarefas` usa `codigo`/`nome`/`conexao_id`, não `grupo`/`nome_tarefa`/`status_atual`; `etl_execucoes` usa `tarefa_codigo`/`status RUNNING`/`linhas_lidas`; `etl_logs` usa `mensagem`/`nivel`/`contexto`). A tela `/etl` (`EtlAdminPage`) usa esse schema atual.

Proposta: **migrar as tabelas existentes para o novo schema** (renomear colunas, adicionar `grupo`, `status_atual`, `ultima_execucao_em`, `ordem`, etc., manter compat onde possível) e atualizar `EtlAdminPage` para o novo modelo — em vez de criar tabelas paralelas. Caso prefira manter `/etl` antigo e criar `/etl/central` novo com tabelas `etl2_*`, me avise antes da implementação.

O plano abaixo assume **migração das tabelas existentes**.

### 1. Banco (migrations Cloud)

**Recriar/alterar tabelas de controle ETL** (DROP + CREATE, já que a `EtlAdminPage` atual será reescrita):

- `etl_tarefas`: `id`, `grupo` (default 'GERAL'), `nome_tarefa` UNIQUE, `descricao`, `ativa`, `ordem`, `status_atual`, `ultima_execucao_em`, `criado_em`, `atualizado_em`.
- `etl_acoes`: nova — campos do briefing + UNIQUE `(tarefa_id, id_acao)`.
- `etl_execucoes`: campos do briefing (`nome_tarefa`, `status`, `acionado_por`, `parametros`, `iniciado_em`, `finalizado_em`, `total_linhas`, `mensagem`, `erro`).
- `etl_acao_execucoes`: nova.
- `etl_logs`: campos do briefing (`acao_execucao_id`, `nivel`, `origem`, `mensagem`, `detalhe`).
- `etl_fila_integrador`: campos do briefing (`nome_tarefa`, `tentativas`, `processado_em`, …).

**Nova tabela `bi_faturamento`** — todos os campos do briefing + índices em `anomes_emissao`, `cd_cliente`, `cd_produto`, `cd_origem`, `cd_tp_movimento`, `cd_filial`.

**GRANT + RLS (em todas):**
- `etl_*` (controle): `GRANT` para `authenticated` e `service_role`; RLS — admins (`is_admin(auth.uid())`) gerenciam tudo (ALL); `authenticated` lê (`SELECT`). FastAPI grava via service role.
- `bi_faturamento`: `GRANT SELECT` para `authenticated`, `GRANT ALL` para `service_role`; RLS — `authenticated` lê tudo.

**Seed (via supabase--insert):**
- 1 tarefa `ATU_COMERCIAL` (grupo GERAL, ordem 10).
- 5 ações: `VM_FATURAMENTO` (ordem 1, ativa), `VM_FATURAMENTO_MANUAL` (2, inativa), `VM_FAT_CONTABIL` (4, inativa), `VM_FAT_TRB` (5, inativa), `ATU_COMERCIAL` (99, ativa).

### 2. Frontend

**Cliente API** — `src/lib/etl/api.ts` (usa `api.ts` existente, Bearer já incluso):
- `listarTarefas()`, `detalheTarefa(nome)`, `acoesTarefa(nome)`
- `executarTarefa(nome, { anomes_ini, anomes_fim, acionado_por })`
- `executarAcao(id_acao, payload)`
- `logsExecucao(execucao_id)`

Os GETs leem do Cloud (mais barato, sem ngrok). Os POSTs vão para a FastAPI.

**Páginas/rotas:**
- `/bi/etl` → `CentralEtlPage` (substitui o link antigo `/etl`; menu "BI / Integrações / Central ETL" no `AppSidebar`).
  - 4 KPIs: total tarefas, ativas, com erro, última execução.
  - Grid (`DataTableBI`): grupo, nome_tarefa, descrição, ativa (badge), status_atual (badge color), última execução, ações [Ver, Executar, Logs].
- `/bi/etl/tarefas/:nome` → `TarefaDetalhePage`.
  - Header: nome, grupo, status_atual, última execução.
  - Tabela ações (com botão Executar por ação).
  - Tabela últimas execuções (com botão Ver logs).

**Modais (em `src/components/etl/`):**
- `ExecutarModal` — inputs `anomes_ini`/`anomes_fim` (number, default = AAAAMM corrente), botão Confirmar. Reusado para tarefa e ação. Ao confirmar: chama endpoint, fecha modal, recarrega detalhe, toast com resultado.
- `LogsModal` — `<Timeline>` (já existe em `bi/layout/Timeline.tsx`) com status/início/fim/total_linhas por ação + lista de logs INFO/WARN/ERROR coloridos.

**Permissão:** rota protegida por `/bi/etl` em `profile_screens`; ações de execução visíveis só para admins (`useIsSeniorAdmin` ou nova `is_admin`).

### 3. Backend (FastAPI — fora do escopo Lovable)

Documentar em `docs/backend-etl-central.md` os endpoints esperados:
- `GET /api/etl/tarefas`, `GET /api/etl/tarefas/{nome}/detalhe`, `GET /api/etl/tarefas/{nome}/acoes`
- `POST /api/etl/tarefas/{nome}/executar`, `POST /api/etl/acoes/{id_acao}/executar`
- `GET /api/etl/execucoes/{id}/logs`
- `POST /api/etl/comercial/faturamento` (worker da ação `VM_FATURAMENTO`)

Body padrão: `{ anomes_ini, anomes_fim, acionado_por }`. Resposta deve retornar `execucao_id`. FastAPI grava em `etl_execucoes`/`etl_acao_execucoes`/`etl_logs` via service role e em `bi_faturamento` com estratégia `REPLACE_PERIODO` (DELETE WHERE anomes BETWEEN … + INSERT em lote, `carga_id = execucao_id`).

### Fora do escopo

- Implementação do ETL real no FastAPI (apenas contrato/doc).
- Editor visual de tarefas/ações (CRUD via SQL/seed nesta fase).
- Agendamento/cron (já existe `etl_watermark` e infra antiga; permanece).

### Validação

1. Migration roda sem erro; `bi_faturamento` aceita insert via service role.
2. `/bi/etl` lista a tarefa `ATU_COMERCIAL` com 5 ações.
3. Botão Executar abre modal, chama `POST /api/etl/tarefas/ATU_COMERCIAL/executar` com Bearer, mostra toast e atualiza grid.
4. Modal de logs renderiza timeline + linhas INFO/WARN/ERROR.

**Confirmar antes de implementar:** posso reescrever as tabelas `etl_*` existentes (e a `EtlAdminPage` que as usa) para o novo schema, ou prefere manter o antigo e criar tabelas paralelas?
