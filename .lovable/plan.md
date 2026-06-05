# Aplicar componente — mais ajustes por widget

## Objetivo
Ampliar o diálogo "Aplicar componente" (`ApplyComponentDialog`) com novas opções de aparência, dados e layout, e fazer com que **todos** os componentes do `componentRegistry` respeitem essas opções em runtime.

## 1. Novo contrato de `options` (persistido em `bi_user_widgets.options`)

```ts
// src/lib/bi/widgetOptions.ts (novo)
export interface WidgetOptions {
  // Aparência
  color?: 'primary'|'success'|'warning'|'danger'|'info'|'muted';
  variant?: 'solid'|'outline'|'ghost'|'gradient';
  icon?: string;              // nome lucide-react ('TrendingUp', 'DollarSign', ...)
  valueFormat?: 'currency'|'number'|'percent'|'compact'|'auto';
  density?: 'compact'|'default'|'comfortable';
  height?: 'sm'|'md'|'lg'|'xl';

  // Layout do card
  hideTitle?: boolean;
  subtitle?: string;
  footerNote?: string;        // rodapé livre

  // Dados / comparação
  unidade_negocio?: string;   // já existente
  periodo_override?: { tipo: 'ultimos_n_meses'|'mes_atual'|'ano_atual'|'custom'; n?: number; ini?: string; fim?: string };
  comparacao?: 'nenhuma'|'periodo_anterior'|'mesmo_periodo_ano_anterior';
  meta?: { tipo: 'valor'|'kpi'; valor?: number; kpiKey?: string };
  topN?: number;              // 5/10/20/50
  sort?: 'desc'|'asc';
}
```

Helpers no mesmo arquivo:
- `resolveColorTokens(color, variant)` → `{ bg, fg, accent, border }` em classes Tailwind semânticas (sem hardcode).
- `densityClasses(density)` → padding / gap / fonte.
- `heightClasses(height)` → `min-h-*` por tier.
- `formatValueAuto(value, fmt)` → respeita compact/currency/percent.
- `applyTopNSort(series, topN, sort)`.
- `computeComparacao(serieAtual, comparacaoMode)` → `{ valorAnterior, deltaPct }`.

## 2. UI do diálogo

`ApplyComponentDialog.tsx`: a coluna esquerda passa de stack único para `Tabs` com 3 abas, mantendo o preview à direita.

- **Aba "Onde"** (atual): Página alvo, Bloco, Mapeamento de dados, Título, Largura, Posição (ordem — input number novo).
- **Aba "Aparência"** (nova):
  - Cor de destaque (6 swatches semânticos).
  - Variante visual (solid/outline/ghost/gradient — 4 botões).
  - Ícone (combobox com busca, opções curadas ~40 ícones lucide; "Nenhum").
  - Formato do valor (Auto / Moeda / Número / Percentual / Compacto).
  - Densidade (Compacto / Padrão / Confortável).
  - Altura (Pequeno / Médio / Grande / XG).
  - Esconder título (switch).
  - Subtítulo (input).
  - Rodapé/Nota (input).
- **Aba "Dados"** (nova):
  - Unidade de Negócio (mover o seletor existente para cá).
  - Período sobreposto (radio: Padrão da página / Últimos N meses [n] / Mês atual / Ano atual / Custom [ini-fim]).
  - Comparação (Nenhuma / Período anterior / Mesmo período do ano anterior).
  - Meta (Nenhuma / Valor fixo [input] / KPI [select dos kpis disponíveis]).
  - Top N (5/10/20/50/Todos).
  - Ordenação (Desc/Asc).

Os blocos só são habilitados quando fazem sentido para o `kind` do componente (Top N e sort só para chart/table; meta só para KPI; etc.). Resto fica desabilitado com tooltip "Não se aplica a este componente".

Pré-visualização à direita continua usando `def.render`, agora recebendo as `options` montadas para refletir as escolhas em tempo real.

## 3. Propagação aos componentes (registry)

Estratégia em duas camadas para cobrir os ~25 componentes sem reescrever todos:

### 3a. Wrapper genérico em `UserWidgetsSlot.tsx`
Antes de chamar `def.render`, envolver o resultado num `<WidgetShell options={...}>`:
- Aplica `density`, `height`, cor de destaque via `style={{ '--bi-accent': hsl(var(--<color>)) }}` no container.
- Cabeçalho: respeita `hideTitle` / `subtitle`.
- Rodapé: renderiza `footerNote` quando presente.
- Passa as `options` ao `def.render` (já existente).

O wrapper cobre: cor, variant (background/borda), densidade, altura, hideTitle, subtitle, footerNote — **sem tocar nos componentes individuais**.

### 3b. Componentes que precisam ler `options` diretamente
Atualizar para ler de `props.options`:
- **KPIs** (`KpiCard`, `KpiSparklineCard`, `KpiTargetCard`, `KpiComparisonCard`, `KpiVariationCard`, `KpiStatusCard`): `icon` (lucide dinâmico), `valueFormat`, `meta`, `comparacao`.
- **Charts de série única** (`BarChartCard`, `HorizontalBarChartCard`, `LineChartCard`, `AreaChartCard`, `DonutChartCard`, `PieChartCard`, `RankingChartCard`, `FunnelChartCard`, `TreemapChartCard`, `SparklineCard`, `StackedBarChartCard`, `ComboChartCard`, `GaugeChartCard`, `ProgressChartCard`, `WaterfallChartCard`): `topN`, `sort`, `valueFormat`, cor de destaque (passar para palette do chart).
- **Charts especiais** (`ScatterChartCard`, `HeatmapChartCard`, `RadarChartCard`, `CalendarHeatmapCard`): só `valueFormat` e cor.
- **Tabelas** (`DataTableBI`, `RankingTable`, `SummaryTable`, `ComparisonTable`, `DrillDownTable`): `topN`, `sort`, `valueFormat`.

Cada componente passa a fazer `const opts = (options ?? {}) as WidgetOptions;` com defaults, sem quebrar quem não passa nada.

### 3c. Período sobreposto
Em `UserWidgetsSlot.tsx`, quando `options.periodo_override` está definido, mesclar com `ctx.filtros` (analogamente ao `unidade_negocio`): calcular `anomes_ini`/`anomes_fim` derivados do tipo e injetar em `mergedFiltros`. Página continua sem precisar saber — quem consome `filtros` (componentes que chamam API por dentro do registry — apenas `bi-ia-chart` e charts dinâmicos) recebe automaticamente.

## 4. Migração / compatibilidade

- Widgets antigos sem novos campos → wrapper aplica defaults (`density: default`, `height: md`, sem cor custom, etc.). Visualmente idênticos ao atual.
- `options.unidade_negocio` continua suportado e movido para a aba "Dados".
- Nenhuma migração SQL necessária (`options` já é `jsonb`).

## 5. Arquivos

**Novos**
- `src/lib/bi/widgetOptions.ts` — tipos + helpers.
- `src/components/bi/runtime/WidgetShell.tsx` — wrapper genérico de aparência.
- `src/components/bi/runtime/IconPicker.tsx` — combobox de ícones lucide.

**Editados (UI/runtime)**
- `src/components/bi/runtime/ApplyComponentDialog.tsx` — 3 abas, novos controles.
- `src/components/bi/runtime/UserWidgetsSlot.tsx` — usar `WidgetShell` + `periodo_override`.

**Editados (componentes do registry)**
- ~25 arquivos sob `src/components/bi/{kpi,charts,tables}/*`. Cada um passa a ler `options` (icon/format/topN/sort/meta/comparacao conforme aplicável). Mudanças mínimas, com defaults preservando comportamento atual.
- `src/lib/bi/componentRegistry.tsx` — `render` já recebe `options`, sem mudança no contrato.

**Não-mudanças**
- Schema do banco (`bi_user_widgets`).
- Edge functions e backend FastAPI.
- `pageRegistry.ts`.
- `AddBiWidgetDialog`, gerador IA, BI Comercial page.

## 6. Critério de aceite

- Diálogo "Aplicar componente" mostra 3 abas (Onde / Aparência / Dados) com todos os novos controles.
- Salvar e abrir a página alvo: widget reflete cor, variante, ícone, formato, densidade, altura, título, subtítulo, rodapé, comparação, meta, Top N, ordenação, período sobreposto.
- Opções não aplicáveis ao componente aparecem desabilitadas com tooltip.
- Widgets já existentes (sem options novas) continuam idênticos ao atual.
- Sem quebra de build TS; sem cores hardcoded — só tokens semânticos.
