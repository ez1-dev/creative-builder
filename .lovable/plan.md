## Fase B — Repaginação Comercial, Compras, Financeiro

Aplicar o mesmo padrão da Visão Geral (Biblioteca BI, sparklines, alertas críticos, seções claras) nas 3 abas restantes do bloco tático.

### 1. `ComercialTab.tsx`

**Estrutura:**
1. **Faixa de alertas críticos** (topo, se houver): meta < 80% do período, desconto > 5%, faturamento negativo vs. mês anterior.
2. **KPIs headline (4 cards)** com `KpiSparklineCard` para Faturamento (série `faturamento_meta`) e `KpiCard` variant colorida para Meta atingida, Ticket médio, Δ vs mês anterior.
3. **KPIs secundários (grid 4 col)**: Notas emitidas, Desconto médio, Meta do período, Faturamento acumulado.
4. **Séries temporais**: Line "Faturamento vs Meta 12m" com dupla série (`valor` + `meta`) — usar `LineChartCard` com `series` múltipla se suportado, senão dois `Line` sobrepostos.
5. **Breakdowns (grid 3 col)**: Top revendas / Top produtos / Faturamento por UF (mantém, mas tamanho reduzido para 260px).
6. Botão "Abrir BI Comercial" reposicionado num header discreto com título "Comercial — resumo".

### 2. `ComprasTab.tsx`

**Estrutura:**
1. **Alertas críticos**: valor atrasado > 0, OCs atrasadas > 10% do total.
2. **KPIs headline (4 cards)**: Valor comprado (sparkline `compras_mes`), Pendente OC, Atrasado (variant danger), Total OCs.
3. **KPIs secundários (grid 3)**: Fornecedores ativos, Ticket médio OC, % Atraso (novo, calculado).
4. **Série temporal**: Bar "Compras 12m" mantida.
5. **Breakdowns (grid 3)**: Donut "Por tipo de despesa", HBar "Top fornecedores", HBar "Situação OCs".
6. Header com botão "Abrir Painel de Compras".

### 3. `FinanceiroTab.tsx`

**Estrutura:**
1. **Alertas críticos**: Resultado negativo, Margem < 0%, Inadimplência > 0.
2. **KPIs headline (4 cards)**: Resultado DRE (sparkline `resultado_mes`, variant conforme sinal), Margem %, Receita, A receber.
3. **KPIs secundários (grid 4)**: Custos, Despesas, A pagar, Inadimplência.
4. **Série temporal**: Line "Resultado DRE 12m" mantida, altura 260.
5. **Nova seção — Fluxo (grid 2)**: dois `HorizontalBarChartCard` — um comparando "Receita vs Custos vs Despesas" (dados dos próprios KPIs), outro "A receber vs A pagar vs Inadimplência" (visual comparativo simples sem novo backend).
6. Header com botões existentes (DRE Configurável, Contas a pagar/receber).

### 4. Padronização compartilhada

- Todas as abas usam `<section aria-label="…">` e mesma hierarquia visual da Visão Geral.
- Sparklines usam a série já disponível no hook (nenhuma nova chamada de API).
- Alertas críticos usam `Badge variant="destructive"` clicáveis quando aplicável.
- Todos os `KpiCard` recebem `loading={loading}` do hook (que agora aproveita `keepPreviousData`, portanto não pisca ao trocar de período).

### Escopo — apenas frontend

Sem novos endpoints, sem migração, sem mudanças em hooks (já refatorados na Fase A). Apenas os 3 arquivos `tabs/*.tsx`.

### Fora do escopo

- Contabilidade, RH, Produção, Estoque, Manutenção → Fases C e D.
