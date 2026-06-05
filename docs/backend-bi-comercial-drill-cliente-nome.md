# BI Comercial — Drill CLIENTE com nome do cliente

Contrato para o time da FastAPI ajustar a rota `POST /api/bi/comercial/drill`
quando `drill_type = "CLIENTE"`.

## 1. View

Verificar se `public.v_bi_faturamento_comercial` possui campo de nome do cliente
(`nm_cliente`, `ds_cliente`, `nome_cliente`, `cliente`...).

- Se **existir**: usar direto no SELECT.
- Se **não existir**: opção A (preferida) — adicionar `nm_cliente` à view;
  opção B — fazer JOIN no SQL do drill com a dimensão de cliente do ERP.

## 2. Resposta do drill CLIENTE

`columns` deve passar a expor a coluna agregada de cliente como `cliente_label`
(ou manter `cd_cliente` e adicionar `cliente_label`):

```json
{
  "columns": [
    { "key": "cd_cliente", "label": "Cliente", "align": "left" },
    { "key": "vl_total", "label": "Faturamento", "format": "currency", "align": "right" }
  ],
  "rows": [
    {
      "cd_cliente": "8794",
      "nm_cliente": "NOME DO CLIENTE",
      "cliente_label": "8794 - NOME DO CLIENTE",
      "vl_total": 123456.78,
      "filtros_drill": { "cd_cliente": "8794" }
    }
  ]
}
```

## 3. Regras invioláveis

- `filtros_drill` deve conter **somente** o código (`cd_cliente`), nunca o label.
- O filtro técnico em todos os SQLs do backend continua sendo
  `WHERE cd_cliente = :cd_cliente`.
- `cliente_label` é meramente de apresentação para o frontend.

## 4. Frontend

O frontend (`ComercialDrillDrawer`) já está preparado para:

- Renderizar `cliente_label` quando presente.
- Fallback `${cd_cliente} - ${nm_cliente}` quando só `nm_cliente` vier.
- Enquanto o backend não atualizar, continua exibindo apenas o `cd_cliente`.

## 5. Extensão futura (fora do escopo deste ajuste)

Mesma estratégia pode ser aplicada a:

- `REVENDA` → `revenda_label = cd_rev_pedido || ' - ' || nm_revenda`
- `PRODUTO` → `produto_label = cd_produto || ' - ' || ds_produto`
