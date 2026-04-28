# Backend — Validação de Origem (OP × Pedido) no vínculo de Nº de Série

Para **prevenir** vínculos cruzados entre OP e pedido de origens diferentes (ex.: OP 1111 da origem 250 sendo vinculada ao pedido 4891 da origem 230), o backend FastAPI deve passar a:

## 1. `GET /api/numero-serie/contexto`

Retornar dois campos novos no objeto `contexto`:

```json
{
  "contexto": {
    "codigo_empresa": 1,
    "numero_pedido": 11510,
    "item_pedido": 1,
    "numero_op": 1111,
    "origem_op": "250",
    "origem_pedido": "230",      // NOVO — origem do item do pedido (E110PED.CODORI ou equivalente)
    "origens_conferem": false,    // NOVO — true se origem_op === origem_pedido (ou um dos dois ausente)
    "...": "..."
  }
}
```

`origem_pedido` deve vir da tabela do item do pedido (mesma fonte que hoje alimenta a coluna "Origem" em outras telas — normalmente `E110PED.CODORI` na Sankhya).

## 2. `POST /api/numero-serie/reservar`

Antes de gravar a reserva (e antes de qualquer update em `USU_T075SEP` ou `E000CSE`), validar:

```python
def validar_origens(db, numero_op: int | None, numero_pedido: int, item_pedido: int):
    if not numero_op:
        return  # sem OP, não há o que comparar
    origem_op = buscar_origem_op(db, numero_op)            # USU_T075SEP / TPRIOP / etc
    origem_ped = buscar_origem_pedido(db, numero_pedido, item_pedido)
    if origem_op and origem_ped and origem_op != origem_ped:
        raise HTTPException(
            status_code=409,
            detail=(
                f"OP {numero_op} (origem {origem_op}) não pode ser vinculada "
                f"ao pedido {numero_pedido} (origem {origem_ped})."
            ),
        )
```

### Comportamento

- `409 Conflict` quando origens divergem. **A flag `forcar_vinculo` NÃO deve burlar essa checagem** — ela só serve para forçar uso de um GS específico, não para ignorar regra de origem.
- Se quiser permitir override administrativo no futuro, criar um campo separado `forcar_origem_divergente: bool` (default `false`) que exige header de auditoria (`X-User-Email`) e gera log obrigatório.

## 3. `POST /api/numero-serie/desvincular`

Não precisa validar origem (desvincular é justamente para corrigir o erro), mas pode incluir `origem_op` e `origem_pedido` no `contexto` retornado, para o frontend re-renderizar consistente.

## 4. Fonte dos dados de origem

| Campo | Tabela / coluna provável (Sankhya) |
| ----- | ----------------------------------- |
| `origem_op` | `TPRIOP.CODORI` ou equivalente da OP |
| `origem_pedido` | `E110PED.CODORI` (cabeçalho do pedido) ou item correspondente |

Confirmar com o time de banco antes de implementar.

## 5. Frontend (já implementado)

- Lê `contexto.origem_pedido` e compara com `contexto.origem_op`.
- Se divergem: mostra `Alert` destrutivo no card de Contexto e **desabilita** os botões "Reservar Selecionado" e "Vincular GS Informado".
- Mesmo se o usuário burlar o front (DevTools), o backend rejeitará com `409`.
