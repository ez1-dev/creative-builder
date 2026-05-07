# Notas Fiscais de Recebimento — Evolução Gerencial

A tela `/api/notas-recebimento` foi evoluída para um dashboard gerencial.

Enquanto o backend não retornar os campos abaixo, o frontend faz a classificação client-side via `enrichRow`. Para precisão e performance, o backend deve passar a expor:

## Campos esperados por linha de NF

- `projeto_macro` — `"Genius" | "Estrutural" | "Outros"`
- `tipo_despesa` — `"Matéria-prima" | "Uso e consumo" | "Despesas gerais" | "Serviços"`
- `mes_competencia` — string `YYYY-MM` (caso ausente, frontend usa `data_emissao` ou `data_recebimento`)
- `condicao_pagamento` — código
- `descricao_condicao_pagamento` — descrição
- `nome_projeto` — para gráficos por projeto
- `numero_oc_origem` / `item_oc_origem` — vínculo com OC quando existir

## Parâmetros aceitos no GET

Adicionar suporte (todos opcionais):
- `projeto_macro`
- `tipo_despesa`
- `mes_competencia`
- `condicao_pagamento`
- `familia`

## Estados visuais já tratados no frontend

- **Carregando**: spinner do `DataTable`.
- **Vazio**: `emptyMessage` por filtros sem resultado.
- **Erro / token expirado**: `toast.error` via `api`.
- **Drill sem registros**: linha "Nenhum dado" no `GenericDrillView`.
- **Recebimento sem OC**: badge "Sem OC" na coluna `numero_oc_origem`.
