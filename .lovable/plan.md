
## Hipótese (nova)

Na correção anterior eu passei a **enviar** `tipo_despesa=Matéria-prima` ao backend. Como o backend não conhece essa classificação derivada (frontend-only), ele provavelmente:
- Trata como filtro literal contra um campo inexistente → retorna 0 registros, OU
- Ignora silenciosamente, mas o endpoint `/api/painel-compras-dashboard` foi chamado **com** o filtro e devolveu agregados zerados/parciais.

O resultado é que `dadosAgregados` fica vazio ou minúsculo, e `dadosFiltrados` (usado no fallback `gerencialActive`) cai de volta apenas para os 3 itens da primeira página da lista — exatamente o que aparece na screenshot: KPIs batem 1:1 com os 3 itens visíveis (R$ 3.778,52 = soma dos 3 valores líquidos).

## Causa raiz

Os 4 campos `tipo_despesa`, `projeto_macro`, `mes_competencia`, `condicao_pagamento` são **derivados no frontend** (via `enrichRow` em `comprasClassificacao.ts`). Eles **não devem** ser enviados ao backend agregado — o agregado precisa devolver a base completa (até 50k) para o frontend filtrar localmente.

## Correção

Em `src/pages/PainelComprasPage.tsx`, alterar `buildParams()` para aceitar uma flag `stripClassificacoes`. As chamadas a `/api/painel-compras-dashboard` e ao agregado de 50k passam essa flag, garantindo que esses 4 filtros derivados **nunca** vão ao backend. A lista paginada continua enviando o que o usuário escolheu (backend ignora o que não entende; lista é re-filtrada client-side de qualquer forma via `dadosListaFiltrados`).

Resultado: com `Tipo de Despesa = Matéria-prima` + `Somente pendentes`, o agregado retorna toda a base de pendentes (~2.426 registros), o frontend classifica e filtra → KPIs, gráficos, "Recebimento vs Pendência" e "Maior Fornecedor" passam a refletir o universo total de matéria-prima, não apenas os 3 itens da página atual.

## Arquivo afetado

- `src/pages/PainelComprasPage.tsx` — refatorar `buildParams` (1 alteração) e adicionar `{ stripClassificacoes: true }` nas 3 chamadas agregadas (linhas ~203, 210, 224).
