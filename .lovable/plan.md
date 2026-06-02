## Painel de Compras — "Registros: Todos" buscando todas as páginas

### Problema
Hoje `tamanhoPagina === 'todos'` apenas envia `tamanho_pagina=100000` em uma única request. Se o backend limitar o tamanho de página, a tela carrega só a primeira página e exibe parcial.

### Solução (apenas `src/pages/PainelComprasPage.tsx`)

1. **`search(page, tamanhoOverride)` — branch "todos"**
   Quando `tamanhoEfetivo === 'todos'`:
   - Buscar página 1 com `tamanho_pagina = 1000` (tamanho de página seguro/padrão) usando `buildParams(1, 1000)`.
   - Ler `total_paginas` e `total_registros` do retorno.
   - Disparar em paralelo (`Promise.all`) as páginas `2..total_paginas`, com um cap defensivo (ex.: máx. 200 páginas / 200k registros) para evitar travar o navegador; se exceder, parar e exibir toast informativo.
   - Concatenar todos os `dados` na ordem das páginas.
   - Setar `data` com `{ ...primeiraPagina, dados: concatenados, pagina: 1, tamanho_pagina: concatenados.length, total_paginas: 1 }` para que o restante da tela continue funcionando.
   - `setPagina(1)`.
   - Manter o fluxo agregado/dashboard atual (KPIs continuam vindo de `/api/painel-compras-dashboard` ou `dadosAgregados`, não da página). Sem mudanças nessa parte.
   - Usar o mesmo `setLoading(true/false)` global enquanto baixa todas as páginas.

2. **Tamanhos != 'todos'**
   Comportamento atual permanece (sem mudança).

3. **Rodapé da aba "lista"**
   Substituir a mensagem fixa por:
   `Exibindo {data.dados.length} de {data.total_registros} registros filtrados`
   quando `tamanhoPagina === 'todos'`. Quando não for "todos", manter `PaginationControl` como hoje.

4. **KPIs**
   Sem alteração — continuam vindo do dashboard agregado, não da página da lista.

### Fora de escopo
- Backend, exportação Excel, filtros, KPIs, demais abas.

### Validação
- Selecionar filtros que retornem >1 página, escolher Registros = Todos → conferir no Network múltiplas chamadas `/api/painel-compras?pagina=1..N`, grid renderizando todos os registros, rodapé mostrando "Exibindo X de Y registros filtrados".
