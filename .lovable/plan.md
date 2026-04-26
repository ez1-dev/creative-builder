# Melhorar gráfico "Tipo de Despesa" — estilo Power BI

A imagem de referência mostra o gráfico **MOTIVO VIAGEM** do Power BI, não tipo de despesa. Como os dados importados do BI têm a riqueza no campo `motivo_viagem` (FOLGA DE CAMPO, TRANSFERENCIA DE OBRA, CONTRATAÇÃO, etc.), o gráfico atual fica pobre quando agrupa por `tipo_despesa`.

## Mudanças no `src/components/passagens/PassagensDashboard.tsx`

### 1. Trocar agrupamento de tipo_despesa → motivo_viagem
- Renomear `porTipo` → `porMotivo`, agrupando por `motivo_viagem` (com fallback "Não informado" se vazio)
- Ordenar do maior para o menor valor
- Renomear título do card para **"Por Motivo de Viagem"**

### 2. Pie chart estilo Power BI
- Aumentar altura do gráfico de 260px → 320px
- `outerRadius` maior (110px) para dar mais presença
- Labels externas com formato exato da imagem: `MOTIVO R$X Mil (X.XX%)`
- Linhas conectoras (`labelLine`) dos slices até as labels
- Função custom de label que abrevia valores (ex.: 135702 → "R$135 Mil")
- Fonte das labels pequena (11px) para caber sem cortar

### 3. Paleta de cores estilo Power BI
- Substituir `COLORS` por: azul claro `#1f9bff`, azul escuro `#1e3a8a`, laranja `#f97316`, roxo `#7c3aed`, magenta `#ec4899`, amarelo `#eab308`, ciano `#06b6d4`, verde `#10b981`, vermelho `#ef4444`, violeta `#8b5cf6`
- Mesma paleta vai melhorar visualmente os outros gráficos também

### 4. Margens internas
- Adicionar `margin={{ top: 20, right: 20, bottom: 20, left: 20 }}` no PieChart para as labels externas não cortarem nas bordas

## O que **não** muda
- Filtros, KPIs, tabela e demais gráficos continuam idênticos
- Tipo de despesa segue existindo no formulário e na tabela — só não vira mais o gráfico de pizza

## Resultado esperado
Pizza com 8-10 fatias coloridas mostrando os motivos de viagem, com labels externas tipo `FOLGA DE CAMPO R$136 Mil (26,11%)` e linhas conectoras finas — visualmente equivalente à imagem do Power BI enviada.
