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
| `limite` | int | não | Default 250. **Quando omitido, retornar todas as contas ativas do período** (sem cap). Recomenda-se cap interno de segurança em ~10.000. |

### Resposta
```json
[
  {
    "cd_mascara": "3.01.01",
    "cd_conta_contabil": "3010101001",
    "ds_conta": "RECEITA DE VENDAS NO MERCADO INTERNO",
    "nivel": 3,
    "centros_custo": [
      { "cd_centro_custos": "1001", "cd_centro_custos_3": "100", "qtd_lancamentos": 12, "valor_total": -1500.00 },
      { "cd_centro_custos": "2002", "cd_centro_custos_3": "200", "qtd_lancamentos": 5, "valor_total": -800.00 }
    ],
    "qtd_lancamentos": 124,
    "valor_total": -53210.55,
    "ja_vinculada": true,
    "linhas_vinculadas": ["RECEITA_BRUTA"]
  }
]
```

Regras adicionais:
- `ds_conta`: descrição vinda do plano de contas do ERP. Pode vir vazia.
- `nivel`: número de segmentos da `cd_mascara` separados por `.` (ex.: `3.01.01` → 3).
- `centros_custo`: agregado por `centro_custo` em `bi_vm_lanc_contabil` no período, top 10 por `valor DESC`.

### Campos obrigatórios na resposta

O frontend depende desses campos. Sem eles, a tela mostra nomes vazios e/ou valores zerados (e exibe banner de diagnóstico).

| Campo | Tipo | Origem sugerida |
|---|---|---|
| `cd_mascara` | string | `bi_vm_lanc_contabil.mascara` |
| `cd_conta_contabil` | string | `bi_vm_lanc_contabil.cd_conta` |
| `ds_conta` | string | join com plano de contas do ERP Senior (`e092cta.desccta` ou equivalente) |
| `nivel` | int | `array_length(string_to_array(cd_mascara,'.'),1)` |
| `qtd_lancamentos` | int | `count(*)` no período |
| `valor_total` | numeric | `sum(vl_saldo)` (ou `sum(vl_credito - vl_debito)`) no período |
| `centros_custo[]` | array | agregado por `centro_custo`, com `cd_centro_custo`, `ds_centro_custo`, `qtd`, `valor` |
| `ja_vinculada` | bool | existe `bi_dre_linha_regra` ativa pra `modelo_id` casando essa máscara/conta |
| `linhas_vinculadas` | string[] | `codigo_linha` das regras que casam |

Aliases aceitos pelo frontend (defensivo): `descricao`/`nome_conta`/`nome` para `ds_conta`; `total`/`valor`/`vl_saldo`/`saldo` para `valor_total`; `qtde`/`qtd`/`quantidade` para `qtd_lancamentos`. Prefira os nomes canônicos.

### SQL de referência

```sql
SELECT
  l.mascara                                   AS cd_mascara,
  l.cd_conta                                  AS cd_conta_contabil,
  c.desccta                                   AS ds_conta,
  array_length(string_to_array(l.mascara,'.'),1) AS nivel,
  count(*)                                    AS qtd_lancamentos,
  sum(l.vl_saldo)                             AS valor_total
FROM bi_vm_lanc_contabil l
LEFT JOIN <plano_contas_senior> c ON c.codcta = l.cd_conta
WHERE l.anomes_referente BETWEEN :ini AND :fim
GROUP BY 1,2,3,4
ORDER BY valor_total DESC;
```

### Agregação de centros de custo (obrigatória)

O array `centros_custo[]` é **obrigatório** em cada item da resposta. Pode vir vazio (`[]`) para contas sem movimento por CCU, mas o campo precisa existir — quando ausente em todos os itens, o frontend exibe banner de diagnóstico avisando que a agregação não foi feita.

Regras:
- Origem: `bi_vm_lanc_contabil`, agrupado por `mascara`/`cd_conta` + `centro_custo` no período `[anomes_ini, anomes_fim]`.
- Retornar **top 10** por `abs(valor) DESC` para cada conta (limita payload).
- `ds_centro_custo`: join com o cadastro de centros de custo do ERP (quando disponível). Pode vir `null`/omitido se não houver descrição.

Nomes canônicos por item:

| Campo | Tipo | Descrição |
|---|---|---|
| `cd_centro_custo` | string | Código do CCU |
| `ds_centro_custo` | string? | Descrição do CCU (opcional) |
| `qtd` | int | `count(*)` no período |
| `valor` | numeric | `sum(vl_saldo)` no período |

Aliases aceitos pelo frontend (defensivo, prefira os canônicos):
- Array: `centros_custo` (canônico), `ccu`, `centroscusto`, `centros`, `cc`, `centros_de_custo`.
- Item: `centro_custo`/`cd_ccu`/`codigo`/`cod_ccu`/`cod` para `cd_centro_custo`; `descricao`/`nome`/`ds_ccu`/`nome_ccu` para `ds_centro_custo`; `qtde`/`qtd_lancamentos`/`quantidade` para `qtd`; `valor_total`/`total`/`vl_saldo`/`saldo` para `valor`.

SQL de referência:

```sql
WITH base AS (
  SELECT
    l.mascara, l.cd_conta, l.centro_custo,
    count(*)        AS qtd,
    sum(l.vl_saldo) AS valor
  FROM bi_vm_lanc_contabil l
  WHERE l.anomes_referente BETWEEN :ini AND :fim
  GROUP BY 1,2,3
),
ranked AS (
  SELECT b.*,
         ccu.descricao AS ds_centro_custo,
         row_number() OVER (PARTITION BY mascara, cd_conta ORDER BY abs(valor) DESC) AS rn
  FROM base b
  LEFT JOIN <ccu_cadastro> ccu ON ccu.codigo = b.centro_custo
)
SELECT mascara, cd_conta,
       json_agg(json_build_object(
         'cd_centro_custo', centro_custo,
         'ds_centro_custo', ds_centro_custo,
         'qtd', qtd,
         'valor', valor
       ) ORDER BY abs(valor) DESC) FILTER (WHERE rn <= 10) AS centros_custo
FROM ranked
GROUP BY 1,2;
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
