# Backend: Enriquecimento de Descrição do Produto no Drill

Aplica-se a `POST /api/bi/comercial/drill`. O frontend agora exibe a coluna
"Descrição do Produto" em todos os drills com `cd_produto` e usa `produto_label`
na coluna "Produto". O backend FastAPI precisa fornecer esses campos.

## Pré-requisito

A dimensão `public.bi_produto` deve estar populada via
`POST /api/bi/comercial/produtos/sincronizar`
(ver `docs/backend-bi-comercial-produtos-sincronizar.md`).

## LEFT JOIN na query base

Onde a query lê `public.v_bi_faturamento_comercial f`, fazer:

```sql
left join public.bi_produto p
  on p.cd_produto = f.cd_produto::text
```

Se a query usa `to_jsonb(f)` para gerar a linha (`raw` CTE), enriquecer:

```sql
raw as (
  select
    to_jsonb(f)
    ||
    jsonb_build_object(
      'ds_produto', p.ds_produto,
      'produto_label',
        case
          when p.ds_produto is not null and trim(p.ds_produto) <> ''
            then f.cd_produto::text || ' - ' || p.ds_produto
          else f.cd_produto::text
        end
    ) as j
  from public.v_bi_faturamento_comercial f
  left join public.bi_produto p
    on p.cd_produto = f.cd_produto::text
)
```

Cada linha de drill que tenha produto deve devolver:

```json
{
  "cd_produto": "1-250001067",
  "ds_produto": "DESCRIÇÃO DO PRODUTO",
  "produto_label": "1-250001067 - DESCRIÇÃO DO PRODUTO"
}
```

## _DRILL_COLUMNS

- **`NOTA_FISCAL`**: incluir `{"key":"cd_produto","label":"Produto"}` e
  `{"key":"ds_produto","label":"Descrição"}`.
- **`PRODUTO`**: usar `{"key":"produto_label","label":"Produto"}` e
  `{"key":"ds_produto","label":"Descrição"}`.
- **`DETALHES_IMPOSTOS`**: incluir `{"key":"cd_produto","label":"Produto"}` e
  `{"key":"ds_produto","label":"Descrição"}`.

## _drill_enriquecer_rows (fallback)

Se a query não trouxer `produto_label` por algum motivo:

```python
cd = r.get("cd_produto")
ds = (
    r.get("ds_produto")
    or r.get("descricao_produto")
    or r.get("nm_produto")
    or r.get("des_produto")
)
if isinstance(ds, str):
    ds = ds.strip()
if cd:
    if ds:
        r["produto_label"] = f"{cd} - {ds}"
        r["ds_produto"] = ds
    else:
        r["produto_label"] = str(cd)
```

## Regra crítica: filtros_drill

`filtros_drill` em cada linha **NUNCA** pode conter `produto_label`. Apenas o código:

```json
{ "filtros_drill": { "cd_produto": "1-250001067" } }
```

Caso contrário, o drill-down quebra (tenta filtrar pela string concatenada).

## Critérios de aceite

- Drill por Nota Fiscal mostra descrição do produto.
- Drill por Produto mostra "código - descrição" na coluna Produto e a descrição em
  coluna separada.
- Drill de Impostos mostra a descrição.
- CSV exporta a descrição.
- Detalhamento (clique em "Detalhar") continua filtrando por `cd_produto`.
- Sem descrição cadastrada, exibe apenas o código (sem quebrar).
