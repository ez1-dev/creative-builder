## Objetivo
Resolver o erro da Edge Function `bi-ia-chart` causado pelo secret `FASTAPI_BASE_URL` estar com valor inválido (`123456`, igual ao `CRON_SECRET`), e garantir mensagem amigável quando a FastAPI estiver fora do ar.

## Passos

### 1. Atualizar o secret `FASTAPI_BASE_URL`
Abrir o formulário seguro de secrets para você colar o valor correto:
- `FASTAPI_BASE_URL` = `https://api-erp-renato.ngrok.app` (URL pública da FastAPI, sem `/` no final)

O secret `CRON_SECRET` permanece com seu token (`123456`) e não será alterado.

Observação: o secret será atualizado via tool `update_secret` — você confirma o valor no formulário, não há necessidade de mexer no painel manualmente. A Edge Function relê o secret a cada invocação, então não precisa redeploy só para isso (mas farei um redeploy mesmo assim para garantir).

### 2. Melhorar tratamento de erro de rede no `bi-ia-chart`
A validação atual já cobre secret inválido. Falta tratar o caso "FastAPI fora do ar / inacessível":
- Capturar `TypeError` / `AbortError` no `fetch` para `${baseUrl}/api/bi/comercial/detalhes`
- Retornar HTTP 200 com `{ error: "Não foi possível conectar à FastAPI", code: "FASTAPI_UNREACHABLE", fallback: true }`
- Frontend (`AiChartGenerator`) já mostra `e.message` no toast, então a mensagem aparecerá direto.

### 3. Redeploy da Edge Function
Após a edição, fazer redeploy de `bi-ia-chart`.

### 4. Validação
Pedir para você testar no BI Comercial com o prompt:
> "Crie um gráfico de rosca mostrando o faturamento da Genius separado por Peças e Serviços com percentual."

Critérios de aceite:
- Sem erro de configuração de secret
- Edge Function chama `https://api-erp-renato.ngrok.app/api/bi/comercial/detalhes`
- Gráfico de rosca renderiza na tela
- Se a FastAPI cair, toast mostra "Não foi possível conectar à FastAPI"

## Arquivos alterados
- `supabase/functions/bi-ia-chart/index.ts` — tratar erro de rede do `fetch` para FastAPI

## Secrets alterados
- `FASTAPI_BASE_URL` (via formulário seguro)
