## Problema observado no PDF anexo

A última OP do lote (OP 7093) gera **20 páginas** quando o conteúdo real termina na página 18:

- Página 17: bloco da operação (operation-single-page) — correto
- Página 18: relação de componentes (componentes-page) — correto
- **Página 19**: apenas um "esqueleto" do cabeçalho da tabela de componentes (linha do `<thead>` repetida pelo `display: table-header-group`) — indesejada
- **Página 20**: totalmente em branco — indesejada

A página 18 está vazia em mais de 50% (10 componentes cabem com folga), portanto não é um problema de overflow real. O Chrome está reservando espaço para uma "próxima página" da tabela por causa de duas combinações de CSS:

1. `.componentes-page thead { display: table-header-group }` faz o cabeçalho da tabela se preparar para repetir em cada página potencial, induzindo Chrome a projetar uma página extra mesmo quando todas as linhas cabem em uma.
2. `.op-operation-page` / `.operation-single-page` têm `page-break-after: always !important` aplicado sem checar `:last-child`. Quando a operation-page é seguida por componentes-page e ambas são as últimas do lote, o break extra pode empurrar conteúdo fantasma para uma página adicional.

## Correção proposta (somente CSS em `src/components/producao/op-print.css`)

1. **Suprimir page-break no último elemento do lote**
   Acrescentar regras `:last-child` para impedir Chrome de gerar uma página em branco depois do último bloco impresso:
   ```css
   @media print {
     .op-print-batch > *:last-child,
     .op-operation-page:last-child,
     .componentes-page:last-child,
     .op-drawing-page:last-child,
     .op-print-page:last-child {
       page-break-after: avoid !important;
       break-after: avoid !important;
     }
     /* Remove o `page-break-after: always` incondicional do operation-single-page
        quando ele é o último elemento do batch */
     .operation-single-page:last-child {
       page-break-after: avoid !important;
       break-after: avoid !important;
     }
   }
   ```

2. **Evitar header-group repetindo desnecessariamente em tabela curta**
   Manter `display: table-header-group` apenas dentro de `.componentes-page` (que pode quebrar para várias folhas) mas garantir que o `<tbody>` tenha `page-break-inside: auto` e que o próprio elemento `.componentes-page` use `page-break-after: avoid` quando for o último filho:
   ```css
   @media print {
     .componentes-page tbody { page-break-inside: auto !important; break-inside: auto !important; }
   }
   ```

3. **Não alterar nada na ordem dos blocos nem no `OpPrintSheet.tsx`** — operação continua na página 17, componentes na página 18.

## Resultado esperado

Pré-visualização Ctrl+P passa a mostrar **18 páginas no total** (em vez de 20). As páginas 19 e 20 deixam de aparecer. As demais OPs do lote continuam imprimindo normalmente com as mesmas quebras já corretas.

## Verificação após implementação

Pedir ao usuário para reimprimir a OP 7093 (ou a mesma seleção do lote), abrir Ctrl+P e confirmar que:
- A última página com conteúdo é a "Relação de Componentes Necessários" (página 18 no exemplo).
- Não há mais sliver de cabeçalho de tabela nem folha totalmente em branco no fim.
