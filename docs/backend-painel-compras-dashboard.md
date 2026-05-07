# Endpoint agregado do Painel de Compras

> Especificação para o time do FastAPI. O frontend já consome este contrato com fallback transparente para o endpoint paginado enquanto a rota não estiver deployada.

## Rota

```
GET /api/painel-compras-dashboard
```

- **Sem paginação.** Não aceita / não usa `pagina`, `tamanho_pagina`, `LIMIT`, `OFFSET`.
- Resposta sempre `application/json`.
- Reaproveita exatamente a mesma query base e os mesmos filtros do `GET /api/painel-compras`.
- Todos os KPIs, buckets de gráfico e linhas de drill são calculados via `GROUP BY` no SQL sobre o resultado completo filtrado.

## Filtros aceitos (todos opcionais, idênticos ao endpoint paginado)

`fornecedor`, `numero_oc`, `codigo_item`, `descricao_item`, `centro_custo`,
`numero_projeto`, `tipo_oc`, `transacao`, `data_emissao_ini`, `data_emissao_fim`,
`data_entrega_ini`, `data_entrega_fim`, `tipo_item`, `valor_min`, `valor_max`,
`origem_material`, `familia`, `coddep`, `somente_pendentes`,
`agrupar_por_fornecedor`, `situacao_oc` (lista CSV), `codigo_motivo_oc`,
`observacao_oc`, `mostrar_valor_total_oc`,
`projeto_macro`, `tipo_despesa`, `mes_competencia`, `condicao_pagamento`.

## Resposta

```json
{
  "kpis": {
    "valor_comprado": 0,
    "valor_recebido": 0,
    "valor_pendente": 0,
    "quantidade_ocs": 0,
    "quantidade_itens": 0,
    "quantidade_fornecedores": 0,
    "ticket_medio_oc": 0,
    "percentual_recebido": 0
  },
  "graficos": {
    "por_mes":                    [{ "mes": "2026-01", "valor": 0, "qtd_ocs": 0, "qtd_itens": 0 }],
    "por_tipo_despesa":           [{ "tipo": "Matéria-prima", "valor": 0, "qtd_ocs": 0, "qtd_itens": 0 }],
    "por_centro_custo":           [{ "centro_custo": "...", "valor": 0, "qtd_ocs": 0, "qtd_itens": 0 }],
    "por_projeto":                [{ "numero_projeto": "...", "projeto": "...", "valor": 0, "qtd_ocs": 0, "qtd_itens": 0 }],
    "por_fornecedor":             [{ "fornecedor": "...", "valor": 0, "qtd_ocs": 0, "qtd_itens": 0 }],
    "comprado_recebido_pendente": [{ "mes": "2026-01", "comprado": 0, "recebido": 0, "pendente": 0 }]
  },
  "drill": [
    {
      "projeto_macro": "Genius",
      "tipo_despesa": "Matéria-prima",
      "numero_projeto": "...", "projeto": "...",
      "centro_custo": "...",
      "fornecedor": "...",
      "numero_oc": "...",
      "valor_comprado": 0, "valor_recebido": 0, "valor_pendente": 0,
      "qtd_ocs": 0, "qtd_itens": 0
    }
  ]
}
```

### Definições

- `valor_comprado` = `SUM(valor_liquido)`.
- `valor_recebido` = `SUM(valor_recebido)` (ou `SUM(quantidade_recebida * preco_unitario)` se a coluna não existir).
- `valor_pendente` = `SUM(saldo_pendente * preco_unitario)`.
- `quantidade_ocs` = `COUNT(DISTINCT numero_oc)`.
- `quantidade_itens` = `COUNT(*)` de itens (linhas).
- `quantidade_fornecedores` = `COUNT(DISTINCT codigo_fornecedor)`.
- `ticket_medio_oc` = `valor_comprado / NULLIF(quantidade_ocs, 0)`.
- `percentual_recebido` = `(valor_recebido / NULLIF(valor_comprado, 0)) * 100`.

### Ordenação sugerida

- `por_mes` / `comprado_recebido_pendente`: cronológica ascendente.
- demais buckets: `valor` desc; cliente faz top-N quando precisar.

## Compatibilidade

- O frontend tenta este endpoint primeiro. Em caso de `404` / falha de rede, ele cai automaticamente para `GET /api/painel-compras?tamanho_pagina=50000` e exibe um aviso de amostragem se o total exceder 50k.
- Quando este endpoint estiver no ar, o aviso de amostragem desaparece e os KPIs / gráficos passam a refletir a base completa filtrada sem teto.
- A `Lista Detalhada` continua sendo alimentada por `GET /api/painel-compras` paginado e independente.
