# Seletor de fonte por widget — Biblioteca BI

Hoje o `VisualConfigEditor` (aba "Configurar" de cada widget) só permite ajustar **tamanho** da fonte de título, subtítulo, legenda, rótulos, eixos e descrição. Vamos adicionar a escolha da **família de fonte**, salva por widget no mesmo `options.visual` que já é persistido em `bi_user_widgets` / `dashboard_widgets`.

## Escopo

- Por **widget** (cada card/gráfico tem sua fonte).
- Aplicado a: título, subtítulo, legenda, rótulos de dados, eixos, descrição do resultado e — quando aplicável — rótulos do Treemap (caso da imagem enviada).
- Fontes disponíveis no seletor:
  - `Padrão` (herda do app — Inter/system)
  - `Serif` (Georgia, "Times New Roman", serif)
  - `Monospace` (ui-monospace, Menlo, Consolas, monospace)
  - Fontes do Google: `Roboto`, `Poppins`, `Inter`, `Nunito`, `Montserrat`, `Source Sans 3`, `Roboto Mono`, `IBM Plex Serif`

## Mudanças

### 1. `src/lib/bi/visualConfig.ts`
- Novo tipo `FontFamilyKey` com as opções acima + mapa `FONT_FAMILY_STACKS` (key → CSS `font-family`).
- Adicionar `fontFamily?: FontFamilyKey` em cada bloco que já tem `fontSize`: `title`, `subtitle`, `legend`, `dataLabels`, `resultDescription`, `axis`.
- Default = `'default'` em todos.
- `mergeVisualConfig` herda automaticamente (já faz spread por bloco).
- Helper `fontFamilyCss(key?)` → string CSS, retorna `undefined` para `'default'` (não emite style).

### 2. `src/components/bi/visual/VisualConfigEditor.tsx`
- Novo subcomponente `FontFamilyField` (Select shadcn) reutilizado em cada seção que já tem `NumberField` de fonte.
- Adicionar uma linha "Família da fonte" ao lado de cada "Fonte (px)" — em: Título, Subtítulo, Legenda, Rótulos de dados, Descrição do resultado, Eixos.
- Tooltip curto explicando que `Padrão` herda do app.

### 3. `src/components/bi/charts/ChartCardShell.tsx`
- Onde já aplica `style={{ fontSize: ... }}` (título, subtítulo, descrição), adicionar `fontFamily: fontFamilyCss(vc.<bloco>.fontFamily)`.

### 4. Aplicar nos gráficos onde o estilo de fonte chega via props ao Recharts
- `BarChartCard`, `LineChartCard`, `AreaChartCard`, `HorizontalBarChartCard`, `StackedBarChartCard`, `ComboChartCard`, `MultiSeriesChartCard`, `PieChartCard`, `RadarChartCard`, `ScatterChartCard`, `FunnelChartCard`, `WaterfallChartCard`, `TreemapChartCard`:
  - Em `<Legend wrapperStyle={...}>`, `<XAxis tick={{...}}>`, `<YAxis tick={...}>`, e nos `<LabelList style={...}>` / labels de rótulo (incluindo o conteúdo SVG `<text>` do TreemapChartCard que renderiza os blocos coloridos da imagem enviada): adicionar `fontFamily` calculada a partir do bloco correspondente do `VisualConfig`.
- Estritamente aditivo — nada muda se o usuário não escolher fonte.

### 5. `index.html`
- Carregar Google Fonts apenas das famílias escolhidas (link `display=swap`), em um único `<link>` consolidado. Sem peso pesado: apenas regular + 600 para cada.

## Fora de escopo
- Fonte global da Biblioteca BI / app inteiro.
- Editor para fontes customizadas (upload).
- Mudanças em KPIs/`KpiCard` — apenas gráficos via `ChartCardShell` por enquanto (pode ser feito num passo seguinte se quiser).
- Backend / migrations (campo já cabe em `options.visual` JSON existente).

## Validação
- Abrir `/biblioteca-bi`, configurar um Treemap (ex.: "Faturamento Estado") e trocar fonte para `Poppins` — rótulos PA/SP/PR devem renderizar em Poppins.
- Verificar que widgets antigos sem `fontFamily` continuam idênticos.
