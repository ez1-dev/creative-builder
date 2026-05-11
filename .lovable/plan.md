# Gráficos interativos — Manutenção de Frota

Objetivo: ao clicar em uma barra/fatia/linha de qualquer gráfico no dashboard `/frota`, o valor vira um filtro ativo. Todos os demais gráficos, KPIs e tabela são recalculados imediatamente. Também adicionar uma visão de **drill-down hierárquico** para explorar gastos por níveis.

## Comportamento

1. **Cross-filter por clique** (estilo Power BI / igual ao módulo Passagens Aéreas):
   - Clicar em uma barra de "Evolução mensal" → adiciona/remove o mês ao filtro de mês.
   - Clicar em uma fatia de "Distribuição por Segmento" → adiciona/remove o segmento.
   - Clicar em uma barra dos rankings (Top Veículos, Fornecedores, Centros de Custo, Motoristas) → adiciona/remove o item ao filtro correspondente.
   - Os filtros aplicados via clique se somam aos filtros do `FilterBar` (Segmento, Placa, C.Custo, Motorista, Busca).
   - Múltiplos cliques no mesmo gráfico = multi-seleção (toggle).
   - A barra/fatia selecionada fica destacada; as outras ficam esmaecidas.

2. **Chips de filtros ativos** acima dos KPIs:
   - Mostram cada seleção (Mês: jan, Segmento: PNEU, Veículo: ABC-1234, …) com um "x" para remover individualmente.
   - Botão "Limpar tudo" reseta cross-filter + FilterBar.

3. **Recalcular tudo a partir do `crossFiltered`**:
   - KPIs (Total, Manutenções, Ticket médio, Veículos atendidos).
   - Todos os gráficos.
   - Tabela inferior.

4. **Drill-down hierárquico** (novo card no fim do grid):
   - Tabela expansível com níveis configuráveis pelo usuário: Segmento → Centro de Custo → Placa → Fornecedor → Descrição.
   - Cada nível mostra contagem e valor total. Expandir abre o próximo nível.
   - Usa o componente `DrillDownTable` já existente em `src/components/bi/tables/DrillDownTable.tsx`.
   - Um seletor de ordem dos níveis (drag-free, apenas chips clicáveis) permite escolher a hierarquia desejada.
   - Respeita o `crossFiltered` (ou seja, drill e cross-filter combinam).

## Mudanças técnicas (apenas frontend)

Arquivo: `src/components/frota/FrotaDashboard.tsx`

- Adicionar states de multi-seleção: `selMes`, `selSegmento`, `selPlaca`, `selFornecedor`, `selCC`, `selMotorista` (todos `string[]`).
- Calcular `crossFiltered` a partir de `filtered` aplicando essas seleções (mesmo pattern do `PassagensDashboard.tsx`, linhas 293–310).
- KPIs e todos os gráficos passam a consumir `crossFiltered`.
- Passar `onItemClick` para cada `BarChartCard` / `RankingChartCard` chamando um helper `toggleItem(arr, value)`.
- Substituir `DonutChartCard` "Distribuição por Segmento" por `PieChartCard` (que aceita `onClick`) **ou** adicionar suporte a `onItemClick` no `DonutChartCard`. Caminho mais simples: trocar por `PieChartCard` já existente na lib BI.
- Renderizar um bloco de chips de filtros ativos (componente leve inline, igual passagens linhas 800–845).
- Adicionar card `Drill-down hierárquico` usando `DrillDownTable` com `levels` controlados por estado local e seletor de ordem.
- Destaque visual da seleção: usar prop `activeLabels` quando suportada pelos chart cards; se não suportada, manter apenas o efeito via chips + filtragem (sem mudar a lib BI).

## Fora de escopo

- Não mexer no backend, migrations, RLS ou na página compartilhada (pode ser feito num passo seguinte se desejado).
- Não alterar a biblioteca `@/components/bi` além do estritamente necessário (idealmente nenhuma alteração).

## Observação

Quer que o **link público compartilhado** (`ManutencaoFrotaCompartilhadoPage`) também receba o mesmo comportamento de cross-filter e drill nesta mesma rodada? Posso incluir.
