## Objetivo

Trocar a base padrão da API contábil de `dreconfiguravel.ngrok.app` (túnel morto) para `https://api-erp-renato.ngrok.app`, unificando todas as chamadas (contábil, RH, requisições) em um único backend.

## Alterações

### 1. `.env`
Adicionar/atualizar:
```
VITE_CONTABIL_API_URL=https://api-erp-renato.ngrok.app
```
`VITE_API_BASE_URL` já aponta para `api-erp-renato.ngrok.app` — manter.

### 2. `src/lib/contabil/contabilApi.ts`
- Trocar `DEFAULT_CONTABIL_URL` para `https://api-erp-renato.ngrok.app`.
- Remover as guard-rails `FORBIDDEN_CONTABIL_HOST` / `isForbiddenContabilUrl` / `warnForbiddenOnce` — eram para bloquear justamente esse domínio, agora oficial.
- Manter guard `isLegacyDreUrl` (porta `:8090`) e a verificação `.supabase.co`.
- Atualizar o comentário do topo do arquivo.

### 3. `src/lib/contabilConfig.ts`
Trocar fallback `https://dreconfiguravel.ngrok.app` → `https://api-erp-renato.ngrok.app`.

### 4. `src/lib/contabilStore.ts`
Atualizar o comentário do cabeçalho para refletir o novo domínio.

### 5. `src/pages/ConfiguracoesPage.tsx`
- Remover o bloqueio em `handleSaveContabilUrl` que rejeitava `api-erp-renato.ngrok.app` (linhas 321-324).
- Trocar o `placeholder` da linha 1700 para `https://api-erp-renato.ngrok.app`.

### 6. `docs/backend-dre-api-integrada.md`
Atualizar a referência do túnel oficial para `api-erp-renato.ngrok.app`.

## Pós-alteração

Reiniciar o dev server (Vite só lê `VITE_*` na boot). Validar em DevTools que chamadas `/api/contabil/*` batem em `api-erp-renato.ngrok.app` retornando 200 (ou 401 se o token expirou).

## Fora de escopo

- Não altero configuração salva em `app_settings.contabil_api_url` no Cloud — se algum usuário salvou o domínio antigo lá, precisa resetar via Configurações → "Restaurar padrão".
