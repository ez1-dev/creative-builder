
## Objetivo

Hoje a paleta de cores do mapa de calor (presets Spectral/Azul/Verde/Quente/Frio/Viridis + customizar stops) só aparece no ícone 🎨 dentro do próprio card, em runtime. Quero a mesma opção dentro do **diálogo "Configurar bloco"** (botão "Editar dashboard" → widget de mapa), para que a paleta escolhida fique persistida no widget e seja a padrão ao renderizar.

## Mudanças

### 1. Contrato de options (`src/lib/bi/widgetOptions.ts`)
- Adicionar campo opcional `colorStops?: string[]` em `WidgetOptions`. Usado apenas por componentes de mapa de calor.

### 2. Diálogo de configuração (`src/components/bi/runtime/ConfigureBiWidgetDialog.tsx`)
- Detectar quando o componente selecionado é um mapa de calor:
  `HEAT_MAP_LIB_IDS = new Set(['brazil-heat-map', 'brazil-heat-map-comercial'])`.
- Novo estado `colorStops: string[]` inicializado de `initial.options?.colorStops` ou de `HEAT_COLOR_STOPS`.
- Renderizar `<HeatPaletteEditor value={colorStops} onChange={setColorStops} />` (com label "Paleta do mapa") logo abaixo do `ChartColorPicker`, somente quando `HEAT_MAP_LIB_IDS.has(libDef.id)`.
- Em `buildLibraryOptions()`, persistir `opts.colorStops = colorStops` se diferente do default Spectral; usar o mesmo helper `arraysEqual` da `HeatPaletteEditor`.
- Reset no `useEffect([open])`.
- Como o painel já tem pré-visualização à direita, o mapa atualiza imediatamente ao trocar a paleta.

### 3. Diálogo "Adicionar / aplicar componente da Biblioteca BI" (`src/components/bi/runtime/ApplyComponentDialog.tsx`)
- Mesma lógica: detectar `brazil-heat-map`/`brazil-heat-map-comercial`, oferecer o `HeatPaletteEditor` na seção de Aparência, incluir `colorStops` em `builtOptions`. Assim a paleta também pode ser definida na criação do widget.

### 4. Registro de componentes (`src/lib/bi/componentRegistry.tsx`)
- `brazil-heat-map` (render): passar `colorStops={options?.colorStops}` para `<BrazilHeatMap>`.
- `BrazilHeatMapComercialHost`: aceitar e repassar `colorStops` via prop.

### 5. Widget de heatmap comercial (`src/components/bi/comercial/BrazilHeatMapWidget.tsx`)
- Aceitar prop opcional `initialColorStops?: string[]`. Inicializar o `useState` com ela (fallback `HEAT_COLOR_STOPS`). O usuário ainda pode trocar em runtime pelo ícone 🎨, mas o valor configurado vira a base padrão.

## Fora de escopo
- Não mexer no editor de cor genérico do mapa em runtime (continua funcionando).
- Não mexer no `BrazilStateMapWidget` (cartograma) — ele não usa paleta de stops.
- Sem alterações de backend.

## Critério de aceite
1. Em qualquer página BI, clicar em "Editar dashboard" → widget do mapa de calor → "Configurar" → aparece um seletor "Paleta do mapa" com os mesmos presets do popover do card.
2. Trocar a paleta no diálogo atualiza a pré-visualização e, ao salvar, o mapa volta a ser renderizado com a paleta escolhida (persistida em `bi_user_widgets.options.colorStops`).
3. Mapas existentes sem `colorStops` continuam usando Spectral (sem regressão).
