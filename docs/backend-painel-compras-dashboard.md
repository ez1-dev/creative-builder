# Endpoint agregado do Painel de Compras

> Especificação para o time do FastAPI. O frontend já consome este contrato com fallback transparente para o endpoint paginado enquanto a rota não estiver deployada.

## Rota

```
GET /api/painel-compras-dashboard
```

- **Sem paginação.** Não aceita / não usa `pagina`, `tamanho_pagina`, `LIMIT`, `OFFSET`.
- Resposta sempre `application/json`.
- Reaproveita exatamente a mesma query base e os mesmos filtros do `GET /api/painel-compras`.
- Todos os KPIs, buckets de gráfico e linhas de drill são calculados via `GROUP BY` no SQL sobre o resultado completo filtrado.

## Filtros aceitos (todos opcionais, idênticos ao endpoint paginado)

`fornecedor`, `numero_oc`, `codigo_item`, `descricao_item`, `centro_custo`,
`numero_projeto`, `tipo_oc`, `transacao`, `data_emissao_ini`, `data_emissao_fim`,
`data_entrega_ini`, `data_entrega_fim`, `tipo_item`, `valor_min`, `valor_max`,
`origem_material`, `familia`, `coddep`, `somente_pendentes`,
`agrupar_por_fornecedor`, `situacao_oc` (lista CSV), `codigo_motivo_oc`,
`observacao_oc`, `mostrar_valor_total_oc`,
`projeto_macro`, `tipo_despesa`, `mes_competencia`, `condicao_pagamento`.

> **CRÍTICO — paridade lista x dashboard.** Ambos os endpoints
> (`/api/painel-compras` e `/api/painel-compras-dashboard`) **DEVEM** aplicar
> exatamente o mesmo conjunto de filtros sobre a mesma CTE base. Se a lista
> retorna registros para um filtro, o dashboard **não pode** zerar.

### Classificação de `tipo_despesa` (servidor)

Normalize o valor recebido (acentos, caixa, hífen/underscore) e aceite todas
estas variações como equivalentes:

| Chave canônica    | Label visual    | Aceitar também                                      |
| ----------------- | --------------- | --------------------------------------------------- |
| `MATERIA_PRIMA`   | Matéria-prima   | `Matéria-prima`, `MATERIA-PRIMA`, `MATERIA PRIMA`   |
| `USO_CONSUMO`     | Uso e consumo   | `Uso e consumo`, `USO E CONSUMO`, `USO-CONSUMO`     |
| `DESPESAS_GERAIS` | Despesas gerais | `Despesas gerais`, `DESPESAS GERAIS`                |
| `SERVICOS`        | Serviços        | `Serviços`, `Servicos`, `SERVICOS`                  |

Regra de classificação (mesma do frontend em `src/lib/comprasClassificacao.ts`):

1. Se a OC já tem `tipo_despesa` persistido no ERP → use-o (após normalização).
2. Caso contrário, derive na CTE base como coluna calculada `tipo_despesa_calc`:
   - `tipo_item IN ('SERVICO','S')` → `SERVICOS`.
   - `descricao_item` contém `EPI|FERRAMENTA|BROCA|DISCO|LIXA|MANUTEN|CONSUMO|LUVA|CAPACETE` → `USO_CONSUMO`.
   - `origem_material`, `codigo_familia` ou `descricao_item` contém
     `MAT|MATERIA|MATÉRIA|PRIMA|INSUMO|ACO|AÇO|METAL|CHAPA|PERFIL|TUBO|BARRA` → `MATERIA_PRIMA`.
   - default → `DESPESAS_GERAIS`.

A coluna `tipo_despesa_calc` deve ser materializada **dentro da CTE base** para
que tanto o `WHERE tipo_despesa_calc = :tipo_despesa` quanto o
`GROUP BY tipo_despesa_calc` (gráfico `por_tipo_despesa`) usem a mesma classificação.

### Classificação de `projeto_macro` (servidor)

Aceitar `GENIUS`, `ESTRUTURAL ZORTEA`, `OUTROS`. Regras (mesma lógica do frontend):

1. Se houver `projeto_macro` persistido, normalize (`ESTRUTURAL` → `ESTRUTURAL ZORTEA`).
2. `numero_projeto >= 600` → `ESTRUTURAL ZORTEA`.
3. `origem_material` ∈ {110,120,130,135,140,150,205,208,210,220,230,235,240,245,250} → `GENIUS`.
4. `nome_projeto` contém `GENIUS|GENI` → `GENIUS`.
5. `nome_projeto` contém `ESTRUTURAL|ZORTEA` → `ESTRUTURAL ZORTEA`.
6. default → `OUTROS`.

Materializar como `projeto_macro_calc` na CTE base.

### `mes_competencia` e `condicao_pagamento`

- `mes_competencia` (`YYYY-MM`): filtrar por
  `SUBSTRING(COALESCE(mes_competencia, data_emissao, data_recebimento), 1, 7) = :mes`.
- `condicao_pagamento`: casar (case-insensitive, contains) contra **código OU
  descrição** da condição de pagamento.

### `somente_pendentes`

`true` → `WHERE saldo_pendente > 0`. Mesma cláusula em ambos os endpoints.



## Resposta

```json
{
  "kpis": {
    "valor_comprado": 0,
    "valor_recebido": 0,
    "valor_pendente": 0,
    "valor_bruto_total": 0,
    "valor_liquido_total": 0,
    "quantidade_ocs": 0,
    "quantidade_itens": 0,
    "quantidade_fornecedores": 0,
    "ticket_medio_oc": 0,
    "percentual_recebido": 0,
    "itens_pendentes": 0,
    "itens_atrasados": 0,
    "maior_atraso_dias": 0,
    "maior_fornecedor": { "codigo": "", "nome": "", "valor": 0 }
  },
  "graficos": {
    "por_mes":                    [{ "mes": "2026-01", "valor": 0, "qtd_ocs": 0, "qtd_itens": 0 }],
    "por_tipo_despesa":           [{ "tipo": "Matéria-prima", "valor": 0, "qtd_ocs": 0, "qtd_itens": 0 }],
    "por_centro_custo":           [{ "centro_custo": "...", "valor": 0, "qtd_ocs": 0, "qtd_itens": 0 }],
    "por_projeto":                [{ "numero_projeto": "...", "projeto": "...", "valor": 0, "qtd_ocs": 0, "qtd_itens": 0 }],
    "por_fornecedor":             [{ "fornecedor": "...", "valor": 0, "qtd_ocs": 0, "qtd_itens": 0 }],
    "comprado_recebido_pendente": [{ "mes": "2026-01", "comprado": 0, "recebido": 0, "pendente": 0 }]
  },
  "drill": [
    {
      "projeto_macro": "Genius",
      "tipo_despesa": "Matéria-prima",
      "numero_projeto": "...", "projeto": "...",
      "centro_custo": "...",
      "fornecedor": "...",
      "numero_oc": "...",
      "valor_comprado": 0, "valor_recebido": 0, "valor_pendente": 0,
      "qtd_ocs": 0, "qtd_itens": 0
    }
  ]
}
```

### Definições

- `valor_comprado` = `SUM(valor_liquido)`.
- `valor_recebido` = `SUM(valor_recebido)` (ou `SUM(quantidade_recebida * preco_unitario)` se a coluna não existir).
- `valor_pendente` = `SUM(saldo_pendente * preco_unitario)`.
- `quantidade_ocs` = `COUNT(DISTINCT numero_oc)`.
- `quantidade_itens` = `COUNT(*)` de itens (linhas).
- `quantidade_fornecedores` = `COUNT(DISTINCT codigo_fornecedor)`.
- `ticket_medio_oc` = `valor_comprado / NULLIF(quantidade_ocs, 0)`.
- `percentual_recebido` = `(valor_recebido / NULLIF(valor_comprado, 0)) * 100`.
- `valor_bruto_total` = `SUM(valor_bruto)`.
- `valor_liquido_total` = `SUM(valor_liquido)`.
- `itens_pendentes` = `COUNT(*)` de itens com `saldo_pendente > 0`.
- `itens_atrasados` = `COUNT(*)` de itens pendentes com `data_entrega < CURRENT_DATE`.
- `maior_atraso_dias` = `MAX(CURRENT_DATE - data_entrega)` entre itens atrasados (0 se nenhum).
- `maior_fornecedor` = fornecedor com maior `SUM(valor_liquido)` (campos `codigo`, `nome`, `valor`).

> **Padrão técnico obrigatório (igual à conciliação ERP x EDocs):**
> 1. Construir CTE/base com TODOS os filtros aplicados.
> 2. `sql_resumo` roda **sem** `OFFSET` / `FETCH` e produz o objeto `kpis`.
> 3. `sql_dados` (do endpoint paginado) roda **com** `OFFSET` / `FETCH` apenas para a tabela.
> 4. Front-end usa `kpis` deste endpoint para os cards e `dados` do endpoint paginado para a tabela. Nunca somar o array paginado para gerar totais.

### Ordenação sugerida

- `por_mes` / `comprado_recebido_pendente`: cronológica ascendente.
- demais buckets: `valor` desc; cliente faz top-N quando precisar.

## Compatibilidade

- O frontend tenta este endpoint primeiro. Em caso de `404` / falha de rede, ele cai automaticamente para `GET /api/painel-compras?tamanho_pagina=50000` e exibe um aviso de amostragem se o total exceder 50k.
- Quando este endpoint estiver no ar, o aviso de amostragem desaparece e os KPIs / gráficos passam a refletir a base completa filtrada sem teto.
- A `Lista Detalhada` continua sendo alimentada por `GET /api/painel-compras` paginado e independente.
