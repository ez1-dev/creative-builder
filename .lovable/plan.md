# Arredondamento global de números no BI

Adicionar uma opção configurável por usuário ("Completo / Sem decimais / Abreviado") na **Biblioteca BI**, persistida no Cloud, com **override por página** no **BI Comercial**, afetando KPIs, eixos/labels de gráficos e tabelas.

## Comportamento esperado

3 modos aplicáveis a valores numéricos (R$ e quantidades):

| Modo | Exemplo (R$ 53.065.883,93) | Exemplo (5,2 mi unidades) |
|---|---|---|
| **Completo** (padrão atual) | R$ 53.065.883,93 | 5.234.123 |
| **Sem decimais** | R$ 53.065.884 | 5.234.123 |
| **Abreviado** | R$ 53,07 mi | 5,23 mi |

Aplica-se a:
- **KPIs** (Faturamento, Líquido, Ticket Médio, Meta, Diferença, etc.)
- **Eixos e tooltips de gráficos** (barras, linhas, donut, combo, área, ranking, mapa, treemap)
- **Tabelas** do dashboard

**Percentuais** (% Atingimento, gauge) **não** são afetados — sempre exibidos como hoje.

## Onde aparece o controle

1. **Biblioteca BI** (`/biblioteca-bi`) — toggle no header da página, persiste como **padrão global do usuário** no Cloud.
2. **BI Comercial** (`/bi/comercial`) — toggle adicional no header da página, sobrescreve o global apenas para essa página (também persistido).
3. Se o usuário não escolher nada, o padrão é **Completo** (comportamento atual).

## Arquitetura técnica

### Persistência (Cloud)

Adicionar coluna JSONB `bi_display_prefs` na tabela `user_preferences` (já existe e segue o padrão de `ai_assistant_prefs`). Migração simples:

```sql
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS bi_display_prefs jsonb NOT NULL DEFAULT '{}';
```

Estrutura do JSONB:

```json
{
  "global": "full" | "no-decimals" | "abbreviated",
  "pages": { "bi-comercial": "abbreviated" }
}
```

Novo hook `useBiDisplayPrefs` espelhando `useAiAssistantPrefs` (select + upsert com `onConflict: 'user_id'`). Helper `useRoundingForPage(pageKey)` resolve o modo efetivo (override da página → global → 'full').

### Propagação (React Context)

Novo `NumberFormatContext` (`src/contexts/NumberFormatContext.tsx`):
- Provider injeta `rounding` resolvido para a página atual.
- Hook `useNumberFormat()` consumido pelos componentes da biblioteca BI.

`ComercialPage` e `BiComponentsDemoPage` envolvem seu conteúdo com `<NumberFormatProvider rounding={...}>`.

### Formatadores

Em `src/components/bi/utils/formatters.ts`, adicionar wrappers que respeitam o modo:

- `formatCurrencyRounded(value, rounding)`
- `formatNumberRounded(value, rounding)`
- `formatByKindRounded(value, format, rounding)` — usado pela maioria dos componentes
- `makeTickFormatter(rounding, kind)` em `chartHelpers.ts` para os eixos do Recharts (substitui `tickCurrencyAbbrev` hardcoded)

Funções atuais (`formatCurrency`, `formatNumber`, `formatByKind`, `tickCurrencyAbbrev`) permanecem para compatibilidade.

### Componentes a atualizar (consumir `useNumberFormat`)

**KPI cards:** `KpiCard`, `KpiTargetCard`, `KpiTriStackCard`, `KpiSparklineCard`, `KpiVariationCard`.

**Gráficos** (eixos + valueFormatter default): `AreaChartCard`, `BarChartCard`, `ComboChartCard`, `LineChartCard`, `HorizontalBarChartCard`, `StackedBarChartCard`, `WaterfallChartCard`, `MultiSeriesChartCard`, `RankingChartCard`, `TreemapChartCard`, `PieChartCard`, `BrazilMapCard`, `ProgressChartCard`.

**Tabelas:** `ComparisonTable`, `SummaryTable`, `DrillDownTable`, `RankingTable`.

**Inline em `ComercialPage.tsx`:** trocar `formatCurrency`/`formatNumber` diretos por versões `Rounded` nas colunas das DataTableBI (linhas ~220-224, 268-276) e no `subtitle` do KpiSparklineCard (linha ~314).

### UI dos toggles

`ToggleGroup` compacto (shadcn) com 3 opções, no header da Biblioteca BI e no header do BI Comercial. Tooltip explicando o efeito. Estado salvo automaticamente via `useBiDisplayPrefs` (debounce 500ms).

## Arquivos novos

- `supabase/migrations/<timestamp>_add_bi_display_prefs.sql`
- `src/contexts/NumberFormatContext.tsx`
- `src/hooks/useBiDisplayPrefs.ts`

## Arquivos editados

- `src/components/bi/utils/formatters.ts` (+ wrappers Rounded)
- `src/components/bi/utils/chartHelpers.ts` (+ `makeTickFormatter`)
- 5 arquivos em `src/components/bi/kpis/`
- ~13 arquivos em `src/components/bi/charts/`
- 4 arquivos em `src/components/bi/tables/`
- `src/pages/BiComponentsDemoPage.tsx` (toggle + Provider)
- `src/pages/bi/ComercialPage.tsx` (toggle + Provider + ajuste das colunas inline)

## Fora do escopo

- Não muda dados subjacentes, apenas exibição.
- Não afeta exports (CSV/Excel) — números continuam com precisão total.
- Não toca em outras páginas BI (Faturamento Validação, Metas, etc.) nesta entrega — ficam preparadas para receber o Provider depois.
- Percentuais e datas não são afetados.
