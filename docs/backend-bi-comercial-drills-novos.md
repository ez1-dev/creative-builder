# Backend: Novos níveis de drill no BI Comercial (OBRA, TIPO_SERVICO)

Estender o endpoint **existente** `POST /api/bi/comercial/drill` para aceitar
três novos valores em `drill_type`. Nenhuma rota nova é criada e nenhuma
migração no Cloud é necessária (a dimensão `bi_projetos` já existe).

## Novos `drill_type`

| drill_type     | Agrupador                                 | Descrição (LEFT JOIN)              |
| -------------- | ----------------------------------------- | ---------------------------------- |
| `OBRA`         | `cd_prj`                                  | `bi_projetos.ds_projeto`           |
| `TIPO_SERVICO` | `cd_tns` (preferencial) ou `cd_tp_movimento` | `bi_tns.ds_tns` (se existir; opcional) |

> "Projeto" e "Obra" são a **mesma chave** (`cd_prj`). O frontend mantém apenas
> "Obra" no menu para não duplicar.

## Contrato da resposta

Mesma `DrillResponse` já documentada. Para cada nível:

### OBRA

```json
{
  "drill_type": "OBRA",
  "titulo": "Faturamento por Obra",
  "columns": [
    { "key": "cd_prj",      "label": "Cód. Obra",   "format": "text" },
    { "key": "ds_projeto",  "label": "Descrição",   "format": "text" },
    { "key": "fat_bruto",   "label": "Fat. Bruto",  "format": "currency", "align": "right" },
    { "key": "fat_liquido", "label": "Fat. Líquido","format": "currency", "align": "right" },
    { "key": "qtde",        "label": "Qtde",        "format": "number",   "align": "right" },
    { "key": "qtd_nfs",     "label": "NFs",         "format": "number",   "align": "right" }
  ],
  "rows": [
    {
      "cd_prj": "1234",
      "ds_projeto": "Obra X - Cliente Y",
      "fat_bruto": 0, "fat_liquido": 0, "qtde": 0, "qtd_nfs": 0,
      "filtros_drill": { "cd_prj": "1234" }
    }
  ]
}
```

### TIPO_SERVICO

```json
{
  "drill_type": "TIPO_SERVICO",
  "titulo": "Faturamento por Tipo de Serviço",
  "columns": [
    { "key": "cd_tns",      "label": "Cód. TNS",    "format": "text" },
    { "key": "ds_tns",      "label": "Descrição",   "format": "text" },
    { "key": "fat_bruto",   "label": "Fat. Bruto",  "format": "currency", "align": "right" },
    { "key": "fat_liquido", "label": "Fat. Líquido","format": "currency", "align": "right" },
    { "key": "qtde",        "label": "Qtde",        "format": "number",   "align": "right" },
    { "key": "qtd_nfs",     "label": "NFs",         "format": "number",   "align": "right" }
  ],
  "rows": [
    {
      "cd_tns": "510",
      "ds_tns": "Venda de Mercadoria",
      "fat_bruto": 0, "fat_liquido": 0, "qtde": 0, "qtd_nfs": 0,
      "filtros_drill": { "cd_tns": "510" }
    }
  ]
}
```

`ds_tns` é opcional: se a fonte não tiver a descrição, devolver `null` ou omitir.

## Regras de filtros_drill

Sempre **apenas a chave agrupadora**, como já é feito para `PRODUTO` / `CLIENTE`:

- `OBRA`: `{ "cd_prj": "<código>" }`
- `TIPO_SERVICO`: `{ "cd_tns": "<código>" }`

Nunca incluir o label/descrição em `filtros_drill`.

## Chaves de contexto herdadas (ALLOWED)

| drill_type alvo | Herda do contexto                                                                 |
| --------------- | --------------------------------------------------------------------------------- |
| `OBRA`          | `anomes_emissao, cd_estado, cd_cliente, cd_rev_pedido, cd_prj, cd_origem, categoria_custom` |
| `TIPO_SERVICO`  | `anomes_emissao, cd_estado, cd_cliente, cd_rev_pedido, cd_tns, cd_origem, categoria_custom` |

Demais chaves do contexto recebido são descartadas para o agrupamento, mas
seguem aplicáveis como filtro WHERE.

## Diagnóstico

Acrescentar (já previstos no schema do front):

- `qtd_linhas_apos_obra`
- `qtd_linhas_apos_tns`

## Ativação no frontend

Após o endpoint aceitar `OBRA` e `TIPO_SERVICO`, o frontend só precisa:

1. Adicionar `'OBRA' | 'TIPO_SERVICO'` na união `DrillType`
   (`src/lib/bi/comercialDrillApi.ts`).
2. Em `src/lib/bi/comercialDrillCatalog.ts`:
   - `ENABLED_DRILLS`: incluir os dois novos.
   - `DRILL_LABELS`: `{ OBRA: 'Obra', TIPO_SERVICO: 'Tipo Serviço' }`.
   - `ROW_TO_CTX_KEY`: `{ OBRA: 'cd_prj', TIPO_SERVICO: 'cd_tns' }`.
   - `ALLOWED_CTX_KEYS`: conforme tabela acima.
   - `NEXT_DRILLS`: serão atualizados automaticamente pelo gerador (todos × todos).

Nenhuma outra mudança no drawer ou no cross-filter — são genéricos.
