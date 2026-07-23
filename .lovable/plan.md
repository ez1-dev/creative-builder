# Análise (IA) do Fluxo de Caixa via Lovable AI

Hoje a narrativa é gerada pelo backend FastAPI (`/api/contabil/fluxo-caixa/analise/stream`) e está batendo no limite de tokens do modelo do servidor — daí o alerta "Resposta cortada pelo limite do modelo". Vamos passar a gerar essa análise com a IA do Lovable (Lovable AI Gateway), com uma janela de saída maior, mantendo o mesmo contrato SSE (`event: meta | delta | done | erro`) para não mexer no restante da tela.

## O que muda

1. **Nova edge function `fluxo-caixa-analise-ia`** (`supabase/functions/fluxo-caixa-analise-ia/index.ts`)
   - Recebe os mesmos parâmetros da UI (`anomes_ini`, `anomes_fim`, `codemp`, `codfil`, `horizonte_dias`, `granularidade`, `data_base`, `saldo_inicial`).
   - Busca no backend FastAPI, em paralelo, os três payloads que a página já usa: `projecao`, `direto`, `indireto` (repassando `Authorization` e `ngrok-skip-browser-warning`). Assim a IA analisa exatamente o que o usuário está vendo.
   - Monta um prompt em PT-BR de "analista de tesouraria" pedindo seções fixas em markdown (Resumo, Projeção & saldo mínimo, Vencidos, DFC Direto, DFC Indireto, Riscos, Recomendações) e chama o Lovable AI Gateway com `streamText` (modelo `google/gemini-2.5-pro`, `providerOptions.lovable` para folga de saída).
   - Adapta o stream do AI SDK para o mesmo formato SSE já consumido pela UI: emite `event: meta` (com `modelo` e período), vários `event: delta` (`{ text }`) e um `event: done` (`{ chars, finish_reason }`); em falha, `event: erro`.
   - CORS liberado e `verify_jwt = false` (só usa o Bearer do usuário para autenticar contra o FastAPI); `LOVABLE_API_KEY` fica só no servidor.

2. **`src/lib/contabil/fluxoCaixaApi.ts`**
   - `streamFluxoCaixaAnalise` passa a fazer `fetch` na URL da edge function (`${VITE_SUPABASE_URL}/functions/v1/fluxo-caixa-analise-ia`) com `Authorization: Bearer <VITE_SUPABASE_PUBLISHABLE_KEY>` + `x-user-authorization: Bearer <token do FastAPI>` (o que já é injetado por `buildContabilRequest`), body JSON com os parâmetros. O parser SSE existente é reaproveitado sem mudanças.
   - `downloadFluxoCaixaExcel` continua no FastAPI (sem alteração).

3. **`FluxoCaixaPage.tsx`** — nenhuma mudança de UI. O card "Análise (IA)", o botão "Gerar novamente", a detecção de truncamento (`narrativaTruncada` + `finish_reason`) e o markdown formatado continuam funcionando exatamente como estão; apenas a origem do stream muda.

4. **`supabase/config.toml`** — adiciona `[functions.fluxo-caixa-analise-ia] verify_jwt = false`.

## Detalhes técnicos

- Provider Lovable AI seguindo o padrão da knowledge `ai-sdk-lovable-gateway` (`createOpenAICompatible`, header `Lovable-API-Key`, `X-Lovable-AIG-SDK`).
- Modelo padrão: `google/gemini-2.5-pro` (contexto grande, ideal para juntar Projeção + DFC Direto + Indireto). Saída ampla para evitar corte.
- Se a chave `LOVABLE_API_KEY` não estiver provisionada, provisiono via ferramenta antes de deploy.
- O `finish_reason` emitido pelo `event: done` mantém a heurística de truncamento; com Gemini 2.5 Pro + saída grande a expectativa é sempre `stop`.
- Erros do gateway (429 crédito/limite, 402 sem crédito, 5xx) são convertidos em `event: erro` com mensagem amigável e mostrados no alerta vermelho existente.

## Fora de escopo

- Migrar Indicadores Contábeis para a IA do Lovable (posso fazer em seguida se quiser).
- Alterar o endpoint de Excel — segue no FastAPI.
