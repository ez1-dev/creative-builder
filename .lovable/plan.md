## Objetivo
Aplicar ordenação automática "do maior para o menor" em todas as grids do BI Comercial, equivalente ao comportamento das Passagens Aéreas (onde os grupos/listagens já vêm ordenados por valor desc).

## Abordagem

A grid base é o `DataTable` (via wrapper `DataTableBI`). Ele já suporta clique no cabeçalho para ordenar, mas inicia sem ordenação aplicada — exibe os dados na ordem retornada pelo backend.

A mudança será mínima e centralizada no componente `DataTable`:

1. Adicionar suporte a `defaultSort?: { key: string; dir: 'asc' | 'desc' }` em `Column`/props (sem quebrar nada existente).
2. Se nenhum `defaultSort` for passado, aplicar fallback automático: ordenar pela **primeira coluna numérica detectada** em ordem decrescente, no estado inicial (`useState` inicial de `sortKey`/`sortDir`).
3. Propagar a prop opcional via `DataTableBI`.

Em `src/pages/bi/ComercialPage.tsx`, passar `defaultSort` explícito para as grids principais para garantir o critério correto:
- **Grid Mensal** (`colsMensal`): ordenar por `anomes_emissao` desc (mês mais recente no topo) **ou** por `vl_tot_fat` desc — confirmaremos com o fallback "primeira coluna numérica". Usaremos `vl_tot_fat` desc para alinhar com o padrão "maior → menor".
- **Grid Detalhamento por Nota Fiscal** (`colsDetalhes`): `vl_tot_fat` desc.
- **Demais grids BI** que usam `DataTableBI` (drill drawer e similares): herdam o fallback automático (1ª coluna numérica desc), sem precisar mudar página a página.

## Arquivos a alterar

- `src/components/erp/DataTable.tsx`
  - Adicionar prop opcional `defaultSort?: { key: string; dir: 'asc' | 'desc' }`.
  - Inicializar `sortKey`/`sortDir` com `defaultSort`, ou, se ausente, com a primeira coluna detectada como numérica em `desc`.
  - Manter a interação manual de clique no header inalterada.

- `src/components/bi/tables/DataTableBI.tsx`
  - Repassar a nova prop `defaultSort` para o `DataTable`.

- `src/pages/bi/ComercialPage.tsx`
  - Passar `defaultSort={{ key: 'vl_tot_fat', dir: 'desc' }}` para a `DataTableBI` da grid Mensal e da grid de Detalhamento por Nota Fiscal.

## Fora do escopo
- Nenhuma alteração de backend, API, drill ou colunas existentes.
- Sem mexer no comportamento de agrupamento (que já ordena grupos por 1ª coluna numérica desc).
- Sem mexer em `useBiClientesMap`, hooks ou ordem de hooks (problema #310 já tratado).

## Validação
- Abrir `/bi/comercial`, verificar:
  - Grid Mensal com linhas ordenadas por `vl_tot_fat` desc.
  - Detalhamento por Nota Fiscal com maiores valores no topo.
  - Clicar no header continua alternando asc/desc/none normalmente.
- Verificar que outras telas que usam `DataTable` (ERP) continuam funcionando — a mudança é retrocompatível: fallback só é aplicado quando há coluna numérica detectada e nenhum estado prévio.