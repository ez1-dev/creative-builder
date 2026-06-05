# BI Comercial — Séries por dimensão (catálogo expandido)

Contexto: a tela `/bi/comercial` agora oferece um catálogo amplo de séries no
diálogo "Configurar bloco → Biblioteca BI → Série", combinando dimensão ×
métrica. O frontend monta os dados das séries assim:

| Dimensão (`por_<dim>`) | Fonte de dados                              | Métricas hoje | Métricas que precisam de backend |
| ---------------------- | ------------------------------------------- | ------------- | -------------------------------- |
| `mensal__*` / `anual__*` | `/api/bi/comercial/mensal`                | TODAS         | nenhuma                          |
| `por_estado__*`        | `/api/bi/comercial/estado`                  | faturamento, nvendas, nclientes | liquido, impostos, devolucao, quantidade, ticket, preco_medio |
| `por_revenda__*`       | `/api/bi/comercial/revenda`                 | faturamento, liquido, nvendas, nclientes | impostos, devolucao, quantidade, ticket, preco_medio |
| `por_obra__*`          | `/api/bi/comercial/obras`                   | faturamento, liquido, nvendas, nclientes | impostos, devolucao, quantidade, ticket, preco_medio |
| `por_mix__*`           | `/api/bi/comercial/mix`                     | faturamento   | demais métricas |
| `por_cliente__*`       | `POST /api/bi/comercial/drill` (CLIENTE)    | faturamento   | demais métricas |
| `por_produto__*`       | `POST /api/bi/comercial/drill` (PRODUTO)    | faturamento   | demais métricas |
| `por_nota_fiscal__*`   | `POST /api/bi/comercial/drill` (NOTA_FISCAL)| faturamento   | demais métricas |
| `por_detalhe_impostos__*` | `POST /api/bi/comercial/drill` (DETALHES_IMPOSTOS) | impostos | demais |

## Convenção de colunas esperadas pelo frontend

Para que QUALQUER série dimensão × métrica fique disponível sem novo endpoint,
basta os endpoints `/estado`, `/revenda`, `/obras`, `/mix` e o `/drill`
devolverem (quando aplicável) os seguintes campos por linha:

| Métrica BI    | Coluna preferida   | Aliases tolerados                          |
| ------------- | ------------------ | ------------------------------------------ |
| faturamento   | `vl_total`         | `vl_bruto`, `faturamento`, `valor_total`   |
| liquido       | `vl_liquido`       | `fat_liquido`, `liquido`                   |
| impostos      | `vl_impostos`      | `impostos`, `total_impostos`               |
| devolucao     | `vl_devolucao`     | `devolucao`                                |
| nvendas       | `numero_vendas`    | `qtd_notas`, `qtd_vendas`, `total_notas`   |
| nclientes     | `numero_clientes`  | `qtd_clientes`, `total_clientes`           |
| quantidade    | `qtd_produtos`     | `quantidade`, `qtd`                        |
| ticket        | `ticket_medio`     | —                                          |
| preco_medio   | `preco_medio`      | —                                          |

E uma coluna de **label de apresentação** por dimensão (mesma regra já
acordada em `docs/backend-bi-comercial-drill-cliente-nome.md`):

| Drill type        | Coluna preferida   | Aliases tolerados                        |
| ----------------- | ------------------ | ---------------------------------------- |
| CLIENTE           | `cliente_label`    | `nm_cliente`, `nm_fantasia`, `cd_cliente`|
| PRODUTO           | `produto_label`    | `ds_produto`, `descricao_produto`, `cd_produto` |
| NOTA_FISCAL       | `nota_label`       | `cd_nf`, `numero_nf`                     |
| DETALHES_IMPOSTOS | `imposto`          | `tipo_imposto`, `descricao_imposto`, `label` |

## Status

- Já implementado no frontend: todas as combinações aparecem no dropdown.
- Métricas hoje sem dado mostram gráfico vazio sem erro.
- À medida que o backend incluir as colunas listadas, as séries passam a
  funcionar automaticamente — nenhuma mudança de frontend necessária.
