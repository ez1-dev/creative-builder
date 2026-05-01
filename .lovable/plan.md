# Diagnóstico visual de backend offline — Monitor de Usuários Senior

Objetivo: na tela `/monitor-usuarios-senior`, transformar a falha silenciosa atual (toast vermelho + tabela "Nenhuma sessão encontrada") em um painel claro que diga exatamente **qual** é o problema (ngrok caiu, token expirou, rota não publicada, sem dados, etc.) e permita corrigir sem sair da tela.

## O que o usuário verá

No topo da página, abaixo do header, um **card de status do backend** que muda conforme o resultado da última chamada a `GET /api/senior/sessoes`:

- **Verde — "Backend ERP online"**: chamada OK. Card pode ser recolhido.
- **Vermelho — "Backend ERP offline ou indisponível"** (erro de rede, `Failed to fetch`, `ERR_NGROK_3200`, timeout, status 0):
  - Mensagem: *"Não foi possível conectar na API ERP. Verifique se o FastAPI e o túnel ngrok estão ativos."*
  - Sub-mensagem específica para ngrok: *"Túnel ngrok offline. Reinicie o ngrok no servidor do backend."*
  - Mostra a URL atual configurada e o erro técnico retornado.
- **Âmbar — "Token expirado ou inválido"** (HTTP 401): *"Faça login novamente."* Botão "Ir para login".
- **Âmbar — "Rota não publicada"** (HTTP 404): *"Backend online, mas a rota /api/senior/sessoes ainda não foi publicada no FastAPI."*
- **Vermelho — "Erro do backend"** (HTTP 500/502/503): mostra o detalhe retornado.

O card sempre exibe:
- URL atual da API (lida de `app_settings.erp_api_url` via `getApiUrl()`).
- Horário da última tentativa.
- Botões: **Testar conexão**, **Atualizar API URL**, **Tentar novamente**.

Na **tabela**, quando o backend está offline, em vez de "Nenhuma sessão encontrada" (que confunde com sucesso vazio), mostrar:
> *"Nenhuma sessão carregada porque o backend ERP está offline."*
com botão "Atualizar" inline. Quando o backend respondeu 200 com lista vazia, manter a mensagem original "Nenhuma sessão encontrada."

Durante o carregamento inicial: spinner centralizado (já existe). O card de status mostra "Verificando conexão…".

## Botões

- **Testar conexão**: chama `GET {ERP_API_URL}/health` (com header `ngrok-skip-browser-warning`). Resposta 200 → toast verde "Backend online" e card fica verde. Falha → mantém alerta com a mensagem classificada.
- **Atualizar API URL**: abre um `Dialog` com um único `Input` (URL atual pré-preenchida), validação básica (`https?://...`), botão Salvar:
  1. Faz `upsert` em `app_settings` com `{ key: 'erp_api_url', value: <nova> }`.
  2. Chama `setApiBaseUrl(nova)`.
  3. Dispara automaticamente um teste em `/health`.
  4. Se OK, recarrega `/api/senior/sessoes`. Se falhar, mantém modal aberto com erro.

Ambos reaproveitam o padrão já existente em `ConfiguracoesPage.tsx` (mesmo `upsert` em `app_settings` + `setApiBaseUrl`). Nada novo no banco.

## Logging

Toda tentativa de carregar sessões loga no `console.info` um objeto estruturado:
```
{ url, method: 'GET', status, errorMessage, timestamp }
```
Erros já são gravados em `error_logs` automaticamente pelo `ApiClient.request` (via `logError`), então não há duplicação no Supabase.

## Detalhes técnicos

Arquivos alterados:

- **`src/pages/MonitorUsuariosSeniorPage.tsx`** (única página tocada na lógica):
  - Novo estado `connectionStatus: { kind: 'idle' | 'loading' | 'online' | 'offline' | 'unauthorized' | 'not_found' | 'server_error', message?, statusCode?, timestamp? }`.
  - Refatorar `load()` para classificar o erro usando os campos já expostos por `src/lib/api.ts`: `err.statusCode` (0 = rede), `err.isNetworkError`, `err.message` (procurar `ERR_NGROK_3200`, `Failed to fetch`, `NetworkError`, `timeout`).
  - Auto-refresh: quando offline, **pausar** o contador automático para não martelar o servidor caído (só voltar a contar após `Tentar novamente` bem-sucedido). Mantém o switch funcional.
  - Novo handler `testHealth()`: usa `fetch` direto em `${getApiUrl()}/health` com `ngrok-skip-browser-warning: true`, `signal: AbortSignal.timeout(8000)`.
  - Novo handler `saveApiUrl(novaUrl)`: `supabase.from('app_settings').upsert({ key: 'erp_api_url', value })` + `setApiBaseUrl()` + `testHealth()` + `load()`.

- **`src/components/erp/BackendStatusCard.tsx`** (novo, ~120 linhas, reutilizável): recebe `status`, `apiUrl`, `onTest`, `onChangeUrl`, `onRetry` e renderiza o `Alert` colorido com botões. Usa apenas tokens semânticos (`destructive`, `warning`, `success` via `Badge`/`Alert variant`); sem cor hardcoded.

- **`src/components/erp/UpdateApiUrlDialog.tsx`** (novo, ~70 linhas): `Dialog` com um campo de URL, salvar e teste automático. Reaproveitado se necessário em outras telas no futuro.

Sem mudanças no banco, sem novas RLS, sem edge functions.

## Comportamento da classificação de erro

```text
err.isNetworkError && /ERR_NGROK_3200/i        → kind: offline, "Túnel ngrok offline..."
err.isNetworkError                              → kind: offline, "Backend ERP offline..."
err.statusCode === 401                          → kind: unauthorized
err.statusCode === 404                          → kind: not_found
err.statusCode >= 500                           → kind: server_error
status 200 + array vazio                        → kind: online (tabela mostra "Nenhuma sessão encontrada")
status 200 + dados                              → kind: online
```

## Fora de escopo

- Não vamos alterar `src/lib/api.ts` (a classificação acontece na página, usando os campos já existentes).
- Não vamos mexer em outras páginas que também consomem a ERP API (essas continuam usando `ErpConnectionAlert`). Se você quiser que esse novo card substitua o `ErpConnectionAlert` em todas as telas, é um passo seguinte.
