## Problema

O gráfico IA do BI Comercial retorna "Sem dados" mesmo havendo registros na base (2854 em `bi_faturamento`, 875 em `v_bi_faturamento_comercial`, com PEÇAS/SERVIÇOS/MÁQUINAS). Causa provável: a chamada para `POST /api/bi/comercial/ia-grafico` está sem `anomes_ini`/`anomes_fim` (ou enviando vazio), e o diagnóstico mostrado quando vem `series: []` não expõe o período de fato usado.

## Alterações (somente frontend)

### 1. `src/lib/bi/iaChartApi.ts` — `executarGraficoIA`

- Normalizar `filtrosBase` antes de montar o body:
  - `anomes_ini`: usar `filtros.anomes_ini`; se vazio/`null`/`undefined`, fallback `"202601"`.
  - `anomes_fim`: usar `filtros.anomes_fim`; se vazio, fallback `"202606"`.
  - `unidade_negocio`: manter regra atual (CONSOLIDADO quando prompt diz total/geral/consolidado ou não menciona unidade; GENIUS / ESTRUTURAL ZORTEA quando explícito).
- Sempre incluir `anomes_ini` e `anomes_fim` no body, mesmo que venham só do fallback.
- Demais chaves do `filtrosBase` continuam sendo repassadas (drills etc.).

### 2. `src/components/bi/ai/AiChartGenerator.tsx` — `renderDiagnostico`

Ampliar o card de diagnóstico exibido quando `series.length === 0` para mostrar:

- `anomes_ini` e `anomes_fim` (do `diagnostico.periodo` com fallback para os filtros enviados).
- `unidade_negocio` (de `diagnostico` com fallback para `result.filtros`).
- `dimensao` (de `diagnostico` com fallback para `result.dimensao`).
- `qtd_linhas_base` (mapear `diagnostico.linhas_view`).
- `qtd_linhas_filtradas` (novo campo opcional `diagnostico.linhas_filtradas` — se ausente, omitir).
- `qtd_categorias` (novo campo opcional `diagnostico.qtd_categorias` — se ausente, derivar de `result.series?.length`).
- Demais filtros aplicados (continua).

Tudo defensivo com fallback `?? '—'` e sem quebrar quando o backend ainda não devolver os novos campos.

### 3. `src/lib/bi/iaChartApi.ts` — tipo `AiChartDiagnostico`

Adicionar campos opcionais para suportar a UI:

```ts
linhas_filtradas?: number;
qtd_categorias?: number;
```

Mantidos opcionais para compatibilidade com o backend atual.

## Não escopo

- Não alterar a edge function `bi-ia-chart` nem o contrato em `docs/backend-bi-ia-grafico.md` (regras de `categoria_custom`, normalização SQL `PE%` / `SERV%` e fallback `CONSOLIDADO` já estão documentadas e implementadas).
- Não alterar lógica de drill, layout do dashboard ou outras telas.

## Critério de aceite

- Body enviado para `/api/bi/comercial/ia-grafico` sempre contém `anomes_ini` e `anomes_fim` (com fallback `202601`/`202606`).
- Para o prompt de "rosca Peças e Serviços", o body inclui `unidade_negocio: "CONSOLIDADO"` e o gráfico exibe PEÇAS e SERVIÇOS no período do dashboard.
- Quando `series` vier vazio, o card de diagnóstico mostra `anomes_ini`, `anomes_fim`, `unidade_negocio`, `dimensao`, `qtd_linhas_base`, `qtd_linhas_filtradas` (quando disponível) e `qtd_categorias`.
