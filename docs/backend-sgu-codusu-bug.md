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
em `R999USU.CODUSU` (integer).

## Esquema real das tabelas (importante)

A documentação anterior citava `R910USU.CODUSU` e `R910USU.DESUSU` em
contexto errado. O esquema correto é:

### `R999USU` — usuários SGU (fonte da PK)

| Coluna   | Tipo    | Descrição                                |
|----------|---------|------------------------------------------|
| `CODUSU` | integer | Código numérico do usuário SGU (**PK**)  |
| `NOMUSU` | string  | Login / nome curto                       |
| `TIPCOL` | string  | Tipo de colaborador                      |
| `NUMEMP` | int     | Empresa                                  |
| `CODFIL` | int     | Filial                                   |

### `R910USU` — cadastro / colaborador

| Coluna   | Tipo    | Descrição                                                |
|----------|---------|----------------------------------------------------------|
| `CODENT` | integer | Código numérico do usuário (FK lógica → `R999USU.CODUSU`)|
| `NOMCOM` | string  | Nome completo                                            |
| `DESUSU` | string  | Descrição / login                                        |

> ⚠️ `R910USU.CODUSU` **não existe**. A junção correta é
> `R910USU.CODENT = R999USU.CODUSU`.

## Consequência atual no frontend

1. A coluna "Código" mostra um aviso porque não consegue converter
   `"ademir.passos"` para inteiro.
2. Endpoints de detalhe falham com **422 Unprocessable Entity**:
   ```
   path.codusu: Input should be a valid integer, unable to parse string as an integer
   ```
   porque a chamada vira `GET /api/sgu/usuarios/ademir.passos` em uma
   rota tipada como `int`.
3. As ações **Detalhes / Origem / Destino** ficam desabilitadas.

## Schema JSON esperado (após correção)

```json
{
  "codusu": 301,
  "nomusu": "lucas.martins",
  "nomcom": "Lucas Martins - CUSTEIO",
  "desusu": "lucas.martins",
  "tipcol": null,
  "empcol": null,
  "filcol": null,
  "existe_r910": 1,
  "existe_r999": 1,
  "qtd_empresas_e099usu": 2
}
```

| Campo     | Tipo       | Origem                  |
|-----------|------------|-------------------------|
| `codusu`  | integer    | `R999USU.CODUSU` (**PK**) |
| `nomusu`  | string     | `R999USU.NOMUSU`        |
| `nomcom`  | string?    | `R910USU.NOMCOM`        |
| `desusu`  | string?    | `R910USU.DESUSU`        |
| `tipcol`  | string?    | `R999USU.TIPCOL`        |
| `empcol`  | string/int | `R999USU.NUMEMP`        |
| `filcol`  | string/int | `R999USU.CODFIL`        |

## SQL sugerido

```sql
SELECT
    R.CODUSU                          AS codusu,
    LTRIM(RTRIM(R.NOMUSU))            AS nomusu,
    LTRIM(RTRIM(A.NOMCOM))            AS nomcom,
    LTRIM(RTRIM(A.DESUSU))            AS desusu,
    LTRIM(RTRIM(R.TIPCOL))            AS tipcol,
    LTRIM(RTRIM(R.NUMEMP))            AS empcol,
    LTRIM(RTRIM(R.CODFIL))            AS filcol,
    CASE WHEN A.CODENT IS NULL THEN 0 ELSE 1 END AS existe_r910,
    CASE WHEN R.CODUSU IS NULL THEN 0 ELSE 1 END AS existe_r999,
    (
        SELECT COUNT(*)
        FROM E099USU E
        WHERE E.CODUSU = R.CODUSU
    ) AS qtd_empresas_e099usu
FROM R999USU R
LEFT JOIN R910USU A
       ON A.CODENT = R.CODUSU
ORDER BY R.NOMUSU;
```

Aplicar o filtro de pesquisa via parâmetro:

```sql
WHERE (
    :filtro IS NULL
 OR R.NOMUSU LIKE '%' + :filtro + '%'
 OR CAST(R.CODUSU AS VARCHAR(20)) = :filtro
)
```

## Pydantic / response model sugerido

```python
class SguUsuario(BaseModel):
    codusu: int
    nomusu: str
    nomcom: Optional[str] = None
    desusu: Optional[str] = None
    tipcol: Optional[str] = None
    empcol: Optional[str] = None
    filcol: Optional[str] = None
    existe_r910: int = 0
    existe_r999: int = 0
    qtd_empresas_e099usu: int = 0
```

## Endpoints afetados

Todos devem usar `codusu` integer:

- `GET  /api/sgu/usuarios?filtro=...` — lista
- `GET  /api/sgu/usuarios/{codusu}` — detalhe (path int)
- `GET  /api/sgu/usuarios/{codusu}/resumo-acessos` (path int)
- `POST /api/sgu/usuarios/comparar` — body `{usuario_origem: int, usuario_destino: int}`
- `POST /api/sgu/usuarios/duplicar-preview-campos` — body com ints
- `POST /api/sgu/usuarios/duplicar-parametros` — body com ints

## Critérios de validação

- `codusu` deve ser **número/integer**.
- `nomusu` deve ser **texto** (login).
- `nomcom` e `desusu` devem ser campos **separados** (nunca duplicar com `codusu`).
- **Nunca** retornar login textual no campo `codusu`.
- As rotas `/api/sgu/usuarios/{codusu}` devem aceitar `codusu` numérico.

## Validação após o ajuste

1. `GET /api/sgu/usuarios?filtro=lucas` retorna `codusu` numérico
   (ex: `301`), `nomusu` textual (`"lucas.martins"`) e `nomcom`
   (`"Lucas Martins - CUSTEIO"`).
2. Frontend renderiza a coluna Código com o número, exibe o nome
   completo na coluna correspondente e remove o banner de alerta
   automaticamente.
3. Botões Detalhes / Origem / Destino funcionam sem 422.
