## Objetivo

Transformar a barra vertical da legenda do `BrazilHeatMap` em uma **legenda interativa de faixa**: hover mostra valor, arrastar handles seleciona uma faixa `[min, max]`, estados fora da faixa ficam esmaecidos, e há ações de Limpar / Aplicar faixa.

## Escopo

- **Editar:** `src/components/bi/maps/BrazilHeatMap.tsx`
- **Novo:** `src/components/bi/maps/InteractiveHeatLegend.tsx` (extrai a barra + handles + tooltip + ações para legibilidade)
- **Opcional:** `src/lib/bi/mapUtils.ts` — apenas se precisar de helper puro `getValueFromPointer`. Provavelmente fica inline no componente.

Sem mudanças em backend, API, drill, zoom/pan, widget cartograma, demais gráficos. O `BrazilHeatMapWidget` (BI Comercial) ganha apenas o repasse opcional de `onRangeApply` — sem nova lógica de filtro: vai chamar o `onDrill` existente quando for o caso (se for aceito; caso contrário, o botão Aplicar fica oculto).

## Comportamento

### Legenda interativa
- Wrapper `relative` na barra vertical existente (gradiente preservado).
- **Pointer events** (`onPointerDown/Move/Up/Leave` + `setPointerCapture`) — funciona mouse e touch.
- **Hover**: linha horizontal fina + tooltip mostrando `formatValue(valor)` na posição Y do ponteiro.
- **Arraste**: clicar perto de um handle "agarra" aquele handle; arrastar atualiza `selectedRange` garantindo `min ≤ max`.
- **2 handles**: marcadores triangulares pequenos à direita da barra (topo = max da faixa, base = min). Cursor `ns-resize`, drag tooltip.
- **Overlay**: regiões fora da faixa cobertas por faixa branco/transparente (~`rgba(255,255,255,0.55)`) sobre a barra de gradiente.
- **Duplo clique na barra** → reseta a seleção (`setSelectedRange(null)`).
- Quando `selectedRange === null`, a barra opera só em modo hover; clique inicial define a faixa começando por aquele valor com o outro handle no extremo mais próximo.

### Conversão pointer ↔ valor
```ts
function valueFromY(clientY, rect, max) {
  const y = clamp(clientY - rect.top, 0, rect.height);
  return clamp((1 - y / rect.height) * max, 0, max);
}
function yFromValue(value, height, max) {
  return (1 - value / max) * height;
}
```

### Estados do mapa
```ts
const selUf = ...
const inRange = !selectedRange || (v >= selectedRange[0] && v <= selectedRange[1]);
opacity = (dimmed ? 0.55 : 1) * (inRange ? 1 : 0.18);
```
Mantém stroke/fill atuais para `isSelected` e hover. Estados sem dados continuam cinza (não afetados pela faixa).

### UFs da faixa
`useMemo` lista UFs cujo valor cai dentro da faixa. Renderiza abaixo da legenda:
- até 6 UFs: `Estados na faixa: MS, SP, PA, MT`
- mais que 6: `Estados na faixa: N UFs`

### Ações
- `Limpar` — sempre visível quando `selectedRange != null`.
- `Aplicar faixa` — só visível se `onRangeApply` foi passado E há ≥1 UF na faixa. Envia `{ cd_estado_in, valor_min, valor_max }`.

### Texto adicional
```
Faixa
R$ X até R$ Y
[Aplicar faixa] [Limpar]
```

## Detalhes técnicos

### `BrazilHeatMap.tsx`
- Nova prop opcional:
  ```ts
  onRangeApply?: (payload: { cd_estado_in: string[]; valor_min: number; valor_max: number }) => void;
  ```
- Estado interno: `const [selectedRange, setSelectedRange] = useState<[number, number] | null>(null);`
- Substituir o bloco atual da barra (linhas 119–151) por `<InteractiveHeatLegend ... />`.
- Calcular `ufsDentroDaFaixa` por `useMemo([data, selectedRange])`.
- Aplicar `opacity` adicional no `style.default`/`hover` dos `Geography`.
- Reset automático: quando `max === 0` ou `data` muda drasticamente (ex: novo período sem UFs na faixa), manter `selectedRange` — usuário decide quando limpar.

### `InteractiveHeatLegend.tsx`
- Renderiza: título + extras (slot p/ `HeatPaletteEditor`), barra vertical (gradiente + overlay + 2 handles + linha de hover + tooltip), labels max/0, e quando faixa ativa: bloco "Faixa" + botões.
- Internamente usa `useRef<HTMLDivElement>` para a barra; cálculo via `getBoundingClientRect()`.
- `setPointerCapture` no `pointerdown` para arraste fluido fora da barra.

### `BrazilHeatMapWidget.tsx` (BI Comercial)
- Adiciona `onRangeApply` que chama o `onDrill` existente quando o ERP aceita lista. Como o contrato atual de `onDrill` espera `valor: string`, e suportar lista é mudança de contrato, esta versão deixa o `onRangeApply` **indefinido por padrão** — o botão Aplicar simplesmente não aparece. A faixa continua funcionando como destaque visual (atende ao requisito "se não aceitar múltiplas UFs, apenas manter destaque visual").

## Garantias
- Zero alteração em backend/API/contrato de drill.
- Zoom/pan/reset, clique em UF, drill/context menu inalterados.
- Sem hooks condicionais → sem React error #310.
- Sem cores hardcoded de UI (tokens semânticos); cores de stops e overlay são dados visuais.
- Mobile/touch funcionam (Pointer Events + capture).
- Formatação respeita `valueFormatter` já injetado (cheio/abreviado/mi).
