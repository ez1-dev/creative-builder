# BI Comercial — Labels (`*_label`) por dimensão nos drills e séries

Extensão dos contratos existentes (`backend-bi-comercial-drill-cliente-nome.md`,
`backend-bi-comercial-produto-nome.md`) para padronizar a entrega de
**código + nome** em todas as dimensões agregadoras de `POST /api/bi/comercial/drill`
e nas séries agregadas (`/api/bi/comercial/revendas`, `/estado`, `/obras`...).

## 1. Regra geral

Quando o SQL do drill/série **agrupar por uma dimensão**, devolver junto:

- a chave técnica (`cd_xxx`) — usada por `filtros_drill` e cross-filter
- o nome (`nm_xxx` ou `ds_xxx`) — para o frontend exibir
- um rótulo pronto `xxx_label = cd_xxx || ' - ' || nm_xxx`

Frontend usa `xxx_label` se vier; senão monta a partir de `cd_xxx + nm_xxx`;
senão exibe só o código.

## 2. Por drill_type

| drill_type | Coluna agregada | JOIN sugerido | Campos a devolver |
|---|---|---|---|
| `CLIENTE` | `cd_cliente` | `LEFT JOIN public.bi_cliente USING (cd_cliente)` | `cd_cliente`, `nm_cliente`, `cliente_label` |
| `REVENDA` | `cd_rev_pedido` | `LEFT JOIN public.bi_revenda USING (cd_rev_pedido)` | `cd_rev_pedido`, `nm_revenda`, `revenda_label` |
| `ESTADO` | `cd_estado` | Lookup fixo de UF (27 + EX) no SQL ou aplicação | `cd_estado`, `nm_estado`, `estado_label` |
| `PRODUTO` | `cd_produto` | `LEFT JOIN public.bi_produto USING (cd_produto)` | `cd_produto`, `ds_produto`, `produto_label` |
| (drill agrupado por obra) | `cd_prj` | `LEFT JOIN public.bi_projetos ON numero_projeto = cd_prj` | `cd_prj`, `ds_obra`, `obra_label` |

> O frontend possui um fallback de UF (`src/lib/bi/ufLabels.ts`) então
> `nm_estado` é opcional, mas preferível para outras regiões.

## 3. Séries agregadas (`/api/bi/comercial/...`)

Endpoints que populam o "Ranking de revendas", "Top estados",
"Faturamento por obra" etc. devem entregar os mesmos campos:

```json
// /api/bi/comercial/revendas
{
  "cd_rev_pedido": "202601",
  "nm_revenda": "REVENDA SP CENTRO",
  "revenda_label": "202601 - REVENDA SP CENTRO",
  "faturamento": 4119.0,
  "fat_liquido": 3500.0,
  "numero_vendas": 12,
  "numero_clientes": 7
}

// /api/bi/comercial/estado
{ "cd_estado": "SP", "nm_estado": "São Paulo", "estado_label": "SP - São Paulo", "faturamento": ... }

// /api/bi/comercial/obras
{ "cd_prj": "80100", "ds_obra": "OBRA EXEMPLO", "obra_label": "80100 - OBRA EXEMPLO", "faturamento": ... }
```

## 4. Regras invioláveis

- `filtros_drill` em **toda linha** continua contendo **APENAS o código**
  (`cd_rev_pedido`, `cd_estado`, `cd_prj`, `cd_cliente`, `cd_produto`).
  NUNCA o label.
- `*_label` é puramente de apresentação. Filtro técnico continua sendo
  `WHERE cd_xxx = :cd_xxx`.
- Compatibilidade reversa: se o backend ainda não devolver `xxx_label`,
  o frontend renderiza o que tiver (`nm_xxx`, fallback de UF, código).
