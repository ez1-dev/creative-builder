# Backend — Demonstrativo de Compras e Recebimentos: erro 42S02 (`#BASE_DEM`)

## Sintoma

```
('42S02', "[42S02] [Microsoft][ODBC Driver 17 for SQL Server][SQL Server]
Nome de objeto '#BASE_DEM' inválido. (208) (SQLExecDirectW)")
```

Erro do SQL Server no endpoint `GET /api/demonstrativo-compras-recebimentos`.
Código **208 / SQLSTATE 42S02** = "objeto inexistente". A query final
referencia a temp table `#BASE_DEM`, mas ela não estava materializada na
sessão/cursor que executou o `SELECT`.

Não é problema do frontend: nenhum payload do cliente cria/derruba temp
tables. Os filtros já estão sanitizados (ver `backend-demonstrativo-erro-22007.md`).

## Causas típicas (pyodbc + SQL Server)

1. **Conexões diferentes para CREATE e SELECT** — temp tables locais (`#nome`)
   só existem na sessão que as criou. Se o pool do pyodbc devolver outra
   conexão entre `CREATE TABLE #BASE_DEM` e `SELECT ... FROM #BASE_DEM`,
   a segunda enxerga "objeto inválido".
2. **Múltiplos `cursor.execute` sem `cursor.nextset()`** — o batch que cria
   `#BASE_DEM` retorna mensagens (contagens, `PRINT`) e o pyodbc consome o
   resultado errado, ignorando o `CREATE`. Resolvido com `SET NOCOUNT ON`.
3. **Erro silencioso no `CREATE TABLE #BASE_DEM ... SELECT INTO ...`** —
   alguma coluna/CTE falha (ex.: filtro novo `tipo_item`, `numero_oc`,
   `familia` referenciando coluna inexistente), o `CREATE` aborta e o
   `SELECT` seguinte explode com 42S02.
4. **`GO` no script** — `GO` é separador do SSMS, não comando T-SQL. Se o
   backend manda o script inteiro com `GO`, pyodbc executa só o primeiro
   bloco e a temp table não é criada.
5. **`with pyodbc.connect(...) as conn:` reabrindo conexão entre passos** —
   `commit`/reconnect derruba a temp table.

## Padrão seguro (referência)

```python
SQL = """
SET NOCOUNT ON;

IF OBJECT_ID('tempdb..#BASE_DEM') IS NOT NULL DROP TABLE #BASE_DEM;

SELECT ...
INTO #BASE_DEM
FROM E140NFI nfi
JOIN E140NFC nfc ON ...
WHERE (? IS NULL OR nfc.DatEmi >= ?)
  AND (? IS NULL OR nfc.DatEmi <= ?);

SELECT ... FROM #BASE_DEM
WHERE (? IS NULL OR projeto_macro = ?)
ORDER BY ...;
"""

with get_conn() as conn:        # 1 conexão por request
    cur = conn.cursor()          # 1 único cursor
    cur.execute(SQL, [
        data_ini, data_ini,
        data_fim, data_fim,
        projeto_macro, projeto_macro,
    ])
    rows = cur.fetchall()
```

Pontos críticos:

- `SET NOCOUNT ON` no topo evita pyodbc consumir contagens em vez do resultado.
- **Nada de `GO`** — quebra o batch em chamadas separadas.
- Não usar pool com `autocommit=True` que recicla conexão entre passos.
- Se o endpoint faz paginação/contagem em chamadas separadas, **recriar a
  `#BASE_DEM` em cada `cursor.execute`** ou trocar para tabela temp global
  `##base_dem_<uuid>` (dropar em `finally`) ou tabela real
  `etl_demonstrativo_tmp` com chave de sessão.

## Alternativas recomendadas

- **Table variable** (`DECLARE @base TABLE(...)`) quando o volume couber em
  memória — escopo limpo, vida amarrada ao batch, sem dependência de conexão.
- **CTE (`WITH base AS (...) SELECT ... FROM base`)** quando o `SELECT` final
  é único — elimina a temp table.
- **Tabela materializada `bi_demonstrativo_*`** populada por ETL (ver
  `backend-etl-bi.md`) quando a query é cara e estável.

## Reprodução

Rode o request mínimo:

```
GET /api/demonstrativo-compras-recebimentos
    ?origem=TODOS
    &nivel=projeto_macro
```

Ative o log do pyodbc para imprimir o SQL final e os parâmetros. Verifique
se o `CREATE TABLE #BASE_DEM` é executado **antes** do `SELECT` no mesmo
cursor. Se aparecer mensagem de erro anterior ao 42S02 (coluna inexistente,
tipo incompatível), corrija a causa raiz — o 42S02 é só sintoma.

## Checklist

- [ ] `SET NOCOUNT ON` no início do script.
- [ ] Nenhum `GO` no SQL enviado por pyodbc.
- [ ] Mesma conexão e mesmo cursor para criar e ler `#BASE_DEM`.
- [ ] Sem `with pyodbc.connect(...)` aninhado entre `CREATE` e `SELECT`.
- [ ] Pool não reseta conexão entre passos (`autocommit` conferido).
- [ ] `CREATE TABLE #BASE_DEM` validado isoladamente (todas as colunas
      referenciadas existem nas tabelas-base com os filtros novos).
- [ ] Considerar migrar para CTE / table variable / tabela `bi_*`.
