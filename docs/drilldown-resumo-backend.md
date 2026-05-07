# Drill-down Gerencial — Contrato de Resumo Global (Backend FastAPI)

> **Regra de ouro:** Tabela = registros da página atual. KPIs/cards/resumo = totais globais do filtro, **sem** paginação.
> O front-end **nunca** soma `data.dados` para gerar KPIs gerenciais. Se o endpoint não enviar `resumo`, o KPI fica como "—" e exibe aviso "Resumo gerencial indisponível".

## Endpoints que devem retornar `resumo`

- `/api/producao/patio`
- `/api/producao/expedido`
- `/api/producao/produzido`
- `/api/producao/relatorio-semanal-obra`
- `/api/producao/nao-carregados`
- `/api/producao/leadtime`
- `/api/producao/engenharia-x-producao`
- `/api/notas-recebimento` (já tem dashboard separado em `/api/notas-recebimento-dashboard`)

## Contrato JSON

```json
{
  "pagina": 1,
  "tamanho_pagina": 100,
  "total_registros": 1000,
  "total_paginas": 10,
  "resumo": {
    "total_registros": 1000,
    "kg_engenharia": 0,
    "kg_produzido": 0,
    "kg_expedido": 0,
    "kg_patio": 0,
    "quantidade_produzida": 0,
    "quantidade_expedida": 0,
    "quantidade_etiquetas": 0,
    "itens_nao_carregados": 0,
    "quantidade_cargas": 0,
    "total_obras": 0,
    "total_projetos": 0,
    "leadtime_medio_engenharia_producao": 0,
    "leadtime_medio_producao_expedicao": 0,
    "leadtime_medio_total": 0
  },
  "dados": [ /* só os 100 da página */ ]
}
```

Apenas os campos relevantes ao endpoint precisam ser preenchidos. Os demais podem ficar em `0`.

## Padrão SQL (SQL Server / Senior)

```python
sql_resumo = f"""
    SELECT
        COUNT(*)        AS total_registros,
        SUM(kg_produzido) AS kg_produzido,
        SUM(kg_expedido)  AS kg_expedido,
        SUM(kg_patio)     AS kg_patio
    FROM BASE
    WHERE {where_clauses}
"""

sql_dados = f"""
    SELECT *
    FROM BASE
    WHERE {where_clauses}
    ORDER BY numero_projeto
    OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
"""

resumo_row = db.fetch_one(sql_resumo, params_filtros)
dados      = db.fetch_all(sql_dados, params_filtros + [offset, tamanho_pagina])

return {
    "pagina": pagina,
    "tamanho_pagina": tamanho_pagina,
    "total_registros": resumo_row["total_registros"],
    "total_paginas": math.ceil(resumo_row["total_registros"] / tamanho_pagina),
    "resumo": dict(resumo_row),
    "dados": dados,
}
```

> **Importante:** `sql_resumo` **não** pode ter `OFFSET/FETCH`. Senão os KPIs vão refletir somente a página atual.

## Aliases aceitos pelo front (helper `normalizarResumoGerencial`)

| Canônico (esperado)                 | Aliases tolerados                                            |
| ----------------------------------- | ------------------------------------------------------------ |
| `kg_engenharia`                     | `kg_engenharia_total`, `kg_previsto`, `kg_previsto_total`    |
| `kg_produzido`                      | `kg_produzido_total`, `peso_produzido`, `peso_real`          |
| `kg_expedido`                       | `kg_expedido_total`, `peso_expedido`                         |
| `kg_patio`                          | `kg_patio_total`, `kg_entrada_estoque_total`                 |
| `quantidade_produzida`              | `qtd_produzida`                                              |
| `quantidade_expedida`               | `qtd_expedida`                                               |
| `quantidade_etiquetas`              | `qtd_etiquetas`, `total_pecas`, `total_pecas_etiquetas`      |
| `itens_nao_carregados`              | `total_itens_nao_carregados`                                 |
| `quantidade_cargas`                 | `quantidade_cargas_geral`, `cargas_distintas`, `total_cargas`|
| `leadtime_medio_engenharia_producao`| `leadtime_eng_prod`, `lt_eng_prod`                           |
| `leadtime_medio_producao_expedicao` | `leadtime_prod_exp`, `lt_prod_exp`                           |
| `leadtime_medio_total`              | `leadtime_total`, `lt_total`                                 |

Preferir os nomes canônicos para reduzir confusão.

## Critérios de aceite

1. Pesquisar uma base com 1.000 registros, 100 por página → KPIs mostram total dos 1.000.
2. Trocar de página 1 → 2 → 3 → KPIs **não mudam**.
3. Alterar filtros → KPIs recalculam.
4. Tabela paginada normalmente.
5. Nenhum KPI gerencial é somado a partir de `data.dados`.
