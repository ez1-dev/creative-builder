## Objetivo

Exibir em **negrito** as seguintes linhas da tabela DRE (visualização):

- Receitas Financeiras
- Despesas Financeiras
- Outras Receitas
- Outras Despesas
- IRPJ / CSLL (Provisão)

## Alteração

Arquivo: `src/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage.tsx`

1. Criar um `Set` com as descrições-alvo normalizadas (uppercase, sem acentos, trim, espaços colapsados) — ex.: `RECEITAS FINANCEIRAS`, `DESPESAS FINANCEIRAS`, `OUTRAS RECEITAS`, `OUTRAS DESPESAS`, `IRPJ / CSLL (PROVISAO)`.
2. No render da linha (`<tr>` por volta da linha 2445), computar `isLinhaNegritoForcado` comparando `descricaoExibida` normalizada com o set.
3. Adicionar `isLinhaNegritoForcado && "font-bold"` na lista de classes do `<tr>`, para que sobreponha o peso padrão sem afetar cor/background.

Sem mudanças de backend, cálculo ou ordenação — apenas apresentação (peso da fonte).

## Fora de escopo

- Não alterar valores, ordem ou hierarquia.
- Não mexer em outras linhas (7, 8, 9, 10 já têm estilos próprios).
