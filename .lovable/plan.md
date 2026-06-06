# Corrigir limpeza de filtros e diagnóstico do drill BI Comercial

## Objetivo
Eliminar valores inválidos (`undefined`, `"null"`, `"(sem nome)"`, `"TODOS"`, `"CONSOLIDADO"`, etc.) do contexto enviado para `/api/bi/comercial/drill`, e mostrar um diagnóstico completo com todos os filtros aplicados e o filtro que zerou o resultado.

## Mudanças

### 1. `src/lib/bi/comercialDrillContract.ts`
- Adicionar `cleanDrillValue(value)` e `cleanDrillContext(ctx)` conforme a especificação do usuário (lista de inválidos: `undefined`, `null`, `(sem nome)`, `sem nome`, `todos`, `todas`, `consolidado`, vazio).
- Aplicar `cleanDrillValue` dentro de `extractDrillCtx` (a função já ignora alguns sentinelas, mas a lista será unificada).
- Exportar ambas para uso no app inteiro.

### 2. `src/lib/bi/comercialDrillApi.ts`
- Substituir o `cleanContexto` atual por `cleanDrillContext` importado do contract, garantindo que o payload final NUNCA leva valores inválidos.
- Continuar removendo chaves com valor `null` antes do POST.

### 3. `src/lib/bi/comercialDrillCatalog.ts` (`mergeCtx`)
- Filtrar valores inválidos via `cleanDrillValue` ao copiar do `currentCtx` e do `rowFilters`, para não propagar lixo entre níveis.

### 4. `src/hooks/useComercialDrillStack.ts`
- Em `openWith`, `pushDrill` e `replacePath`, passar o contexto inicial por `cleanDrillContext` antes do `mergeCtx`.
- Adicionar opção `resetCtx` para drills de KPI/Card: quando true (chamado pelos KPIs Impostos, Faturamento, etc.), o stack é aberto somente com filtros globais do dashboard, sem reaproveitar resíduo de drill anterior.

### 5. `src/pages/bi/ComercialPage.tsx`
- Em todos os `openDrill` de KPI/Card (Faturamento, Impostos, Devolução, Nº Clientes, etc.), chamar `stack.openWith({ ..., resetCtx: true })`.
- Em cliques de linha/gráfico, garantir que o contexto vem de `extractDrillCtx(row, drillType)` (já usa `row.filtros_drill` quando existir) — não usar `row.label` como filtro técnico.
- Passar o contexto final por `cleanDrillContext` antes de pushar no stack.

### 6. `src/components/bi/drill/DrillEmptyDiagnostico.tsx`
- Expandir `stepDefs` para mostrar TODOS os filtros aplicados, com uma linha por chave de contexto presente (`anomes_emissao`, `cd_estado`, `cd_cliente`, `cd_prj`, `cd_rev_pedido`, `cd_origem`, `cd_tp_movimento`, `cd_tns`, `cd_nf`, `cd_produto`, `cd_derivacao`, `categoria_custom`), com botão "remover" ao lado de cada um.
- Renderizar destaque "Filtro que zerou: X" quando `diagnostico.filtro_que_zerou` vier preenchido (adicionar campo opcional em `DrillDiagnostico`).
- Quando `rows.length === 0` e `qtd_linhas_apos_unidade > 0`, exibir a mensagem: *"Existem dados para unidade/período, mas a combinação de filtros adicionais zerou o resultado."*
- Manter o passo "Base" mas mostrar também a contagem após cada filtro adicional retornado pelo backend (loop dinâmico em `diagnostico.qtd_linhas_apos_*`).

### 7. `src/lib/bi/comercialDrillApi.ts` — tipo `DrillDiagnostico`
- Adicionar `filtro_que_zerou?: string` e `qtd_linhas_apos_origem?`, `qtd_linhas_apos_nf?`, `qtd_linhas_apos_categoria?` (opcionais) para acompanhar campos extras do backend.

## Critério de aceite
- Nenhum payload de `/api/bi/comercial/drill` contém `"undefined"`, `"null"`, `"(sem nome)"`, `"TODOS"`, `"Todos"` ou `"CONSOLIDADO"` em contexto técnico.
- O diagnóstico lista todos os filtros aplicados (não só 6 fixos).
- Mostra "Filtro que zerou: X" quando o backend informar.
- Drill de KPI ignora filtros residuais de drills anteriores.
- Quando há 792 linhas para a unidade/período, a tela passa a trazer dados após a limpeza.

## Fora de escopo
- Backend FastAPI (a normalização é puramente client-side).
- Outros módulos BI.
- Mudança visual além do diagnóstico.
