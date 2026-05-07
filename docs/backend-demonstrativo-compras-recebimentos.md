# Backend: Demonstrativo de Compras e Recebimentos

Endpoint único consumido pela tela `/demonstrativo-compras-recebimentos`.

## GET /api/demonstrativo-compras-recebimentos

### Query params
- `origem`: `TODOS` | `COMPRAS` | `RECEBIMENTOS` (default `TODOS`)
- `nivel`: `projeto_macro` | `numero_projeto` | `centro_custo` | `tipo_despesa` | `mes_competencia` | `fornecedor` | `documento` | `item` (default `projeto_macro`)
- `projeto_macro`: `GENIUS` | `ESTRUTURAL` | `OUTROS` (opcional, filtra)
- `numero_projeto`, `centro_custo`, `tipo_despesa`, `descricao_item`, `mes_competencia` (YYYY-MM), `fornecedor`, `condicao_pagamento`, `transacao`, `data_ini` (YYYY-MM-DD), `data_fim` (YYYY-MM-DD)

### Resposta
```json
{
  "nivel": "projeto_macro",
  "proximo_nivel": "numero_projeto",
  "kpis": {
    "valor_comprado": 0,
    "valor_recebido": 0,
    "valor_pendente": 0,
    "diferenca_comprado_recebido": 0,
    "qtd_linhas": 0,
    "qtd_documentos": 0,
    "qtd_fornecedores": 0
  },
  "drill": [
    {
      "chave": "GENIUS",
      "label": "GENIUS",
      "valor_comprado": 0,
      "valor_recebido": 0,
      "valor_pendente": 0,
      "diferenca": 0,
      "qtd_documentos": 0
    }
  ],
  "detalhe": []
}
```

`detalhe` deve trazer linhas com:
- Compras: `numero_projeto, centro_custo, tipo_despesa, descricao_item, mes_competencia, fornecedor, condicao_pagamento, numero_oc, codigo_item, quantidade, valor_comprado, valor_pendente`
- Recebimentos: `numero_projeto, centro_custo, tipo_despesa, descricao_item, mes_competencia, fornecedor, transacao, condicao_pagamento, numero_nf, serie_nf, codigo_item, quantidade, valor_recebido, oc_origem`

Quando `origem=TODOS`, agregar comprado e recebido por chave do nível.

## GET /api/export/demonstrativo-compras-recebimentos
Mesmos params; retorna xlsx.
