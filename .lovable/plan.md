## Objetivo
Fazer o modo **Quebrar por operação** ajustar automaticamente o layout de impressão para que **componentes + primeira operação caibam em uma única folha A4** sempre que esse for o layout esperado, sem empurrar a operação inteira para a página seguinte.

## O que vou fazer
1. **Ajustar a altura do bloco de operação para impressão**
   - Reduzir dinamicamente a área de apontamento no modo impresso por operação.
   - Em vez de sempre renderizar a mesma grade alta, adaptar a quantidade/altura dos blocos para caber junto com cabeçalho + componentes na folha.
   - Manter o restante do conteúdo da operação visível e legível.

2. **Manter a regra pedida para a primeira folha**
   - Preservar a ordem: **cabeçalho → componentes (quando poucos) → operação**.
   - Não repetir cabeçalho.
   - Garantir que isso valha igual para:
     - impressão individual
     - `Visualizar selecionadas`
     - `Imprimir visualização`

3. **Ajustar o CSS de impressão só no contexto necessário**
   - Refinar as regras de `page-break`/`break-inside` no modo `operation-single-page`.
   - Evitar que o navegador jogue a operação inteira para outra folha.
   - Não mexer no comportamento dos desenhos, que continuam em páginas próprias.

4. **Validar contra o caso real mostrado**
   - Conferir o cenário da imagem em que a última parte da operação vai para a página 2.
   - Garantir que, no layout final, a operação inteira fique condensada em uma única página A4 quando estiver no modo de impressão por operação.

## Resultado esperado
```text
Folha 1: cabeçalho + componentes + operação completa
Folhas seguintes: desenhos (uma por página)
Próxima operação: nova folha com cabeçalho + operação
```

## Detalhes técnicos
- Arquivos-alvo:
  - `src/components/producao/OpPrintSheet.tsx`
  - `src/components/producao/op-print.css`
- Causa identificada:
  - o bloco da operação está alto demais para A4 no modo impresso porque a tabela de apontamento usa altura fixa e 6 blocos sempre, então o navegador quebra a operação em outra página.
- Escopo excluído:
  - sem mudança de API
  - sem mudança no fluxo de dados
  - sem mudança nos desenhos
  - sem alteração do modo padrão fora de `quebrarPorOperacao`