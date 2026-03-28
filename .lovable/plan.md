

# Adicionar KPI Cards acima das abas no Painel de Compras

## Problema
Os KPI cards atualmente estão dentro da aba "Dashboard", então ao alternar para "Lista Detalhada" os indicadores desaparecem.

## Solução
Mover os KPI cards principais para **fora das abas**, ficando sempre visíveis após a consulta, independente da aba selecionada.

## Alteração: `src/pages/PainelComprasPage.tsx`

Extrair os 3 blocos de KPIs (Indicadores Financeiros, Indicadores de Pendência, Contagem de Itens) para **antes** do componente `<Tabs>`, mantendo-os visíveis em ambas as abas.

Estrutura resultante:
```text
PageHeader
FilterPanel
── KPI Cards (sempre visíveis quando houver dados)
   ├─ Indicadores Financeiros (6 cards)
   ├─ Indicadores de Pendência (6 cards)
   └─ Contagem de Itens (3 cards)
── Tabs
   ├─ Dashboard (gráficos apenas)
   └─ Lista Detalhada (tabela + paginação)
```

Nenhum arquivo novo. Apenas reorganização do JSX existente.

