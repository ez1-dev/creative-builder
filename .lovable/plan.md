# Correção dos rótulos do mapa

## Status atual

Após inspecionar `src/components/passagens/MapaDestinosCard.tsx` (linhas 305-338), os rótulos das siglas de UF **já estão usando a projeção correta** do `react-simple-maps`.

A correção que você pediu já foi aplicada na iteração anterior:

```tsx
<Marker key={`label-${geo.rsmKey}`} coordinates={labelCoord}>
  <text textAnchor="middle" dominantBaseline="central" ...>
    {uf}
  </text>
</Marker>
```

- `labelCoord` é `[longitude, latitude]` em graus (vindo de `geoCentroid(geo)`).
- O componente `<Marker>` aplica automaticamente a projeção `geoMercator` definida no `ComposableMap` (scale 780, center [-54, -15]).
- O `<text>` interno renderiza no espaço já projetado, com `textAnchor="middle"` para centralizar sobre o estado.

## Não há código a alterar

A versão antiga (que usava `<text x={cx} y={cy}>` direto, fazendo as siglas se aglomerarem no canto superior esquerdo) já foi removida.

## Se você ainda vê rótulos fora de posição

Pode ser cache do navegador. Possíveis próximas ações (precisa aprovar para eu executar):

1. **Forçar reload do preview** — abrir o preview em aba anônima ou Ctrl+Shift+R.
2. **Verificar visualmente** com a ferramenta de browser autenticada e tirar um screenshot do mapa atual para confirmar onde estão as siglas hoje.
3. **Ajustar offsets dos estados pequenos do Nordeste** (RN, PB, PE, AL, SE) — hoje há `labelOffset` empurrando essas siglas para o oceano para não sobrepor. Se estiverem caindo no lugar errado, ajusto os valores.

## Recomendação

Me confirme **qual sigla específica** está fora do lugar (ex.: "SP está sobre o RJ", "RN aparece no meio do mar muito longe") para eu corrigir o offset exato. Sem isso, qualquer mudança seria às cegas e pode piorar o que já está bom.
