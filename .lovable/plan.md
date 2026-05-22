# Restaurar margens internas na impressão da OP

## Problema

No PDF anexo (página 1 — folha da OP 30782), o conteúdo do `.op-sheet` (cabeçalho, relação de componentes, operação, blocos de apontamento) está colado nas bordas do papel. Só existe a margem mínima do `@page` (7 mm). Antes do ajuste da página de componentes, havia também 8 mm de padding interno do `.op-sheet`, o que dava uma "respiração" visual ao redor das caixas.

O que removeu a margem foi esta regra adicionada em `src/components/producao/op-print.css` (bloco `@media print`):

```css
.op-print-page .op-sheet,
.op-operation-page .op-sheet,
.operation-single-page {
  padding: 0 !important;
}
```

Ela foi necessária para a página de componentes não estourar o papel, mas zerou o padding também das folhas de OP/operação.

## Plano

Editar apenas `src/components/producao/op-print.css`:

1. **Restaurar padding interno só onde é seguro** — trocar a regra acima por algo mais cirúrgico que mantenha 8 mm de padding nas folhas de OP e de operação (cabeçalho + apontamento), e continue com padding 0 só na página de componentes:

   ```css
   .op-print-page .op-sheet,
   .op-operation-page .op-sheet,
   .operation-single-page {
     padding: 8mm !important;
   }
   .op-sheet.componentes-page,
   .componentes-page {
     padding: 0 !important;
   }
   ```

2. **Garantir que o conteúdo continua cabendo** — como os wrappers `.op-print-page` / `.op-operation-page` / `.operation-single-page` têm 196 × 283 mm e o `@page` já contribui com 7 mm, somando os 8 mm de padding interno o conteúdo útil fica em ~180 × 267 mm, que é a área visual original do preview (não há overflow novo).

3. **Não tocar na página de componentes** — ela continua com `min-height: 0`, `height: auto`, `overflow: visible` e padding zero, então a tabela longa segue quebrando normalmente em várias folhas A4.

## Validação

- OP 30782 (do PDF) → cabeçalho, "Relação de Componentes Necessários" e "Operação" devem aparecer com ~15 mm de margem do papel (7 mm `@page` + 8 mm padding interno), como no preview.
- OP 1109 → página de componentes continua sendo gerada e quebra em múltiplas A4 (sem regressão do fix anterior).
- OP 7093 → mesma quantidade de páginas, sem folha em branco no final.
- Página de desenho (`.op-drawing-page`) não é afetada (não bate com nenhum dos seletores alterados).

## Fora de escopo

- `OpPrintSheet.tsx`, `OpPrintBatch.tsx`, hooks, backend.
- Alterar o valor do `@page margin` global.
- Mudar layout/ordem dos blocos.
