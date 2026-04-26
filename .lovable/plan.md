## Objetivo

Fazer com que o layout "Power BI" (e o grid em geral) funcione bem em telas menores — sem cortar widgets, sem empilhamento desalinhado e sem gráficos espremidos.

## Diagnóstico

Hoje o `ResponsiveGridLayout` em `DashboardBuilder.tsx` recebe **apenas** `layouts.lg` com larguras pensadas para 12 colunas (ex.: `w:7 + w:5`, `w:4 + w:4 + w:4`). Quando a tela cai para `md` (10 cols), `sm` (6 cols), `xs` (4 cols) ou `xxs` (2 cols), o react-grid-layout tenta encaixar essas larguras nas novas grades, gerando overlap, corte ou ordem errada. Além disso, `rowHeight` fixo em 80px deixa cards muito altos no mobile.

## Mudanças

### 1. Layouts por breakpoint no grid (`DashboardBuilder.tsx`)

Em vez de passar somente `layouts.lg`, gerar layouts derivados para cada breakpoint a partir do layout `lg` salvo, redimensionando proporcionalmente e organizando em fluxo:

- **lg (12 cols)**: usa o layout salvo como está.
- **md (10 cols)**: escala `w` proporcionalmente (round, mín. 3) mantendo a ordem por (y, x).
- **sm (6 cols)**: 2 widgets por linha — KPIs `w:3`, demais `w:6`; tabelas full-width `w:6`.
- **xs (4 cols)**: 1 widget por linha — `w:4` para todos; KPIs com `h` menor.
- **xxs (2 cols)**: 1 widget por linha — `w:2`, alturas levemente reduzidas.

Função `buildResponsiveLayouts(widgets)` faz esse cálculo, ordenando por `(y, x)` do layout `lg` e empilhando com um cursor `(x, y, rowH)` por breakpoint.

### 2. Altura de linha responsiva

Trocar `rowHeight={80}` por valor por breakpoint (`lg/md: 80`, `sm: 70`, `xs: 64`, `xxs: 60`) usando a prop `rowHeight` aceita pelo Responsive (manter 80 e ajustar `h` por breakpoint na função acima — mais previsível que mudar rowHeight dinamicamente).

### 3. Persistir somente o layout `lg`

`onLayoutChange(currentLayout, allLayouts)` — salvar apenas `allLayouts.lg` no estado/banco, para não sobrescrever os layouts derivados quando o usuário arrasta em uma tela pequena. Em breakpoints menores travar `isDraggable={false}` e `isResizable={false}` (drag manual em mobile não faz sentido e gera os "cortes" reportados).

### 4. Toolbar e barra Power BI responsivas

- Na barra de ações (linha com "Personalizar", "Layout Power BI" etc.), reduzir para ícones-only quando `sm` (esconder texto com `hidden sm:inline`), evitando wrap feio.
- A barra decorativa estilo Power BI já é centralizada — manter.

### 5. WidgetRenderer

Garantir que os componentes internos não estourem largura: adicionar `min-w-0` e `overflow-hidden` no wrapper do card de cada widget e `truncate` em títulos longos. Charts (`ResponsiveContainer`) já se ajustam, mas tabelas compactas precisam de `overflow-auto` no container para evitar corte horizontal em `xs/xxs`.

### 6. Bloqueio do botão "Layout Power BI" em telas pequenas

O botão aplica coordenadas `lg`. Mantemos isso, pois o passo 1 garante que essas coordenadas serão re-fluídas automaticamente para o breakpoint atual. Sem mudanças adicionais.

## Arquivos afetados

- `src/components/dashboard-builder/DashboardBuilder.tsx` — `buildResponsiveLayouts`, props do `ResponsiveGridLayout`, `onLayoutChange`, toolbar responsiva.
- `src/components/dashboard-builder/WidgetRenderer.tsx` — overflow/min-width/truncate nos containers.

## Resultado esperado

- Em desktop (≥1280px): layout Power BI exatamente como hoje.
- Em tablets (768–1279px): mesma intenção, com proporções ajustadas a 10/6 colunas, sem overlap.
- Em mobile (<768px): widgets empilhados verticalmente, full-width, KPIs compactos, gráficos legíveis, tabelas com scroll horizontal interno.
- Drag/resize desabilitado abaixo de `md` para evitar quebras acidentais; o layout salvo (`lg`) permanece intacto.
