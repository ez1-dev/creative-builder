# Padronizar números negativos nos KPIs do BI Comercial

Hoje os cards mostram valores negativos de forma inconsistente:

- **Devolução** (R$ 13.003) → já em vermelho, sem sinal (backend devolve positivo)
- **Impostos** (-R$ 282.481) → cinza, com sinal de menos
- **Diferença** (-R$ 6.135.932) → vermelho, mas ainda com sinal

O padrão desejado, aplicado em toda a tela BI Comercial, é: **valor negativo = vermelho + sem sinal** (o próprio vermelho comunica o sinal, como já acontece em "Devolução").

## O que muda (apenas camada visual, sem tocar em dados)

Alterar dois componentes da biblioteca BI, que são os cards usados no `ComercialPage`:

1. **`src/components/bi/kpis/KpiCard.tsx`** — usado nos cards simples (Impostos, Devolução, Nº Estados, Ticket Médio, Nº Clientes, Nº Vendas, Faturamento Líquido do bloco direito, etc).
2. **`src/components/bi/kpis/KpiTriStackCard.tsx`** — usado no bloco "Faturamento" (Realizado / Meta / Diferença) via `FaturamentoRealizadoMetaCard`.

Regra em ambos, apenas para formatos numéricos (`currency`, `number`, `quantity`):

- Se `value < 0`:
  - Formata o **valor absoluto** (`Math.abs(value)`) via `formatByKind`, para nunca renderizar o "-".
  - Aplica classe `text-[hsl(var(--destructive))]` no `<div data-widget-value>`.
- Se `value >= 0`: comportamento atual, sem cor forçada.
- Se `format` for `percent` ou `raw` (string): mantém como está — percentuais e textos não entram nessa regra.
- No `KpiTriStackCard`, quando o item já tem `color` explícito (ex: `FaturamentoRealizadoMetaCard` colore Diferença), a cor explícita continua prevalecendo — mas o sinal ainda é removido.

Efeitos visíveis na tela:

| Card | Antes | Depois |
|---|---|---|
| Impostos | -R$ 282.481 (cinza) | R$ 282.481 (vermelho) |
| Devolução | R$ 13.003 (vermelho) | R$ 13.003 (vermelho) — inalterado |
| Diferença (Faturamento) | -R$ 6.135.932 (vermelho) | R$ 6.135.932 (vermelho) |

## O que **não** muda

- Nada nos filtros, dados, cálculos, backend ou fórmulas (`valor_liquido`, `margem_bruta`, etc).
- Nenhuma alteração no `formatByKind` / `formatCurrency` global — outros módulos (Compras, RH, ETL, DRE) continuam com o comportamento atual (sinal de menos). O padrão é aplicado só nos dois cards da biblioteca BI, que hoje é o que a tela BI Comercial usa.
- Tabelas (`SummaryTable`, `ComparisonTable`), gráficos e o gauge não entram neste ajuste — se depois você quiser estender o padrão para tabelas do BI Comercial, faço num passo seguinte.
- Trends (setinhas ▲/▼ com variação %) mantêm sinal e cores atuais, pois já usam `Math.abs` + ícone direcional.

## Verificação

Após o build, revisar `/bi/comercial` no preview com o mesmo filtro do print (Impostos, Devolução, Diferença e demais cards) e confirmar que negativos aparecem em vermelho sem "-".
