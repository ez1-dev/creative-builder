

# Tooltips e Drill-Down nos KPIs do Dashboard de Compras

## Objetivo
Tornar os KPIs interativos: ao passar o mouse, exibir tooltip com detalhes extras; ao clicar, abrir um popover/dialog com breakdown dos dados.

## Mudanças

### 1. Atualizar `KPICard` (`src/components/erp/KPICard.tsx`)
- Adicionar props opcionais: `tooltip?: string`, `details?: { label: string; value: string }[]`, `onClick?: () => void`
- Envolver o card com `TooltipProvider > Tooltip > TooltipTrigger/TooltipContent` quando `tooltip` estiver presente
- Quando `details` estiver presente, ao clicar no card abrir um `Popover` com uma mini-tabela dos detalhes (label/value pairs)
- Adicionar `cursor-pointer` quando clicável
- Usar componentes existentes: `Tooltip`, `Popover`

### 2. Atualizar KPIs no Dashboard (`src/pages/PainelComprasPage.tsx`)
Adicionar `tooltip` descritivo e `details` com breakdown para cada KPI:

**Indicadores Financeiros:**
- Total OCs: tooltip "Quantidade total de Ordens de Compra", details com OCs por situação (usando `graficos.situacoes`)
- Valor Bruto: tooltip "Soma dos valores brutos antes de descontos"
- Desconto Total: tooltip "Soma de todos os descontos aplicados"
- Valor Líquido: tooltip "Valor bruto menos descontos", details com breakdown bruto/desconto/líquido
- Impostos Totais: tooltip "Soma de IPI, ICMS, ISS e outros impostos"
- Fornecedores: tooltip "Quantidade de fornecedores distintos"

**Indicadores de Pendência:**
- Valor Pendente: tooltip "Valor total de itens ainda não recebidos"
- Itens Pendentes/Atrasados: tooltip explicativo, details com top itens atrasados
- OCs Atrasadas: tooltip "Quantidade de OCs com entrega vencida"
- Maior Atraso: tooltip "Maior número de dias de atraso entre todos os itens"
- Ticket Médio: tooltip "Valor líquido total dividido pelo número de itens"

**Contagem:**
- Total Linhas/Itens Produto/Serviço: tooltips descritivos, details com percentual produto vs serviço

### Detalhes Técnicos
- Imports necessários: `Tooltip, TooltipTrigger, TooltipContent, TooltipProvider` e `Popover, PopoverTrigger, PopoverContent`
- O popover de detalhes usa layout simples: lista de `div` com `flex justify-between` para label/value
- Nenhuma chamada extra à API — todos os dados já estão em `resumo` e `graficos`

