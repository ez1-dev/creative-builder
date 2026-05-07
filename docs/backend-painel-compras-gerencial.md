# Painel de Compras — Evolução Gerencial

O frontend do Painel de Compras (`/api/painel-compras`) foi evoluído com filtros, KPIs e drill-down gerencial.

Enquanto o backend não retornar os campos abaixo, o frontend faz a classificação client-side. Para precisão e performance, o backend deve passar a expor:

## Campos esperados por linha de OC

- `projeto_macro` — `"Genius" | "Estrutural" | "Outros"`
- `tipo_despesa` — `"Matéria-prima" | "Uso e consumo" | "Despesas gerais" | "Serviços"`
- `mes_competencia` — string `YYYY-MM`
- `condicao_pagamento` — código
- `descricao_condicao_pagamento` — descrição

## Parâmetros aceitos no GET

Adicionar suporte (todos opcionais):
- `projeto_macro`
- `tipo_despesa`
- `mes_competencia`
- `condicao_pagamento`

## Totais agregados

Em `totais`/`resumo`, expor (opcional, mas desejável):
- `valor_recebido_total` — soma do que já foi recebido (notas fiscais) para o filtro atual.

Sem esse campo, o KPI "Total Recebido" exibe `--`.
