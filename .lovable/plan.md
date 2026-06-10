## Problema

Nos gráficos de pizza com rótulos enriquecidos, as fatias pequenas (TRATOR, CARREGADEIRA, EMPILHADEIRA — todas próximas a 3%) geram rótulos no mesmo ângulo e acabam **empilhados um sobre o outro** (ver "CARREGADEIRA / EMPILHADEIRA" sobrepostos na imagem).

A causa: `richLabelRenderer` no `PieChartCard.tsx` posiciona cada label puramente pelo `midAngle` da fatia, sem considerar colisão vertical com labels vizinhos.

## Solução: anti-colisão de rótulos externos (estilo "outside labels com leader lines")

Vou trocar a renderização label-a-label do Recharts por uma **camada única de labels desenhada após o Pie**, que:

1. Calcula a posição "ideal" de cada label (igual hoje: ângulo médio × raio + offset).
2. Separa em dois grupos: **lado esquerdo** (x < cx) e **lado direito** (x ≥ cx).
3. Ordena cada grupo por Y e aplica algoritmo de **empurra-vizinho**: se dois labels estão a menos de `minGap` (≈ altura do label + 4px), empurra o de baixo para baixo e o de cima para cima até caberem.
4. Limita ao retângulo do chart (não sai pelo topo/base).
5. Desenha **linha-guia** (leader line) curva da borda da fatia até o label ajustado, igual ferramentas BI clássicas (Power BI / Tableau).
6. Para fatias muito pequenas (< 2% por padrão, configurável), oculta o nome e mantém só valor+% — ou agrupa visualmente caso ainda colida.

### Mudanças técnicas

**`src/components/bi/charts/PieChartCard.tsx`**
- Remover `label={richLabelRenderer}` e `labelLine` do `<Pie>`.
- Adicionar um `<Customized component={RichLabelsLayer} />` dentro do `<PieChart>` que recebe via props os dados, total, raio, cx/cy e desenha:
  - Para cada fatia: ponto na borda → cotovelo → linha horizontal até o label.
  - Texto em 2 linhas (nome / valor+%), com `text-anchor` por lado.
- Função `resolveCollisions(items, minGap, chartHeight)`:
  - Pass 1: empurra para baixo varrendo top→bottom.
  - Pass 2: empurra para cima varrendo bottom→top.
- Ajustar `outerRadius` levemente (de 90 para ~78–82) quando `rich` ativo, para reservar margem lateral às leader lines.
- Aumentar margem do `ResponsiveContainer` lateral via padding interno do SVG (sem mexer no shell).

**Sem mudanças** em: VisualConfigEditor, visualConfig.ts, Bar/Line/Area/Treemap, backend, persistência.

### Critérios de aceite

- Em "Por Segmento" e "Por Tipo de Veículo" da Manutenção Frota: **nenhum rótulo se sobrepõe**.
- Linhas-guia conectam cada label à sua fatia mesmo quando o label foi deslocado.
- Pizza normal (sem rótulos enriquecidos) continua igual.
- Donut continua funcionando (mesmo componente).
- Funciona em qualquer página BI que use Pizza/Rosca.

### Arquivos a editar

- `src/components/bi/charts/PieChartCard.tsx` (único)
