

# Fix: KPIs "A Vencer 7 dias" e "A Vencer 30 dias"

## Problema
Ambas as páginas (Contas a Pagar e Contas a Receber) hardcodam `valor_a_vencer_7d: 0` e `valor_a_vencer_30d: 0` no cálculo de fallback do frontend. Quando a API não retorna o objeto `resumo`, esses KPIs ficam zerados.

## Solução
Calcular os valores filtrando os títulos com `status_titulo !== 'PAGO'` e `data_vencimento` dentro dos próximos 7 e 30 dias a partir de hoje.

### Arquivos a modificar

**1. `src/pages/ContasPagarPage.tsx`** (linhas ~178-181)

Substituir:
```typescript
valor_a_vencer_7d: 0,
valor_a_vencer_30d: 0,
```

Por lógica que calcula com base na data de vencimento:
```typescript
const hoje = new Date();
const em7d = new Date(); em7d.setDate(hoje.getDate() + 7);
const em30d = new Date(); em30d.setDate(hoje.getDate() + 30);

const aVencer = d.filter((r: any) => {
  if (!r.data_vencimento || r.status_titulo === 'PAGO') return false;
  const venc = new Date(r.data_vencimento);
  return venc >= hoje;
});

valor_a_vencer_7d: aVencer
  .filter((r: any) => new Date(r.data_vencimento) <= em7d)
  .reduce((s, r) => s + (r.valor_aberto || 0), 0),
valor_a_vencer_30d: aVencer
  .filter((r: any) => new Date(r.data_vencimento) <= em30d)
  .reduce((s, r) => s + (r.valor_aberto || 0), 0),
```

**2. `src/pages/ContasReceberPage.tsx`** (linhas ~178-179)

Mesma correção aplicada ao contexto de Contas a Receber.

## Resultado
Os KPIs "A Vencer 7 dias" e "A Vencer 30 dias" passarão a mostrar os valores corretos calculados a partir dos dados retornados pela API, mesmo quando o backend não envia o objeto `resumo`.

