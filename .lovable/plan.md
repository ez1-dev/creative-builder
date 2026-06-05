
## Diagnóstico

Os logs da Edge Function `bi-ia-chart` mostram a causa raiz:

```
bi-ia-chart error: Invalid URL: '123456/api/bi/comercial/detalhes'
```

O secret `FASTAPI_BASE_URL` está configurado com o valor `123456` em vez da URL pública do FastAPI (ex.: `https://xxxx.ngrok-free.app`). Como `bi-ia-chart` apenas faz `new URL(base + "/api/...")`, qualquer string que não seja URL absoluta quebra a função, ela lança erro e o retorno vira HTTP 500 — daí o "Edge Function returned a non-2xx status code" no frontend.

A função `programacao-sync-fila` já tem validação rica desse mesmo secret. A `bi-ia-chart` não tem.

## O que será feito

### 1. Corrigir o secret `FASTAPI_BASE_URL` (ação do usuário)

O secret precisa apontar para a URL pública da FastAPI, exatamente como nas outras funções que já funcionam. Vou solicitar o valor correto via `add_secret` para reconfigurar.

### 2. Endurecer a Edge Function `bi-ia-chart`

Adicionar a mesma validação usada em `programacao-sync-fila` antes de montar a URL:

- secret ausente → `{ error: "Backend não configurado: defina FASTAPI_BASE_URL nos secrets.", code: "MISSING_BASE_URL" }`
- não começa com `http://` ou `https://` → `INVALID_BASE_URL` com a string recebida
- termina com `/` → `INVALID_BASE_URL`
- aponta para `localhost` / `127.0.0.1` → `LOCALHOST_NOT_ALLOWED`
- igual a `CRON_SECRET` → mensagem específica indicando troca de secrets

Em vez de devolver HTTP 500, a função passa a devolver **HTTP 200 com `{ error, code, fallback: true }`** para erros de configuração, evitando o crash genérico no frontend (padrão já usado em outras funções do projeto). Erros de runtime (LLM, fetch FastAPI) continuam com status apropriado mas sempre com CORS e JSON.

### 3. Tratar a mensagem no frontend

Em `src/lib/bi/iaChartApi.ts` e `src/components/bi/ai/AiChartGenerator.tsx`:

- Quando a resposta vier com `error` (mesmo status 200), exibir um toast com a mensagem amigável ("Backend não configurado…") em vez do erro técnico atual.
- Logar `code` no console para diagnóstico.

## Arquivos a alterar

- `supabase/functions/bi-ia-chart/index.ts` — validação de `FASTAPI_BASE_URL` + erros estruturados
- `src/lib/bi/iaChartApi.ts` — propagar `error/code` da resposta
- `src/components/bi/ai/AiChartGenerator.tsx` — toast com mensagem amigável

## Fora de escopo

- Reescrever a integração com o FastAPI ou a lógica de agregação (`fetchDetalhes`, `aggregate`)
- Mudanças visuais nos gráficos ou no editor visual

## Pergunta antes de implementar

Qual é a URL pública atual da FastAPI (ngrok) que devo gravar em `FASTAPI_BASE_URL`? Vou pedi-la via secret na hora de aplicar o plano.
