# Bug: backend SGU está enviando login no campo `codusu`

## Sintoma observado no frontend

Em `GET /api/sgu/usuarios?filtro=...` o JSON retornado contém:

```json
{
  "codusu": "ademir.passos",
  "nomusu": "ademir.passos",
  "tipcol": null,
  "empcol": null,
  "filcol": null,
  "existe_r910": 1,
  "existe_r999": 1,
  "qtd_empresas_e099usu": 2
}
```

O campo `codusu` está vindo com o **login textual** (igual ao `nomusu`),
quando deveria ser o **identificador numérico (PK)** do usuário SGU
(`R910USU.CODUSU`, integer). Os campos `tipcol`, `empcol`, `filcol`
também estão vindo `null` — provavelmente faltam no SELECT.

## Consequência no frontend

1. A coluna "Código" mostra um aviso porque não consegue converter
   `"ademir.passos"` para inteiro.
2. Endpoints de detalhe falham com **422 Unprocessable Entity**:
   ```
   path.codusu: Input should be a valid integer, unable to parse string as an integer
   ```
   porque a chamada vira `GET /api/sgu/usuarios/ademir.passos` em uma
   rota tipada como `int`.
3. As ações **Detalhes / Origem / Destino** ficam desabilitadas.

## Correção esperada no backend

O JSON deve retornar campos distintos:

| Campo     | Tipo       | Descrição                              | Exemplo         |
|-----------|------------|----------------------------------------|-----------------|
| `codusu`  | integer    | Código numérico do usuário SGU (PK)    | `1234`          |
| `nomusu`  | string     | Login / nome curto do usuário          | `ademir.passos` |
| `descusu` | string?    | (opcional) Descrição/nome completo     | `Ademir Passos` |
| `tipcol`  | string?    | Tipo de colaborador                    | `F` / `J`       |
| `empcol`  | string/int | Empresa do colaborador                 | `1`             |
| `filcol`  | string/int | Filial do colaborador                  | `1`             |

### Endpoints afetados (todos devem usar `codusu` integer)

- `GET  /api/sgu/usuarios?filtro=...` — lista
- `GET  /api/sgu/usuarios/{codusu}` — detalhe (path int)
- `GET  /api/sgu/usuarios/{codusu}/resumo-acessos` (path int)
- `POST /api/sgu/usuarios/comparar` — body `{usuario_origem: int, usuario_destino: int}`
- `POST /api/sgu/usuarios/duplicar-preview-campos` — body com ints
- `POST /api/sgu/usuarios/duplicar-parametros` — body com ints

### Sugestão de SELECT

```sql
SELECT
  R910.CODUSU                 AS codusu,    -- integer (PK)
  R910.NOMUSU                 AS nomusu,    -- string (login)
  R910.DESUSU                 AS descusu,   -- string (descrição)
  R910.TIPCOL                 AS tipcol,
  R910.EMPCOL                 AS empcol,
  R910.FILCOL                 AS filcol,
  CASE WHEN R910.CODUSU IS NULL THEN 0 ELSE 1 END AS existe_r910,
  CASE WHEN R999.CODUSU IS NULL THEN 0 ELSE 1 END AS existe_r999,
  COALESCE((SELECT COUNT(DISTINCT E099.CODEMP)
              FROM E099USU E099
             WHERE E099.CODUSU = R910.CODUSU), 0) AS qtd_empresas_e099usu
FROM R910USU R910
LEFT JOIN R999USU R999 ON R999.CODUSU = R910.CODUSU
WHERE (
       :filtro IS NULL
    OR R910.NOMUSU ILIKE '%' || :filtro || '%'
    OR CAST(R910.CODUSU AS TEXT) = :filtro
)
ORDER BY R910.NOMUSU;
```

### Pydantic / response model sugerido

```python
class SguUsuario(BaseModel):
    codusu: int
    nomusu: str
    descusu: Optional[str] = None
    tipcol: Optional[str] = None
    empcol: Optional[str] = None
    filcol: Optional[str] = None
    existe_r910: int = 0
    existe_r999: int = 0
    qtd_empresas_e099usu: int = 0
```

## Validação após o ajuste

1. `GET /api/sgu/usuarios?filtro=ademir` retorna `codusu` numérico
   (ex: `1234`) e `nomusu` textual (`"ademir.passos"`).
2. Frontend renderiza a coluna Código com o número e remove o banner
   de alerta automaticamente.
3. Botões Detalhes / Origem / Destino funcionam sem 422.
