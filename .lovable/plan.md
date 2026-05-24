## Diagnóstico

- `bi_ops_fila` tem **0 linhas** e `etl_execucoes` não tem **nenhuma** entrada para `SYNC_FILA_OPS_ERP` → o botão "Atualizar fila do ERP" nunca foi clicado com sucesso (ou estourou antes de logar).
- A tela hoje:
  - **Lê** `bi_ops_fila` via `programacaoApi.fila()` ✅
  - **Tem** botão "Atualizar fila do ERP" que invoca a Edge Function `programacao-sync-fila` ✅
  - **Não** exibe estado vazio amigável (renderiza tabela em branco)
  - **Não** mostra erro detalhado da Edge Function (só `e.message` do `functions.invoke`, que oculta o body)
  - **Não** tem card de diagnóstico

A Edge Function `programacao-sync-fila` já chama o endpoint correto e faz upsert, mas:
- Não valida `FASTAPI_BASE_URL` contra `localhost` nem barra final.
- Não envia `x-cron-secret` ao chamar a FastAPI (só usa para autenticar a chamada *de entrada* do cron).
- Retorna `status: 500` em falha — o cliente Supabase engole o body de erro, frontend só vê "Edge Function returned a non-2xx".

## Mudanças

### 1. Edge Function `programacao-sync-fila`

- Validar `FASTAPI_BASE_URL`:
  - obrigatório, sem barra final (normalizar com `.replace(/\/+$/, '')`)
  - rejeitar se contiver `localhost` ou `127.0.0.1` → retorna `{ error: 'FASTAPI_BASE_URL inválido (localhost não permitido)', code: 'INVALID_BASE_URL' }`
- Encaminhar `x-cron-secret: {CRON_SECRET}` no header da chamada GET para FastAPI (além do `ngrok-skip-browser-warning`).
- Em qualquer falha (FastAPI down, 4xx/5xx, parse), responder **HTTP 200** com `{ ok: false, code, message, detalhe }` para o frontend conseguir ler. Manter log em `etl_execucoes` com `status='ERROR'` e `erro_resumo`.
- Em sucesso continuar retornando `{ ok: true, lidas, inseridas, removidas, duracao_ms }`.

### 2. `programacaoApi.syncFila`

- Tratar `{ ok: false, ... }` como erro: jogar `Error(message)` com `code` e `detalhe` anexados para o toast exibir.

### 3. `ProgramacaoFiltersBar`

- Toast de erro passa a mostrar `code` + `message` + (se houver) primeiros 300 chars de `detalhe`.

### 4. `FilaOpsTab` — estado vazio

- Quando `fila.data.dados.length === 0` e não está carregando, renderizar mensagem dentro de um Card:
  > **Fila de OPs vazia.** Clique em **Atualizar fila do ERP** ou verifique a conexão com a FastAPI.
- Mantém tabela quando há dados.

### 5. Card de diagnóstico (novo componente `DiagnosticoSyncCard.tsx`)

Renderizado logo abaixo do `ProgramacaoKpis`. Consulta no Cloud:

- **Última sincronização**: `select * from etl_execucoes where tarefa_codigo='SYNC_FILA_OPS_ERP' order by iniciado_em desc limit 1`
- **OPs importadas (última run)**: `linhas_inseridas` da linha acima
- **Linhas em bi_ops_fila**: `select count(*) from bi_ops_fila` (filtrado pelos mesmos filtros da tela quando aplicável)
- **Erro**: `erro_resumo` quando `status='ERROR'`, com badge vermelho

Atualiza junto com `onRefresh` (mesma query key) e logo após `syncFila` resolver.

### 6. Documentação

Atualizar `docs/backend-fila-erp.md` para registrar:
- FastAPI deve aceitar e validar header `x-cron-secret` (opcional, mas recomendado).
- Não usar localhost no `FASTAPI_BASE_URL` configurado no Cloud (a Edge Function roda em Deno deploy, não enxerga sua máquina).

## Fora de escopo

- Mexer em outras abas (Agenda, Gargalos etc.).
- Mudar algoritmo de `programacao-gerar`.
- Implementar o endpoint na FastAPI (já documentado em `docs/backend-fila-erp.md`).

## Pré-requisito p/ funcionar

- Secrets `FASTAPI_BASE_URL` (sem `/` final, sem `localhost`) e `CRON_SECRET` precisam estar configurados no Cloud — provavelmente é por isso que a fila está vazia. Confirma se você já preencheu esses dois?
