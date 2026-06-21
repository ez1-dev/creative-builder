## Agendamento automático de tarefas ETL

Adicionar parametrização de horários para qualquer tarefa em `/etl` (ATU_COMERCIAL, contábil, etc.), com presets simples e janela móvel de período. Execução disparada pelo Lovable Cloud (pg_cron → edge function → FastAPI).

### 1. Backend (Lovable Cloud)

**Nova tabela `etl_agendamentos`** (campos de domínio):
- `tarefa_id` (FK `etl_tarefas`) e `nome_tarefa` (snapshot para log)
- `ativo` (bool)
- `frequencia`: `intervalo_minutos` | `diario` | `semanal`
- `intervalo_minutos` (int, p/ frequência "intervalo")
- `hora`, `minuto` (p/ diário/semanal, hora local America/Sao_Paulo)
- `dias_semana` (int[], 0=dom … 6=sáb)
- `janela_tipo`: `mes_atual` | `ultimos_n_meses` | `mes_anterior`
- `janela_n_meses` (int, default 1)
- `parametros_extras` (jsonb, opcional)
- `proxima_execucao_em`, `ultima_execucao_em`, `ultimo_status`, `ultima_mensagem`
- `criado_por`, timestamps

RLS: leitura/edição só para admins (mesma regra de `etl_tarefas`); `service_role` total.

**Edge function `etl-agendamentos-tick`** (verify_jwt=false):
- Roda a cada minuto via `pg_cron` + `pg_net`.
- Para cada agendamento ativo cujo `proxima_execucao_em <= now()`:
  1. Calcula `anomes_ini`/`anomes_fim` conforme `janela_tipo`/`janela_n_meses` (mês atual; últimos N meses; mês anterior).
  2. Chama FastAPI `POST /api/etl/tarefas/{nome}/executar` com Bearer service token armazenado em `app_settings` (`erp_api_url` + `etl_agendamentos_token`).
  3. Grava `ultima_execucao_em`, `ultimo_status`, `ultima_mensagem`.
  4. Calcula próximo `proxima_execucao_em` (timezone America/Sao_Paulo).
- Logs em `etl_logs` (origem = `'agendador'`).

**Cron job** (`pg_cron`) executando a cada minuto, chamando a edge function via `net.http_post` (inserido via `supabase--insert`, fora de migration por conter chaves do projeto).

### 2. Frontend

**Nova aba "Agendamentos" em `/etl`** (`src/pages/EtlAdminPage.tsx`):
- Lista todos os agendamentos com tarefa, frequência resumida ("A cada 30 min", "Diariamente 06:00", "Seg/Qua/Sex 22:30"), janela, próxima execução, último status, switch ativo/inativo.
- Botão "Novo agendamento" abre dialog.

**Dialog `AgendamentoFormDialog`**:
- Select da tarefa (lista de `etl_tarefas`).
- Frequência (radio): Intervalo / Diário / Semanal
  - Intervalo: input minutos (5–1440)
  - Diário: time picker HH:MM
  - Semanal: time picker + checkboxes dos dias
- Janela: select mês atual / últimos N meses (input N) / mês anterior + preview do `ANOMES_INI`–`ANOMES_FIM` calculado agora.
- Switch ativo, botão "Executar agora" (chama o endpoint manual existente).

**Hook `useEtlAgendamentos`** (TanStack Query) com CRUD via `supabase.from('etl_agendamentos')`.

**Resumo na linha da tarefa** (tabela principal): badge "⏱ Agendado" quando houver agendamento ativo, com tooltip da próxima execução.

### 3. Configuração necessária

- Habilitar extensões `pg_cron` e `pg_net` (migration).
- Guardar em `app_settings` a chave `etl_agendamentos_token` (Bearer usado pela edge function para autenticar no FastAPI) — pedirei via `add_secret` se ainda não existir.
- FastAPI já expõe `/api/etl/tarefas/{nome}/executar`; nenhuma mudança no backend ERP.

### Detalhes técnicos

- Cálculo de próxima execução feito em SQL (`timezone('America/Sao_Paulo', now())`) para não depender de runtime da edge function.
- Tick é idempotente: usa `UPDATE … RETURNING` com `proxima_execucao_em <= now()` para evitar disparo duplo entre instâncias.
- Edge function não trava esperando o FastAPI: faz `fetch` com timeout de 25s e registra status; execução longa permanece monitorada pela tela `/etl/tarefas/:nome` existente.

### Arquivos previstos

- Migration: `etl_agendamentos` + RLS + extensões + cron job.
- `supabase/functions/etl-agendamentos-tick/index.ts`
- `src/lib/etl/agendamentosApi.ts`
- `src/hooks/useEtlAgendamentos.ts`
- `src/components/etl/AgendamentosTab.tsx`
- `src/components/etl/AgendamentoFormDialog.tsx`
- Ajuste em `src/pages/EtlAdminPage.tsx` para abas (Tarefas / Agendamentos) e badge.
