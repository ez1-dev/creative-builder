# Adicionar botão "Limpar filtros" — Passagens Aéreas

## O que será feito
Incluir um botão **Limpar** no painel de filtros do dashboard `/passagens-aereas` que zera todos os filtros de uma só vez: Colaborador, Centro de Custo, Tipo, Data início e Data fim.

## Onde
Arquivo: `src/components/passagens/PassagensDashboard.tsx` — painel de filtros (atualmente um `Card` com grid de 5 colunas, linhas 125–159).

## Como

1. Adicionar uma função `limparFiltros` que reseta os 5 estados:
   - `setFiltroColaborador('')`
   - `setFiltroCC('')`
   - `setFiltroTipo('todos')`
   - `setDataInicio('')`
   - `setDataFim('')`

2. Reorganizar o layout do card de filtros para acomodar o botão sem quebrar o grid:
   - Manter o grid atual de 5 colunas com os campos.
   - Adicionar uma linha de ações abaixo do grid, alinhada à direita, com o botão **Limpar** (`variant="outline"`, ícone `X` ou `RotateCcw` do lucide-react).
   - O botão fica desabilitado quando nenhum filtro está ativo (todos vazios + tipo = 'todos'), seguindo o padrão de comportamento de filtros do projeto.

3. Manter consistência visual com o resto do sistema (tokens semânticos, sem cores hardcoded).

## Resultado esperado
Um clique em **Limpar** restaura a visão completa dos 300 registros, KPIs e gráficos, sem precisar limpar campo por campo.
