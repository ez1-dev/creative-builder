## Objetivo
Mostrar `código — nome` do cliente na grid "Detalhamento por Nota Fiscal" do BI Comercial (coluna Cliente e cabeçalho de agrupamento), buscando os nomes da tabela `bi_cliente` no Cloud. Sem alterações de backend.

## Arquivos

### 1. `src/hooks/useBiClientesMap.ts` (novo)
- React Query (`queryKey: ['bi_cliente_map']`, `staleTime: 5min`).
- Lê `bi_cliente` (`cd_cliente, nm_cliente, nm_fantasia`) paginado via `.range()` em blocos de 1000 até esgotar.
- Retorna `Map<string, { nm_cliente?: string; nm_fantasia?: string }>` com chave `String(cd_cliente).trim()`.

### 2. `src/pages/bi/ComercialPage.tsx`
- Consumir `useBiClientesMap()`.
- Antes de passar para o `DataTable`, montar `detalhesEnriquecidos`:
  ```ts
  const cd = String(row.cd_cliente ?? '').trim();
  const c = clientesMap?.get(cd);
  const nome = c?.nm_fantasia || c?.nm_cliente || '';
  return { ...row, cliente_label: nome ? `${cd} — ${nome}` : cd };
  ```
- Na coluna Cliente de `colsDetalhes`: trocar `key: 'cd_cliente'` por `key: 'cliente_label'` (header "Cliente", `groupable: true`).
- Manter `cd_cliente` intacto no objeto original (drill, filtros e chamadas continuam usando o código).

## Comportamento
- Agrupamento por Cliente passa a exibir `Cliente: 8865 — NOME` (usa `cliente_label`).
- Cliente sem match em `bi_cliente` → exibe apenas o código, sem erro.
- Backend (`/api/bi/comercial/detalhes`, drill `NOTA_FISCAL`) não é tocado.

## Fora de escopo
- Nomes de revenda/produto/obra.
- Mudanças no FastAPI.
