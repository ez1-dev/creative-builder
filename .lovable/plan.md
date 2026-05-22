## Objetivo
Aplicar a regra de **mais de 7 componentes** no layout de impressão: quando a OP tiver mais de 7 componentes, a primeira folha fica com **cabeçalho + operação(ões)** e os **componentes vão para uma folha própria com o mesmo cabeçalho**, independente de haver desenhos ou não.

## O que vou fazer
1. **Aplicar a regra também no modo "Quebrar por operação"**
   - Hoje, nesse modo, os componentes são sempre colados acima da primeira operação.
   - Passa a valer: se houver **mais de 7 componentes**, eles **não** ficam inline; saem em uma folha dedicada (com cabeçalho próprio).
   - Quando houver até 7 componentes, mantém o comportamento atual (inline na folha da primeira operação).

2. **Garantir o mesmo critério no modo padrão**
   - Confirmar que o limite de 7 já existente continua acionando a folha separada de componentes com cabeçalho.
   - Manter a página de componentes sempre com o mesmo cabeçalho da OP.

3. **Ordem das folhas no modo "Quebrar por operação" com >7 componentes**
   ```text
   Folha 1: cabeçalho + 1ª operação
   Folha 2: cabeçalho + componentes
   Folhas seguintes: demais operações (uma por folha, com cabeçalho)
   Por último: desenhos (uma página por desenho)
   ```

4. **Independência dos desenhos**
   - A regra vale **com ou sem desenhos**.
   - Desenhos continuam em folhas A4 dedicadas, sem alterar a ordem das folhas anteriores.

5. **Validar nos 3 fluxos**
   - Impressão individual
   - "Visualizar selecionadas"
   - "Imprimir visualização"

## Resultado esperado
- Até 7 componentes: igual ao que já fizemos (componentes acima da operação na mesma folha).
- Mais de 7 componentes: operação na folha 1, componentes em folha própria com cabeçalho, desenhos depois.

## Detalhes técnicos
- Arquivos-alvo:
  - `src/components/producao/OpPrintSheet.tsx` (regra de quando renderizar inline x página separada no modo `quebrarPorOperacao`)
  - `src/components/producao/op-print.css` apenas se precisar de ajuste fino de quebra entre as folhas
- Escopo excluído:
  - sem mudança de API
  - sem mudança na busca/seleção de OPs
  - sem mudança no comportamento de desenhos