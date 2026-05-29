## Ajuste — Consulta de Produtos: auto-carregar combos

Revisando `src/pages/cadastros/ConsultaProdutosPage.tsx`, a maior parte do comportamento solicitado já existe (origens carregam na montagem; famílias recarregam quando `codori` muda; consulta só dispara no botão). Os ajustes ficam em refinar mensagens e garantir o estado inicial exato.

### Mudanças

**`src/pages/cadastros/ConsultaProdutosPage.tsx`**

1. Garantir estado inicial conforme spec (já está: `somente_ativos=true`, `incluir_derivacoes=false`, `codori=""`, `codfam=""`, `pagina=1`, `tamanho_pagina=100`).
2. Passar mensagens de loading dedicadas para os combos:
   - Origem: placeholder muda para `"Carregando origens..."` enquanto `loadingOrigens`.
   - Família: placeholder muda para `"Carregando famílias..."` enquanto `loadingFamilias`.
3. Falhas ao carregar origens/famílias não bloqueiam a tela — manter combo vazio e exibir `toast` discreto (comportamento atual), removendo qualquer chance de o erro travar o restante.
4. Confirmar que ao limpar a origem (`codori=""`), o `useEffect` já dispara `getProdutosFamilias(undefined)` retornando todas as famílias — manter como está.
5. A consulta de produtos continua disparando apenas via botão `Consultar` no `FilterPanel` (comportamento atual).

### Componente `ComboboxFilter`

- Aceita `placeholder` e `loading` — apenas passar a string dinâmica de loading via prop `placeholder` enquanto carrega, ou exibir o spinner já existente. Sem alteração no componente.

### Fora de escopo

- Endpoints e contrato do backend (já documentados em `docs/backend-cadastros-produtos.md`).
- Alteração visual da tabela, paginação ou colunas.
- Export Excel ou drill nas derivações.
