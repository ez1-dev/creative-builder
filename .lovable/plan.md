## Resolver corte dos nomes em "Por Motivo de Viagem"

Hoje cada fatia do Pie renderiza `Nome R$X Mil (Y%)` numa única linha SVG. Em motivos longos (ex: "Viagem Administrativa") o texto sai pela borda do card — visível principalmente na página de compartilhamento.

Solução: manter labels nas fatias, mas dar mais espaço e quebrar em 2 linhas.

### Alterações em `src/components/passagens/PassagensDashboard.tsx`

1. **Aumentar margens do PieChart** (desktop) para reservar espaço para as labels:
   - De `{ top: 20, right: 30, bottom: 20, left: 30 }` para `{ top: 30, right: 90, bottom: 30, left: 90 }`.
2. **Reduzir `outerRadius`** no desktop de `100` para `85` para sobrar mais espaço externo às labels.
3. **Aumentar `height`** do `ResponsiveContainer` no desktop de `320` para `380`.
4. **Renderizar label customizado em 2 linhas** (apenas desktop) usando função que retorna um elemento SVG `<text>` com dois `<tspan>`:
   - Linha 1: `Nome do motivo` (com truncamento >24 chars + reticências)
   - Linha 2: `R$X Mil (Y%)`
   - Posicionamento polar igual ao default (cos/sin de midAngle, raio = outerRadius + 22).
   - `textAnchor` dinâmico (`start` ou `end`) conforme o lado.
5. Mobile permanece igual (só `%` dentro da fatia + legenda embaixo já existente).

A página de compartilhamento (`PassagensAereasCompartilhadoPage`) usa o mesmo `PassagensDashboard`, então herda o fix automaticamente.

### Fora do escopo

- Não mexer no comportamento de clique/seleção do gráfico.
- Não mexer nos demais gráficos (Evolução, Top CC, Mapa).
