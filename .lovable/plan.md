## Toolbar na tabela de Registros do `/frota`

Replicar no card "Registros" do FrotaDashboard a mesma toolbar usada em `PassagensDashboard` (Buscar, Ordenação, Agrupar, Exportar CSV/Excel), adaptando ao contexto de frota.

### Mudanças (apenas em `src/components/frota/FrotaDashboard.tsx`)

Substituir o bloco atual `'tabela-registros'` (linhas 368–373) por um `<Card>` com `CardHeader` + toolbar e `CardContent` com a tabela:

1. **Título**: `Registros (N)` onde N = `crossFiltered.length`.
2. **Buscar**: input compartilhado já existente `busca` / `setBusca` (mover apenas a UI; a lógica permanece — hoje o input já está na FilterBar, então duplicaríamos visualmente. Decisão: **mover** o `SearchFilter` da FilterBar para a toolbar do card de Registros, deixando a FilterBar só com os 4 multi-selects + botão Limpar).
3. **Ordenação** (novo state local `ordenacao`): `data_desc` (default), `data_asc`, `placa_az`, `placa_za`, `valor_desc`, `valor_asc`, `motorista_az`. Aplicada via `useMemo` sobre `crossFiltered` antes de passar à tabela.
4. **Agrupar Motorista** (botão toggle, `agruparMot`): quando ativo, renderizar em vez da `DataTableBI` uma lista de grupos por `motorista` (cabeçalho clicável colapsa/expande, com totais de qtd + valor); quando inativo, renderiza a `DataTableBI` normal. *Adaptação de "Agrupar Colaborador" para o contexto frota = motorista. Se preferir agrupar por Placa ou Centro de Custo, podemos trocar — ver pergunta.*
5. **Exportar CSV** e **Exportar Excel**: usar utilitário simples (CSV gerado em runtime; XLSX via `xlsx` se já estiver no projeto, senão CSV apenas). Exporta as linhas atualmente visíveis (`displayRows` = ordenadas + filtradas). Vou verificar disponibilidade de `xlsx` antes de implementar.

Layout/estilo idêntico ao de Passagens: `CardHeader` flex com título à esquerda e grupo de controles à direita, classes `h-8 text-xs`.

### Fora de escopo

- Não mexer em gráficos, KPIs, layout-edição ou cross-filter.
- Não alterar `PassagensDashboard`.
- Não alterar a lógica de filtros multi-select da FilterBar.

### Pergunta antes de implementar

O botão "Agrupar Colaborador" da imagem é de Passagens. Em Frota, o equivalente natural é **Motorista**, mas pode fazer mais sentido **Placa** ou **Centro de Custo**. Qual prefere?
- (A) Agrupar Motorista
- (B) Agrupar Placa
- (C) Agrupar Centro de Custo
