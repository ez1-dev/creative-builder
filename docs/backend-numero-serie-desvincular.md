# Backend — Desvincular Número de Série

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
  "numero_pedido": 123456,
  "item_pedido": 1,
  "numero_op": 100234,         // opcional, mas recomendado quando houver
  "numero_serie": "GS-11705",  // GS atualmente vinculado
  "limpar_e000cse": true       // limpa o nº de série gravado no item do pedido
}
```

## Comportamento esperado

1. Validar contexto: pedido/item existem; se `numero_op` informado, conferir o vínculo.
2. Conferir que `numero_serie` está realmente vinculado àquele pedido/item (status `RESERVADO`
   em `USU_T075SEP` com `pedido_reservado` / `item_reservado` correspondentes).
3. Liberar o registro em `USU_T075SEP`:
   - `status = 'LIVRE'`
   - `pedido_reservado = 0`, `item_reservado = 0`
4. Se `limpar_e000cse=true`, limpar o campo de número de série do item do pedido
   (`E000CSE` ou equivalente).
5. Retornar contexto atualizado (mesmo shape de `/reservar`):

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
- `"Número de série já está LIVRE."`
- `"Pedido/item não encontrado."`

## Auditoria (sugerido)

Gravar em log/tabela de auditoria:
- usuário (header `X-User-Email` enviado pelo frontend)
- pedido, item, OP, GS removido, timestamp.
