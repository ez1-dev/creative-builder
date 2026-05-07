## Objetivo
Forçar os KPIs do Painel de Compras a virem **sempre** do retorno agregado da API (`/api/painel-compras-dashboard` ou `data.totais`/`data.resumo`). Remover o cálculo client-side que hoje soma `data.dados` da página atual e produz valores parciais quando a API não retorna agregados.

## Arquivo
`src/pages/PainelComprasPage.tsx`

## Mudanças

### 1. `kpisGerencial` (cards principais — linhas ~536-592)
- Manter o ramo que lê de `dashboard.kpis` quando disponível.
- **Remover** o fallback que soma `dadosFiltrados` (forEach somando `valor_liquido`, `saldo_pendente`, sets de OCs/fornecedores).
- Quando não houver `dashboard`, retornar `null` → cards de hero/qtd ficam ocultos (já há guarda `{kpisGerencial && ...}`).
- Para filtros gerenciais client-side (projeto_macro/tipo_despesa/mes/cond_pagto), **não recalcular**: também retornar `null` e exibir aviso de que KPIs refletem somente a base agregada da API.

### 2. `kpis` (KPIs detalhados — linhas ~394-489)
- Remover todo o bloco de `fallback` (cálculo a partir de `dadosParaFallback` somando bruto/líquido/desconto/pendente/atrasos etc).
- Manter apenas `merge(totaisNorm, resumo)` vindo do backend.
- Se nem `totais` nem `resumo` existirem → retornar `null` (cards ocultos automaticamente pelo guard `{data && kpis && ...}`).
- Manter a normalização de aliases (`qtd_registros`→`total_linhas` etc).

### 3. Aviso amarelo (linhas ~1092-1096)
- Atualizar texto: em vez de "cards somando apenas a página atual", informar que "o backend não retornou totais agregados — KPIs indisponíveis. Recarregue ou ajuste filtros".
- Esse aviso passa a aparecer quando `!data.totais && !data.resumo && !dashboard`.

### 4. Lista Detalhada (aba "lista")
- **Não muda nada**. Continua filtrando localmente via `dadosListaFiltrados` para a tabela apenas. Não recalcula KPIs (já não recalculava).

### 5. Gráficos (`chartData`, `gerencialCharts`)
- **Fora de escopo** desta mudança. Continuam como estão (usando `dashboard.graficos` quando disponível, fallback client-side caso contrário). Se quiser estender o "API-only" para gráficos também, peça em seguida.

## Resumo do efeito
- KPIs **nunca** mais refletem soma da página atual.
- Quando a API agregada falhar, cards ficam ocultos e o aviso explica o motivo, em vez de mostrar números parciais enganosos.
- Lista Detalhada e gráficos seguem inalterados nesta etapa.