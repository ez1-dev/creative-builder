## Objetivo
Restabelecer a exportação em PDF do Relatório Executivo de Faturamento sem mexer no conteúdo do relatório, apenas no fluxo de impressão e nos estilos necessários para ele aparecer corretamente no diálogo “Salvar como PDF”.

## O que vou corrigir
1. Ajustar a regra de impressão que hoje esconde elementos do `body` para não ocultar o próprio documento `#rel-doc` quando ele é movido para impressão.
2. Tornar o fluxo `exportarPdf` mais resiliente, garantindo restauração do DOM mesmo se o `afterprint` não disparar ou o usuário cancelar a impressão.
3. Revisar o container imprimível para evitar que o relatório fique invisível ou fora do fluxo na hora de gerar o PDF.
4. Validar o comportamento no preview, especificamente se o clique em “Exportar PDF (Imprimir)” volta a abrir o diálogo de impressão e mantém o relatório íntegro.

## Resultado esperado
- O botão “Exportar PDF (Imprimir)” volta a funcionar.
- O navegador abre o fluxo de impressão/salvar como PDF.
- O relatório visível no preview é o mesmo que entra no PDF.
- O layout do cabeçalho e dos blocos continua preservado.

## Detalhes técnicos
- Arquivos alvo: `src/pages/bi/relatorio.css` e `src/pages/bi/RelatorioExecutivoFaturamentoPage.tsx`
- Causa provável encontrada: a regra `body.printing-rel-doc > *:not(#rel-print-portal)` usa `display: none`, mas o `#rel-doc` é anexado direto no `body`; como ele não é exceção da regra, acaba sendo escondido junto com o resto.
- Ajuste previsto:
  - excluir explicitamente `#rel-doc` da regra que oculta os irmãos do `body`
  - adicionar fallback de restauração no `exportarPdf`
  - manter o documento em fluxo visível durante `window.print()`

## Fora de escopo
- Alterar dados do relatório
- Mudar exportação PPTX
- Refazer o layout visual do relatório