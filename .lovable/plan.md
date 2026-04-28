## Plano: Drill-down nos gráficos de Meta (Semanal e Mensal)

### Objetivo
Adicionar drill-down clicável nas barras dos dois novos gráficos de meta (semanal e mensal) do **Relatório Semanal Obra**. Ao clicar numa barra, abrir um **modal de detalhamento** com a lista de obras/projetos daquele período, sem alterar os filtros principais da tela.

### O que o usuário verá
- Cursor pointer ao passar o mouse sobre as barras (semanal e mensal).
- Hint discreto no topo do card: "Clique numa barra para ver os detalhes do período".
- Ao clicar numa barra, abre um modal (`Dialog`) com:
  - **Título**: "Entregas da semana de DD/MM" ou "Entregas de mês/aaaa"
  - **Mini-KPIs no topo**: Peso total (kg), Peças, Cargas, Obras distintas, Projetos distintos, % da meta atingida
  - **Tabela** com as obras do período: Obra, Cliente, Cidade, Projeto, Data Inicial, Data Final, Cargas, Peças, Peso (kg)
  - Tabela ordenada por peso decrescente, com totais no rodapé
  - Botão de fechar
- Estado vazio caso a barra clicada esteja zerada: "Sem entregas neste período".

### Mudanças técnicas

**Arquivo editado:** `src/pages/producao/MetaEntregaSemanalChart.tsx`
- Adicionar estado `drillDown: { type: 'week' | 'month', label: string, rows: RelatorioRow[] } | null`.
- Criar handlers `handleWeekClick` e `handleMonthClick`:
  - Recebem o `payload` da barra (com `ts`).
  - Filtram `rows` cujo `data_inicial` cai dentro daquela semana (start..start+7d) ou mês (start..fim do mês).
  - Setam `drillDown` para abrir o modal.
- Adicionar `onClick` nas `<Bar>` e `cursor="pointer"` para indicar interatividade.
- Renderizar `<Dialog>` (shadcn) com:
  - Cabeçalho com período + KPIs calculados a partir das rows filtradas
  - `<DataTable>` simples ou `<Table>` do shadcn com as colunas listadas
  - Total no rodapé (peso, peças, cargas)
- Reusar `formatNumber` e tokens semânticos. Sem cores hardcoded.

### Validação
- Clicar numa barra com dados → modal abre com KPIs e tabela populados.
- Clicar numa barra zerada → modal abre mostrando "Sem entregas neste período".
- Comparar totais do modal com altura da barra (devem coincidir).
- Filtros principais da tela permanecem inalterados após fechar o modal.
