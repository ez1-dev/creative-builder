## Painel de Compras — "Registros: Todos" via loop de páginas

Hoje o branch `tamanhoEfetivo === 'todos'` em `src/pages/PainelComprasPage.tsx` (linhas 192-204) faz uma única chamada com `todos: true` e usa só `retorno.dados` daquela resposta. Trocar pelo loop multi-página, conforme solicitado.

### Mudança única — `src/pages/PainelComprasPage.tsx`, branch `tamanhoEfetivo === 'todos'`

1. Definir `PAGE_SIZE = 1000` e `MAX_PAGINAS = 200` (trava de segurança).
2. Buscar página 1: `api.get('/api/painel-compras', buildParams(1, PAGE_SIZE))` — sem `todos:true`.
3. Ler `total_paginas` e `total_registros` da resposta.
4. Se `total_paginas > 1`:
   - Se `total_paginas > MAX_PAGINAS` → `toast.warning` avisando que será truncado em `MAX_PAGINAS * PAGE_SIZE` registros e usar `Math.min(total_paginas, MAX_PAGINAS)`.
   - `Promise.all` das páginas `2..N` com os mesmos filtros (`buildParams(p, PAGE_SIZE)`).
5. Concatenar `dados` na ordem (página 1 + páginas 2..N).
6. `setData({ ...primeira, dados: dadosConcat, pagina: 1, tamanho_pagina: dadosConcat.length, total_paginas: 1 })` para a grid renderizar tudo sem paginação interna.
7. `setPagina(1)`; `trackSearch(filters, primeira.total_registros)` quando `page === 1`.

### Fora de escopo

- Branch de tamanhos numéricos (continua paginado, 1 chamada).
- Bloco do dashboard agregado / `dadosAgregados` (KPIs continuam vindo de `/api/painel-compras-dashboard`, intocado).
- Rodapé "Exibindo X de Y registros filtrados" — já implementado anteriormente, sem mudança.
- Exportação Excel, demais abas, backend.

### Validação

- Selecionar Registros = Todos com filtro amplo → Network mostra `/api/painel-compras?...&pagina=1&tamanho_pagina=1000`, seguido de chamadas paralelas `pagina=2..N` com os mesmos filtros (sem `todos=true`).
- Grid renderiza todos os registros; rodapé mostra `Exibindo X de Y registros filtrados` com `X === Y`.
- KPIs continuam batendo com `/api/painel-compras-dashboard`.
