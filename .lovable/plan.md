# Erro 42S02 — `#BASE_DEM` inválido no Demonstrativo

## Diagnóstico

```
('42S02', "[42S02] ... Nome de objeto '#BASE_DEM' inválido. (208)")
```

Erro do **SQL Server**, vindo do backend FastAPI no endpoint `GET /api/demonstrativo-compras-recebimentos`. O código 42S02 / 208 significa "tabela/objeto não existe". A query final do endpoint referencia a tabela temporária `#BASE_DEM`, mas ela não foi criada na mesma conexão/sessão antes do `SELECT`.

Não é problema do frontend — nenhum payload do cliente cria/derruba temp tables. Os filtros foram sanitizados na correção anterior (erro 22007) e seguem corretos.

## Causas típicas no backend (pyodbc + SQL Server)

1. **Conexões diferentes para CREATE e SELECT** — temp tables locais (`#nome`) vivem só na sessão que as criou. Se o pool do pyodbc devolver outra conexão entre o `CREATE TABLE #BASE_DEM` e o `SELECT ... FROM #BASE_DEM`, a segunda enxerga "objeto inválido".
2. **`executemany` / múltiplos `cursor.execute` sem `cursor.nextset()`** — o batch que cria a `#BASE_DEM` retorna mensagens (ex.: `SET NOCOUNT ON` ausente, `PRINT`, contagens) e o pyodbc consome o resultado errado, ignorando o `CREATE`.
3. **Erro silencioso no `CREATE TABLE #BASE_DEM ... SELECT ...`** — alguma das colunas/CTEs falha (ex.: filtro novo `tipo_item`, `numero_oc`, `familia` referenciando coluna inexistente), o `CREATE` aborta e o `SELECT` seguinte explode com 42S02.
4. **Quebra do SQL em pedaços com `GO`** — `GO` é separador do SSMS, não comando T-SQL; se o backend manda o script inteiro com `GO`, pyodbc executa só o primeiro bloco.
5. **Uso de `with pyodbc.connect(...) as conn:` reabrindo conexão entre passos** — temp table some no `commit`/reconnect.

## Escopo desta tarefa

Apenas documentação para o time de backend, já que o código FastAPI não está neste repo. Sem mudanças visuais ou de lógica no frontend.

1. Criar `docs/backend-demonstrativo-erro-42s02.md` com:
   - Diagnóstico do erro e do código 208.
   - Checklist de correção (mesma conexão/cursor, `SET NOCOUNT ON`, evitar `GO`, validar `CREATE` antes do `SELECT`).
   - Alternativas recomendadas: usar **table variable** (`DECLARE @base TABLE(...)`) ou **CTE** quando os dados couberem em memória; ou criar **tabela temporária global** `##base_dem_<uuid>` e dropar no `finally`.
   - Snippet pyodbc mostrando padrão correto (um único `cursor.execute` com o script completo ou conexão dedicada por request).
   - Como reproduzir: rodar `GET /api/demonstrativo-compras-recebimentos?origem=TODOS&nivel=projeto_macro` e ativar log de SQL para ver onde o `CREATE` foi engolido.
2. Atualizar `.lovable/plan.md` com o novo erro investigado e apontar para o doc.

## Snippet de referência (vai no doc)

```python
# Padrão seguro: mesma conexão, mesmo cursor, SET NOCOUNT, batch único
SQL = """
SET NOCOUNT ON;

IF OBJECT_ID('tempdb..#BASE_DEM') IS NOT NULL DROP TABLE #BASE_DEM;

SELECT ...
INTO #BASE_DEM
FROM E140NFI nfi
JOIN E140NFC nfc ON ...
WHERE nfc.DatEmi BETWEEN ? AND ?;

SELECT ... FROM #BASE_DEM
WHERE (? IS NULL OR projeto_macro = ?)
ORDER BY ...;
"""

with get_conn() as conn:           # uma conexão por request
    cur = conn.cursor()             # um único cursor
    cur.execute(SQL, [data_ini, data_fim, projeto_macro, projeto_macro])
    rows = cur.fetchall()
```

Pontos críticos:
- `SET NOCOUNT ON` no topo evita pyodbc consumir contagens em vez do resultado.
- Nada de `GO` — quebra o batch em chamadas separadas.
- Não usar pool com `autocommit=True` que recicla conexão entre passos.
- Se o backend faz paginação/contagem em chamadas separadas, **recriar a `#BASE_DEM` em cada cursor.execute** ou trocar para `##global` / tabela real `etl_demonstrativo_tmp` com chave de sessão.

## Mitigação no frontend

Já temos `ErrorState` mostrando a mensagem do backend. Vou adicionar, junto da heurística do 22007, mais um caso amigável: quando `statusCode === 500` e a mensagem contiver `42S02` ou `#BASE_DEM` ou `Nome de objeto`, exibir toast:

> "O backend não conseguiu montar a tabela temporária do demonstrativo. Reenvie a requisição em alguns segundos; se persistir, o time de backend precisa revisar o endpoint (ver `docs/backend-demonstrativo-erro-42s02.md`)."

Isso ajuda o usuário a saber que não é input dele.

## Arquivos afetados

- `docs/backend-demonstrativo-erro-42s02.md` (novo).
- `.lovable/plan.md` (atualizar com o novo erro).
- `src/pages/DemonstrativoComprasRecebimentosPage.tsx` (apenas estender o tratamento amigável de erro 500 — sem mudar layout nem lógica de filtros).

## Fora de escopo

- Alterar o backend FastAPI (não está neste repo).
- Mudanças visuais ou de comportamento da tela além da mensagem de erro.
- Outros módulos.
