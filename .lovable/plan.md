## Cross-filter interativo nos gráficos do Dashboard de Passagens

Tornar os gráficos do `/passagens-aereas` **clicáveis e interconectados**, no estilo Power BI: clicar em um elemento (barra/fatia) filtra todos os outros visuais e KPIs; clicar de novo no mesmo elemento desmarca.

### Comportamento

1. **Evolução Mensal (barras)** → clicar em uma barra (ex: "2026-01") filtra todos os demais visuais, KPIs e a tabela para aquele mês.
2. **Por Motivo de Viagem (pizza)** → clicar em uma fatia filtra por aquele motivo.
3. **Top 15 Centros de Custo (barras)** → clicar em uma barra filtra por aquele Centro de Custo.
4. Os filtros cruzados são **acumulativos** com os filtros do topo (Colaborador, Tipo, Mês, etc).
5. Clicar no mesmo elemento novamente **desmarca** aquele filtro cruzado.
6. O elemento selecionado fica visualmente destacado (cor primária forte; demais ficam mais claros / com opacidade reduzida).
7. Um indicador acima dos KPIs mostra os filtros cruzados ativos com um "x" para limpar individualmente; o botão "Limpar" também zera os cross-filters.

### Mudanças técnicas (`src/components/passagens/PassagensDashboard.tsx`)

- Adicionar 3 novos estados de seleção:
  - `selectedMes: string | null`
  - `selectedMotivo: string | null`
  - `selectedCC: string | null`
- Criar um `crossFiltered` derivado de `filtered`, aplicando os 3 cross-filters por cima dos filtros do topo.
- **KPIs e a tabela** passam a usar `crossFiltered`.
- **Cada gráfico** continua sendo calculado a partir de `filtered` **sem aplicar a sua própria seleção**, para que o usuário enxergue todas as opções e o destaque visual da seleção (padrão Power BI). Os outros dois gráficos refletem o cross-filter atual.
  - `porMes` ignora `selectedMes` (mas aplica `selectedMotivo` e `selectedCC`).
  - `porMotivo` ignora `selectedMotivo` (mas aplica `selectedMes` e `selectedCC`).
  - `porCentroCusto` ignora `selectedCC` (mas aplica `selectedMes` e `selectedMotivo`).
- Handlers `onClick` nos componentes do Recharts (`<Bar onClick>`, `<Pie onClick>`) com toggle (clicar igual = limpar).
- Destaque visual: usar `<Cell>` por item nos `<Bar>` e nos `<Pie>` com cor cheia para o selecionado e opacidade ~0.35 para os demais (quando há seleção); cor padrão quando não há seleção.
- Faixa de "chips" acima dos KPIs listando seleções ativas (ex: `Mês: Jan/2026 ✕`, `Motivo: ... ✕`, `CC: ... ✕`), só aparece se houver alguma.
- Atualizar o botão **Limpar** existente para também zerar `selectedMes`, `selectedMotivo` e `selectedCC`, e ajustar a condição de `disabled`.
- Cursor `pointer` nos elementos clicáveis.

### Fora do escopo

- Não muda o módulo `PassagensAereasCompartilhadoPage` (página pública). Se quiser o mesmo comportamento lá, posso replicar em uma próxima rodada.
- Não cria persistência das seleções em URL/localStorage.