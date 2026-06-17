# Backend BI Contabilidade — DRE Dinâmica

Endpoint que monta a DRE Gerencial a partir do modelo configurado em `bi_dre_modelos` / `bi_dre_estrutura_v2` / `bi_dre_linha_regra` no Cloud, agregando lançamentos de `bi_vm_lanc_contabil`.

## GET /api/bi/contabilidade/dre-dinamica

### Query params
| Nome | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `anomes_ini` | string `YYYYMM` | sim | Início do período inclusivo |
| `anomes_fim` | string `YYYYMM` | sim | Fim do período inclusivo |
| `modelo_id` | uuid | não | Modelo da DRE. Se omitido, usar o modelo publicado mais recente; se nenhum, devolver `dados: []`. |

### Exemplo
```
GET /api/bi/contabilidade/dre-dinamica?anomes_ini=202601&anomes_fim=202606
Authorization: Bearer <token>
ngrok-skip-browser-warning: true
```

### Resposta
```json
{
  "anomes_ini": "202601",
  "anomes_fim": "202606",
  "modelo_id": "8f1...",
  "dados": [
    {
      "modelo_id": "8f1...",
      "codigo_linha": "RECEITA_BRUTA",
      "descricao": "Receita Bruta",
      "ordem": 10,
      "nivel": 1,
      "tipo_linha": "ANALITICA",
      "formula": null,
      "realizado": 30762679.39,
      "flag_negrito": false,
      "flag_permite_drill": true
    }
  ]
}
```

### Regras de avaliação
1. Carregar todas as linhas de `bi_dre_estrutura_v2` com `modelo_id = :modelo_id AND ativo = true`, ordenadas por `ordem`.
2. Para cada linha do tipo `ANALITICA` ou `AGRUPADORA`:
   - Carregar regras ativas de `bi_dre_linha_regra` ordenadas por `prioridade`.
   - Aplicar filtro em `bi_vm_lanc_contabil` conforme `tipo_regra`/`operador`:
     - `MASCARA_CONTA` + `COMECA_COM` → `mascara LIKE cd_mascara || '%'`
     - `CONTA_CONTABIL` + `IGUAL` → `cd_conta = cd_conta_contabil`
     - `CENTRO_CUSTOS` → `centro_custo = cd_centro_custos`
     - `ORIGEM` → coluna do ERP
     - `TRANSACAO` → `cd_tns`
     - `HISTORICO` + `CONTEM` → `ds_historico ILIKE '%' || ds_historico || '%'`
   - Somar `coalesce(vl_saldo, vl_credito - vl_debito)` no período (`anomes_referente BETWEEN ini AND fim`).
   - Multiplicar por `sinal` da regra e por `-1` adicional se `flag_inverte_sinal` da linha.
3. Para `TOTAL` / `CALCULO`: avaliar `formula` referenciando `codigo_linha` de outras linhas. Suportar `+ - * /` e parênteses.
4. Para `TITULO`: `realizado = 0`.
5. Devolver TODAS as linhas (mesmo `realizado = 0`) onde `flag_exibe_dre = true`, na ordem original.

### Diagnóstico
- Quando não há modelo publicado e nenhum `modelo_id` foi enviado: retornar `dados: []` com `modelo_id: null` (o front exibe mensagem padrão).
- Nunca retornar 500 por ausência de lançamentos.

### Logs esperados no front
```
[DRE DINAMICA] filtros: { ano, mes_ini, mes_fim, anomes_ini, anomes_fim, modelo_id }
[DRE DINAMICA] url: https://.../api/bi/contabilidade/dre-dinamica?anomes_ini=...
[DRE DINAMICA] retorno: { ... }
```

## Plano de Contas (Cloud, sem FastAPI)
A aba "Plano de Contas" da configuração consome a RPC `get_plano_contas_dre()` (Supabase, security definer, `authenticated only`). Não passa pelo FastAPI.
