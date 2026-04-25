## Diagnóstico

A divergência (R$ 45.106,23 no card vs R$ 191.603 na tabela mensal) acontece porque os **KPIs estão sendo recalculados a partir das linhas do detalhe paginado**, não do dashboard agregado.

No arquivo `src/pages/FaturamentoGeniusPage.tsx`:

- Linha 353: o detalhe é buscado com `tamanho_pagina: 100` → traz só **100 linhas** do período.
- Linha 442–446: `rawRows = detalhe.dados` → essas mesmas 100 linhas.
- Linha 450–454: quando o flag "Incluir OUTROS" está **desligado** (default), o código faz `computeKpis(filteredRows)` somando apenas essas 100 linhas filtradas no front. Por isso o card mostra R$ 45.106,23 (uma fração do mês).
- A tabela "Mensal" (R$ 191.603) usa `dashboard.por_anomes`, que vem agregado pelo backend sobre **todo** o período → valor correto.

Resumindo: o KPI ignora o agregado do backend sempre que "OUTROS" está desligado e existem linhas no detalhe.

## Correção

Trocar a lógica de seleção dos KPIs para **sempre preferir o agregado do backend** (`dashboard.kpis`) e só cair no recálculo local se o dashboard não existir. O filtro "OUTROS" continua sendo respeitado porque o backend já devolve agregados separados; quando o usuário desliga "OUTROS", subtraímos os totais da revenda OUTROS retornados em `dashboard.por_revenda`.

### Mudanças em `src/pages/FaturamentoGeniusPage.tsx`

1. **`useMemo` dos KPIs (linhas 450–454)**: usar `dashboard.kpis` como fonte de verdade. Quando `incluirOutros` for `false`, calcular os ajustes a partir da linha `OUTROS` em `dashboard.por_revenda` (subtrair `valor_total`, `valor_devolucao`, `valor_custo`, `quantidade_notas`, etc.) em vez de recalcular tudo a partir das 100 linhas paginadas.

2. **Helper `subtractOutros(kpis, porRevenda)`**: nova função pura que devolve `kpis` ajustados removendo a linha cuja `revenda === 'OUTROS'`. Recalcula `fat_liquido`, `margem_bruta` e `margem_percentual` ao final, com a mesma fórmula de `computeKpis` (linhas 263–266).

3. **Tooltip do card "Faturamento"** (linha 749): manter o texto, mas garantir que o número exibido reflete o período inteiro, não a página atual.

4. **Aviso opcional**: se `dashboard.kpis` estiver ausente (backend antigo), mostrar um pequeno alerta informando que os KPIs estão sendo calculados a partir da página atual e podem estar incompletos.

### Testes

- Adicionar teste em `src/pages/__tests__/` (novo arquivo `FaturamentoGeniusPage.kpis.test.tsx`) cobrindo:
  - KPI usa `dashboard.kpis` quando disponível.
  - Com `incluirOutros = false`, KPI subtrai corretamente os valores da linha OUTROS de `dashboard.por_revenda`.
  - Fallback para `computeKpis(filteredRows)` quando `dashboard.kpis` for `undefined`.

## Resultado esperado

Para 202603, o card "Faturamento" passa a mostrar **R$ 191.603,00**, batendo com a tabela "Mensal" e com a soma do backend agregado.

## Arquivos

- editar: `src/pages/FaturamentoGeniusPage.tsx`
- criar: `src/pages/__tests__/FaturamentoGeniusPage.kpis.test.tsx`
