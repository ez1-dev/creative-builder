

# Dashboard Completo do Painel de Compras

## Situação Atual
Já existe uma aba Dashboard com 6 KPIs e 4 gráficos. Porém a API retorna dados adicionais não exibidos:
- **Resumo**: `valor_bruto_total`, `valor_desconto_total`, `valor_pendente_total`, `impostos_totais`, `saldo_pendente_total`, `ocs_atrasadas`, `ticket_medio_item`, `itens_produto`, `itens_servico`, `total_linhas`
- **Gráficos**: `tipos` e `origens` não utilizados

## Mudanças em `src/pages/PainelComprasPage.tsx`

### 1. Expandir KPIs (de 6 para ~12)
Reorganizar em duas linhas de cards, adicionando:
- Valor Bruto Total
- Valor Desconto Total  
- Valor Pendente Total
- Impostos Totais
- OCs Atrasadas
- Ticket Médio por Item
- Itens Produto vs Serviço (contagem)
- Total de Linhas

### 2. Adicionar gráficos faltantes
- **Tipos de Item** (Produto vs Serviço) — PieChart com `graficos.tipos`
- **Origens** — BarChart horizontal com `graficos.origens`

### 3. Layout aprimorado
- KPIs em grid responsivo `grid-cols-2 md:grid-cols-4 lg:grid-cols-6`
- Gráficos em grid `grid-cols-1 lg:grid-cols-2 xl:grid-cols-3` para melhor distribuição
- Seções visuais separadas com títulos (Indicadores Financeiros, Indicadores de Pendência, Análises Gráficas)

### Detalhes Técnicos
- Todos os dados já vêm da API (`resumo` e `graficos`), sem chamadas adicionais
- Usa componentes existentes: `KPICard`, Recharts (`BarChart`, `PieChart`), `formatCurrency`, `formatNumber`
- Ícones adicionais do lucide-react: `DollarSign`, `Clock`, `Percent`, `FileText`

