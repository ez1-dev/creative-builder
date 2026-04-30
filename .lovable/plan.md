## Paginação no card Registros (Passagens Aéreas)

Hoje o card "Registros" renderiza **todas** as linhas de uma vez e o "Subtotal · N registros" aparece como rodapé fixo no final da lista — quando há muitos registros, ele fica visualmente muito abaixo (mesmo com `sticky`, em telas grandes o card cresce e o subtotal só aparece no fim).

Vou quebrar em páginas, fazendo o Subtotal aparecer imediatamente após a última linha da página atual.

### Comportamento

- Padrão: **25 registros por página**, com seletor para escolher 25 / 50 / 100 / Todos.
- Paginação aplicada nos dois modos:
  - **Tabela** (desktop): linhas paginadas + `TableFooter` com Subtotal logo após a última linha da página.
  - **Cards** (mobile/compacto): cards paginados + barra de Subtotal logo abaixo da última linha.
- **Subtotal mostra os totais da página atual + total geral filtrado**, no formato:
  `Subtotal página · 25 de 312 registros · R$ 18.420,00 (página) · R$ 245.300,00 (total)`
- Controles de navegação abaixo do subtotal: `« Anterior` · `Página 1 de 13` · `Próxima »` + seletor de "registros por página".
- Resetar para página 1 automaticamente quando: `busca`, `ordenacao`, qualquer filtro ou cross-filter mudar, ou quando `agruparColab` for alternado.
- Quando **"Agrupar Colaborador"** estiver ativo, manter o comportamento atual (sem paginação por linha — paginar não faz sentido com grupos colapsáveis); apenas o modo "lista" é paginado.
- Remover o `sticky bottom-0` do footer/subtotal, já que com poucas linhas por página ele naturalmente fica logo abaixo.

### Alterações técnicas

Arquivo único: `src/components/passagens/PassagensDashboard.tsx`

1. Novos states:
   - `pageSize: number` (default 25)
   - `pageIndex: number` (default 0)

2. Novo `useMemo` `pagedRows`:
   - Se `agruparColab` ou `pageSize === Infinity` → retorna `displayRows` inteiro.
   - Senão → `displayRows.slice(pageIndex*pageSize, (pageIndex+1)*pageSize)`.

3. Novo `useMemo` `subtotalPagina` somando `valor` de `pagedRows`.

4. `useEffect` que zera `pageIndex` quando mudar `busca`, `ordenacao`, `agruparColab`, `crossFiltered.length`.

5. No JSX do bloco `'tabela-registros'`:
   - Substituir `displayRows.map(...)` por `pagedRows.map(...)` no modo tabela e no modo cards (apenas quando não agrupado).
   - Atualizar o `TableFooter`/barra de subtotal para mostrar duas linhas: subtotal da página + total geral.
   - Adicionar logo abaixo do `Table`/lista um rodapé de paginação (`Pagination` do shadcn já presente no projeto, ou botões simples) com:
     - seletor de page size (`Select` do shadcn)
     - botões anterior/próxima
     - texto "Página X de Y"
   - Esconder o rodapé de paginação quando `agruparColab` ou quando `displayRows.length <= pageSize`.

6. Remover classes `sticky bottom-0 z-10 ...` do `TableFooter` e da barra de subtotal nos cards (já que o subtotal agora aparece naturalmente após poucas linhas).

### Fora do escopo

- O modo "Agrupar Colaborador" continua sem paginação (grupos colapsáveis já organizam).
- Os outros blocos (KPIs, mapa, gráficos) não mudam.
- Persistência da preferência de page size por usuário fica para depois.
