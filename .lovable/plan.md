## Objetivo
Adicionar 2 novos blocos prontos ao BI Comercial inspirados na referência:
1. **Resumo Faturamento** — card único com Realizado / Meta / Diferença empilhados (3 valores grandes com rótulo acima).
2. **Atingimento (Gauge)** — gauge semicircular vermelho→amarelo→verde com o `% Atingimento` abaixo.

Ambos consomem KPIs já calculados no `ComercialPage` (`faturamento`, `meta`, `diferenca`, `pct_atingimento`) — sem chamadas novas ao backend.

## Mudanças

### 1. Novo componente `src/components/bi/kpis/KpiTriStackCard.tsx`
Card com header opcional e 3 blocos verticais `{label, value, format, color?}`. Usa tokens semânticos; `data-widget-value` no valor principal (já compatível com a personalização de cor).

### 2. Novo componente `src/components/bi/charts/GaugeAchievementCard.tsx`
Wrapper sobre o `GaugeChartCard` existente, fixando gradiente vermelho→amarelo→verde (faixas 0-60 / 60-90 / 90-120) e rótulo grande do percentual abaixo do arco. Aceita `value` (%) e `title`.

### 3. `src/lib/bi/comercialWidgetCatalog.ts`
Adicionar dois novos tipos:
- `'resumo-faturamento'` — `kind:'kpi'`, sem variantes (single shape), `libraryComponentIds: []` (não substituível).
- `'gauge-atingimento'` — `kind:'kpi'`, sem variantes, `libraryComponentIds: []`.

### 4. `src/pages/bi/ComercialPage.tsx`
- No `renderWidget` (switch por `type`), adicionar branches para `resumo-faturamento` (renderiza `KpiTriStackCard` com Realizado=`kpis.faturamento`, Meta=`kpis.meta`, Diferença=`kpis.diferenca`) e `gauge-atingimento` (renderiza `GaugeAchievementCard` com `kpis.pct_atingimento`).
- Click em qualquer um abre `openDetalhes('todas', title)` (consistente com KPIs atuais).
- Ambos respeitam loading / erro do `qKpis`.

### 5. Catálogo "Adicionar bloco"
O dialog `AddBiWidgetDialog` lista o catálogo automaticamente; basta os novos types existirem em `COMERCIAL_WIDGETS` para aparecerem na seção "KPIs".

### 6. Estilo de personalização (cor título / resultado)
Os novos componentes usam `CardTitle` e `data-widget-value` nos valores principais, então o WidgetTitleStyle já funciona neles sem mudanças adicionais. No `KpiTriStackCard` os 3 valores recebem `data-widget-value` para herdarem a cor.

## Critérios de aceitação
- Em **Editar → Adicionar bloco** aparecem "Resumo Faturamento" e "Atingimento (Gauge)".
- Resumo Faturamento mostra os 3 valores grandes empilhados com rótulos `Realizado / Meta / Diferença`.
- Atingimento exibe o gauge semicircular colorido com o percentual abaixo.
- Personalização de cor (título + resultado) funciona nos dois.

## Fora de escopo
- Configuração avançada de variantes (são blocos fixos).
- Substituição via Biblioteca BI.
- Edição das faixas do gauge.
