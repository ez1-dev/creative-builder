# Endpoint agregado do Painel de Compras

## Objetivo
Mesmo padrão aplicado em Notas Fiscais de Recebimento, agora para `/painel-compras`: KPIs/gráficos/drill passam a vir de um endpoint agregado real, sem paginação. A `Lista Detalhada` continua paginada por `/api/painel-compras`.

## Parte 1 — Backend FastAPI (fora deste repositório)

Especificação em `docs/backend-painel-compras-dashboard.md`.

**Novo endpoint:** `GET /api/painel-compras-dashboard`

- Sem `pagina`, `tamanho_pagina`, `LIMIT`, `OFFSET`.
- Reaproveita exatamente a mesma query base e filtros do `GET /api/painel-compras`.
- Filtros: `fornecedor`, `numero_oc`, `codigo_item`, `descricao_item`, `centro_custo`, `numero_projeto`, `tipo_oc`, `transacao`, `data_emissao_ini/fim`, `data_entrega_ini/fim`, `tipo_item`, `valor_min/max`, `origem_material`, `familia`, `coddep`, `somente_pendentes`, `agrupar_por_fornecedor`, `situacao_oc` (CSV), `codigo_motivo_oc`, `observacao_oc`, `mostrar_valor_total_oc`, `projeto_macro`, `tipo_despesa`, `mes_competencia`, `condicao_pagamento`.
- Todos os agregados via `GROUP BY`.

**Resposta:**
```json
{
  "kpis": {
    "valor_comprado": 0, "valor_recebido": 0, "valor_pendente": 0,
    "quantidade_ocs": 0, "quantidade_itens": 0, "quantidade_fornecedores": 0,
    "ticket_medio_oc": 0, "percentual_recebido": 0
  },
  "graficos": {
    "por_mes": [{ "mes": "2026-01", "valor": 0, "qtd_ocs": 0, "qtd_itens": 0 }],
    "por_tipo_despesa": [{ "tipo": "Matéria-prima", "valor": 0, "qtd_ocs": 0, "qtd_itens": 0 }],
    "por_centro_custo": [{ "centro_custo": "...", "valor": 0, "qtd_ocs": 0, "qtd_itens": 0 }],
    "por_projeto": [{ "numero_projeto": "...", "projeto": "...", "valor": 0, "qtd_ocs": 0, "qtd_itens": 0 }],
    "por_fornecedor": [{ "fornecedor": "...", "valor": 0, "qtd_ocs": 0, "qtd_itens": 0 }],
    "comprado_recebido_pendente": [{ "mes": "2026-01", "comprado": 0, "recebido": 0, "pendente": 0 }]
  },
  "drill": []
}
```

Definições: `valor_comprado=SUM(valor_liquido)`, `valor_recebido=SUM(valor_recebido)` (ou `SUM(qtd_recebida*preco_unitario)`), `valor_pendente=SUM(saldo_pendente*preco_unitario)`, `quantidade_ocs=COUNT(DISTINCT numero_oc)`, `ticket_medio_oc=valor_comprado/qtd_ocs`, `percentual_recebido=valor_recebido/valor_comprado*100`.

## Parte 2 — Documentação

Criar `docs/backend-painel-compras-dashboard.md` com o contrato completo, lista de filtros e exemplos de SQL.

## Parte 3 — Frontend (`src/pages/PainelComprasPage.tsx`)

1. Adicionar tipo `PainelComprasDashboardResponse` em `src/lib/api.ts`.
2. Em `search()`:
   - Manter primeiro request a `/api/painel-compras` paginado (alimenta Lista Detalhada).
   - Quando `page === 1`, chamar `/api/painel-compras-dashboard` (sem paginação).
   - Em caso de erro/404, cair de volta para o request paginado com `tamanho_pagina=50000` (comportamento atual) e setar `usandoFallbackAgregado=true`.
3. Adicionar estado `dashboard` substituindo o `dadosAgregados` como fonte preferencial de KPIs/gráficos/drill.
4. Em `kpisGerencial` e `gerencialCharts`: preferir dados de `dashboard` quando disponível; manter cálculo client-side como fallback.
5. Banner amarelo de amostragem só aparece em fallback (`usandoFallbackAgregado && totalAgregado > 50000`).
6. Trocar página da tabela continua chamando só o endpoint paginado — KPIs/gráficos não recalculam.
7. Trocar filtros + Pesquisar dispara os dois endpoints.
8. `<DataTable>` continua usando `dadosListaFiltrados` (sem mudança).
9. Drill-down: usa `dashboard.drill` quando presente; senão usa `dadosFiltrados` como hoje.

## Resultado
- KPIs/gráficos/drill sempre na base completa filtrada (sem teto de 50k).
- Lista Detalhada paginada e independente.
- Fallback transparente enquanto o backend não atualiza.
