
## Sugestão de política Min/Max via IA (baseada em movimentação)

Adicionar um botão **"Sugerir com IA"** na tela `/sugestao-min-max` que envia a movimentação histórica já carregada para a Lovable AI, recebe sugestões de mínimo/máximo/ponto de pedido/lote por item com justificativa, popula a tabela e permite salvar em `USU_EST_POLITICA` pelo fluxo já existente.

### Fluxo do usuário

1. Usuário aplica filtros e clica **Consultar movimentação** (já existe).
2. Clica no novo botão **Sugerir com IA** (Sparkles roxo, ao lado de "Gerar sugestão").
3. Toast "Analisando movimentação com IA..." aparece; resposta chega em poucos segundos.
4. Tabela é repopulada com `minimo_sugerido`, `maximo_sugerido`, `ponto_pedido`, `lote_compra`, `consumo_medio`, `lead_time_dias` e nova coluna **"Justificativa IA"**.
5. KPIs recalculam automaticamente (fallback agregando `data.dados` já existe).
6. Usuário clica **Salvar política** (fluxo existente, sem alteração) — grava em `USU_EST_POLITICA` com `obs = "Sugestão IA: <justificativa>"`.

### Backend — Edge Function nova

**`supabase/functions/sugestao-minmax-ia/index.ts`** (verify_jwt = true, padrão)

- Recebe `{ movimentacoes: [...], filtros: {...} }` do frontend (linhas já carregadas pelo `/api/estoque/movimentacao`).
- Agrupa por `(codemp, codpro, codder, coddep)` no servidor antes de mandar para IA, para reduzir tokens (entrega resumo por item: total entradas, total saídas, nº movimentos, primeira/última data, saldo atual, fornecedor recorrente).
- Chama **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`) com:
  - Modelo padrão: `google/gemini-3-flash-preview` (rápido, barato, suficiente para a tarefa).
  - **Tool calling** com schema `sugerir_politicas` retornando array de itens `{ codemp, codpro, codder, coddep, consumo_diario_medio, consumo_mensal, lead_time_dias, estoque_seguranca, minimo_sugerido, maximo_sugerido, ponto_pedido, lote_compra, justificativa }` — garante saída estruturada sem parse frágil.
  - System prompt em PT-BR explicando as fórmulas base (mínimo = consumo_diário × lead_time + segurança; máximo = mínimo + lote; ponto_pedido = mínimo) e pedindo para ajustar conforme sazonalidade/variabilidade observada nas movimentações.
- Trata 429 (rate limit) e 402 (créditos) retornando JSON com mensagem amigável.
- Retorna `{ dados: [...], resumo: { saldo_atual_total, consumo_90d, consumo_180d, lead_time_medio_dias, minimo_sugerido_total, maximo_sugerido_total }, total_registros, total_paginas: 1 }` — mesmo shape de `SugestaoPoliticaResponse`, drop-in na tabela existente.

**`supabase/config.toml`** — adicionar bloco para a função nova (sem alterar outras), `verify_jwt = true`.

### Frontend

**`src/pages/SugestaoMinMaxPage.tsx`**
- Novo botão `Sugerir com IA` (ícone `Wand2`, variant `default`, cor accent) entre "Gerar sugestão" e "Salvar política".
- Habilitado apenas quando `mode === 'movimentacao'` e `data?.dados?.length > 0` (precisa ter movimentação carregada).
- Handler `sugerirComIa()`:
  - `setLoading(true)`, toast "Analisando movimentação com IA...".
  - `supabase.functions.invoke('sugestao-minmax-ia', { body: { movimentacoes: data.dados, filtros: filters } })`.
  - Trata erros 429/402 com toast específico.
  - Em sucesso: `setData(result)`, `setMode('sugestao')`, toast "IA sugeriu política para N item(ns)".
- Adicionar coluna **"Justificativa IA"** (render apenas quando `r.justificativa` existir; caso contrário "-"), entre `maximo_sugerido` e `status`. Coluna ocupa largura mínima com `truncate` + `title` para tooltip nativo.
- `salvarPolitica` existente já envia `obs` — anexar `justificativa` quando presente: `obs: r.justificativa ? \`Sugestão IA: ${r.justificativa}\` : 'Sugestão automática'`.

**`src/lib/api.ts`** — adicionar campo opcional `justificativa?: string` ao tipo de linha de `SugestaoPoliticaResponse` (apenas tipagem, sem mudança de runtime).

### Memória
Atualizar `mem://features/sugestao-minmax` adicionando o fluxo IA (edge function `sugestao-minmax-ia`, modelo Gemini Flash, tool calling com schema `sugerir_politicas`, coluna Justificativa). Sem nova entrada no índice (extensão da memória existente).

### Sem alterações em
Autenticação, `EstoqueMinMaxPage`, sidebar, rotas, permissões (rota `/sugestao-min-max` já liberada), `PageHeader`, demais módulos. Endpoints FastAPI do ERP permanecem inalterados — IA é puramente uma camada adicional opcional.

### Observação
A IA roda sobre dados **já carregados no frontend** (resposta do `/api/estoque/movimentacao`), então não depende de novo endpoint no FastAPI. Funciona imediatamente após aprovação do plano. Custo por chamada típica (~50 itens agrupados): poucos centavos com Gemini Flash.
