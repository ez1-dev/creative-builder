

## Lista de operadores na Auditoria Apontamento Genius

### Objetivo
Adicionar uma seção "Resumo por Operador" que lista, conforme os filtros aplicados, cada operador com:
- Código do operador (`numcad`)
- Nome do operador (`nome_operador`)
- Total de horas apontadas
- Quantidade de OPs distintas trabalhadas
- Quantidade de apontamentos

### O que muda

**`src/pages/AuditoriaApontamentoGeniusPage.tsx`**
- Novo `useMemo` `operadoresAgg` que percorre as linhas já carregadas (`data.dados` normalizadas) e agrupa por `numcad`/`nome_operador`, somando `horas_realizadas` (min → h), contando apontamentos e usando `Set<numero_op>` para OPs distintas.
- Novo bloco visual entre os KPIs e a tabela principal: card colapsável "Operadores no período" com:
  - Tabela compacta usando `DataTable` (4 colunas: Código, Operador, OPs, Horas, Apontamentos).
  - Ordenação default: maior total de horas primeiro.
  - Busca rápida e total no rodapé (somatório de horas e contagem de OPs únicas globais).
  - Clique numa linha → preenche o filtro `operador` com o nome e dispara a pesquisa (drill rápido).
- Respeita os filtros porque é derivado de `data.dados`. Se o usuário usar paginação, o agregado é da página atual; vou exibir um aviso pequeno tipo "agregado da página atual — use Exportar para visão completa" quando `total_paginas > 1`.

### Detalhe técnico
- Reaproveita `normalizeRowApont` que já mapeia `nome_operador`, `numcad`, `horas_realizadas` (em minutos), `numero_op`.
- Sem novo endpoint — agregação 100% client-side sobre `data.dados`.
- Sem mudança de contrato com backend.
- Card colapsado por padrão para não poluir a tela.

### Validação
- Aplicar filtro de período + clicar Pesquisar → card "Operadores no período" mostra lista com código, nome, OPs, horas, apontamentos.
- Mudar filtro de origem/operador/status → lista atualiza junto.
- Clicar numa linha → filtro Operador é preenchido e a busca refaz só com aquele operador.
- Quando há mais de uma página, banner indica que o agregado é da página visível.

