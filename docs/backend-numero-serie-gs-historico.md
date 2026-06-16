# Histórico do GS / Reserva OP Complementar — contratos backend

Esta tela vive em `/numero-serie` (`src/pages/NumeroSeriePage.tsx`).
Consulta o histórico de um GS e valida se ele foi corretamente gravado
na OP nova complementar.

## 1) Resposta enriquecida de `POST /api/numero-serie/op-complementar/manter-gs`

Além dos campos já existentes, o backend DEVE devolver:

```json
{
  "sucesso": true,
  "vinculo_confirmado": true,
  "mensagem": "GS GS-11661 reservado para a OP nova 250/1113.",
  "op_nova": 1113,
  "origem_op_nova": "250",
  "numero_serie": "GS-11661",
  "pedido": 11675,
  "item_pedido": 1,
  "produto_op_nova": "250000780",
  "derivacao": "U",
  "validacoes": {
    "e120ipd_confirmado": true,
    "usu_tnsop_confirmado": true,
    "e000cse_confirmado": false,
    "historico_estoque_encontrado": true
  }
}
```

Regras de exibição no frontend:

- `vinculo_confirmado=true` → alert verde "Vínculo confirmado. O GS está reservado na OP nova."
- `vinculo_confirmado=false` → alert vermelho "Reserva não confirmada. O GS não foi localizado no item do pedido da OP nova."
- `validacoes.historico_estoque_encontrado=true` → aviso amarelo "GS encontrado no histórico do ERP e reaproveitado para a OP complementar."
- Os 4 flags em `validacoes` viram badges (verde quando true, cinza/vermelho quando false).
- Quando o GS for encontrado em `E210MVP` ou `E210DLS`, NÃO bloquear nem exigir `forcar_vinculo=true`.
- `forcar_vinculo=true` somente após confirmação extra do usuário quando o GS não existe em nenhuma fonte.

## 2) `GET /api/numero-serie/gs-historico`

Filtros (query params, todos opcionais — ao menos `numero_serie` OU `numero_op_nova`):

| param            | tipo    | descrição                                    |
| ---------------- | ------- | -------------------------------------------- |
| `numero_serie`   | string  | Ex.: `GS-11661`                              |
| `numero_op_nova` | int     | Ex.: `1113`                                  |
| `origem_op_nova` | string  | Default `250`                                |
| `codigo_produto` | string  | Ex.: `250000780`                             |
| `data_inicio`    | date    | `YYYY-MM-DD` (filtra movimentações)          |
| `data_fim`       | date    | `YYYY-MM-DD`                                 |
| `situacao`       | string  | `ENCONTRADO`/`RESERVADO`/`VINCULADO`/`PENDENTE`/`ERRO` |

Resposta:

```json
{
  "resumo": {
    "numero_serie": "GS-11661",
    "fonte": "E210MVP",
    "produto_origem": "250000123",
    "derivacao_origem": "U",
    "produto_op_nova": "250000780",
    "derivacao_op_nova": "U",
    "status": "RESERVADO"
  },
  "reserva": {
    "codigo_empresa": 1,
    "origem_op_nova": "250",
    "numero_op_nova": 1113,
    "numero_pedido": 11675,
    "item_pedido": 1,
    "produto_op_nova": "250000780",
    "derivacao": "U",
    "numsep_e120ipd": "GS-11661",
    "data_reserva": "2026-06-16T14:32:00",
    "usuario": "joao.silva",
    "justificativa": "MAQUINA ESTA EM REFORMA..."
  },
  "movimentacoes": [
    {
      "data_movimento": "2024-08-12",
      "produto": "250000123",
      "derivacao": "U",
      "deposito": "01",
      "transacao": "510",
      "tipo": "E",
      "quantidade": 1,
      "origem_op": "250",
      "numero_op": 998,
      "fonte": "E210MVP"
    }
  ],
  "validacao": {
    "e120ipd_confirmado": true,
    "usu_tnsop_confirmado": true,
    "e000cse_confirmado": false,
    "e900_confirmado": true
  }
}
```

`reserva` pode ser `null` quando o GS não tem reserva ativa.
`movimentacoes` pode ser `[]`.

## 3) Fontes ERP consultadas

- Reserva ativa: `E120IPD.USU_NUMSEP`, `USU_TNSOP.USU_NUMSEP`, `E000CSE.NUMSEP`.
- OP nova: `E900COP` / `E900QDO`.
- Histórico de movimentação: `E210MVP` (saídas/entradas) e `E210DLS` (lote/série).
- Cadastro de GS: `USU_T075SEP` (quando existir).
