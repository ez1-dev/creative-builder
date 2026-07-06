## Objetivo
Preencher "Evolução mensal" e "Detalhamento mensal" na página RH-01 Resumo Folha.

## Causa raiz
`fetchResumoFolhaDashboard(..., "completo")` — modo default usado pela página — retorna `kpis`, `filiais`, `proventos_vantagens`, `descontos` e `tipos_evento`, mas o backend não popula `mensal` nesse modo (confirmado no log: `mensal: undefined`). A série mensal só vem quando o endpoint é chamado com `modo=mensal`.

## Correção

1. **`src/pages/rh/ResumoFolhaPage.tsx`**
   - Adicionar uma segunda `useQuery` em paralelo com `modo="mensal"`, usando o mesmo `baseParams` e mesma `enabled` condition.
   - Usar `queryMensal.data?.mensal ?? []` como fonte de `mensal` na página (fallback para `data?.mensal` caso o backend eventualmente comece a devolver no `completo`).
   - Estender o payload de exportação PDF/IA para incluir esses dados mensais.

2. **Sem mudanças no backend, no cliente HTTP nem no normalizador** — `normalizeDashboard` já mapeia `mensal` corretamente quando presente.

## Fora de escopo
- Não alterar outras páginas RH.
- Não mexer em cache global nem em invalidations do sync (o mensal também será refetch quando o `resumo-folha-dashboard` for invalidado, pois compartilha o prefixo de queryKey).

## Validação
- Abrir `/rh/resumo-folha` no período default (últimos 6 meses): o gráfico "Evolução mensal" mostra barras por competência e a tabela "Detalhamento mensal" lista as linhas com provento/desconto/líquido.
- Alterar período e ver o gráfico/tabela atualizarem.
- Console mostra `[RH ResumoFolha] dashboard` para completo e um segundo log/response para mensal.
