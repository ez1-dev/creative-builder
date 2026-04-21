
## Botões "Consultar / Gerar / Salvar" não aparecem

### Diagnóstico
No viewport atual (747 px) o `PageHeader` usa `flex items-center justify-between` sem permitir quebra de linha. Título + descrição longa ("Análise de movimentação histórica…") ocupam todo o espaço e empurram os 4 botões (Consultar, Gerar, Salvar, Export) para fora da área visível. Em telas largas eles aparecem; em telas médias/estreitas somem.

### Correção

**`src/components/erp/PageHeader.tsx`** — tornar o cabeçalho responsivo (sem afetar nenhuma outra página, todas se beneficiam):
- Trocar `flex items-center justify-between` por `flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`.
- Adicionar `flex-wrap` no container de `actions` para que os botões quebrem em duas linhas quando faltar espaço.
- Adicionar `min-w-0` no bloco de título para evitar overflow horizontal.

### Resultado
- Em desktop largo: layout idêntico ao atual (título à esquerda, botões à direita).
- Em telas médias/estreitas (como o preview 747 px): título em cima, botões logo abaixo, com quebra natural quando necessário — Consultar, Gerar, Salvar e Export ficam todos visíveis.

### Sem alterações em
Lógica dos botões, endpoints, `SugestaoMinMaxPage`, demais páginas (apenas ganham comportamento responsivo equivalente).
