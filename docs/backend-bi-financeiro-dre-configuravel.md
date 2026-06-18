# API FastAPI — BI Financeiro · DRE Configurável

Tela Lovable: `/bi/financeiro/dre-configuravel`

> O front é apenas interface. Não calcula DRE, não acessa o ERP diretamente,
> não conhece regra de encerramento (lote 16090 e similares são responsabilidade
> exclusiva do backend). Todos os endpoints exigem
> `Authorization: Bearer <token>` e `ngrok-skip-browser-warning: true`.

## Tela 1 — Painel DRE Realizada

### `GET /api/dre/realizado/resumo`

Query params:

| Param                | Tipo            | Obs |
|----------------------|-----------------|-----|
| `empresa`            | string/int (opt)| Código da empresa. |
| `filial`             | string/int (opt)| Código da filial. |
| `data_ini`           | `YYYY-MM-DD`    | Obrigatório. |
| `data_fim`           | `YYYY-MM-DD`    | Obrigatório. |
| `modelo_id`          | uuid (opt)      | Modelo DRE selecionado. |
| `tipo`               | `MENSAL` \| `ACUMULADO` | Default `MENSAL`. |
| `comparar_orcamento` | bool            | Default `false`. |

Resposta:

```json
{
  "totais": {
    "receita_operacional": 0,
    "custos": 0,
    "despesas": 0,
    "resultado_dre": 0,
    "margem_pct": 0
  },
  "mensal": [
    {
      "anomes": "202601",
      "receita_operacional": 0,
      "receita_bruta": 0,
      "deducoes": 0,
      "custos": 0,
      "despesas": 0,
      "receitas_nao_operacionais": 0,
      "resultado_dre": 0
    }
  ]
}
```

### `GET /api/dre/modelos`

Resposta: `{ "itens": [{ "id": "uuid", "nome": "DRE Gerencial 2026", "status": "publicado" }] }`
ou array simples. O front aceita ambos.

## Telas futuras (não implementadas ainda)

| Tela | Endpoints |
|------|-----------|
| Drill por conta       | `GET /api/dre/realizado/contas` |
| Drill por lançamento  | `GET /api/dre/realizado/lancamentos` |
| Configurador de modelo| `GET/POST /api/dre/modelos`, `GET /api/dre/modelos/{id}`, `POST /api/dre/modelos/{id}/linhas`, `PUT /api/dre/linhas/{linha_id}`, `DELETE /api/dre/linhas/{linha_id}` |
| Regras de conta       | `POST /api/dre/linhas/{linha_id}/regras-contas`, `DELETE /api/dre/regras-contas/{id}` |

## Regras invariantes (front)

- Sem cálculo contábil local.
- Sem acesso ao Cloud para valores da DRE.
- Sem hardcode de lote de encerramento.
- Filtros vazios não são enviados (exceto datas, sempre obrigatórias).
- Valores numéricos são normalizados via `toNumberBI` (aceita number, string pt-BR com vírgula).
