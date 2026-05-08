## Objetivo
Fazer a pré-visualização voltar a aparecer ao selecionar tipo e série nos diálogos de gráfico de Passagens Aéreas.

## O que vou ajustar
1. Garantir que o preview receba dados mesmo dentro do diálogo
- Remover a dependência frágil do contexto visual do diálogo/portal.
- Passar os dados necessários do dashboard para os diálogos de forma explícita, para o preview não depender de `usePageData()` estar acessível naquele ponto da árvore.

2. Tornar a inicialização do preview mais confiável
- Revisar a sincronização de `componentId`, `seriesKey`, título e cor quando o modal abre.
- Garantir fallback válido para a primeira série disponível quando existir schema/dados carregados.

3. Tratar estados vazios sem “sumir” o gráfico
- Se houver série selecionada mas os dados estiverem vazios, manter a área de preview renderizada com estado vazio do componente em vez da mensagem genérica.
- Reservar a mensagem “Selecione tipo e série para visualizar” apenas para ausência real de seleção.

4. Validar os dois fluxos
- Conferir tanto “Adicionar novo gráfico” quanto “Configurar gráfico”, porque hoje os dois usam a mesma lógica de preview.

## Arquivos previstos
- `src/components/passagens/AddChartDialog.tsx`
- `src/components/passagens/ConfigureChartDialog.tsx`
- `src/components/passagens/PassagensDashboard.tsx`

## Detalhes técnicos
- Hoje o preview só renderiza quando `def && seriesKey && ctx`.
- O `ctx` vem de `usePageData()`, mas os diálogos são renderizados via portal e esse acoplamento é o candidato mais provável para o estado nulo/intermitente.
- Vou substituir essa dependência por props com `kpis`, `series` e `rows`, mantendo o mesmo renderer do `componentRegistry` para não mudar o comportamento dos gráficos em si.