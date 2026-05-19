# Endpoints de cadastros para autocomplete (Senior)

O frontend (`PainelComprasPage` → componente `AutocompleteAsync`) consome quatro endpoints novos no FastAPI para alimentar os filtros Fornecedor, Centro de Custo, Depósito e Transação. Todos seguem o mesmo contrato.

## Contrato comum

- Método: `GET`
- Auth: Bearer token (mesmo padrão dos demais endpoints).
- Query param: `q` (opcional). Filtro `ILIKE` em código OU descrição. Sem `q`, retornar até 50 itens mais usados / ordenados por código.
- Limite padrão: 50 itens por resposta.
- Resposta: `application/json`, array de objetos:

```json
[
  { "codigo": "12345", "descricao": "FORNECEDOR EXEMPLO LTDA", "label": "12345 - FORNECEDOR EXEMPLO LTDA", "fantasia": "FornEx" }
]
```

O frontend aceita também `{ "dados": [...] }` ou `{ "itens": [...] }`. Em erro (404/500/timeout), o componente apenas mostra "Nenhum resultado" — não exibe toast.

## Endpoints

### 1. `GET /api/cadastros/fornecedores?q=`
Tabela `E095FOR`. Preferir somente ativos (`SitFor = 'A'` se a coluna existir).

```sql
SELECT TOP 50
  CodFor   AS codigo,
  NomFor   AS descricao,
  ApeFor   AS fantasia,
  CONCAT(CodFor, ' - ', NomFor) AS label
FROM E095FOR
WHERE (:q IS NULL
       OR CAST(CodFor AS VARCHAR(20)) LIKE :q + '%'
       OR NomFor LIKE '%' + :q + '%'
       OR ApeFor LIKE '%' + :q + '%')
  AND (SitFor = 'A' OR SitFor IS NULL)
ORDER BY NomFor;
```

### 2. `GET /api/cadastros/centros-custo?q=`
Tabela `E044CCU`.

```sql
SELECT TOP 50 CodCcu AS codigo, DesCcu AS descricao,
       CONCAT(CodCcu, ' - ', DesCcu) AS label
FROM E044CCU
WHERE (:q IS NULL
       OR CAST(CodCcu AS VARCHAR(20)) LIKE :q + '%'
       OR DesCcu LIKE '%' + :q + '%')
ORDER BY CodCcu;
```

### 3. `GET /api/cadastros/depositos?q=`
Tabela `E205DEP`.

```sql
SELECT TOP 50 CodDep AS codigo, DesDep AS descricao,
       CONCAT(CodDep, ' - ', DesDep) AS label
FROM E205DEP
WHERE (:q IS NULL
       OR CAST(CodDep AS VARCHAR(20)) LIKE :q + '%'
       OR DesDep LIKE '%' + :q + '%')
ORDER BY CodDep;
```

### 4. `GET /api/cadastros/transacoes-compras?q=`
Tabela `E001TNS`, restrito a transações de compras. Sugestão (validar com o time Senior):

```sql
SELECT TOP 50 t.CodTns AS codigo, t.DesTns AS descricao,
       CONCAT(t.CodTns, ' - ', t.DesTns) AS label
FROM E001TNS t
WHERE EXISTS (SELECT 1 FROM E140IPD ipd WHERE ipd.CodTns = t.CodTns)
  AND (:q IS NULL
       OR CAST(t.CodTns AS VARCHAR(20)) LIKE :q + '%'
       OR t.DesTns LIKE '%' + :q + '%')
ORDER BY t.CodTns;
```

Alternativa mais leve: filtrar por `IdePrc` de compras se essa coluna existir.

## Índices recomendados

- `E095FOR`: índice em `(NomFor)`, `(ApeFor)` e PK em `CodFor`.
- `E044CCU`: PK em `CodCcu`, índice em `(DesCcu)`.
- `E205DEP`: PK em `CodDep`, índice em `(DesDep)`.
- `E001TNS`: PK em `CodTns`, índice em `(DesTns)`; índice em `E140IPD(CodTns)`.

## Notas de integração com `/api/painel-compras`

O filtro Fornecedor agora envia **`CodFor`** (string numérica), não o nome. Garantir que o `/api/painel-compras` aceite:

- `fornecedor` = `CodFor` (numérico/string)
- `centro_custo` = `CodCcu`
- `coddep` = `CodDep`
- `transacao` = `CodTns`

Caso o endpoint ainda esteja filtrando `fornecedor` por substring em `NomFor`, atualizar para comparar contra `CodFor`.
