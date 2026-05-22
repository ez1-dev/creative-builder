## Objetivo

Adicionar um botão **"Imprimir visualização"** na barra de ações da grid de OPs (ao lado de "Visualizar selecionadas" e "Limpar seleção"), que dispara Ctrl+P do lote já carregado no preview — sem precisar rolar a página até o card de visualização.

## Mudanças

Apenas em `src/pages/producao/ImpressaoOrdemProducaoPage.tsx` (sem CSS novo, sem lógica nova — reusa a função `imprimirVisualizacao` que já existe na linha 684).

1. Na barra de ações da grid (~linha 924, junto de "Visualizar selecionadas" / "Limpar seleção" / "Imprimir todas"), adicionar:

   ```tsx
   <Button
     size="sm"
     variant="outline"
     onClick={imprimirVisualizacao}
     disabled={!lote || lote.ordens.length === 0 || loteLoading}
     title={!lote ? 'Visualize as OPs antes de imprimir' : 'Imprimir as OPs já visualizadas'}
   >
     <Printer className="mr-1 h-3 w-3" />
     Imprimir visualização
   </Button>
   ```

2. Comportamento: fica **desabilitado** enquanto `lote` for `null` (ou estiver carregando). O usuário precisa primeiro clicar em "Visualizar selecionadas"; depois o botão habilita e o clique chama `imprimirVisualizacao()`, que já aguarda desenhos prontos e dispara `window.print()`.

3. Manter o botão existente dentro do card "Visualização das OPs selecionadas" (linha 1139) — serve como atalho secundário e mostra a dica de A4/escala/margem.

## Fora de escopo

- Não mexer em `OpPrintSheet`, `OpPrintBatch`, hooks, CSS de impressão ou backend.
- Não criar atalho que carregue o lote automaticamente — comportamento confirmado pelo usuário: só imprimir o que já está visualizado.
