
## Problema

O card **Impostos** (e por consequência **Fat. Líquido**) no `/faturamento-genius` mostra valores divergentes do mês filtrado (ex.: ~R$ 50–120 mil em vez dos R$ 27.370 esperados em Mar/2026).

**Causa**: o card lê `kpis.valor_impostos`, vindo do agregado `dashboard.por_revenda` retornado pelo backend FastAPI — esse agregado está somando impostos de forma divergente (não respeita corretamente o recorte de período/revenda).

A **tabela "Mensal"** já calcula corretamente, somando ICMS+IPI+PIS+COFINS direto das linhas de `detalhe.dados`, e bate com o relatório oficial Genius.

## Solução

Alinhar os KPIs com a mesma lógica da tabela mensal: recalcular no frontend a partir das linhas do detalhe.

### Passos

1. **Aumentar `tamanho_pagina` do detalhe** em `consultar()` e `loadPage()` de **100 → 5000** em `src/pages/FaturamentoGeniusPage.tsx`, garantindo que o mês inteiro caiba numa requisição (Mar/2026 GENIUS tem ~2.7k itens; com folga).

2. **Refatorar `computeKpis(rows)`** para somar impostos a partir dos campos granulares (`valor_icms + valor_ipi + valor_pis + valor_cofins`) — exatamente a fórmula da linha 1225 — em vez do campo agregado `valor_impostos`.

3. **Mudar a fonte dos KPIs no `useMemo` de `kpis` (linhas 549–557)**: usar **sempre** `computeKpis(filteredRows)` quando houver linhas detalhadas disponíveis. Manter `dashboard.kpis` apenas como fallback quando o detalhe ainda não carregou.

4. **Card "Descontos"** (já adicionado): segue lendo `valor_desconto` do detalhe — sem alteração.

5. **Tooltip do card Impostos**: ajustar para "Soma de ICMS+IPI+PIS+COFINS das linhas do período (mesma base da tabela mensal)".

6. **Aviso de paginação**: se eventualmente o backend retornar `total > 5000` linhas no detalhe, exibir um pequeno aviso abaixo dos KPIs ("Cards calculados sobre as primeiras 5000 linhas do período"). Caso contrário, sem aviso.

7. **Atualizar testes** em `src/pages/__tests__/FaturamentoGeniusPage.kpis.test.tsx` para validar a nova fonte de cálculo (impostos somados de ICMS/IPI/PIS/COFINS) e o alvo R$ 27.370 / R$ 161.674 para Mar/2026 com revenda=GENIUS.

## Detalhes técnicos

- Arquivo único impactado (lógica): `src/pages/FaturamentoGeniusPage.tsx`
- Funções alteradas: `computeKpis`, `kpisFromPorRevenda` (deprecada para o caso impostos — passa a delegar para `computeKpis` quando há detalhe), `useMemo` de `kpis`, chamadas `api.get('/api/faturamento-genius', { tamanho_pagina: 5000 })`.
- Fórmula final (já aplicada para desconto): `fat_liquido = valor_total − valor_devolucao − |impostos_granulares| − valor_desconto`
- Sem mudanças no backend; sem migrações.
