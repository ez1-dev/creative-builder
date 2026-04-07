
# Corrigir fixação do cabeçalho das colunas Código, Descrição e Família

## Problema identificado
Hoje a rolagem vertical está sendo controlada no `<thead>` (`sticky top-0`), enquanto a rolagem horizontal das colunas fixas está sendo controlada em cada `<th>` (`sticky left`). Essa combinação em elementos diferentes não é robusta, então o cabeçalho dessas colunas não fica realmente “preso” no cruzamento topo + esquerda.

## Implementação
1. **`src/components/erp/DataTable.tsx`**
   - Remover o `sticky top-0` do `<TableHeader>`.
   - Aplicar o comportamento de cabeçalho fixo diretamente em cada `<TableHead>`.
   - Para colunas com `sticky: true`, aplicar no cabeçalho:
     - `position: sticky`
     - `top: 0`
     - `left: <offset calculado>`
     - `z-index` mais alto que o restante da tabela
     - fundo opaco do cabeçalho
   - Para colunas sticky no corpo, manter:
     - `position: sticky`
     - `left: <offset calculado>`
     - fundo opaco
   - Garantir largura consistente nas colunas sticky usando `width` + `minWidth` com `stickyWidth`, não só `minWidth`.

2. **`src/pages/EstoquePage.tsx`**
   - Manter `sticky: true` em:
     - Código
     - Descrição
     - Família
   - Revisar `stickyWidth` dessas 3 colunas para casar com a largura real desejada.

## Resultado esperado
- Ao rolar **verticalmente**, o cabeçalho continua visível no topo.
- Ao rolar **horizontalmente**, os títulos **Código, Descrição e Família** continuam fixos à esquerda junto com suas células.
- O “canto” da tabela (topo + esquerda) passa a funcionar corretamente.

## Detalhe técnico
A correção principal é concentrar o sticky do cabeçalho no próprio `<th>`, combinando `top` e `left` no mesmo elemento. Isso evita o conflito atual entre `<thead>` sticky e `<th>` sticky.
