# Backend: Demonstrativo de Compras e Recebimentos

Endpoint único consumido pela tela `/demonstrativo-compras-recebimentos`. O frontend
não faz cálculos: KPIs, gráficos, drill e detalhe vêm prontos da API.

## GET /api/demonstrativo-compras-recebimentos

### Query params
- `data_ini`, `data_fim` (YYYY-MM-DD)
- `origem`: `TODOS` | `COMPRAS` | `RECEBIMENTOS` (default `TODOS`)
- `nivel`: `projeto_macro` | `numero_projeto` | `centro_custo` | `tipo_despesa` |
  `mes_competencia` | `fornecedor` | `documento` | `item` | `transacao` | `deposito`
  (default `projeto_macro`)
- Filtros de recorte: `projeto_macro`, `numero_projeto`, `centro_custo`, `tipo_despesa`,
  `mes_competencia` (YYYY-MM), `fornecedor` (CodFor), `condicao_pagamento`,
  `transacao` (CodTns), `descricao_item`, `deposito` (CodDep), `familia`,
  `origem_material`, `numero_oc`, `numero_nf`, `documento`, `tipo_item`
  (`PRODUTO` | `SERVICO`)
- Detalhe: `incluir_detalhe` (bool), `limite_detalhe` (int, default 500)

### Resposta
```json
{
  "atualizado_em": "2026-05-19T12:00:00",
  "nivel": "projeto_macro",
  "proximo_nivel": "numero_projeto",
  "kpis": {
    "valor_comprado": 0,
    "valor_recebido": 0,
    "valor_pendente": 0,
    "diferenca_comprado_recebido": 0,
    "qtd_linhas": 0,
    "qtd_fornecedores": 0,
    "qtd_documentos": 0
  },
  "kpis_dashboard": {},
  "graficos": {
    "comprado_recebido_pendente": [
      { "label": "Comprado", "valor": 0 },
      { "label": "Recebido", "valor": 0 },
      { "label": "Pendente", "valor": 0 }
    ],
    "por_projeto_macro": [{ "chave": "GENIUS", "label": "GENIUS", "valor_comprado": 0, "valor_recebido": 0, "valor_pendente": 0 }],
    "por_mes":           [{ "mes": "2026-01", "label": "2026-01", "valor_comprado": 0, "valor_recebido": 0, "valor_pendente": 0 }],
    "por_centro_custo":  [{ "chave": "1001", "label": "1001 - Obra X", "valor_comprado": 0, "valor_recebido": 0 }],
    "por_projeto":       [{ "chave": "P-001", "label": "P-001", "valor_comprado": 0, "valor_recebido": 0 }],
    "por_tipo_despesa":  [{ "chave": "MATERIA_PRIMA", "label": "Matéria-prima", "valor": 0 }],
    "por_fornecedor":    [{ "chave": "12345", "label": "12345 - Fornecedor X", "valor_comprado": 0 }],
    "por_transacao":     [{ "chave": "100", "label": "100 - NF Compra", "valor_comprado": 0 }]
  },
  "drill": [
    {
      "chave": "GENIUS",
      "label": "GENIUS",
      "valor_comprado": 0,
      "valor_recebido": 0,
      "valor_pendente": 0,
      "diferenca_comprado_recebido": 0,
      "qtd_linhas": 0,
      "qtd_fornecedores": 0,
      "qtd_documentos": 0
    }
  ],
  "detalhe": [],
  "filtros_aplicados": {},
  "observacao": ""
}
```

`detalhe` (quando `incluir_detalhe=true`) deve trazer linhas com:
`origem_dado, projeto_macro, mes_competencia, numero_projeto, nome_projeto,
codigo_centro_custo, descricao_centro_custo, tipo_despesa, codigo_fornecedor,
nome_fornecedor, documento, numero_oc, numero_nf, serie_nf, tipo_item,
sequencia_item, codigo_item, descricao_item, derivacao, unidade_medida,
codigo_familia, origem_material, transacao, deposito, quantidade_pedida,
quantidade_recebida, quantidade_pendente, valor_bruto, valor_comprado,
valor_recebido, valor_pendente, diferenca_comprado_recebido`.

## GET /api/export/demonstrativo-compras-recebimentos
Mesmos params; retorna xlsx.
