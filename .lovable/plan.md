## O que muda

No drawer de Drill (Razão) do DRE Studio, ocultar tudo que se refere a **Saldo Anterior** quando o modelo aberto é uma **DRE**. Contas de resultado zeram no início de cada período, então esse dado não faz sentido para DRE (só para Balanço). O comportamento no Balanço continua igual.

## Alterações

### 1. `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`
- Ao montar `<DrillDrawer args={drill} />`, passar `tipoModelo` dentro de `args` (`"DRE" | "BALANCO"`), usando o `tipoModelo` que a página já calcula.

### 2. `src/components/dre-studio/DrillDrawer.tsx`
- Adicionar campo opcional `tipoModelo?: "DRE" | "BALANCO"` em `DrillArgs`.
- Derivar `const isDRE = args?.tipoModelo === "DRE"`.
- Quando `isDRE`:
  - Cabeçalho: remover o `ResumoCard "Saldo Anterior"` e ajustar o grid para 3 colunas (Total Débito, Total Crédito, Saldo Final).
  - Tabela do razão:
    - Remover o `<TableHead>` "Saldo Anterior".
    - Remover a `<TableCell>` correspondente em cada linha do `itens.map(...)`.
    - Remover a `<TableCell>` da linha "SALDO INICIAL" e da linha "SALDO FINAL" que ocupam essa coluna.
    - Remover a própria linha "SALDO INICIAL" (fica sem função sem o saldo anterior).
  - Rodapé: sem mudança (já não mostra saldo anterior).

Nenhuma outra mudança de layout, endpoints, hooks ou tipos.

## Detalhes técnicos

- `tipoModelo` já é lido em `DreStudioVisualizacaoPage` a partir de `modelo?.modelo?.tipo_modelo`. Basta propagar via prop.
- No Balanço nada muda: `isDRE` fica `false` (ou `undefined`) e todos os elementos continuam sendo renderizados exatamente como hoje.
