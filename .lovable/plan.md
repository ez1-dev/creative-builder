## Objetivo

Tornar a legenda (pedestal) do mapa de calor **interativa**: o usuário pode escolher uma paleta pronta ou customizar cada cor (stops) e o mapa repinta em tempo real. Estado vive só na sessão; aplica-se somente ao mapa do BI Comercial (não muda o tema global de outros heatmaps).

## Escopo de arquivos

Alterar apenas:

- `src/components/bi/maps/BrazilHeatMap.tsx` — aceitar paleta dinâmica via prop e usar nos estados + legenda
- `src/lib/bi/mapUtils.ts` — permitir `heatColorFromValue(valor, max, stops?)` recebendo paleta opcional
- `src/components/bi/comercial/BrazilHeatMapWidget.tsx` — guardar paleta em `useState`, abrir popover com presets + color pickers, passar `colorStops` para `BrazilHeatMap`

**Novo arquivo:**
- `src/components/bi/maps/HeatPaletteEditor.tsx` — popover de edição (presets + 5 color pickers + reset)

Sem mudanças em backend, API, fluxo de dados, drill, zoom/pan ou clique de estado.

## Como vai funcionar

1. Próximo ao topo da legenda vertical aparece um pequeno botão "Paleta" (ícone Palette).
2. Ao clicar, abre um `Popover` (shadcn) com:
   - **Presets** (chips clicáveis): Spectral (atual), Azul corporativo, Verde, Quente, Frio, Viridis. Cada preset preenche os 5 stops.
   - **5 color pickers** (`<input type="color">` estilizado) representando: 0% → 25% → 50% → 75% → 100%. Editar qualquer um atualiza o gradiente da barra de legenda e repinta o mapa.
   - Botão "Restaurar padrão" volta para Spectral.
3. A barra vertical da legenda continua mostrando o gradiente — agora derivado dos stops escolhidos.
4. Estado vive em `useState` no `BrazilHeatMapWidget` (não persiste; reseta ao recarregar).

## Detalhes técnicos

- `mapUtils.ts`: `heatColor(t, stops)` já aceita `stops`. Estender `heatColorFromValue(valor, max, stops = HEAT_COLOR_STOPS)`. Exportar `HEAT_PRESETS: Record<string, string[]>` com 5–6 paletas de 5 cores cada.
- `BrazilHeatMap.tsx`: nova prop opcional `colorStops?: string[]` (default `HEAT_COLOR_STOPS`). Usar em:
  - `legendGradient = linear-gradient(to top, ${colorStops.join(', ')})`
  - cada `Geography.fill = heatColorFromValue(v, max, colorStops)` (hover/default/pressed)
  - nova prop opcional `legendExtras?: ReactNode` renderizada ao lado do título "Fat. (R$)" para hospedar o botão da paleta sem o BrazilHeatMap precisar conhecer o editor.
- `HeatPaletteEditor.tsx`: componente controlado (`value: string[]`, `onChange`), usa `Popover` + `Button` shadcn + tokens semânticos (sem cores hardcoded fora dos próprios swatches da paleta — que são dados, não tokens).
- `BrazilHeatMapWidget.tsx`: 
  ```tsx
  const [stops, setStops] = useState<string[]>(HEAT_COLOR_STOPS);
  <BrazilHeatMap colorStops={stops} legendExtras={<HeatPaletteEditor value={stops} onChange={setStops} />} ... />
  ```

## Garantias

- Nada de cores hardcoded em components fora dos próprios swatches de presets (são valores de dados visuais, não estilo de UI).
- Zero impacto em outros mapas/heatmaps do projeto.
- Sem chamadas de API novas, sem migrations, sem mudança de contrato.
- Zoom, pan, reset, clique-para-drill, tooltip e siglas continuam idênticos.
- Sem React error #310 (todos os hooks no topo, dependências estáveis).
