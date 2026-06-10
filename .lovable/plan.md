## Objetivo

Tornar a própria **barra vertical da legenda** interativa: as 5 paradas de cor viram pequenos círculos clicáveis sobre a barra. Clicar em um stop abre um color picker nativo; ao escolher a cor, o gradiente da legenda e o mapa repintam na hora.

## Escopo

Alterar apenas `src/components/bi/maps/BrazilHeatMap.tsx`. Sem mudanças em backend, API, drill, zoom/pan ou no `mapUtils.ts`/`HeatPaletteEditor`. O editor popover atual continua existindo (ao lado de "Fat. (R$)") — agora soma-se a interação direta na barra.

## Como vai funcionar

1. A barra vertical (`w-4`) ganha um wrapper `relative`.
2. Para cada um dos 5 stops, renderizar um círculo absoluto centrado na barra, posicionado verticalmente em `bottom: ${(i/4)*100}%` (índice 0 = base, 4 = topo).
3. Cada círculo:
   - 14 px, `rounded-full`, `border-2 border-background`, `shadow`, `cursor-pointer`
   - `background = stops[i]`
   - contém um `<input type="color" class="absolute inset-0 opacity-0 cursor-pointer" value={stops[i]} onChange={...}>` para abrir o picker nativo no clique
   - `title` mostra "Stop X — clique para mudar a cor"
4. O `onChange` propaga via nova prop opcional `onColorStopsChange?: (stops: string[]) => void`. Se ausente, os círculos ficam apenas visuais (não-editáveis).
5. `BrazilHeatMapWidget` (BI Comercial) já tem o `useState` — passa `onColorStopsChange={setColorStops}` para habilitar a edição direta.

## Detalhes técnicos

- Nova prop em `BrazilHeatMapProps`: `onColorStopsChange?: (next: string[]) => void`.
- A barra vira:
  ```tsx
  <div className="relative w-4 rounded-full border border-border" style={{background: legendGradient, height}}>
    {editable && stops.map((c, i) => (
      <div key={i} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-background shadow cursor-pointer"
           style={{ top: `${(1 - i/(stops.length-1))*100}%`, background: c }}>
        <input type="color" value={c} onChange={e => onColorStopsChange!(stops.map((x,j)=>j===i?e.target.value:x))}
               className="absolute inset-0 opacity-0 cursor-pointer" aria-label={`Cor stop ${i+1}`} />
      </div>
    ))}
  </div>
  ```
- `BrazilHeatMapWidget.tsx`: adicionar `onColorStopsChange={setColorStops}` ao `<BrazilHeatMap />`.

## Garantias

- Zero alteração em backend/API/dados.
- Acessibilidade: cada stop tem `aria-label`; teclado abre o picker nativo via `<input type="color">`.
- Sem cores hardcoded de UI (tokens semânticos para borda/sombra; os valores `stops[i]` são dados visuais).
- Sem React error #310 — handlers estáveis, sem hooks condicionais.
- Editor popover (botão Palette) continua disponível para presets.
