## Problema

Para 202603 com filtro `revenda = "GENIUS"`:

| Métrica       | Tabela Mensal (correto) | Card KPI (errado)        |
|---------------|-------------------------|--------------------------|
| Faturamento   | R$ 191.603              | R$ 191.603 ✓ (já corrigido) |
| Devolução     | R$ 821                  | R$ 821 ✓                 |
| Impostos      | R$ -27.370              | ~R$ 50–120 mil ✗         |
| Fat. Líquido  | R$ 161.674              | divergente ✗             |

Causa: o card lê de `dashboard.kpis`, que é o agregado **global do período (todas as revendas)**. O filtro de texto `revenda = "GENIUS"` que digitamos no painel é repassado ao backend, mas o backend está retornando KPIs SEM aplicar esse filtro (provavelmente faz LIKE ou ignora). Já a tabela mensal usa `dashboard.por_anomes` que coincidentemente bate porque o backend agrupa só GENIUS quando há linha única.

A função `subtractOutros` só remove a linha "OUTROS" — não isola apenas GENIUS quando há outras revendas no agregado.

## Correção

Quando o usuário tem filtro de revenda preenchido (ou switch "Somente revendas Genius" ligado), os cards devem somar **apenas as linhas de `dashboard.por_revenda` que casam com o filtro**, em vez de usar `dashboard.kpis` cheio.

### Mudanças em `src/pages/FaturamentoGeniusPage.tsx`

1. **Nova helper `kpisFromPorRevenda(porRevenda)`**: soma todos os campos numéricos da lista `por_revenda` (já filtrada) e recalcula `fat_liquido = valor_total - valor_devolucao - |valor_impostos|`, `margem_bruta`, `margem_percentual` com a mesma fórmula de `computeKpis`. Conta `quantidade_revendas = porRevenda.length`. Para `quantidade_notas/pedidos/clientes/produtos`, soma os campos correspondentes (aceitando que pode haver dupla contagem de clientes entre revendas — manter o que o backend devolve).

2. **`useMemo` dos KPIs (linhas 496–501)**: nova lógica em ordem de prioridade:
   - Se `porRevenda` (já filtrada por OUTROS + texto do filtro de revenda) tem ≥1 item E está **estritamente menor** que `dashboard.por_revenda` total (ou seja, há filtro ativo) → usa `kpisFromPorRevenda(porRevenda)`.
   - Senão se `incluirOutros` → usa `dashboard.kpis` direto.
   - Senão → usa `subtractOutros(dashboard.kpis, dashboard.por_revenda)` (comportamento atual).
   - Fallback: `computeKpis(filteredRows)`.

3. **Filtro de revenda nos agregados**: garantir que o `porRevenda` (linha 505–509) também filtra pelo `filters.revenda` (case-insensitive `includes`) quando preenchido, não só por OUTROS. Isso já alinha tabela e cards.

4. **Sinal de "Impostos"**: o tooltip e exibição mantêm `fmtBRL(kpis.valor_impostos)`. Como o backend pode retornar positivo ou negativo, manter `Math.abs` no cálculo de fat_liquido (já está) e exibir o valor "como veio" na tabela mensal (que mostra -27.370). Nada a mudar aqui.

### Testes

Estender `src/pages/__tests__/FaturamentoGeniusPage.kpis.test.tsx`:
- Quando `por_revenda` tem GENIUS + 3 outras marcas e o usuário filtra por "GENIUS", `kpisFromPorRevenda` retorna apenas os totais da linha GENIUS.
- `valor_impostos` e `fat_liquido` batem com os targets oficiais (Mar/2026: -27.370 e 161.674).
- Sem filtro de revenda + `incluirOutros=false` → mantém comportamento atual (`subtractOutros`).

## Arquivos

- editar: `src/pages/FaturamentoGeniusPage.tsx`
- editar: `src/pages/__tests__/FaturamentoGeniusPage.kpis.test.tsx`

## Resultado esperado

Para 202603 com `revenda = "GENIUS"`, todos os cards passam a bater com a tabela mensal e com os targets oficiais Genius:
- Faturamento R$ 191.603 · Devolução R$ 821 · Impostos R$ -27.370 · Fat. Líquido R$ 161.674.
