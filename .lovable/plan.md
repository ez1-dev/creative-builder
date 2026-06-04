
# Biblioteca BI — Aparência e leitura dos gráficos

Implementação faseada para evitar quebrar dashboards existentes. Toda configuração visual fica em um único objeto `visual_config` (JSON), opcional, com defaults sãos. Sem mudanças em SQL nem em regras de negócio.

## Fase 1 — Modelo de dados e tipo `VisualConfig`

1. Criar `src/lib/bi/visualConfig.ts`:
   - `export interface VisualConfig { title, subtitle, legend, dataLabels, resultDescription, axis, grid, tooltip, card }` exatamente no formato do JSON proposto pelo usuário.
   - `DEFAULT_VISUAL_CONFIG` com defaults compatíveis com o look atual.
   - `mergeVisualConfig(partial?)` → faz merge profundo com defaults (componentes sem `visual_config` continuam renderizando idênticos).
   - `formatDataLabel(value, cfg.dataLabels)` cobrindo: `int | decimal | currency | percent | compact`, `decimals`, `prefix`, `suffix`.
   - `interpolateDescription(text, vars)` para `{total}`, `{periodo}`, `{maior_valor}`, `{menor_valor}`, `{quantidade_registros}` (Fase 5, mas o esqueleto já entra).

2. **Persistência**: NÃO criar coluna nova. Reaproveitar `bi_user_widgets.options JSONB` (já existe) salvando em `options.visual` o `VisualConfig`. Para widgets canônicos (`dashboard_widgets.config JSONB`) reusar `config.visual`. Zero migração de banco.

## Fase 2 — Renderização respeitando `visual_config`

Alterar `ChartCardShell` para receber `visualConfig?: VisualConfig` e aplicar:
- `card.showHeader`, `card.showBorder`, `card.density` (`compacta|normal|detalhada` → padding/altura).
- `title.visible/text/align/fontSize`, `subtitle.visible/text/fontSize`.
- `resultDescription` (renderizado `above`/`below`/`beforeLegend`/`afterChart`).
- Manter `subtitle` legado funcionando se `visual_config` estiver ausente.

Atualizar os charts impactados (`BarChartCard`, `HorizontalBarChartCard`, `LineChartCard`, `AreaChartCard`, `ComboChartCard`, `PieChartCard`, `DonutChartCard`, `StackedBarChartCard`) para receber `visualConfig` e aplicar:
- `<Legend>` condicional, `verticalAlign`/`align` mapeados de `legend.position` (`top|bottom|left|right`), `wrapperStyle.fontSize`, e renomes via `legend.seriesLabels`.
- `<LabelList>` do Recharts quando `dataLabels.visible`, com `position` (Recharts: `top|bottom|inside|outside|left|right|center`), `fontSize`, e `formatter = formatDataLabel`.
- `<CartesianGrid>` condicional (`grid.visible`).
- `<XAxis>`/`<YAxis>` condicional (`axis.xVisible/yVisible`), `label` para `axis.xLabel/yLabel`, `tick.fontSize` de `axis.fontSize`.
- `<Tooltip>` condicional (`tooltip.visible`), com `formatter` usando `formatDataLabel` quando definido.

Charts especiais (radar, scatter, gauge, heatmap, treemap, calendar, funnel, waterfall) recebem só o subset que faz sentido (título, legenda, descrição, card, tooltip) — eixos/labels ignorados sem erro.

No `componentRegistry.tsx`, propagar `options.visual` para os componentes nas chamadas `render(...)`:
```ts
const visual = mergeVisualConfig(options?.visual);
return <BarChartCard ... visualConfig={visual} title={visual.title.text || title || ...} />;
```

## Fase 3 — Editor "Aparência e leitura do gráfico"

Criar `src/components/bi/visual/VisualConfigEditor.tsx`:
- Componente controlado: `value: VisualConfig`, `onChange(next)`.
- Layout em `<Tabs>` shadcn com 6 abas: **Título**, **Legenda**, **Rótulos**, **Descrição**, **Eixos & Grade**, **Card**.
- Cada aba usa primitivos shadcn (`Switch`, `Input`, `Select`, `Slider`, `Textarea`, `RadioGroup`).
- Para "nome amigável das séries" (`legend.seriesLabels`): receber prop `availableSeriesKeys: string[]` e renderizar uma lista editável (chave → label).
- Botões inferiores: **Restaurar padrão** (volta a `DEFAULT_VISUAL_CONFIG`).

Integrar no `ConfigureChartDialog` (`src/components/passagens/ConfigureChartDialog.tsx`):
- Acrescentar uma seção/aba "Aparência e leitura do gráfico" acima do preview.
- Estado novo `visual` inicializado de `initial?.options?.visual` ou default.
- O preview já existente passa `options.visual = visual` e mostra mudanças em tempo real.
- Em `onApply`, persistir `options.visual` junto.
- Botão "Restaurar padrão visual" reseta só o `visual` (separado do "Voltar ao padrão" que reseta o bloco inteiro).

Onde mais o editor aparece: o mesmo dialog é reutilizado por `PassagensDashboard`, `FrotaDashboard`, `MaquinasDashboard` (Dashboard Builder) — todos já vão herdar.

## Fase 4 — Aplicação fora do Dashboard Builder

- **`/biblioteca-bi`** (catálogo): adicionar botão "Configurar aparência" no preview de cada componente; abre `VisualConfigEditor` em standalone para o usuário experimentar (não persiste — só ilustrativo).
- **`PaginaDashboardTemplate`** e usuários do registry (ex.: ComercialPage): nada a fazer; já recebem `options.visual` pelo widget store.

## Fase 5 — Variáveis dinâmicas em `resultDescription`

- `ChartCardShell` calcula `vars` a partir dos dados (`total`, `maior_valor`, `menor_valor`, `quantidade_registros`) e `periodo` vindo de prop opcional `periodLabel`. Passa para `interpolateDescription`.
- Apenas substituição simples `{var}` → string formatada. Sem motor de fórmulas.

## Fase 6 — QA

- Smoke check em `/bi/comercial`, `/passagens-aereas`, `/manutencao-frota`: dashboards sem `visual_config` continuam idênticos.
- Editar 1 gráfico em `/passagens-aereas`: trocar título, ativar rótulos `currency` + prefixo `R$`, mover legenda para `right`, ativar descrição "below" — confirmar persistência após reload.
- Garantir que `mergeVisualConfig(undefined)` nunca lance.

## Fora do escopo (deixar para depois)

- "Aplicar estilo para todos os componentes do mesmo tipo" (botão fica desabilitado com tooltip "em breve").
- Editor visual para `radar/scatter/heatmap/gauge/treemap/funnel/waterfall` específicos — só o subset comum.
- Mudanças em `<Legend>` para gráficos `pie/donut` quando `position: left|right` (Recharts não suporta tudo igual — mapear para `top|bottom` com warning silencioso).

## Arquivos tocados (resumo)

Novos:
- `src/lib/bi/visualConfig.ts`
- `src/components/bi/visual/VisualConfigEditor.tsx`

Editados:
- `src/components/bi/charts/ChartCardShell.tsx`
- `src/components/bi/charts/{Bar,HorizontalBar,Line,Area,Combo,Pie,Donut,StackedBar}ChartCard.tsx`
- `src/lib/bi/componentRegistry.tsx`
- `src/components/passagens/ConfigureChartDialog.tsx`
- `src/pages/BiComponentsDemoPage.tsx` (catálogo `/biblioteca-bi`)

Sem migração de banco. Sem alteração em SQL/ETL/regra de negócio.
