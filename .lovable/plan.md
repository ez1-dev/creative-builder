## Contexto

O erro relatado (React #310 — "Rendered more hooks than during the previous render") indica que algum Hook está sendo chamado em ordem diferente entre renders. Auditando `src/pages/bi/ComercialPage.tsx` o código atual já tem todos os hooks em nível de função (sem `if`/`map`/early-return antes deles), mas o `useBiClientesMap()` está intercalado no meio de derivações de dados (linha 314, depois de `const detalhesRaw = qDetalhes.data ?? []`). Isso funciona, porém é frágil: qualquer edição futura que adicione um `return` condicional antes dele reintroduz o bug.

A correção defensiva é reagrupar todos os hooks no topo do componente, antes de qualquer derivação de dados, e garantir que a coluna Revenda continue sendo controlada apenas pelo conteúdo do `useMemo` (já está, mantém).

## Mudanças em `src/pages/bi/ComercialPage.tsx`

1. Mover `const { data: clientesMap } = useBiClientesMap();` (linha 314) para junto do bloco de `useQuery` (perto da linha 208), antes das constantes `kpis/mensal/mix/...`.
2. Manter `useMemo` de `detalhes`, `colsDetalhes` e demais memos onde já estão — todos já são top-level.
3. Manter a lógica condicional da coluna Revenda **dentro** do `useMemo` `colsDetalhes` (já implementada via `unidade === 'ESTRUTURAL ZORTEA' ? cols.filter(...) : cols`).
4. Não alterar `src/hooks/useBiClientesMap.ts` — já chama `useQuery` no topo e faz paginação dentro da `queryFn` (correto).

## Fora de escopo

- Backend, API, contrato de drill, demais colunas/widgets.
- Lógica de negócio da coluna Revenda (regra já está correta).
- `useBiClientesMap` (já está conforme).

## Validação

- Abrir BI Comercial, alternar unidade GENIUS / ESTRUTURAL ZORTEA / Consolidado, abrir “Detalhamento por Nota Fiscal”, agrupar por Cliente. Confirmar ausência do erro #310 no console.
