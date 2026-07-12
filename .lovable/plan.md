
## Objetivo

Separar as duas APIs em bases independentes, com clientes HTTP, health checks, telemetria e configuração próprios, para que a indisponibilidade da API contábil deixe de derrubar o ERP e vice-versa.

- **API principal do ERP:** `VITE_ERP_API_URL` → padrão `https://api-erp-renato.ngrok.app`, health em `/health`.
- **API contábil / DRE:** `VITE_CONTABIL_API_URL` → padrão `https://dreconfiguravel.ngrok.app`, health em `/api/contabil/health`.

## Mudanças

### 1. Nova base contábil e cliente dedicado (`src/lib/contabil/contabilApi.ts` – novo)

Arquivo novo, isolado do `ApiClient` do ERP. Expõe:

- `getContabilBaseUrl()` — resolve nesta ordem: valor salvo em `app_settings.contabil_api_url` (via `setContabilBaseUrl`, chamado no bootstrap do `AuthContext`), `import.meta.env.VITE_CONTABIL_API_URL`, fallback `https://dreconfiguravel.ngrok.app`. Nunca inclui `/api/contabil`.
- `setContabilBaseUrl(url)` — grava em memória (mesmo padrão do `setApiBaseUrl`).
- `contabilApiFetch<T>(endpoint, options?)` — anexa `Authorization: Bearer <token>` (reusa `api.getToken()`), header `ngrok-skip-browser-warning`, `Content-Type: application/json`, timeout de **15 s** via `AbortController`. Em erro, lança `Error` com `statusCode`, `dreKind` (`api_offline` / `timeout` / `auth` / `not_found` / `functional`), `urlTested`, `bodyText`.
- Métodos `contabilApi.get/post/put/delete` no mesmo formato do `ApiClient`, para permitir substituição drop-in.
- `pingContabilHealth()` — `GET /api/contabil/health` com timeout de 15 s, retorna `{ ok, status, urlTested, details }`.

### 2. Redirecionar chamadas contábeis

- `src/lib/contabil/dreStudioApi.ts` — trocar `import { api }` por `import { contabilApi as api }`. Nenhuma outra alteração — as constantes de rota (`/api/contabil/...`) já batem.
- `src/lib/bi/dreConfiguravelApi.ts` — mesma troca (usa `/api/contabil/realizado/resumo` e `/api/contabil/modelos`).
- `src/lib/bi/dreErrors.ts` — `useDreApiHealth` passa a apontar para `getContabilBaseUrl() + /api/contabil/health` em vez de `getApiUrl() + /openapi.json`.
- `src/hooks/contabil/useDreStudio.ts` — o hook `useDreStudioHealth` continua chamando `fetchDreHealth()` do `dreStudioApi`, que já vai pelo novo cliente. Ajustar apenas o `queryKey` para incluir a base contábil (invalidação ao trocar URL).

### 3. Banner contábil (`src/components/dre-studio/DreHealthBanner.tsx`)

Passar a exibir, em caso de falha, um bloco técnico com **URL testada**, **status HTTP** (ou `timeout`/`network`) e **detalhes** retornados. Textos:

- `api_offline` / `timeout` / rede → “API contábil indisponível”.
- `404` / `not_found` → “Endpoint /api/contabil/health não encontrado — verifique se o backend contábil está publicado”.
- `500` → mensagem do payload.

Mantém o caso `erp_offline` (banco Senior) que vem do payload do próprio `/api/contabil/health`.

### 4. Bootstrap (`src/contexts/AuthContext.tsx`)

Ampliar o `loadCredentials` para ler também `contabil_api_url` de `app_settings` e chamar `setContabilBaseUrl(...)`. Não altera o carregamento de `erp_api_url`.

### 5. Configurações (`src/pages/ConfiguracoesPage.tsx`)

Na aba onde hoje há a URL da API ERP, adicionar um **segundo bloco** para a API contábil:

- Campo “URL da API contábil / DRE” + botões **Salvar** e **Testar conexão** independentes.
- Estado `ApiStatus = { erp, contabil }` com valores `online | offline | checking`.
- Botão “Testar conexão” do ERP: `GET ${ERP}/health` com timeout 15 s.
- Botão “Testar conexão” da contábil: `pingContabilHealth()`.
- Em caso de erro, exibir card com URL testada, status HTTP e detalhes brutos (sem trocar por mensagem genérica).
- Persistência em `app_settings.contabil_api_url` (upsert) + reset para padrão (delete).

### 6. Sem mudança

- `ApiClient` principal (`src/lib/api.ts`) continua exatamente como está. Nenhum módulo não-contábil é afetado.
- Nenhum mock, nenhum dado fictício, nenhuma remoção de endpoint real. Autenticação, permissões e layout intactos.
- Nenhuma referência a `localhost` / `127.0.0.1` é adicionada — os defaults são os domínios ngrok informados.

### 7. Variáveis de ambiente

`.env` é auto-gerado e não pode ser tocado. Documentar no relatório final (e via defaults no código) que o operador pode definir `VITE_ERP_API_URL` e `VITE_CONTABIL_API_URL` em builds locais; em produção a URL contábil também pode ser editada pela tela Configurações e sobrescreve o env.

## Arquivos afetados

- **novo** `src/lib/contabil/contabilApi.ts`
- edit `src/lib/contabil/dreStudioApi.ts` (troca de import)
- edit `src/lib/bi/dreConfiguravelApi.ts` (troca de import)
- edit `src/lib/bi/dreErrors.ts` (health aponta para contábil)
- edit `src/hooks/contabil/useDreStudio.ts` (queryKey inclui base contábil)
- edit `src/components/dre-studio/DreHealthBanner.tsx` (detalhes técnicos)
- edit `src/contexts/AuthContext.tsx` (carrega `contabil_api_url`)
- edit `src/pages/ConfiguracoesPage.tsx` (segundo campo + teste independente)

## Verificação

- `tsgo` nos arquivos alterados.
- Playwright: abrir `/configuracoes`, disparar “Testar conexão” em cada API, capturar screenshot do card de erro com URL/status/detalhes; abrir `/contabilidade/dre-studio/modelos` e conferir que o banner mostra dados técnicos quando a API contábil responder 404/timeout.
