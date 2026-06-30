## Problema

A tela "01 — Resumo Folha" calcula tudo (KPIs, Top Eventos, Filial, Tipos) a partir de `r.provento`, `r.desconto`, `r.valor_evento`, `r.referencia`, `r.descricao_evento`, `r.competencia`, `r.filial`, `r.tipo_evento`. Se o FastAPI estiver devolvendo os campos com nomes do Senior (`vl_provento`, `vl_desconto`, `vl_evento`, `ds_evento`, `cd_evento`, `tp_evento`, `ano_mes`, `cd_filial`, etc.), todos os totais ficam em 0 mesmo com linhas chegando — que é o sintoma reportado.

Hoje a tela não loga o payload, então o usuário não consegue confirmar o motivo.

## O que será feito (somente front)

### 1. `src/lib/rh/api.ts` — normalização tolerante
- Adicionar `normalizeResumoFolhaItem(raw)` que mapeia todos os aliases comuns para o shape `ResumoFolhaItem`:
  - valores: `vl_provento|provento|valor_provento` → `provento`; `vl_desconto|desconto|valor_desconto` → `desconto`; `vl_evento|valor|valor_evento|vl_total` → `valor_evento`; `vl_referencia|qt_referencia|qtd_referencia|referencia` → `referencia`; `vl_liquido|liquido|liquido_calculado` → `liquido_calculado`.
  - textos: `ds_evento|descricao|descricao_evento` → `descricao_evento`; `cd_evento|codigo_evento|evento` → `evento`; `tp_evento|tipo|tipo_evento` → `tipo_evento`.
  - chaves: `ano_mes|anomes|competencia|periodo` → `competencia` (string `YYYYMM`); `cd_filial|filial|nm_filial|ds_filial` → `filial`; `cd_matricula|matricula|num_matricula` → `matricula`; `nm_colaborador|ds_colaborador|colaborador` → `colaborador`; `cd_centro_custo|centro_custo|ds_centro_custo` → `centro_custo`.
- Usar helper numérico (reaproveitar `toNumberBI` se existir ou local) que aceita string pt-BR ("1.234,56") e en-US ("1234.56").
- `fetchResumoFolha` chama `unwrap` e mapeia cada item por `normalizeResumoFolhaItem`. Mantém o objeto original spread em `...raw` para preservar campos extras.
- Log diagnóstico (apenas 1x por chamada): `console.log("[RH ResumoFolha] amostra", { totalItens, primeiraChaveRaw: Object.keys(raw0), normalizado: itens[0] })`.

### 2. `src/pages/rh/ResumoFolhaPage.tsx` — banner diagnóstico
- Após `useQuery`, calcular `temLinhas = data.length > 0` e `somaZero = kpis.provento === 0 && kpis.desconto === 0 && kpis.custoTotal === 0`.
- Quando `temLinhas && somaZero`, mostrar um `<Alert variant="warning">` acima dos KPIs com:
  - "Foram recebidos N registros mas todos os valores estão zerados."
  - "Verifique no console (`[RH ResumoFolha] amostra`) os nomes dos campos numéricos retornados pelo backend e ajuste o aliasing em `src/lib/rh/api.ts:normalizeResumoFolhaItem` se necessário."
- Sem alterar layout/cores/cards existentes.

### 3. `src/lib/rh/eventoBuckets.ts`
- Sem mudanças: já lê `descricao_evento`, `evento`, `tipo_evento`, `valor_evento`, `provento`, `desconto`. Após a normalização passa a receber valores reais.

## Verificação

- Build/typecheck automático.
- Pedir ao usuário para abrir o console na tela; o log `[RH ResumoFolha] amostra` mostra as chaves cruas — se houver alias não previsto, basta acrescentá-lo na normalização.

## Fora de escopo

- Mudanças no backend FastAPI ou no ETL.
- Alterações de layout/cores/tabelas.
