
# Plano — Pizza/Rosca: modo compacto automático e rótulo externo só com folga

Alvo único: `src/components/bi/charts/PieChartCard.tsx`. `DonutChartCard` herda; preview no `ConfigureChartDialog` herda; nada do backend/API/Cloud muda.

## Decisão automática de modo

Medir largura real do container via `ResponsiveContainer`/`Customized` (já temos `props.width/height` no layer). A decisão é feita pelo SVG renderer com base no tamanho real e em `data.length`:

```ts
const COMPACT_WIDTH = 760;
const COMPACT_HEIGHT = 360;
const MAX_EXTERNAL_PIE_LABELS = 6;
const MIN_EXTERNAL_LABEL_PERCENT = 4;     // antes era 3
const MIN_INSIDE_LABEL_PERCENT = 6;       // fatias ≥ 6% recebem % dentro
const MAX_DATA_FOR_EXTERNAL = 8;          // mais que isso → sempre compacto

const isCompactPie = cw < COMPACT_WIDTH || ch < COMPACT_HEIGHT || data.length > MAX_DATA_FOR_EXTERNAL;
const allowExternal = rich && !isCompactPie && data.length <= MAX_DATA_FOR_EXTERNAL;
```

A escolha entre "compact" e "external" passa a ser feita dentro do componente `Customized` (que recebe o `width/height` reais). Quando compacto, não desenhamos a leader-line layer; quando externo permitido, desenhamos o `RichLabelsLayer` atual (com limite ainda de 6 e ≥4%).

Como a decisão depende da largura real, removemos as props `outerRadius/cy/margin` "estáticas" derivadas de `rich` e usamos valores **seguros para o pior caso** (modo compacto) por padrão, deixando o layer externo apenas pintar quando houver folga. O layer compacto roda dentro do mesmo `Customized` e desenha labels DENTRO das fatias (≥ 6%) ou nada.

## Mudanças no `PieChartCard`

1. **Constantes** no topo (substituem as atuais):
   ```ts
   export const COMPACT_PIE_WIDTH = 760;
   export const COMPACT_PIE_HEIGHT = 360;
   export const MAX_EXTERNAL_PIE_LABELS = 6;
   export const MIN_EXTERNAL_LABEL_PERCENT = 4;
   export const MIN_INSIDE_LABEL_PERCENT = 6;
   export const MAX_DATA_FOR_EXTERNAL = 8;
   export const MAX_LABEL_CHARS = 18;
   ```

2. **Layout estático sempre seguro** (não tenta abrir margem para externo "preventivamente"):
   ```ts
   const outerRadius = rich ? '58%' : 90;
   const innerRadius = donut ? (rich ? '35%' : 55) : 0;
   const cy = '45%';
   const margin = { top: 10, right: 20, bottom: 70, left: 20 };
   ```
   Quando o layer detectar `allowExternal`, ele desenha texto/leader fora do raio mas **dentro** dos 20px de margem horizontal — não há reflow.

3. **Novo `PieLabelsLayer`** (substitui `RichLabelsLayer`), invocado sempre que `vc.dataLabels.visible`. Decide modo internamente:
   - `compact`: para cada fatia com `pct ≥ MIN_INSIDE_LABEL_PERCENT`, desenha `${pct}%` (uma linha) no centroide da fatia, cor branca/foreground com contraste sutil (`fill="hsl(var(--primary-foreground))"` quando dentro de fatia colorida; usar `fill="#fff"` simples já legível na paleta atual). Truncamento desnecessário pois é só %.
   - `external` (somente se `rich && !isCompactPie && data.length ≤ 8`): comportamento atual do `RichLabelsLayer`, com `MIN_EXTERNAL_LABEL_PERCENT=4` e `MAX_EXTERNAL_PIE_LABELS=6`. Mantém leader lines, anti-colisão, truncamento `MAX_LABEL_CHARS`.
   - Quando `rich && isCompactPie`: usa o modo compacto (só % dentro). O `richLabel` continua respeitado, mas o layout adaptativo decide a forma.
   - Quando `!rich` e `vc.dataLabels.visible`: usa o `LabelList` atual (modo simples). Sem mudança.

4. **Remover** o `LabelList` de modo simples atual (mantém) e o uso atual de `RichLabelsLayer` (substituído pelo unificado). `outsideOnly` fica controlado pelo layer.

5. **Tooltip**: manter o `tooltipFormatter` atual (já mostra `valor (%) — nome completo`).

6. **Legenda**: sempre `verticalAlign: 'bottom'`, `align: 'center'`, `layout: 'horizontal'`, `wrapperStyle: { fontSize: 12, lineHeight: '16px', paddingTop: 8, maxHeight: 56, overflowY: 'auto', width: '100%' }`, `formatter` truncando para 22 chars. Não respeita mais `vc.legend.position` para Pizza/Rosca (regra do briefing: "legenda abaixo, sem invadir"). Mantém `vc.legend.visible`.

## Texto informativo na aba "Rótulos"

`src/components/bi/visual/VisualConfigEditor.tsx`: abaixo do toggle "Rótulos enriquecidos", adicionar uma única linha:

```
<p className="text-[11px] text-muted-foreground">
  Em cards pequenos, rótulos externos são simplificados automaticamente para evitar sobreposição.
</p>
```

Sem novos toggles.

## Escopo

- Editar: `src/components/bi/charts/PieChartCard.tsx`, `src/components/bi/visual/VisualConfigEditor.tsx`.
- Não tocar: `DonutChartCard`, `BarChartCard`, `LineChartCard`, `AreaChartCard`, `TreemapCard`, `MapCard`, KPIs, `visualConfig.ts`, backend, Cloud.

## Verificação

1. `/manutencao-frota` (card "Por Segmento", "Por Tipo de Veículo") — labels não saem do card, apenas % dentro das fatias ≥ 6%, legenda abaixo.
2. `/passagens-aereas` — mesmo comportamento.
3. Abrir modal "Configurar gráfico" e ver que o preview (pequeno) também usa modo compacto.
4. Caso exista visualização ampliada (≥ 760px de largura e ≤ 8 categorias e `richLabel` ligado), labels externos aparecem com leader line, máximo 6, ≥ 4%, sem corte.
5. Tooltip continua mostrando nome completo + valor + %.
6. Bar/Line/Area/Treemap intactos.
