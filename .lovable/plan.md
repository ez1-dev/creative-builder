
## Objetivo

Garantir que o botão "Atualizar fila do ERP" popule `bi_ops_fila` com **todas** as OPs em situação `A` (aberta) e `L` (liberada), sem filtro de data por padrão, e expor diagnóstico com a URL chamada na FastAPI.

## Mudanças

### 1. Edge Function `programacao-sync-fila/index.ts`

- Trocar o nome do query param de `limit` → **`limite`** (alinhar com a spec FastAPI).
- Default `codemp=1`, `situacoes=A,L`, `limite=5000`.
- **Não enviar** `data_ini` / `data_fim` por padrão (mesmo que venham no body, ignorar a menos que explicitamente passados; sincronização padrão = snapshot completo A,L).
- No retorno da function (sucesso e erro), incluir `url_chamada` — a URL completa chamada na FastAPI **sem** o header `x-cron-secret` e sem expor o secret (URL não contém secret, então pode ser logada como está).
- Persistir `url_chamada` no campo `params_executados` de `etl_execucoes` (já é JSON), junto com `situacoes`, `codemp`, `limite`.

### 2. `src/lib/producao/programacaoApi.ts`

- Propagar `url_chamada`, `lidas`, `inseridas`, `removidas` no retorno de `sincronizarFilaErp()` para a UI.

### 3. `DiagnosticoSyncCard.tsx`

Adicionar nova linha/coluna mostrando:
- **URL chamada na FastAPI** (lida de `params_executados.url_chamada` da última execução), com `break-all` para não quebrar layout.
- Já existem: última sincronização, OPs lidas/salvas/removidas, total em `bi_ops_fila`, último erro.

### 4. `FilaOpsTab.tsx`

Já tem mensagem de fila vazia — manter texto exato:
"Fila de OPs vazia. Clique em Atualizar fila do ERP ou verifique a conexão com a FastAPI."

### 5. `ProgramacaoFiltersBar.tsx` (botão "Atualizar fila do ERP")

- Não passar `data_ini`/`data_fim` na chamada de sync (sync = snapshot completo A,L).
- Filtros de data na tela continuam funcionando apenas como **filtros visuais** sobre `bi_ops_fila`.

### 6. Secret `FASTAPI_BASE_URL`

Continua inválido (`123456`). Após aprovar o plano, abrir formulário seguro para o usuário colar a URL pública correta (ex.: `https://xxxx.ngrok-free.app`, sem barra final). A validação já implementada na Edge Function rejeita localhost / valor não-URL e retorna mensagem clara.

## Fora de escopo

- Alterações no FastAPI (já em ajuste pelo backend conforme a spec `docs/backend-fila-erp.md`).
- Lógica do algoritmo de programação, RLS, capacidades.

## Critério de pronto

1. Clicar em "Atualizar fila do ERP" → Edge Function chama `{FASTAPI_BASE_URL}/api/producao/programacao/fila-erp?codemp=1&situacoes=A%2CL&limite=5000`.
2. `bi_ops_fila` é populada com todas as OPs A e L retornadas.
3. `DiagnosticoSyncCard` mostra URL chamada, qtd recebida, qtd gravada, data/hora, último erro.
4. Aba "Fila de OPs" lista as OPs; filtros visuais (data, situação, unidade, recurso, operação) continuam funcionando localmente.
