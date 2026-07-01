# /api/rh/resumo-folha/dashboard

Endpoint agregado consumido pela tela `RH · 01 — Resumo Folha`.

Fonte oficial: **objeto `VM_FOLHA`** (mesma origem usada pelo painel UpQuery/BI JET). O backend NÃO deve inventar KPIs a partir de eventos brutos — todos os cards e a grid por filial derivam das colunas `CALC_*` e `VL_*` da VM_FOLHA. O front nunca soma nada.

## Request

`GET /api/rh/resumo-folha/dashboard`

| Param | Formato | Obrigatório |
|-------|---------|-------------|
| `anomes_ini` | `YYYYMM` (ex.: `202601`) | sim |
| `anomes_fim` | `YYYYMM` (ex.: `202605`) | sim |
| `codemp`     | int (default `1`)         | não |
| `modo`       | `completo` \| `acumulado` \| `mensal` | não (o front chama sempre `completo`, que retorna KPIs + grid por filial + série mensal + drills em uma única resposta) |
| `filial`     | string                    | não |
| `matricula`  | string                    | não |


Autenticação: Bearer Token (mesmo cliente das demais rotas `/api/*`).

Antes de responder o dashboard, o backend deve garantir que `POST /api/rh/vm-folha/sincronizar?codemp=&anomes_ini=&anomes_fim=` já rodou para o período.

## Mapeamento oficial — KPIs (`response.kpis`)

| Campo do payload | Origem VM_FOLHA |
|------------------|-----------------|
| `provento`       | `SUM(CALC_VL_PROVENTO_LIQ)` |
| `desconto`       | `SUM(CALC_VL_DESCONTO_LIQ)` |
| `total_liquido`  | `SUM(VL_LIQUIDO)` |
| `custo_total`    | `SUM(CALC_VL_CUSTO_TOTAL)` |
| `beneficios`     | `SUM(CALC_VL_BENEFICIOS)` |
| `inss_total`     | `SUM(CALC_VL_INSS_TOTAL)` |
| `hora_extra`     | `SUM(CALC_VL_HORAS_EXTRA)` |
| `provisoes`      | `SUM(CALC_VL_TOTAL_PROVISAO)` |
| `custo_ferias`   | `SUM(CALC_VL_CUSTO_FERIAS)` |
| `rescisoes`      | `SUM(CALC_CUSTO_TOTAL_RESCISAO)` |
| `fgts`           | `SUM(VL_FGTS)` |

## Mapeamento oficial — grid por filial (`response.filiais[]`)

| Campo do payload      | Origem VM_FOLHA |
|-----------------------|-----------------|
| `salario_base`        | `SUM(CALC_VL_SAL_BRUTO)` **ou** `SUM(VL_SALARIO)` — usar a que fechar `8.549.198,39` no período de aceite |
| `custo_total`         | `SUM(CALC_VL_CUSTO_TOTAL)` |
| `qtd_horas`           | `SUM(CALC_QTD_HORAS)` — devolver string `HH:MM` |
| `custo_hora_extra`    | `SUM(CALC_VL_HORAS_EXTRA)` |
| `qtd_hora_extra`      | `SUM(CALC_QTD_HORA_EXTRA)` — devolver string `HH:MM` |
| `liquido`             | `SUM(VL_LIQUIDO)` |
| `fgts`                | `SUM(VL_FGTS)` |
| `va`                  | `SUM(VL_VALE_ALIMENTACAO)` |
| `inss`                | `SUM(CALC_VL_INSS_TOTAL)` |
| `custo_ferias`        | `SUM(CALC_VL_CUSTO_FERIAS)` |
| `prov_ferias`         | `SUM(VL_PROVISAOFERIAS)` |
| `prov_13`             | `SUM(VL_PROVISAO13)` |
| `proventos`           | `SUM(VL_PROVENTOS)` |
| `descontos`           | `SUM(VL_DESCONTOS)` |

O front preserva `qtd_horas`/`qtd_hora_extra` como string quando contém `:` ou `H` — não retornar como número decimal.

## Alvo de aceite — Jan a Mai/2026 (codemp=1)

O endpoint deve reproduzir exatamente estes totais:

| KPI            | Alvo |
|----------------|------|
| `provento`     | 12.537.132,60 |
| `desconto`     | 6.795.671,53 |
| `total_liquido`| 5.741.461,07 |
| `custo_total`  | 18.260.200,42 |
| `beneficios`   | 1.060.678,68 |
| `inss_total`   | 3.147.442,33 |
| `hora_extra`   | 1.533.612,20 |
| `provisoes`    | 2.734.855,50 |
| `custo_ferias` | 581.462,67 |
| `rescisoes`    | 1.408.899,46 |
| `fgts`         | 840.274,75 |

Grid por filial: `SUM(salario_base)` do período deve fechar `8.549.198,39`.

## Regras de erro (obrigatórias)

- **Nunca** retornar `0.00` silenciosamente para um KPI cujo componente VM_FOLHA não foi localizado.
- Se um componente estiver ausente, ou o KPI é **omitido** de `response.kpis`, ou vem como `null`, ou como string `"campo_pendente"`. Qualquer desses três é tratado pelo front como "Campo não retornado pela API".
- Em qualquer dessas situações, listar o problema em `response.diagnostico.componentes_pendentes[]`:
  ```json
  "componentes_pendentes": [
    { "campo": "CALC_VL_CUSTO_TOTAL", "motivo": "coluna não encontrada em VM_FOLHA" }
  ]
  ```
- Se a VM_FOLHA não tiver linhas no período: `diagnostico.vm_folha_status = "SEM_CARGA"` e `qtd_linhas_vm_folha = 0` (o front já renderiza CTA "Sincronizar agora").

## Bloco de diagnóstico (obrigatório para admin)

`response.diagnostico` deve incluir, além dos campos já existentes (`vm_folha_status`, `qtd_linhas_vm_folha`, `menor_anomes_vm_folha`, `maior_anomes_vm_folha`):

```json
"vm_folha_componentes": {
  "calc_vl_provento_liq": 12537132.60,
  "calc_vl_desconto_liq": 6795671.53,
  "vl_liquido": 5741461.07,
  "calc_vl_custo_total": 18260200.42,
  "calc_vl_beneficios": 1060678.68,
  "calc_vl_inss_total": 3147442.33,
  "calc_vl_horas_extra": 1533612.20,
  "calc_vl_total_provisao": 2734855.50,
  "calc_vl_custo_ferias": 581462.67,
  "calc_custo_total_rescisao": 1408899.46,
  "vl_fgts": 840274.75,
  "vl_vale_alimentacao": 0,
  "vl_provisaoferias": 0,
  "vl_provisao13": 0,
  "vl_proventos": 0,
  "vl_descontos": 0
}
```

Esse bloco é exibido "as is" no painel Diagnóstico Técnico (admin) para conferência campo a campo contra a VM_FOLHA.

## Payload de resposta

```json
{
  "kpis": {
    "provento": 12537132.60, "desconto": 6795671.53, "total_liquido": 5741461.07,
    "custo_total": 18260200.42, "beneficios": 1060678.68, "inss_total": 3147442.33,
    "hora_extra": 1533612.20, "provisoes": 2734855.50, "custo_ferias": 581462.67,
    "rescisoes": 1408899.46, "fgts": 840274.75
  },
  "proventos_vantagens": [{ "codigo": "001", "descricao": "Salário Base", "valor": 8549198.39 }],
  "descontos":           [{ "codigo": "601", "descricao": "INSS",         "valor": 3147442.33 }],
  "filiais": [{
    "cd_filial": "1", "filial": "Matriz",
    "salario_base": 8549198.39, "custo_total": 18260200.42,
    "qtd_horas": "160:00", "custo_hora_extra": 1533612.20, "qtd_hora_extra": "300:00",
    "liquido": 5741461.07, "fgts": 840274.75, "va": 0, "inss": 3147442.33,
    "custo_ferias": 581462.67, "prov_ferias": 0, "prov_13": 0,
    "proventos": 12537132.60, "descontos": 6795671.53
  }],
  "tipos_evento": [{ "tipo": "PROVENTO", "valor": 12537132.60 }],
  "mensal": [{
    "competencia": "202601",
    "provento": 2327701.88, "desconto": 1197550.99, "total_liquido": 1130150.89,
    "custo_hora_extra": 300000.00, "custo_mensal": 3600000.00
  }],
  "diagnostico": {
    "vm_folha_status": "OK",
    "qtd_linhas_vm_folha": 12345,
    "menor_anomes_vm_folha": "202601",
    "maior_anomes_vm_folha": "202605",
    "vm_folha_componentes": { "…": "veja acima" },
    "componentes_pendentes": []
  }
}
```

`mensal` é opcional — se ausente, o front oculta o gráfico da série mensal.

## Erros HTTP tratados pelo frontend

- `404` / `405` / `501` → banner "Endpoint de dashboard da folha ainda não disponível.".
- Outros → banner vermelho com a mensagem.
- `kpis` todos ausentes + `filiais` vazio + `mensal` vazio (ou `qtd_linhas_vm_folha === 0`) → CTA "Sincronizar agora" (chama `POST /api/rh/vm-folha/sincronizar`).
