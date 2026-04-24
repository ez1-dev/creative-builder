## Problema

Na tela `/faturamento-genius`, com toggle "Incluir OUTROS" desligado (visão somente Genius), os cards de Volume Financeiro divergem do relatório oficial Genius (Jan–Abr/2026: Fat. 794.052, Dev. 8.879, Impostos -120.598, Fat.Líq. 653.862, Margem real ≈ Fat.Líq − Custo).

A causa é que `computeKpis` (linha ~241 de `FaturamentoGeniusPage.tsx`) faz somas linha-a-linha do detalhe sem aplicar as convenções da visão Genius:

- **Valor Total** mostrado como soma bruta de `valor_total`, sem deduzir devolução nem impostos. Na visão Genius, esse card deve representar o **Faturamento (R$)** = soma de `valor_total` (que já é o faturamento bruto da operação, sem devolução) — precisa bater **794.052**.
- **Margem Bruta** = `valor_total − valor_custo`. Ignora devolução e impostos, inflando a margem. O correto é `Fat.Líq − Custo`, onde `Fat.Líq = valor_total − devolução − |impostos|` (mesma fórmula já validada na linha TOTAL da tabela QA).
- **Margem %** = `margem_bruta / valor_total`. Deveria ser `margem_bruta_corrigida / fat_liq` (ou ao menos `/ (valor_total − devolução)`) para refletir a margem real Genius.
- **Custo / Comissão**: revisar se o backend está incluindo linhas de devolução com sinal já invertido — se sim, a soma está correta; se não, precisamos descontar a parcela referente à devolução para evitar superestimar custo/comissão atribuídos ao faturamento líquido.

## O que vai mudar

Arquivo único: `src/pages/FaturamentoGeniusPage.tsx`, função `computeKpis` (linhas ~241-265) e os cards (linhas ~726-732).

### 1. Reescrever `computeKpis` para refletir a visão Genius

```ts
function computeKpis(rows: any[]) {
  let valor_total = 0, valor_bruto = 0, valor_devolucao = 0;
  let valor_custo = 0, valor_comissao = 0, valor_impostos = 0;
  // ... contagens distintas (mantidas)

  for (const r of rows) {
    valor_total      += Number(r.valor_total ?? 0);
    valor_bruto      += Number(r.valor_bruto ?? 0);
    valor_devolucao  += Number(r.valor_devolucao ?? 0);
    valor_custo      += Number(r.valor_custo ?? 0);
    valor_comissao   += Number(r.valor_comissao ?? 0);
    valor_impostos   += (Number(r.valor_icms ?? 0) + Number(r.valor_ipi ?? 0)
                       + Number(r.valor_pis ?? 0)  + Number(r.valor_cofins ?? 0));
    // ... sets distintos
  }

  const fat_liquido     = valor_total - valor_devolucao - valor_impostos;
  const margem_bruta    = fat_liquido - valor_custo;          // antes: valor_total - valor_custo
  const margem_percentual = fat_liquido > 0 ? (margem_bruta / fat_liquido) * 100 : 0;

  return {
    valor_total, valor_bruto, valor_devolucao, valor_custo, valor_comissao,
    valor_impostos, fat_liquido,
    margem_bruta, margem_percentual,
    // ... contagens
  };
}
```

### 2. Adicionar 2 cards novos (Impostos e Fat. Líquido) e ajustar tooltips

Atualizar a linha de cards de Volume Financeiro (linhas ~726-732) para:

| Card | Valor | Esperado Jan–Abr/26 |
|---|---|---|
| Faturamento (Valor Total) | `kpis.valor_total` | 794.052 |
| Devolução | `kpis.valor_devolucao` | 8.879 |
| Impostos | `kpis.valor_impostos` (novo) | 120.598 |
| Fat. Líquido | `kpis.fat_liquido` (novo) | 653.862 |
| Custo | `kpis.valor_custo` | (do ERP) |
| Comissão | `kpis.valor_comissao` | (do ERP) |
| Margem Bruta | `kpis.margem_bruta` (corrigida) | Fat.Líq − Custo |
| Margem % | `kpis.margem_percentual` (corrigida) | Margem / Fat.Líq |

Tooltips em cada card explicando a fórmula, para ficar claro o que cada número representa.

### 3. Atualizar o tipo `KpisGenius`

Adicionar `valor_impostos: number` e `fat_liquido: number`.

### 4. Sem mudanças em backend

Toda a correção é client-side, recalculando a partir do detalhe já filtrado (sem OUTROS). A tabela QA de validação continua existindo e servirá para confirmar que os cards passaram a bater com o oficial.

## Resultado esperado

Após a mudança, com toggle "Incluir OUTROS" desligado e período Jan–Abr/2026, os cards mostram:

- Faturamento ≈ R$ 794.052
- Devolução ≈ R$ 8.879
- Impostos ≈ R$ 120.598
- Fat. Líquido ≈ R$ 653.862
- Margem Bruta = Fat.Líq − Custo (real, não inflada)
- Margem % = Margem / Fat.Líq

Bate com a linha TOTAL da tabela QA Validação Genius já presente na página.
