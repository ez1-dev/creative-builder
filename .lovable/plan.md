## Situação atual

A URL-base já está configurada corretamente e nenhum código aponta para `api-erp-renato.ngrok.app/api/contabil/*`. Verificações:

- `src/lib/contabil/contabilApi.ts` → `DEFAULT_CONTABIL_URL = 'https://dreconfiguravel.ngrok.app'` (fallback quando `VITE_CONTABIL_API_URL` não está definido).
- `src/lib/contabilConfig.ts` → mesma URL como fallback.
- `.env` **não** define `VITE_CONTABIL_API_URL` → o default (`dreconfiguravel.ngrok.app`) é usado.
- Health check em `pingContabilHealth()` faz `GET {base}/api/contabil/health` → resolve para `https://dreconfiguravel.ngrok.app/api/contabil/health` ✅.
- API principal ERP continua em `https://api-erp-renato.ngrok.app` (via `VITE_ERP_API_URL` / `getApiUrl()`), sem chamadas contábeis.

## Plano

Uma única mudança defensiva para garantir que nenhum ambiente (preview, produção, futuras overrides) possa apontar a API contábil para `api-erp-renato.ngrok.app`:

1. **`src/lib/contabil/contabilApi.ts`** — em `getContabilBaseUrl()`, se `VITE_CONTABIL_API_URL` estiver definido apontando para o domínio `api-erp-renato.ngrok.app`, ignorar e usar o default `https://dreconfiguravel.ngrok.app`, emitindo `console.warn` uma vez. Mesma proteção em `setContabilBaseUrl()` (usado pela tela Configurações).

2. **`src/pages/ConfiguracoesPage.tsx`** — validar no submit do campo "API contábil": bloquear salvar se a URL contiver `api-erp-renato.ngrok.app`, com mensagem clara ("Use https://dreconfiguravel.ngrok.app — o domínio api-erp-renato não atende rotas /api/contabil").

3. **Verificação** — rodar `tsgo` e um Playwright rápido em `/configuracoes` + qualquer tela do DRE Studio para confirmar que o banner de health mostra `dreconfiguravel.ngrok.app` e status 200.

### Fora de escopo
Nenhuma mudança em `.env`, backend, autenticação, JWT, CORS, endpoints, hooks, ou na API principal do ERP.
