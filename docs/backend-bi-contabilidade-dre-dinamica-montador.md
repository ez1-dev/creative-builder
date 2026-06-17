# Backend BI Contabilidade — Montador da DRE Dinâmica

Dois endpoints novos no FastAPI usados pela tela `/bi/contabilidade/dre-dinamica/montador`.

## GET /api/bi/contabilidade/dre-dinamica/plano-contas

Lista as contas/máscaras do ERP com totais agregados e indicador de vínculo no modelo da DRE.

### Query params
| Nome | Tipo | Obrig. | Descrição |
|---|---|---|---|
| `anomes_ini` | string `YYYYMM` | sim | Início do período |
| `anomes_fim` | string `YYYYMM` | sim | Fim do período |
| `modelo_id` | uuid | não | Modelo da DRE para checagem de vínculo |
| `busca` | string | não | Filtro por máscara ou conta (ILIKE) |
| `somente_nao_vinculadas` | bool | não | Filtra `ja_vinculada=false` |
| `somente_vinculadas` | bool | não | Filtra `ja_vinculada=true` |
| `limite` | int | não | Default 250 |

### Resposta
```json
[
  {
    "cd_mascara": "3.01.01",
    "cd_conta_contabil": "3010101001",
    "qtd_lancamentos": 124,
    "valor_total": -53210.55,
    "ja_vinculada": true,
    "linhas_vinculadas": ["RECEITA_BRUTA"]
  }
]
```

### Implementação esperada
- Agregar `bi_vm_lanc_contabil` por `mascara`/`cd_conta` no período.
- `ja_vinculada`: existe regra ativa em `bi_dre_linha_regra` para o `modelo_id` referenciando essa máscara/conta.
- `linhas_vinculadas`: `codigo_linha` de cada regra que casa.
- Ordenar por `valor_total DESC` por padrão.

## POST /api/bi/contabilidade/dre-dinamica/vincular-contas

Vincula uma ou mais contas/máscaras a uma linha da DRE no modelo escolhido.

### Body
```json
{
  "modelo_id": "uuid",
  "linha_id": "uuid",
  "tipo_regra": "MASCARA_CONTA",
  "operador": "COMECA_COM",
  "sinal": 1,
  "prioridade": 100,
  "contas": [
    { "cd_mascara": "3.01.01", "cd_conta_contabil": "3010101001" }
  ]
}
```

Regras:
- `operador`: `COMECA_COM` para `MASCARA_CONTA`, `IGUAL` para `CONTA_CONTABIL`.
- `sinal`: `1` ou `-1` (numérico).
- Para cada item de `contas`, inserir uma linha em `bi_dre_linha_regra` (idempotente — se já existe regra com mesmo `modelo_id` + `codigo_linha` da linha + `tipo_regra` + chave, atualizar sinal/prioridade).
- Registrar evento em `bi_dre_auditoria` (`acao: 'VINCULAR'`, payload com lista de contas).

### Resposta
```json
{ "vinculadas": 12 }
```

## Logs esperados no front
```
[MONTADOR DRE] linha selecionada: { codigo_linha, descricao, ... }
[MONTADOR DRE] contas selecionadas: [...]
[MONTADOR DRE] payload vínculo: { modelo_id, linha_id, ... }
```

## Resolução de `linha_id`
O front resolve `linha_id` via consulta Cloud (`bi_dre_estrutura_v2.id` por `modelo_id` + `codigo_linha`). Alternativamente o endpoint `/dre-dinamica` pode retornar `linha_id` em cada item para evitar essa segunda viagem.
