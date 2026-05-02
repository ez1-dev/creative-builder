
## Mudança

Priorizar `response.totais` sobre `response.resumo` nos KPIs do Painel de Compras, e esconder o alerta de "backend não retornou totais agregados" quando `totais` existir.

## Arquivo

`src/pages/PainelComprasPage.tsx` — duas alterações pequenas.

### 1. KPIs (linha 288)

```tsx
const kpis = useMemo(() => {
  if ((data as any)?.totais) return (data as any).totais;   // ← novo: prioridade máxima
  if (data?.resumo) return data.resumo;                      // fallback existente
  if (!data?.dados || data.dados.length === 0) return null;
  // ... fallback client-side somando a página atual (inalterado)
}, [data]);
```

### 2. Alerta (linha 665)

Atualmente:

```tsx
{!data.resumo && tamanhoPagina !== 'todos' && data.total_paginas > 1 && (
  <div ...>Atenção: o backend não retornou totais agregados...</div>
)}
```

Passa a ser:

```tsx
{!(data as any).totais && !data.resumo && tamanhoPagina !== 'todos' && data.total_paginas > 1 && (
  <div ...>Atenção: o backend não retornou totais agregados...</div>
)}
```

## Resultado

- `response.totais` presente → cards usam `totais`, alerta some.
- `response.totais` ausente mas `response.resumo` presente → cards usam `resumo`, alerta some (comportamento atual).
- Nenhum dos dois e há mais de uma página → fallback client-side soma a página atual e o alerta aparece.

Sem mudanças em backend, tipos ou outras páginas.
