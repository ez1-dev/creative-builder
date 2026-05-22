## Objetivo

Fazer a impressão sair **idêntica** ao preview das OPs selecionadas: mesma quantidade de páginas, mesma ordem dos blocos, mesmas quebras e mesmo tamanho/espaçamento visual. Hoje o DOM é o mesmo nos dois modos, mas o `@media print` reescreve fontes, paddings, alturas mínimas e quebras, e o resultado diverge (ex.: OP 7093 mostra 18 folhas no preview e imprime 20).

## Estratégia

Tratar cada `.op-sheet` (cabeçalho/operação), `.componentes-page`, `.op-operation-page` e `.op-drawing-page` como **uma folha A4 fixa** tanto no preview quanto na impressão, e reduzir o `@media print` ao mínimo necessário (apenas esconder cromo da UI e controlar quebras). Sem reescrever fonte, padding ou min-height na impressão.

## Mudanças

Tudo em `src/components/producao/op-print.css` (não mexer em React/lógica):

1. **Unificar dimensões da folha**
   - `.op-sheet`, `.op-print-page`, `.op-operation-page`, `.componentes-page`, `.op-drawing-page`: largura `196mm`, altura `283mm` fixos no preview *e* na impressão (já é assim no preview; remover os overrides do `@media print` que zeram `min-height`/`height` para `componentes-page` e `op-operation-page`).
   - `.op-sheet` deixa de aplicar `padding: 8mm` quando dentro de uma folha já dimensionada (preview e impressão usam o mesmo `box-sizing` e a mesma área útil).

2. **`@page` alinhado ao preview**
   - Manter `@page { size: A4 portrait; margin: 7mm; }` igual hoje; folhas internas têm `196mm × 283mm` = exatamente a área útil. Nada de margem dupla.

3. **Remover overrides de tipografia/spacing no print**
   - Apagar do `@media print`: `.op-sheet { font-size: 8.5pt }`, sobrescritas de padding/line-height em `th/td`, `border: 0.5pt`, `table-layout: fixed`, etc. Preview já usa `10px` / `1px solid #000`; usar o mesmo na impressão.
   - Resultado: as quebras naturais do navegador acontecem nos mesmos pontos do preview (mesma altura de linha → mesma contagem de linhas por folha).

4. **Quebras de página simplificadas**
   - `.op-sheet, .op-operation-page, .componentes-page, .op-drawing-page { page-break-after: always; break-after: page; }` aplicado só quando **não** é `:last-child`.
   - Manter `:last-child { page-break-after: avoid }` para não gerar folha em branco no fim do lote.
   - Remover `display: table-header-group` do `thead` da página de componentes (causa página fantasma quando a tabela termina no fim de uma folha). O cabeçalho da tabela aparece só na 1ª folha de componentes — igual ao preview.
   - Manter `tr { page-break-inside: avoid }` para não cortar linhas no meio.

5. **Esconder cromo da UI**
   - Manter o bloco que esconde `header/nav/sidebar/.no-print/.print-actions/.preview-message` e o `visibility: hidden` em `body * → .print-root` (necessário para isolar a área de impressão).

6. **Preview = folha real**
   - Garantir que `.op-sheet--preview` continue apenas adicionando a sombra/margem entre folhas; nada mais. Assim cada “página” que o usuário conta na tela corresponde 1:1 à folha impressa.

## Validação

Caso de teste sugerido: a mesma OP usada antes (ex.: 7093). Abrir o preview, contar folhas (cabeçalho + N operações + componentes + desenhos), depois Ctrl+P e conferir que o navegador mostra o mesmo total e os mesmos blocos nas mesmas posições. Repetir com uma OP de poucos componentes (modo inline) e com lote de 2+ OPs.

## Fora de escopo

- Não mexer em `OpPrintSheet.tsx`, `OpPrintBatch.tsx`, hooks, ordem de blocos ou regra de quantos componentes vão inline.
- Não mexer em backend nem em `ImpressaoOrdemProducaoPage.tsx`.
