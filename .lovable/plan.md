# Corrigir filtro de Data início / Data fim

## Problema
Em `src/components/passagens/PassagensDashboard.tsx` linhas 72-73, a comparação `r.data_registro < dataInicio` é lexicográfica de string. O `data_registro` pode chegar do Supabase como ISO completo (`"2026-01-01T00:00:00+00:00"`) enquanto o input `type="date"` produz só `"2026-01-01"` (10 chars). Resultado: registros são incluídos/excluídos incorretamente.

## Correção
Normalizar `data_registro` para os 10 primeiros caracteres antes de comparar:

```ts
const dr = (r.data_registro ?? '').slice(0, 10);
if (dataInicio && dr < dataInicio) return false;
if (dataFim && dr > dataFim) return false;
```

Mudança isolada — apenas o `useMemo` `filtered` (linhas ~68-75). Nenhum outro componente afetado.
