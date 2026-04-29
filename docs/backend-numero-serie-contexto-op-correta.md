# Backend — `/contexto` deve retornar a OP do pedido informado

## Bug observado

Ao buscar o contexto pelo **pedido 11510 / item 1**, o backend retorna a **OP 1111**. Mas a OP 1111 está vinculada ao **pedido 4891** (vínculo antigo, feito errado). O resultado: o usuário vê uma OP que não pertence ao pedido que ele digitou — e se reservar/vincular sem perceber, contamina mais um GS.

## Regra esperada

`GET /api/numero-serie/contexto?numero_pedido=11510&item_pedido=1&codigo_empresa=1`

deve buscar a OP **cujo vínculo seja exatamente esse pedido + item**, não "qualquer OP do produto".

### Algoritmo sugerido

```python
def buscar_op_do_pedido(db, codigo_empresa: int, numero_pedido: int, item_pedido: int):
    rows = db.execute(text("""
        SELECT NUMERO_OP_VINCULADA AS numero_op
        FROM   USU_T075SEP
        WHERE  CODEMP = :emp
          AND  PEDIDO_VINCULADO_OP = :ped
          AND  ITEM_VINCULADO_OP   = :item
          AND  COALESCE(NUMERO_OP_VINCULADA, 0) > 0
        ORDER BY DTCAD DESC, NUMSER DESC
    """), {"emp": codigo_empresa, "ped": numero_pedido, "item": item_pedido}).fetchall()

    if not rows:
        return None, []  # nenhuma OP vinculada a este pedido
    return rows[0].numero_op, [r.numero_op for r in rows]  # principal, candidatas
```

### Comportamento

1. Se houver OP vinculada ao pedido informado → retornar essa OP em `contexto.numero_op` e `contexto.origem_op`.
2. Se houver mais de uma → retornar a mais recente em `numero_op` e expor as outras em `ops_candidatas: number[]` (campo opcional novo).
3. Se NÃO houver OP vinculada → `numero_op: 0` (ou null). **NÃO inventar** retornando OP de outro pedido só porque o produto bate.
4. Quando o cliente chama com `numero_op` explícito (sem `numero_pedido`), retornar normalmente os campos `pedido_vinculado_op` e `item_vinculado_op` para o frontend detectar mismatch.

## Resposta atualizada

```json
{
  "contexto": {
    "codigo_empresa": 1,
    "numero_pedido": 11510,
    "item_pedido": 1,
    "numero_op": 0,                    // 0 quando não há OP vinculada a este pedido
    "origem_op": "",
    "origem_pedido": "250",
    "origens_conferem": true,
    "pedido_vinculado_op": null,
    "item_vinculado_op": null,
    "ops_candidatas": [],              // NOVO opcional, [] quando nenhuma
    "...": "..."
  }
}
```

Quando chamado com `numero_op=1111` direto (sem pedido), retornar:

```json
{
  "contexto": {
    "numero_op": 1111,
    "origem_op": "230",
    "pedido_vinculado_op": 4891,    // pedido REAL ao qual a OP está hoje
    "item_vinculado_op": 1,
    "...": "..."
  }
}
```

Assim o frontend já detecta que `numero_pedido` digitado (se houver) ≠ `pedido_vinculado_op` e bloqueia a reserva com aviso amarelo.

## Frontend (já implementado)

- Compara `contexto.numero_pedido` com `contexto.pedido_vinculado_op`.
- Se diferentes: mostra `Alert` âmbar e desabilita "Reservar Selecionado" + "Vincular GS Informado".
- Não auto-preenche o campo `OP` no filtro quando há mismatch (evita o usuário "herdar" a OP errada na próxima busca).
- O botão **Desvincular GS** continua habilitado — é justamente como se corrige o vínculo antigo.

## Endpoint complementar (opcional, futuro)

Se útil, criar `GET /api/numero-serie/ops-do-pedido?numero_pedido=11510&item_pedido=1` que retorna a lista de OPs encontradas para o pedido (ativas, com produto, status, qtde) — para o frontend oferecer um seletor "qual OP é a correta?".
