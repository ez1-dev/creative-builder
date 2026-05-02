## Problema

No print, o gráfico **"Por Motivo de Viagem"** aparece como uma "bolinha" pequena no centro de um card largo, com muito espaço em branco em volta. Isso acontece porque, no modo expandido (não-compacto), o pie está com:

- `outerRadius={85}` fixo (px), independente da largura disponível
- `height={380}` com margens grandes (`right: 90, left: 90, top: 30, bottom: 30`)
- O card ocupa quase metade da tela em viewports largos (2057px), então sobra muito espaço lateral inutilizado

## Solução

Aumentar o tamanho efetivo do pie no modo expandido, mantendo o modo compacto (mobile/grid apertado) intacto.

### Alterações em `src/components/passagens/PassagensDashboard.tsx` (linhas ~813–815, 822)

1. **Aumentar a altura do `ResponsiveContainer`** no modo wide: de `380` para `460`.
2. **Aumentar `outerRadius`** no modo wide: de `85` para `130`.
3. **Reduzir margens laterais** do `PieChart` no modo wide: de `right/left: 90` para `right/left: 60` (ainda dá espaço pros labels externos sem cortar).
4. Manter modo compacto exatamente como está (`height: 300`, `outerRadius: 70`).

```tsx
<ResponsiveContainer width="100%" height={isCompact ? 300 : 460} ...>
  <PieChart margin={isCompact ? { top: 8, right: 8, bottom: 8, left: 8 } : { top: 30, right: 60, bottom: 30, left: 60 }} ...>
    <Pie
      ...
      outerRadius={isCompact ? 70 : 130}
```

Resultado: a fatia do pie fica visualmente proporcional ao card, ocupando o espaço vertical e horizontal que hoje fica vazio, sem afetar mobile.

## Fora de escopo

- Não mexer no gráfico "Evolução Mensal" nem no mapa.
- Não alterar lógica de cross-filter, "Outros", ou cores.