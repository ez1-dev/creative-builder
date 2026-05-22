## Diagnóstico

A última mudança no `@media print` removeu os overrides que faziam a `.componentes-page` "soltar" suas dimensões na impressão (`min-height: 0`, `height: auto`, `overflow: visible`). Agora ela herda do `.op-sheet`: `min-height: 297mm` + `padding: 8mm` + `box-sizing: border-box`. Como o `@page` tem margem 7mm, a área útil real do papel é 196mm × 283mm — menor que o `min-height: 297mm` do elemento. O Chrome trata o bloco inteiro como "não cabe" e em alguns casos pula a página, fazendo a tabela de componentes não aparecer na impressão (apesar de existir no DOM e renderizar bem no preview).

Outro efeito colateral: mesmo se aparecesse, com `min-height: 297mm` o bloco é uma única "caixa" gigante — o navegador não pagina naturalmente uma tabela de 30+ linhas em múltiplas folhas A4.

## Solução

Tudo em `src/components/producao/op-print.css`, dentro do `@media print` que reescrevi:

1. **Reabrir a página de componentes para fluir naturalmente**

   ```css
   @media print {
     .op-sheet.componentes-page {
       min-height: 0 !important;
       height: auto !important;
       overflow: visible !important;
       padding: 0 !important;   /* tira o padding do .op-sheet que estoura a página */
     }
     .componentes-page tbody {
       page-break-inside: auto;
       break-inside: auto;
     }
   }
   ```

   Combinado com `tr { page-break-inside: avoid }` (já existe), a tabela quebra entre linhas em quantas folhas A4 forem necessárias, sem cortar nenhuma linha no meio.

2. **Compensar o padding nas demais folhas dimensionadas fixas**

   `.op-print-page` e `.op-operation-page` continuam com altura fixa de 283mm — mas o `.op-sheet` interno aplica `padding: 8mm`, somando 16mm a mais. Em print, zerar esse padding:

   ```css
   @media print {
     .op-print-page .op-sheet,
     .op-operation-page .op-sheet,
     .operation-single-page {
       padding: 0 !important;
     }
   }
   ```

3. **Cabeçalho da tabela de componentes repete em cada folha**

   Reverter `display: table-row-group` que coloquei para `display: table-header-group`, agora que a tabela vai mesmo quebrar em várias folhas — assim cada folha de componentes começa com a linha de "Código / Descrição / Qtde / UN / Dep / Endereço".

   ```css
   .componentes-page thead { display: table-header-group !important; }
   ```

4. **Manter o resto da regra minimalista** que já existe (esconder cromo da UI, isolar `.print-root`, `page-break-after: always` + `:last-child { avoid }`).

## Validação

- OP 1109 (caso atual da tela): pré-visualizar, abrir Ctrl+P, conferir que a folha de componentes aparece — provavelmente em 1 folha A4 se couber, ou 2 se a tabela for muito longa.
- OP com 7 ou menos componentes: continuam inline (modo "quebrar por operação"), sem folha extra.
- OP 7093 (40+ operações): conferir que o total de folhas continua batendo com o preview.

## Fora de escopo

- `OpPrintSheet.tsx` e `OpPrintBatch.tsx` não mudam.
- Sem mudança de backend, layout ou ordem de blocos.
