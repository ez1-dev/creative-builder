# Manter GS — modo manutenção/reforma

Extensão de `POST /api/numero-serie/op-complementar/manter-gs` (e do `simular` equivalente)
para suportar o caso em que o mesmo GS precisa ser reaproveitado em produto/derivação
diferente porque a máquina/equipamento está em manutenção ou reforma.

## Novos campos no request

| campo                              | tipo    | obrigatório | descrição                                                                 |
| ---------------------------------- | ------- | ----------- | ------------------------------------------------------------------------- |
| `manutencao`                       | boolean | sim         | `true` quando o usuário marcou "É manutenção/reforma?" no Lovable.        |
| `tipo_vinculo`                     | string  | sim         | `"NORMAL"` ou `"MANUTENCAO"`. Espelha o flag `manutencao`.                |
| `permitir_mesmo_gs_outro_produto`  | boolean | sim         | `true` apenas quando `manutencao=true`. Libera o vínculo do GS em produto/derivação diferente. |

### Exemplo — modo manutenção

```json
{
  "codigo_empresa": 1,
  "numero_op_nova": 1113,
  "origem_op_nova": "250",
  "numero_op_origem": 250,
  "origem_op_origem": "250",
  "numero_serie": "GS-11661",
  "justificativa": "Máquina em manutenção/reforma. Reaproveitamento controlado do mesmo GS na OP complementar.",
  "confirmar": true,
  "forcar_vinculo": false,
  "manutencao": true,
  "tipo_vinculo": "MANUTENCAO",
  "permitir_mesmo_gs_outro_produto": true
}
```

### Exemplo — fluxo normal

```json
{
  "manutencao": false,
  "tipo_vinculo": "NORMAL",
  "permitir_mesmo_gs_outro_produto": false
}
```

## Regras no backend

- `manutencao=true` ⇒ não exigir `forcar_vinculo=true` mesmo se o GS aparecer em produto/derivação diferente. O alerta "GS encontrado em produto diferente" segue como aviso, nunca como bloqueio.
- `manutencao=false` ⇒ comportamento atual mantido.
- Logar `tipo_vinculo` junto com a reserva para auditoria.
- Validar coerência: se `permitir_mesmo_gs_outro_produto=true` mas `manutencao=false`, rejeitar com 400.
