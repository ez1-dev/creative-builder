## Objetivo

Reforçar `docs/backend-bi-contabilidade-dre-matriz.md` com dois requisitos que ainda não estão explícitos e que são prováveis causas do 502 atual:

1. **Nomes exatos dos parâmetros nomeados** na chamada da RPC (`p_anomes_ini` / `p_anomes_fim`) — proibido usar `anomes_ini`, `anomes_fim`, `ano`, `mes_ini`, `mes_fim`.
2. **Conversão `Decimal → float`** antes de serializar JSON (causa comum de `TypeError: Object of type Decimal is not JSON serializable`, que vira 502 no proxy).

O logging com `traceback.print_exc()` + `detail=str(e)` já está documentado na seção "Tratamento de erros / Diagnóstico (obrigatório)" — apenas reforçar que é o **primeiro passo** antes de qualquer outra mudança.

## Mudanças no documento

### 1. Subseção "Contrato da RPC consumida" — endurecer os nomes dos parâmetros

Adicionar bloco de aviso:

> **Nomes dos parâmetros (obrigatórios):** a RPC declara `p_anomes_ini` e `p_anomes_fim`.
> A chamada deve usar **exatamente** esses nomes — tanto via parâmetros nomeados psycopg
> (`%(p_anomes_ini)s`) quanto via SQL nomeado (`rpc_bi_dre_realizado_regras(p_anomes_ini => :ini, p_anomes_fim => :fim)`).
> **Proibido** usar `anomes_ini`, `anomes_fim`, `ano`, `mes_ini`, `mes_fim` ou qualquer outra forma.

Atualizar o pseudocódigo do endpoint para deixar essa amarração óbvia:

```python
p_anomes_ini = f"{ano}01"
p_anomes_fim = f"{ano}12"
rows = pg.fetch(
    "SELECT codigo_linha, anomes_referente, vl_realizado "
    "FROM public.rpc_bi_dre_realizado_regras(%(p_anomes_ini)s, %(p_anomes_fim)s)",
    {"p_anomes_ini": p_anomes_ini, "p_anomes_fim": p_anomes_fim},
)
```

E aplicar o mesmo nome de parâmetro em `docs/backend-bi-contabilidade-teste-rpc-dre.md` para manter consistência.

### 2. Nova subseção "Serialização JSON (Decimal → float)"

Logo após o pseudocódigo, antes de "Tratamento de erros":

````markdown
## Serialização JSON

A RPC retorna `vl_realizado numeric` → no Python vira `decimal.Decimal`, que **não** é
serializável pelo JSON do FastAPI e dispara `TypeError`, que o proxy traduz em **502**.

Converter para `float` antes de devolver:

```python
def _to_float(v):
    return float(v) if v is not None else None

return [
    {
        "codigo_linha":     r["codigo_linha"],
        "anomes_referente": r["anomes_referente"],
        "vl_realizado":     _to_float(r["vl_realizado"]),
    }
    for r in rows
]
```

Aplicar a mesma conversão a **todos** os campos numéricos do response final do
`/dre-matriz` (`*_realizado`, `*_av`, `*_orcado`, `total_*`).
````

### 3. Reordenar a seção "Tratamento de erros / Diagnóstico"

Adicionar uma nota no topo dela:

> **Fazer isso primeiro.** Antes de qualquer outra alteração no endpoint, plugar o
> `traceback.print_exc()` + `detail=str(e)` e reproduzir o 502 — o stdout do uvicorn
> vai apontar exatamente onde quebra (nome de parâmetro errado, Decimal não serializável,
> coluna inexistente, etc.).

## Arquivos alterados

- `docs/backend-bi-contabilidade-dre-matriz.md`
- `docs/backend-bi-contabilidade-teste-rpc-dre.md` (alinhar para `%(p_anomes_ini)s` / `%(p_anomes_fim)s`)

## Fora de escopo

- Frontend (`DrePage.tsx`) — contrato HTTP preservado, sem mudanças.
- Lovable Cloud — nenhuma alteração.
