# Corrigir mapa do Brasil que não está renderizando

## Problema observado

Na captura enviada, as bolhas dos destinos aparecem corretamente posicionadas, mas o **contorno do Brasil não é desenhado** — o mapa fica com fundo cinza vazio.

## Causa

No `react-simple-maps` v3, o componente `<Geography>` ignora as props diretas `fill` e `stroke` quando também recebe a prop `style`. Hoje o componente em `MapaDestinosCard.tsx` passa `fill`/`stroke` como props soltas e um `style.default` apenas com `outline: 'none'` — resultado: as feições renderizam sem fill nem stroke (invisíveis). O GeoJSON em `/geo/brasil-uf.json` está sendo servido normalmente (verifiquei: HTTP 200, 98KB).

Adicionalmente, a projeção atual (`scale: 750`) deixa o Brasil um pouco apertado dentro do viewport — ajuste fino para `scale: 850, center: [-54, -14]` para ocupar melhor o card.

## Correção

Em `src/components/passagens/MapaDestinosCard.tsx`, mover `fill` e `stroke` para dentro de `style.default` / `style.hover` / `style.pressed` do `<Geography>`:

```tsx
<Geography
  key={geo.rsmKey}
  geography={geo}
  style={{
    default: {
      fill: 'hsl(var(--muted))',
      stroke: 'hsl(var(--border))',
      strokeWidth: 0.6,
      outline: 'none',
    },
    hover: {
      fill: 'hsl(var(--accent))',
      stroke: 'hsl(var(--border))',
      strokeWidth: 0.6,
      outline: 'none',
    },
    pressed: { /* mesmo do default */ },
  }}
/>
```

Também ajustar `projectionConfig` para `{ scale: 850, center: [-54, -14] }`.

## Arquivo afetado

- `src/components/passagens/MapaDestinosCard.tsx`

Aprove para eu aplicar a correção.
