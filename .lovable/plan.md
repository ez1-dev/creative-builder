## Objetivo
Fazer o modo **Quebrar por operação** respeitar a regra pedida também na impressão real: quando houver poucos componentes, eles devem ficar **na mesma folha da primeira operação**, acima da operação, sem repetir cabeçalho; só os desenhos seguintes ficam em folhas próprias.

## O que vou ajustar
1. **Revisar a regra de quebra da primeira folha da operação**
   - Manter a ordem já esperada no `OpPrintSheet`: cabeçalho → componentes inline → operação.
   - Garantir que isso valha igualmente para impressão individual, `Visualizar selecionados` e `Imprimir visualização`, já que todos passam por `OpPrintSheet` / `OpPrintBatch`.

2. **Corrigir a CSS de impressão que está empurrando a operação para a próxima folha**
   - Remover a proteção excessiva de quebra no bloco `.op-operation` quando estiver no modo de impressão por operação.
   - Ajustar as regras de `page-break-inside` / `break-inside` para permitir que a primeira folha comporte componentes + início da operação, em vez de jogar a operação inteira para outra página.
   - Preservar o comportamento dos desenhos em páginas dedicadas.

3. **Respeitar a regra de “poucos componentes = mesma folha”**
   - Usar a lógica já existente de limite de componentes como critério para manter os componentes inline quando couber.
   - Evitar reintroduzir página separada de componentes no modo `quebrarPorOperacao` quando a OP tiver poucos itens.

4. **Validar o resultado nos 3 fluxos**
   - OP individual
   - `Visualizar selecionados`
   - `Imprimir visualização`

## Resultado esperado
```text
Folha 1: cabeçalho + componentes + operação
Folhas seguintes: desenhos (uma por página)
Próxima operação: nova folha com cabeçalho + operação
```

## Detalhes técnicos
- Arquivos-alvo:
  - `src/components/producao/OpPrintSheet.tsx`
  - `src/components/producao/op-print.css`
- Causa provável já identificada:
  - `.op-operation` e outras regras globais de impressão ainda estão com `page-break-inside: avoid`, o que faz o navegador mover a operação inteira para a próxima folha quando existem componentes acima.
- Escopo excluído:
  - sem mudança de API
  - sem mudança em desenhos
  - sem mudança no modo padrão fora de `quebrarPorOperacao`