# Painel de Compras — `situacao_oc` aceitar múltiplas situações

## Status atual (rejeita CSV com 422)

Hoje o endpoint `/api/painel-compras` (e `/api/export/painel-compras`) tipa
`situacao_oc` como `int` direto via Pydantic. Qualquer string não numérica
quebra com:

```
situacao_oc: Input should be a valid integer, unable to parse string as an integer
```

Por isso o frontend **não envia CSV** quando o usuário seleciona 2+
situações: ele omite o parâmetro e aplica a mitigação client-side
(`MITIGACAO_SITUACAO_OC_MULTI` em `PainelComprasPage.tsx`), filtrando
`dados` localmente e exibindo um `toast.warning`. A exportação, nesse
cenário, baixa todas as situações — o usuário é avisado por outro toast.

## Contexto

O frontend de **Painel de Compras** (`/api/painel-compras`) passou a permitir
selecionar **mais de uma situação da OC** ao mesmo tempo (Aberto Total +
Aberto Parcial + Suspenso, por exemplo). Para que o filtro funcione no
backend (paginação correta, exportação correta), o parâmetro precisa ser
relaxado para aceitar uma lista.

## Contrato proposto

`GET /api/painel-compras` — parâmetro `situacao_oc`:

| Valor recebido       | Comportamento esperado                          |
|----------------------|--------------------------------------------------|
| ausente / vazio      | Não filtra (todas as situações)                  |
| `4`                  | Filtra `E300OCP.SITOCP = 4`                      |
| `1,2,3`              | Filtra `E300OCP.SITOCP IN (1,2,3)`               |
| `1, 2 , 3`           | Aceitar com trim (split por vírgula)             |

Mesma regra deve valer no endpoint de exportação `/api/export/painel-compras`.

### Pseudocódigo (FastAPI)

```python
def parse_situacoes(raw: Optional[str]) -> Optional[list[int]]:
    if not raw:
        return None
    parts = [p.strip() for p in raw.split(',') if p.strip()]
    try:
        return [int(p) for p in parts] or None
    except ValueError:
        return None

# ...
sits = parse_situacoes(situacao_oc)
if sits:
    where.append(f"E300OCP.SITOCP IN ({','.join('?' for _ in sits)})")
    params.extend(sits)
```

## Como remover a mitigação no frontend

Quando o backend implementar isto, remover o bloco
`MITIGACAO_SITUACAO_OC_MULTI` em `src/pages/PainelComprasPage.tsx` (dentro
do `search`). A flag global `__avisouSituacaoMultiBackend` também pode ser
removida.
