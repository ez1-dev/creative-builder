

# Corrigir "Failed to fetch" com ngrok — Header + CORS

## Problema
O ngrok gratuito exibe uma página de aviso (interstitial) para requisições que não incluem o header `ngrok-skip-browser-warning`. Isso causa "Failed to fetch" mesmo com a URL correta configurada.

## Solução

### 1. Adicionar header `ngrok-skip-browser-warning` em todas as requisições
**Arquivo:** `src/lib/api.ts`

- No método `request()`, adicionar o header `ngrok-skip-browser-warning: true` quando a URL contiver `ngrok`
- No método `login()`, adicionar o mesmo header no `fetch`
- No health check do `LoginPage.tsx`, adicionar o header no `fetch` de verificação

### 2. Garantir que o health check também use o header
**Arquivo:** `src/pages/LoginPage.tsx`
- No `checkApi`, adicionar o header `ngrok-skip-browser-warning` no fetch

## Resumo
| Arquivo | Mudança |
|---|---|
| `src/lib/api.ts` | Header `ngrok-skip-browser-warning` no `request()` e `login()` |
| `src/pages/LoginPage.tsx` | Header no health check |

