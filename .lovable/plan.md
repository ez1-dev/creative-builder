

## Paginação no card "Operadores no período"

### Situação atual
O card mostra o aviso "Agregado da página atual (1 de 15). Use Exportar para visão completa." mas o agregado é feito só sobre `data.dados` (página atual da tabela principal). Não há como navegar entre páginas dentro do próprio card — o usuário depende da paginação da tabela principal.

### O que muda
Adicionar paginação **interna** ao card "Operadores no período" em `src/pages/AuditoriaApontamentoGeniusPage.tsx`, permitindo navegar pela lista de operadores agregados sem mexer na tabela principal.

### Implementação

**`src/pages/AuditoriaApontamentoGeniusPage.tsx`**
- Novo estado local: `const [paginaOperadores, setPaginaOperadores] = useState(1)` e constante `OPERADORES_POR_PAGINA = 10`.
- Derivar `operadoresPaginados` via `useMemo` a partir de `operadoresAgg`:
  ```ts
  const totalPaginasOp = Math.ceil(operadoresAgg.length / OPERADORES_POR_PAGINA);
  const inicio = (paginaOperadores - 1) * OPERADORES_POR_PAGINA;
  const operadoresPaginados = operadoresAgg.slice(inicio, inicio + OPERADORES_POR_PAGINA);
  ```
- Passar `operadoresPaginados` (em vez de `operadoresAgg`) para o `DataTable`.
- Adicionar `<PaginationControl>` (já existe em `src/components/erp/PaginationControl.tsx`) abaixo do `DataTable` do card, usando:
  - `pagina={paginaOperadores}`
  - `totalPaginas={totalPaginasOp}`
  - `totalRegistros={operadoresAgg.length}`
  - `onPageChange={setPaginaOperadores}`
- Reset automático: `useEffect` que zera `paginaOperadores` para `1` quando `operadoresAgg.length` mudar (novo filtro/pesquisa).
- Esconder o controle quando `totalPaginasOp <= 1`.

### Detalhe sobre o aviso existente
O aviso "Agregado da página atual (1 de 15)" continua igual — refere-se à paginação da **tabela principal** de apontamentos (que vem do backend). A nova paginação é só dentro do card de operadores e opera sobre o agregado já calculado.

### Validação
- Após pesquisar com muitos operadores, o card mostra 10 operadores por vez + controle de paginação no rodapé com "Página 1 de N (X registros)".
- Botões ‹‹ ‹ › ›› navegam corretamente.
- Mudar filtro e pesquisar de novo → card volta para página 1 automaticamente.
- Se houver ≤10 operadores, controle de paginação não aparece.
- Ordenação por colunas (clique no header) continua funcionando dentro da página atual.

