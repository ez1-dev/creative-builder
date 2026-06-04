
## Objetivo

Adicionar no topo do BI Comercial (e replicar em BI Faturamento) um campo de texto + botão **"Gerar gráfico com IA"** que interpreta um pedido em linguagem natural, agrega os dados e renderiza um gráfico (rosca, pizza, barras ou linha) com legenda, tooltip, percentual e drill ao clicar na fatia.

## Arquitetura

```text
[Usuário] → input texto + botão
    ↓
Edge Function `bi-ia-chart` (Lovable AI Gateway, google/gemini-3-flash-preview)
   1. Interpreta o prompt → JSON estruturado (tipo, métrica, dimensão, filtros)
   2. Chama FastAPI /api/bi/comercial/detalhes (escopo=todas, mesmas regras do BI)
   3. Agrega no servidor por `dimensao` somando `metrica` → series[]
   4. Devolve { titulo, subtitulo, tipo_grafico, metrica, total, series:[{label,valor,percentual}], dimensao, filtros }
    ↓
Frontend: AiChartCard renderiza Donut/Pie/Bar/Line já existentes (DonutChartCard etc.)
   + onClick na fatia → DrillSheet existente filtrando por (dimensao=label)
```

Tudo segue o padrão já usado pelo `biblioteca-bi-suggest` (Edge Function + Lovable AI) e a biblioteca BI existente.

## Backend

**Nova Edge Function** `supabase/functions/bi-ia-chart/index.ts` (verify_jwt=false, CORS padrão):

- Recebe `{ prompt, filtros_base }` (filtros do header do BI: unidade, período, etc.)
- Passo 1 — chama Lovable AI (`google/gemini-3-flash-preview`) com `Output.object` Zod schema:
  ```ts
  {
    titulo: string, subtitulo: string,
    tipo_grafico: 'donut'|'pie'|'bar'|'line',
    metrica: 'faturamento'|'impostos'|'devolucao'|'custo'|'quantidade'|'numero_clientes'|'numero_vendas',
    dimensao: 'unidade_negocio'|'cd_origem'|'cd_estado'|'cd_cliente'|'cd_tns'|'cd_rev_pedido'|'anomes_emissao',
    filtros_extras: Record<string,string>,
    top_n: number
  }
  ```
  System prompt em PT-BR explicando catálogo de métricas/dimensões e regras (GENIUS=503, ESTRUTURAL ZORTEA=502, "peças vs serviços" → dimensao `cd_origem`).
- Passo 2 — chama FastAPI existente `${FASTAPI_BASE_URL}/api/bi/comercial/detalhes` com filtros mesclados (escopo=`todas`, limit alto) e header `ngrok-skip-browser-warning: true`.
- Passo 3 — agrega no Deno: agrupa por `dimensao`, soma a coluna mapeada (`vl_bruto`,`vl_impostos`,`vl_devolucao`,`qtd_produtos`, `count(distinct cd_cliente)`, `count(distinct cd_nf+cd_serie+cd_filial)`), ordena desc, corta em `top_n` (default 10, agrupando resto em "Outros" no donut/pie).
- Passo 4 — devolve o payload final no formato pedido.
- Erros 429/402 do AI Gateway repassados como mensagem clara.

## Frontend

**Novo client API** `src/lib/bi/iaChartApi.ts`:
- `gerarGraficoIA(prompt, filtrosBase) → AiChartResult` via `supabase.functions.invoke('bi-ia-chart')`.
- Types: `AiChartResult`, `AiChartSerie`.

**Novo componente** `src/components/bi/ai/AiChartGenerator.tsx`:
- Card colapsável no topo da página (estilo do `ComponentSuggester`): `<Sparkles/> Gerar gráfico com IA`.
- Textarea + botão "Gerar gráfico" (loading, exemplos clicáveis).
- Recebe `filtrosBase` (filtros atuais da página) e `onDrill(dimensao, label) => void`.
- Quando há resultado, renderiza abaixo o gráfico usando os cards já existentes:
  - `donut` → `DonutChartCard` com `centerValue={total}` e `valueFormatter` por métrica.
  - `pie` → `PieChartCard`.
  - `bar` → `BarChartCard` (ou `HorizontalBarChartCard` se >8 itens).
  - `line` → `LineChartCard`.
- Passa `visualConfig` com `legend.visible`, `tooltip.visible`, `dataLabels` (percentual em donut/pie).
- `onItemClick` da fatia/barra chama `onDrill(dimensao, label)`.
- Botão "Limpar" / "Regerar".

**Integração nas páginas**:
- `src/pages/bi/ComercialPage.tsx`: inserir `<AiChartGenerator filtrosBase={filters.base} onDrill={...} />` logo após o `FilterBar`. O `onDrill` aciona o `DrillSheet` já existente convertendo `dimensao→drill key` (mapa interno: `cd_estado→estado`, `cd_cliente→cliente`, `cd_origem→origem` etc.).
- `src/pages/bi/FaturamentoValidacaoPage.tsx`: mesmo componente, com filtros locais da página (somente leitura — sem drill se não houver suporte).

**Formatação**:
- Reusa `formatCurrency`, `formatNumber` de `@/components/bi`.
- Percentual no donut/pie via `visualConfig.dataLabels.format = 'percent'`.

## Segurança / Limites

- Edge Function valida prompt (Zod, max 1000 chars), exige sessão Supabase (verifica `Authorization` → `supabase.auth.getUser`).
- Lista de métricas/dimensões fechada (enum); qualquer valor fora cai em erro 400.
- Limite de `top_n` (1..30) e timeout 30s na chamada FastAPI.
- Sem SQL dinâmico — só chama endpoint existente `/api/bi/comercial/detalhes`.

## Entregáveis

1. `supabase/functions/bi-ia-chart/index.ts` (nova).
2. `src/lib/bi/iaChartApi.ts` (nova).
3. `src/components/bi/ai/AiChartGenerator.tsx` (nova).
4. Edits:
   - `src/pages/bi/ComercialPage.tsx` — montar o gerador + ligar ao DrillSheet.
   - `src/pages/bi/FaturamentoValidacaoPage.tsx` — montar o gerador (sem drill).
5. `docs/bi-ia-chart.md` — contrato da função + exemplos de prompts.

## Fora de escopo

- Persistir gráficos gerados no dashboard (pode vir depois via "Salvar como widget").
- Suporte a múltiplas métricas/séries (combo). Inicialmente 1 métrica × 1 dimensão.
- Tipos além de donut/pie/bar/line.
