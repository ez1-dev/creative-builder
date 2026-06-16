# GET /api/bi/contabilidade/dre-matriz

Endpoint usado pela tela **Contabilidade — DRE (matriz)** (`src/pages/bi/contabilidade/DrePage.tsx`). Substitui a chamada direta de `supabase.rpc('bi_dre_matriz_anual', ...)` no frontend.

## Request

```
GET /api/bi/contabilidade/dre-matriz?ano=2026&unidade=
```

Headers:
- `ngrok-skip-browser-warning: true` (enviado pelo front).

### Query params

| Param   | Tipo   | Obrig. | Observações                                                                                  |
|---------|--------|--------|----------------------------------------------------------------------------------------------|
| `ano`   | string | sim    | Ex.: `2026`. Repassar como `p_ano` (text) para a RPC.                                        |
| `unidade` | string | não  | Vazio / ausente / `TODOS` / `TODAS` / `ALL` (case-insensitive) → enviar `NULL` para a RPC.   |

## Comportamento backend

```sql
SELECT *
FROM public.bi_dre_matriz_anual(
  p_ano := %(ano)s,
  p_unidade_negocio := %(unidade)s   -- NULL quando "todos"
);
```

Pseudo-código FastAPI:

```python
@router.get("/api/bi/contabilidade/dre-matriz")
def dre_matriz(ano: str, unidade: str | None = None):
    u = (unidade or "").strip().upper()
    p_unidade = None if u in ("", "TODOS", "TODAS", "ALL") else unidade
    rows = supabase_admin.rpc(
        "bi_dre_matriz_anual",
        {"p_ano": ano, "p_unidade_negocio": p_unidade},
    ).execute().data or []
    return rows
```

## Response

`200 OK` — array JSON com as linhas exatamente como a RPC devolve:

```json
[
  {
    "ordem": 10,
    "codigo_linha": "RECEITA_BRUTA",
    "descricao": "Receita Bruta de Vendas",
    "jan_realizado": 1234567.89,
    "jan_av": 100.0,
    "jan_orcado": 1200000.0,
    "fev_realizado": 0,
    "fev_av": 0,
    "fev_orcado": 0,
    "...": "...",
    "dez_realizado": 0,
    "dez_av": 0,
    "dez_orcado": 0,
    "total_realizado": 9876543.21,
    "total_av": 100.0,
    "total_orcado": 12000000.0
  }
]
```

Campos esperados por linha (mesmo contrato da RPC):
- `ordem`, `codigo_linha`, `descricao`
- Para cada mês `jan..dez`: `<mes>_realizado`, `<mes>_av`, `<mes>_orcado`
- Totais: `total_realizado`, `total_av`, `total_orcado`

### Erros

- `400` — `ano` inválido.
- `5xx` — `{ "detail": "mensagem" }`. O front exibe `detail`/`message` quando disponível.

## CORS

Liberar origem do preview Lovable como nos demais endpoints `/api/bi/*`.
