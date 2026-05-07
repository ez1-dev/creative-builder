# Endpoint agregado de Notas Fiscais de Recebimento

> Especificação para o time do FastAPI. O frontend já consome este contrato com fallback transparente para o endpoint legado paginado enquanto a rota não estiver deployada.

## Rota

```
GET /api/notas-recebimento-dashboard
```

- **Sem paginação.** Não aceita / não usa `pagina`, `tamanho_pagina`, `LIMIT`, `OFFSET`.
- Resposta sempre `application/json`, mesmo quando o conjunto filtrado for grande.
- Reaproveita exatamente a mesma query base e os mesmos filtros do `GET /api/notas-recebimento`.
- Todos os KPIs, buckets de gráfico e linhas de drill são calculados via `GROUP BY` no SQL sobre o resultado completo filtrado.

## Filtros aceitos (todos opcionais, idênticos ao endpoint paginado)

- `tipo_despesa`
- `projeto`, `numero_projeto`
- `centro_custo`, `codigo_centro_custo`
- `fornecedor` (nome ou código), `codigo_fornecedor`
- `transacao_nf`, `transacao`
- `condicao_pagamento`
- `data_emissao_ini`, `data_emissao_fim`
- `data_recebimento_ini`, `data_recebimento_fim`
- `mes_competencia` (`YYYY-MM`)
- `numero_nf`, `serie_nf`
- `numero_oc_origem`
- `familia`
- `origem`
- `deposito`
- `projeto_macro` (`GENIUS` | `ESTRUTURAL ZORTEA` | `OUTROS`)
- `valor_min`, `valor_max`
- `tipo_item` (`PRODUTO` | `SERVICO`)
- `situacao_nf`
- `codigo_item`, `descricao_item`

## Resposta

```json
{
  "kpis": {
    "quantidade_nfs": 0,
    "quantidade_itens": 0,
    "quantidade_fornecedores": 0,
    "valor_recebido": 0,
    "valor_liquido_total": 0,
    "valor_bruto_total": 0,
    "quantidade_recebida_total": 0,
    "valor_medio_nf": 0,
    "nfs_com_oc": 0,
    "nfs_sem_oc": 0,
    "pct_com_oc": 0,
    "pct_sem_oc": 0,
    "maior_fornecedor": { "codigo": "", "nome": "", "valor": 0 },
    "total_produtos": 0,
    "total_servicos": 0,
    "total_digitadas": 0,
    "total_fechadas": 0,
    "total_canceladas": 0
  },
  "graficos": {
    "por_mes":            [{ "mes": "2026-01",     "valor": 0, "qtd_nfs": 0, "qtd_itens": 0 }],
    "por_tipo_despesa":   [{ "tipo": "Matéria-prima", "valor": 0, "qtd_nfs": 0, "qtd_itens": 0 }],
    "por_centro_custo":   [{ "codigo_centro_custo": "...", "centro_custo": "...", "valor": 0, "qtd_nfs": 0, "qtd_itens": 0 }],
    "por_projeto":        [{ "numero_projeto": "...", "projeto": "...", "valor": 0, "qtd_nfs": 0, "qtd_itens": 0 }],
    "por_fornecedor":     [{ "codigo_fornecedor": "...", "fornecedor": "...", "valor": 0, "qtd_nfs": 0, "qtd_itens": 0 }],
    "por_transacao_nf":   [{ "transacao": "...", "valor": 0, "qtd_nfs": 0, "qtd_itens": 0 }]
  },
  "drill": [
    {
      "projeto_macro": "Genius",
      "tipo_despesa": "Matéria-prima",
      "numero_projeto": "...", "projeto": "...",
      "codigo_centro_custo": "...", "centro_custo": "...",
      "codigo_fornecedor": "...", "fornecedor": "...",
      "transacao": "...",
      "valor": 0, "qtd_nfs": 0, "qtd_itens": 0
    }
  ]
}
```

### Definições

- `valor_recebido` / `valor_liquido_total` / `valor` = `SUM(valor_liquido)`.
- `valor_bruto_total` = `SUM(valor_bruto)`.
- `quantidade_recebida_total` = `SUM(quantidade_recebida)`.
- `quantidade_itens` = `COUNT(*)` de itens (linhas da NF).
- `quantidade_nfs` = `COUNT(DISTINCT codigo_empresa || codigo_filial || numero_nf || serie_nf || codigo_fornecedor)`.
- `quantidade_fornecedores` = `COUNT(DISTINCT codigo_fornecedor)`.
- `valor_medio_nf` = `valor_recebido / NULLIF(quantidade_nfs, 0)`.
- `nfs_com_oc` = NFs distintas com `numero_oc_origem` não nulo / não zero.
- `nfs_sem_oc` = `quantidade_nfs - nfs_com_oc`.
- `pct_com_oc` / `pct_sem_oc` = razão x 100 sobre `quantidade_nfs`.
- `maior_fornecedor` = fornecedor com maior `SUM(valor_liquido)` (campos `codigo`, `nome`, `valor`).
- `total_produtos` / `total_servicos` = contagem de itens com `tipo_item` = PRODUTO / SERVICO.
- `total_digitadas` / `total_fechadas` / `total_canceladas` = contagem de NFs distintas por `situacao_nf`.
- `por_mes.mes` = `to_char(data_emissao, 'YYYY-MM')` (ou `mes_competencia` quando existir).

> **Padrão técnico obrigatório (igual à conciliação ERP x EDocs):**
> 1. Construir CTE/base com TODOS os filtros aplicados.
> 2. `sql_resumo` roda **sem** `OFFSET` / `FETCH` e produz o objeto `kpis`.
> 3. `sql_dados` (do endpoint paginado) roda **com** `OFFSET` / `FETCH` apenas para a tabela.
> 4. Front-end usa `kpis` deste endpoint para os cards e `dados` do endpoint paginado para a tabela. Nunca somar o array paginado para gerar totais.

### Ordenação sugerida

- `por_mes`: ordem cronológica ascendente.
- demais buckets: `valor` desc; cliente fará seu próprio top-N quando necessário.

## Exemplo de SQL agregado por bucket

```sql
-- KPIs
SELECT
  SUM(valor_liquido)                                                  AS valor_recebido,
  COUNT(DISTINCT cod_emp || '-' || cod_fil || '-' || num_nf || '-' || ser_nf || '-' || cod_for) AS quantidade_nfs,
  COUNT(*)                                                            AS quantidade_itens,
  COUNT(DISTINCT cod_for)                                             AS quantidade_fornecedores
FROM <view_nfe_recebimento>
WHERE <filtros>;

-- por_mes
SELECT to_char(dt_emi, 'YYYY-MM') AS mes,
       SUM(valor_liquido)         AS valor,
       COUNT(DISTINCT cod_emp || '-' || cod_fil || '-' || num_nf || '-' || ser_nf || '-' || cod_for) AS qtd_nfs,
       COUNT(*)                   AS qtd_itens
FROM <view_nfe_recebimento>
WHERE <filtros>
GROUP BY 1
ORDER BY 1;
```

Aplicar o mesmo padrão para os demais buckets, alterando apenas a coluna agrupada.

## Compatibilidade

- O frontend tenta este endpoint primeiro. Em caso de `404` / falha de rede, ele cai automaticamente para `GET /api/notas-recebimento?tamanho_pagina=50000` e exibe um aviso de amostragem se o total exceder 50k.
- Quando este endpoint estiver no ar, o aviso de amostragem desaparece e os KPIs / gráficos passam a refletir a base completa filtrada sem teto.
