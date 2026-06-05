## Correção do 401 na Edge Function `bi-ia-chart`

### Problema
A chamada para `${FASTAPI_BASE_URL}/api/bi/comercial/detalhes` agora chega no backend (URL correta), mas o FastAPI rejeita com **HTTP 401 Unauthorized** porque a Edge Function não envia os headers de autenticação esperados (`x-cron-secret` e `Authorization: Bearer ...`).

Hoje, em `supabase/functions/bi-ia-chart/index.ts`, a função `fetchDetalhes` envia apenas:
```ts
headers: { "ngrok-skip-browser-warning": "true", "Accept": "application/json" }
```
Faltam as credenciais do `CRON_SECRET`.

### Alteração (escopo mínimo)

**Arquivo:** `supabase/functions/bi-ia-chart/index.ts`  
**Função:** `fetchDetalhes(filtros)`

1. Ler `CRON_SECRET` do ambiente:
   ```ts
   const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
   ```
2. Se `CRON_SECRET` estiver vazio, retornar erro amigável (`code: "MISSING_CRON_SECRET"`) antes de fazer a request — evita bater no backend com header vazio e tomar 401 mascarado.
3. Adicionar os headers de auth na chamada `fetch`:
   ```ts
   headers: {
     "Content-Type": "application/json",
     "Accept": "application/json",
     "ngrok-skip-browser-warning": "true",
     "x-cron-secret": cronSecret,
     "Authorization": `Bearer ${cronSecret}`,
   }
   ```
4. Tratar explicitamente `resp.status === 401` com mensagem amigável (`code: "FASTAPI_UNAUTHORIZED"`, "FastAPI rejeitou credenciais — verifique CRON_SECRET").
5. Redeploy automático da função `bi-ia-chart` após a edição.

### Validação de Secrets
Conferir via `secrets--fetch_secrets` se já existem:
- `FASTAPI_BASE_URL`
- `CRON_SECRET`

Se algum estiver faltando, solicitar via `secrets--add_secret`. Os valores exatos (`https://api-erp-renato.ngrok.app` e `123456`) **não** vão no código — ficam apenas nos secrets do Cloud.

### Teste após deploy
Chamar `supabase--curl_edge_functions` em `/bi-ia-chart` com um prompt simples (ex.: "Top 5 revendas por faturamento") e validar:
- Status 200
- Payload contém `series` e `total`
- Sem erro 401 nos logs (`supabase--edge_function_logs`)

### Critério de aceite
- `bi-ia-chart` não retorna mais 401 ao chamar `/api/bi/comercial/detalhes`.
- O componente "Gerar gráfico com IA" no BI Comercial renderiza o gráfico.
- Logs da edge function mostram a request bem-sucedida.

### Fora de escopo
- Nenhuma mudança no frontend (`AiChartGenerator.tsx`, `iaChartApi.ts`).
- Nenhuma mudança em outras edge functions ou no schema do banco.
