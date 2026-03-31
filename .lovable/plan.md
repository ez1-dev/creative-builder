

# Filtro de Busca Rápida em Todas as Grids

## Objetivo
Adicionar um campo de busca rápida acima de cada `DataTable` que filtra os resultados já carregados em tempo real, pesquisando em todas as colunas visíveis.

## Alteração

### Arquivo único: `src/components/erp/DataTable.tsx`
- Adicionar estado interno `searchTerm` com um `Input` de busca acima da tabela (ícone de lupa, placeholder "Buscar nos resultados...")
- Filtrar `data` localmente: para cada linha, converter todos os valores das colunas em string e verificar se contém o termo digitado (case-insensitive)
- O campo de busca só aparece quando há dados (`data.length > 0`)
- Exibir contador de resultados filtrados vs total (ex: "Exibindo 12 de 50")
- Adicionar prop opcional `enableSearch?: boolean` (default `true`) para permitir desabilitar em casos específicos

Como a alteração é centralizada no componente `DataTable`, todas as páginas (Estoque, Compras, Onde Usa, BOM, Notas, etc.) ganham o filtro automaticamente sem nenhuma mudança.

