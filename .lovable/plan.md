## Adicionar botão "Limpar filtros" na FilterBar do `/frota`

Hoje o botão "Limpar tudo" só aparece quando há cross-filter (clique em gráficos). Se o usuário usa apenas os filtros multi-select da barra (Segmento, Placa, Centro de Custo, Motorista) ou o "Buscar", não há atalho visível para limpar.

### Mudança (apenas em `src/components/frota/FrotaDashboard.tsx`)

1. Adicionar um botão **"Limpar filtros"** dentro da `FilterBar`, ao lado do `SearchFilter` (linha ~421).
2. O botão chama a função `limparTudo` já existente (que zera multi-selects da barra, busca e cross-filters de gráficos).
3. O botão fica **desabilitado** quando não há nada a limpar: `segmento.length + placa.length + centroCusto.length + motorista.length + busca.length + totalAtivos === 0`.
4. Estilo discreto: `variant="ghost"` ou `outline`, ícone `X` do lucide-react, tamanho `sm`, alinhado à direita.

### Fora de escopo

- Não alterar a lógica de filtros, gráficos, layout ou cross-filter.
- Não mexer em `PassagensDashboard` nem componentes compartilhados.
- O bloco de chips "Filtros ativos" continua mostrando seu próprio "Limpar tudo" como hoje (redundância intencional para quando há cross-filter de cliques).
