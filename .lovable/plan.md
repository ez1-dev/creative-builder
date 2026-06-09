## Objetivo
Eliminar o erro React #310 no BI Comercial sem alterar API, backend ou drill.

## Plano
1. Corrigir a ordem dos hooks no componente de tabela base
   - Ajustar `src/components/erp/DataTable.tsx` para que nenhum hook fique depois de `return` condicional.
   - O principal candidato é `summaryCols`, que hoje está em `useMemo(...)` após `if (loading) return ...`, padrão que pode gerar exatamente `Rendered more hooks than during the previous render` quando a tabela alterna entre loading e carregada.

2. Fazer uma revisão pontual do fluxo BI Comercial para garantir estabilidade de hooks
   - Revisar `src/pages/bi/ComercialPage.tsx` para manter hooks e custom hooks apenas no topo do componente.
   - Revisar `src/components/bi/drill/ComercialDrillDrawer.tsx` e o fluxo da grid para confirmar que mudanças de unidade, agrupamento e abertura do detalhamento não introduzem chamadas condicionais de hooks.
   - Manter intactas as regras já pedidas para coluna Revenda e exibição de Obra.

3. Validar o cenário crítico do usuário
   - Abrir o BI Comercial.
   - Agrupar por Cliente.
   - Alternar unidade entre `GENIUS`, `ESTRUTURAL ZORTEA` e `CONSOLIDADO`.
   - Abrir `Detalhamento por Nota Fiscal`.
   - Confirmar que o erro #310 não reaparece.

## Detalhes técnicos
- Erro oficial React #310: `Rendered more hooks than during the previous render`.
- Sinal mais forte encontrado: `src/components/erp/DataTable.tsx` chama hooks no topo e também possui um `useMemo` declarado depois de um `return` condicional de loading.
- Isso explica bem o comportamento intermitente no fluxo da grid/detalhamento, porque o mesmo componente pode renderizar uma vez em loading e outra vez com dados, mudando a quantidade de hooks executados.

## Fora de escopo
- API
- Backend
- Banco
- Alterações no contrato do drill
- Mudanças visuais fora do necessário para estabilizar a renderização