## Corrigir barra horizontal flutuante na matriz DRE/Balanço

Arquivo: `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`

### Problemas a resolver
1. **Barras duplicadas**: o container da matriz (`overflow-auto`) mostra a barra nativa horizontal e, abaixo, a `FloatingHScrollbar`.
2. **Não flutua**: a `FloatingHScrollbar` foi colocada como irmã fora de um wrapper adequado, então cai no fluxo normal e não gruda no viewport.

### Mudanças
1. Ocultar a barra horizontal nativa do container da matriz (linha 2144), mantendo a rolagem funcional:
   ```tsx
   <div
     ref={matrizScrollRef}
     className="relative rounded-lg border bg-white overflow-auto isolate
                [&::-webkit-scrollbar:horizontal]:hidden"
   >
   ```
2. Envolver a matriz e a `FloatingHScrollbar` num wrapper `relative`, com a barra flutuante como último filho, para que o `sticky bottom-0` do componente encontre o contexto correto:
   ```tsx
   <div className="relative">
     <div ref={matrizScrollRef} className="…">
       … tabela …
     </div>
     <FloatingHScrollbar targetRef={matrizScrollRef} />
   </div>
   ```
3. Ajustar `src/components/dre-studio/FloatingHScrollbar.tsx` para funcionar também em página inteira (não só em drawers): usar `IntersectionObserver` já presente para saber se o alvo está em tela e, quando estiver e a barra nativa do alvo estaria fora do viewport, aplicar `position: fixed` com `left` e `width` calculados a partir do `getBoundingClientRect()` do alvo. Fallback continua sendo `sticky bottom-0` (comportamento atual que funciona nos drawers `DrillDrawer` e `DrillResultadoPanel`).

### Verificação
- Rolar a página até que a matriz de DRE fique visível: a barra flutuante deve aparecer colada no rodapé do viewport, com a mesma largura visível do container da tabela, e deve rolar a tabela horizontalmente. Ao sair da matriz (scroll pra cima/baixo), a barra some.
- Nenhuma barra horizontal nativa visível no container da matriz.
- Drawers (`DrillDrawer`, `DrillResultadoPanel`) continuam funcionando como antes.
