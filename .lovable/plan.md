
# Plano — Legibilidade de rótulos em Pizza/Rosca

Alvo único: `src/components/bi/charts/PieChartCard.tsx` (usado também por `DonutChartCard` e pelo preview do `ConfigureChartDialog`, garantindo paridade automática entre prévia e widget final). Sem mudanças em API, Cloud, séries ou no fluxo de Aplicar.

## Constantes internas (topo do arquivo)

```ts
const MIN_PIE_LABEL_PERCENT = 3;   // fatias < 3% não recebem rótulo externo
const MAX_VISIBLE_PIE_LABELS = 6;  // no máx. 6 rótulos externos
const MAX_LABEL_CHARS = 18;        // truncamento de nome longo
```

E um helper local:

```ts
function truncateLabel(v: string, max = MAX_LABEL_CHARS) {
  if (!v) return '';
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}
```

## Mudanças no `PieChartCard`

1. **Pré-filtragem de itens elegíveis a rótulo externo** (somente quando `rich`):
   - Calcular `pct = valor / total` para cada item preservando o índice original (para manter cor da paleta).
   - Marcar elegível se `pct*100 >= MIN_PIE_LABEL_PERCENT`.
   - Ordenar elegíveis por valor desc e manter apenas os primeiros `MAX_VISIBLE_PIE_LABELS`.
   - Itens não-elegíveis: continuam na pizza, na legenda e no tooltip — só não geram entry em `RichLabelsLayer`.

2. **`RichLabelsLayer`**:
   - Iterar sobre todos os data para acumular ângulos (necessário para posicionar corretamente), mas só empurrar para `left`/`right` os itens elegíveis.
   - `line1 = truncateLabel(name)`; `line2` permanece "valor (xx,x%)" via `formatRichLabel`.
   - Reintroduzir leader line curta (`<polyline>`) ligando borda da fatia à âncora do texto, com cor da fatia em `stroke-opacity: 0.5` — ajuda quando há colisão deslocada.
   - Manter `resolveCollisions` (já existe) mas com `minGap = blockH + 4`.

3. **Layout responsivo a rótulos**:
   ```ts
   const hasExternal = rich && elegiveis.length > 0;
   const outerRadius = hasExternal ? '58%' : (rich ? 82 : 90);
   const innerRadius = donut ? (hasExternal ? '38%' : (rich ? 50 : 55)) : 0;
   const cy = hasExternal ? '46%' : '50%';
   ```
   - Margem do `PieChart`: `{ top: 8, right: 32, bottom: 28, left: 32 }` quando `hasExternal`.

4. **Legenda**:
   - Quando `vc.legend.visible`, forçar `verticalAlign='bottom'`, `align='center'`, `layout='horizontal'`, `wrapperStyle={{ fontSize: 12, lineHeight: '16px', paddingTop: 8, maxHeight: 40, overflow: 'hidden' }}`.
   - Itens longos truncados no `formatter` da Legend (`truncateLabel(value, 22)`), nome completo preservado no tooltip.

5. **Tooltip**:
   - Sempre habilitado quando `vc.tooltip.visible`. Customizar `formatter` para devolver `[`${valueFormatter(v)} (${pct}%)`, nomeCompleto]` para que mesmo fatias sem rótulo externo mostrem nome, valor e %.

6. **Escopo restrito a Pizza/Rosca**: toda a lógica fica neste arquivo. Bar/Line/Area/Treemap/Map/KPI permanecem inalterados.

## Configuração visual (opcional, sem novos controles agora)

Não adicionar novos toggles à UI nesta passada. Os três limites (`MIN_PIE_LABEL_PERCENT`, `MAX_VISIBLE_PIE_LABELS`, `MAX_LABEL_CHARS`) ficam como padrão interno, mas exportados como constantes para futura exposição em `VisualConfigEditor` (gancho preparado, sem alterar `visualConfig.ts` agora).

## "Outros" — estrutura futura

Deixar a função de seleção de elegíveis isolada como `function pickLabeledSlices(data, total)` retornando `{ labeled: Set<index>, smallCount: number }`. Assim, uma futura opção "Agrupar fatias pequenas em Outros" só precisa pré-processar `data` antes do `<Pie>`, sem mexer no layer de rótulos.

## Verificação

- Abrir `/passagens-aereas` ou outro dashboard com gráfico Pizza/Rosca com muitas categorias (Tipo de Veículo no print do usuário) e conferir:
  - Sem sobreposição dos nomes.
  - Fatias < 3% sem rótulo externo, mas presentes no tooltip e na legenda.
  - Máximo 6 rótulos externos visíveis.
  - Legenda abaixo, sem invadir o gráfico.
- Reabrir o modal "Adicionar bloco" / "Configurar gráfico" para confirmar que a prévia tem o mesmo comportamento do widget final (mesmo componente).
- Conferir que Barras/Linhas/Área/Treemap continuam idênticos (nenhum arquivo deles é tocado).

## Arquivos

- Editar: `src/components/bi/charts/PieChartCard.tsx`
- Não alterar: `DonutChartCard.tsx` (herda automaticamente), `VisualConfigEditor.tsx`, `visualConfig.ts`, demais charts, backend/API/Cloud.
