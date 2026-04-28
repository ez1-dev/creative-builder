# Backend — Desvincular Número de Série

> **Veja também:** [`backend-numero-serie-validacao-origem.md`](./backend-numero-serie-validacao-origem.md) — regra de prevenção que impede o vínculo errado de acontecer (OP × pedido com origens diferentes).

Endpoint a ser implementado no backend FastAPI para permitir desfazer um vínculo
de número de série (GS) feito erroneamente em uma OP / pedido.

## Rota

```
POST /api/numero-serie/desvincular
```

## Request

```json
{
  "codigo_empresa": 1,
  "numero_pedido": 11510,
  "item_pedido": 1,
  "numero_op": 1111,             // opcional, mas recomendado quando houver
  "numero_serie": "GS-11705",    // GS atualmente vinculado
  "escopo": "vinculo_op",        // "item_pedido" (default) | "vinculo_op"
  "limpar_e000cse": false        // limpa o nº de série gravado no item do pedido
}
```

### Campo `escopo`

O frontend pode enviar dois tipos de desvínculo, porque o mesmo item pode ter
**dois GS distintos** ao mesmo tempo:

- O GS gravado no item do pedido (`E000CSE`).
- O GS reservado para a OP em `USU_T075SEP` (campos `pedido_vinculado_op` /
  `item_vinculado_op`).

| `escopo`        | O que o backend deve fazer                                                                                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `item_pedido` (default) | Localizar o registro em `USU_T075SEP` cujo `numero_serie` = informado e `pedido_reservado` / `item_reservado` batem. Zerar `pedido_reservado` e `item_reservado`. Se `limpar_e000cse=true`, limpar `E000CSE` do item do pedido. |
| `vinculo_op`    | Localizar o registro em `USU_T075SEP` cujo `numero_serie` = informado e `pedido_vinculado_op` / `item_vinculado_op` batem (e `numero_op` se enviado). Zerar `pedido_vinculado_op` / `item_vinculado_op`. **Não** mexer em `E000CSE` salvo se `limpar_e000cse=true` E o GS realmente estiver gravado lá. |

Em ambos os casos, se após o desvínculo o registro em `USU_T075SEP` não tiver
mais nenhuma reserva nem vínculo de OP, o `status` deve voltar para `LIVRE`.

## Comportamento esperado

1. Validar contexto: pedido/item existem; se `numero_op` informado, conferir o vínculo.
2. Conferir que `numero_serie` está realmente vinculado conforme o `escopo`.
3. Aplicar o update conforme tabela acima.
4. Retornar contexto atualizado (mesmo shape de `/reservar`):

```json
{
  "mensagem": "Vínculo do GS-11705 removido com sucesso.",
  "contexto": { /* ContextoNumeroSerie atualizado */ },
  "numero_serie_removido": "GS-11705"
}
```

## Erros

Retornar `400` com `detail` claro:
- `"Número de série GS-XXXX não está vinculado a este pedido/item."`
- `"Número de série não está vinculado à OP informada."` (escopo `vinculo_op`)
- `"Número de série já está LIVRE."`
- `"Pedido/item não encontrado."`

## Auditoria (sugerido)

Gravar em log/tabela de auditoria:
- usuário (header `X-User-Email` enviado pelo frontend)
- pedido, item, OP, GS removido, escopo, timestamp.
