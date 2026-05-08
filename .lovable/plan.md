
# Arquitetura BI: Supabase como base analítica + módulo ETL

## Visão geral

```text
ERP Senior (SQL Server/Oracle)
        │
        ▼
FastAPI ETL  ──► tabelas bi_* (Supabase/Postgres)
        │              │
        │              ▼
        │       APIs agregadas (FastAPI lendo Supabase via service role)
        │              │
        ▼              ▼
   etl_logs        Lovable/React (consome só APIs agregadas)
```

Frontend **nunca** consulta ERP nem Supabase com service role. Só consome `/api/painel-compras*` e `/api/notas-recebimento*`, que passam a ler do Supabase em vez do ERP.

---

## 1. Tabelas analíticas (migrações Supabase)

Todas em `public`, com RLS habilitado. Acesso de leitura para `authenticated` via policies; escrita só pelo backend FastAPI usando service role.

### 1.1 Dimensões

- **bi_fornecedores**: `codigo (PK)`, `nome`, `cnpj`, `uf`, `cidade`, `ativo`, `updated_at`.
- **bi_projetos**: `numero_projeto (PK)`, `nome_projeto`, `projeto_macro` (`GENIUS|ESTRUTURAL ZORTEA|OUTROS`), `cliente`, `updated_at`.
- **bi_centros_custo**: `codigo (PK)`, `descricao`, `responsavel`, `updated_at`.
- **bi_tipo_despesa**: `codigo (PK)`, `label` (`Matéria-prima|Uso e consumo|Despesas gerais|Serviços`), `regra_origem` (`erp|calculada`).

### 1.2 Fatos

- **bi_compras** (1 linha por item de OC):
  `id (uuid PK)`, `numero_oc`, `sequencia_item`, `codigo_item`, `descricao_item`, `tipo_item`, `origem_material`, `codigo_familia`,
  `codigo_fornecedor`, `nome_fornecedor`, `numero_projeto`, `nome_projeto`, `projeto_macro`,
  `centro_custo`, `tipo_despesa`, `tipo_despesa_calc`,
  `data_emissao`, `data_entrega`, `mes_competencia`, `condicao_pagamento`,
  `quantidade`, `quantidade_recebida`, `saldo_pendente`,
  `preco_unitario`, `valor_bruto`, `valor_liquido`, `valor_recebido`, `valor_pendente`,
  `situacao_oc`, `codigo_motivo_oc`, `observacao_oc`,
  `erp_updated_at`, `etl_updated_at`.
  Índices: `(data_emissao)`, `(numero_oc)`, `(codigo_fornecedor)`, `(numero_projeto)`, `(projeto_macro)`, `(tipo_despesa)`, `(mes_competencia)`.

- **bi_recebimentos** (1 linha por item de NF):
  `id (uuid PK)`, `numero_nf`, `serie`, `sequencia_item`, `codigo_item`, `descricao_item`,
  `numero_oc_origem`, `sequencia_oc_origem`,
  `codigo_fornecedor`, `nome_fornecedor`, `numero_projeto`, `projeto_macro`,
  `centro_custo`, `tipo_despesa`, `tipo_despesa_calc`,
  `data_emissao_nf`, `data_recebimento`, `mes_competencia`,
  `quantidade`, `valor_bruto`, `valor_liquido`,
  `tipo_movimento` (`RECEBIMENTO|DEVOLUCAO|ESTORNO|CANCELAMENTO`),
  `cancelada` bool, `estornada` bool,
  `erp_updated_at`, `etl_updated_at`.
  Índices: `(data_recebimento)`, `(numero_nf)`, `(numero_oc_origem)`, `(codigo_fornecedor)`, `(projeto_macro)`.

### 1.3 Cache de dashboard (opcional, acelera respostas pesadas)

- **dashboard_cache**: `cache_key text PK`, `payload jsonb`, `filtros_hash text`, `valid_until timestamptz`, `created_at`. TTL definido pela API (ex.: 5 min para dashboards globais sem filtro).

### 1.4 Tabelas de orquestração ETL

- **etl_tarefas**: `id`, `codigo` (`ATU_COMPRAS`, `ATU_RECEBIMENTOS`, ...), `nome`, `descricao`, `cron` (text, cron-style), `enabled`, `params jsonb` (ex.: janela em dias, batch size), `conexao_id`, `created_at`, `updated_at`.
- **etl_conexoes**: `id`, `codigo`, `tipo` (`SENIOR|SQLSERVER|ORACLE|HTTP`), `host`, `porta`, `database`, `usuario`, `secret_key` (referência ao nome do secret no backend, **nunca** a senha), `enabled`.
- **etl_execucoes**: `id`, `tarefa_id`, `iniciado_em`, `terminado_em`, `status` (`RUNNING|SUCCESS|ERROR|CANCELLED`), `linhas_lidas`, `linhas_inseridas`, `linhas_atualizadas`, `linhas_rejeitadas`, `erro_resumo`, `params_executados jsonb`, `acionado_por` (`SCHEDULER|MANUAL|API`), `user_id`.
- **etl_logs**: `id`, `execucao_id`, `nivel` (`DEBUG|INFO|WARN|ERROR`), `mensagem`, `contexto jsonb`, `created_at`. Índice por `(execucao_id, created_at)`.
- **etl_watermark**: `tarefa_codigo PK`, `ultimo_valor` (timestamptz ou texto p/ chave incremental), `tipo` (`TIMESTAMP|ID|MES`), `updated_at`. Uma linha por tarefa.
- **etl_fila_integrador**: `id`, `tarefa_codigo`, `params jsonb`, `prioridade`, `status` (`PENDENTE|EM_EXECUCAO|CONCLUIDA|ERRO`), `created_at`, `picked_at`, `finished_at`, `execucao_id`. Permite enfileirar reprocessos manuais.

### 1.5 RLS

- `bi_*`, `dashboard_cache`: `SELECT` para `authenticated` (apenas autenticados leem); INSERT/UPDATE/DELETE apenas service role (sem policy → bloqueado).
- `etl_*`: leitura/escrita só para admins via `is_admin(auth.uid())`. Inserções automáticas vêm pelo backend (service role bypassa RLS).

---

## 2. Backend FastAPI — módulo ETL

Não fica no projeto Lovable. É um serviço externo (mesmo onde já estão `/api/painel-compras` etc.) com novos componentes:

### 2.1 Camadas

```text
etl/
  connectors/
    senior.py        # SQL Server / Oracle, via pyodbc/oracledb
    supabase.py      # client com service role (env: SUPABASE_SERVICE_ROLE_KEY)
  tasks/
    base.py          # contrato: read_watermark, extract, transform, load, commit_watermark
    atu_compras.py
    atu_recebimentos.py
  classificacao/
    projeto_macro.py # mesma regra do docs/backend-projeto-macro.md
    tipo_despesa.py  # mesma regra do docs/backend-painel-compras-dashboard.md
  scheduler.py       # APScheduler lendo etl_tarefas.cron
  runner.py          # CLI: python -m etl run ATU_COMPRAS [--from=YYYY-MM-DD]
  api.py             # FastAPI router /api/etl/...
```

### 2.2 Fluxo de uma execução

1. Cria linha em `etl_execucoes` (`status=RUNNING`).
2. Lê `etl_watermark` da tarefa.
3. Extract: query no ERP filtrando `erp_updated_at > watermark` (ou `data_emissao >= watermark` para `MES`).
4. Transform: aplica `getProjetoMacro` e `getTipoDespesa` no servidor (port das funções TS de `src/lib/comprasClassificacao.ts`), calcula `valor_bruto/liquido/recebido/pendente`.
5. Load: `UPSERT` em `bi_compras` / `bi_recebimentos` com `ON CONFLICT (numero_oc, sequencia_item)` (ou chave equivalente para NF). Em batches de 1.000–5.000.
6. Atualiza watermark com o maior `erp_updated_at` processado.
7. Loga contadores em `etl_logs` e fecha `etl_execucoes` (`SUCCESS|ERROR`).
8. Em erro: rollback do batch atual, watermark **não** avança, status `ERROR`, logs com stacktrace.

### 2.3 Reprocessamento manual

Endpoint `POST /api/etl/reprocessar`:
```json
{ "tarefa": "ATU_COMPRAS", "data_ini": "2026-01-01", "data_fim": "2026-04-30" }
```
Insere job em `etl_fila_integrador`. Worker consome a fila e ignora watermark para essa execução (mas registra normalmente em `etl_execucoes`).

### 2.4 Endpoints administrativos

- `GET /api/etl/tarefas` / `POST` / `PUT /:id` / `POST /:id/executar`
- `GET /api/etl/conexoes` / `POST` / `PUT /:id` / `POST /:id/testar`
- `GET /api/etl/execucoes?tarefa=&status=&limit=`
- `GET /api/etl/execucoes/:id/logs`
- `GET /api/etl/fila` / `POST /api/etl/fila` / `DELETE /api/etl/fila/:id`

Todos protegidos por header de admin (mesmo padrão das rotas atuais).

### 2.5 Tarefas iniciais

- **ATU_COMPRAS**: cron sugerido `*/15 * * * *`. Watermark `TIMESTAMP` em `data_alteracao` da OC no ERP.
- **ATU_RECEBIMENTOS**: cron sugerido `*/15 * * * *`. Watermark `TIMESTAMP` em `data_alteracao` da NF. Trata `tipo_movimento` lendo flags do ERP (`indicador_devolucao`, `indicador_cancelamento`, `estornada`).

---

## 3. Reescrita das APIs agregadas

Mantêm contrato atual (frontend não muda) — mudam só a fonte:

- `GET /api/painel-compras` → `SELECT ... FROM bi_compras WHERE <filtros> ORDER BY data_emissao DESC LIMIT/OFFSET`. Total via `COUNT(*) OVER()`.
- `GET /api/painel-compras-dashboard` → `SELECT SUM(valor_liquido), COUNT(DISTINCT numero_oc), ... FROM bi_compras WHERE <filtros> GROUP BY ...` para cada bucket descrito em `docs/backend-painel-compras-dashboard.md`. Sem `LIMIT`. Cache opcional em `dashboard_cache` por `filtros_hash`.
- `GET /api/notas-recebimento` e `/api/notas-recebimento-dashboard` análogos sobre `bi_recebimentos`.

Regras de classificação (`projeto_macro`, `tipo_despesa`) **não são recalculadas na API** — já vêm prontas das colunas materializadas pelo ETL. Mantém paridade lista x dashboard automaticamente.

---

## 4. Módulo ETL no Lovable (frontend)

Nova seção no menu lateral (apenas admin), rotas:

- `/etl/tarefas` — lista `etl_tarefas`, ações: editar cron/params, habilitar/desabilitar, "Executar agora".
- `/etl/conexoes` — CRUD de `etl_conexoes`. Senha **nunca** trafega: campo aceita só nome do secret no backend.
- `/etl/acoes` — botões de reprocessamento por período (chama `POST /api/etl/reprocessar`).
- `/etl/fila` — `etl_fila_integrador` em tempo real (poll 5s).
- `/etl/execucoes` — `etl_execucoes` com filtro por tarefa/status, link para logs.
- `/etl/logs` — `etl_logs` com filtro por execução/nível.

Componentes reutilizam `@/components/bi` (KpiGrid, DataTableBI). Acesso via `is_admin(auth.uid())` + `profile_screens` (`/etl/*`). Frontend lê `etl_*` direto do Supabase (RLS admin) e dispara ações via API FastAPI.

---

## 5. Segurança

- `SUPABASE_SERVICE_ROLE_KEY`: só no backend FastAPI (env var). Nunca no React.
- Credenciais ERP: só no backend, em secret manager. `etl_conexoes.secret_key` guarda o **nome** do secret, não o valor.
- Frontend usa apenas `VITE_SUPABASE_PUBLISHABLE_KEY` (anon) + JWT do usuário; RLS bloqueia escrita em `bi_*`.
- Endpoints `/api/etl/*` exigem usuário admin (mesma checagem já usada nas outras rotas administrativas).
- Logs **não** persistem senhas nem connection strings completas.

---

## 6. Plano de execução em fases

1. **Migração 1 — Esquema BI**: criar todas as tabelas `bi_*`, `dashboard_cache`, `etl_*`, índices, RLS e seed de `bi_tipo_despesa`.
2. **Backend ETL — esqueleto**: connectors, base task, scheduler, endpoints `/api/etl/*`, runner CLI.
3. **Tarefa ATU_COMPRAS**: extract + transform + upsert + watermark + testes contra um período pequeno.
4. **Tarefa ATU_RECEBIMENTOS**: idem, com tratamento de devolução/estorno/cancelamento.
5. **Reescrita das APIs**: `painel-compras`, `painel-compras-dashboard`, `notas-recebimento`, `notas-recebimento-dashboard` apontando para `bi_*`. Validar paridade contra ERP por amostragem.
6. **Frontend ETL**: telas Tarefas/Conexões/Ações/Fila/Execuções/Logs. Reaproveitar biblioteca BI.
7. **Cutover**: ativar agendamento, manter fallback ao ERP por 1 semana atrás de feature flag, depois remover.

---

## 7. O que precisa do usuário antes de começar

Algumas decisões precisam ser confirmadas antes da implementação. Vou perguntar em seguida (se aprovar este plano) sobre:

- Onde mora hoje o backend FastAPI (mesmo repo das rotas `/api/painel-compras` atuais? URL via ngrok?). O módulo ETL deve viver lá.
- Driver do Senior (SQL Server via `pyodbc` ou Oracle via `oracledb`?), para escolher os connectors corretos.
- Frequência inicial dos jobs (cada 15 min é razoável?) e janela de retenção de `etl_logs` (sugiro 30 dias com `cleanup_old_etl_logs`).
- Se o cache `dashboard_cache` deve entrar já na fase 1 ou ficar para depois.

Essas respostas afetam só configuração, não a estrutura do plano.
