## Objetivo

Corrigir os drills da tela **RH · 01 — Resumo da Folha** para que o menu/estado de "drillável" venha **exclusivamente** de `drills_menu` da resposta de `/api/rh/resumo-folha/dashboard`, eliminando a lista fixa de cards esperados que hoje gera falsos "faltantes" (`salario_bruto`, `tipos_evento`, `filial`).

## Mudanças em `src/pages/rh/ResumoFolhaPage.tsx`

1. **Remover as listas hardcoded**
   - Excluir `EXPECTED_KPI_DRILLS` e `EXPECTED_EXTRA_DRILLS` (linhas 165–172).
   - Excluir `missingDrills` (173–177) e o banner amarelo "Drills ausentes em drills_menu" (~linha 1019). Sem lista fixa, não há como declarar "faltante".
   - Manter `copyDrillDiagnostico` mas simplificado: copia apenas `params`, `drills_menu_recebidos`, `cards_recebidos` e `diagnostico`. O botão "Copiar diagnóstico" continua disponível a admin como ferramenta de suporte, sem banner de erro.

2. **Alias `salario_bruto` → `salario_base`**
   - Em `openDrill`/`kpiDrill`, se o `field` pedido não existir em `drillsMap` mas houver o alias equivalente, usar o alias. Mapa inicial: `{ salario_bruto: "salario_base" }`.
   - Isso mantém o card "Salário Bruto" clicável reutilizando o drill de `salario_base`, que é o comportamento oficial do backend (mesmos valores, label "Salário Base/Bruto").

3. **Fonte de verdade = `drills_menu`**
   - `kpiDrill(field)` continua consultando `drillsMap.has(field)` (após alias). Cards, linhas de tabela, células e fatias do donut já usam `drillsMap.has(...)` para decidir se são clicáveis — mantém-se o padrão, mas agora sem a duplicidade de "lista esperada".
   - Quando `openDrill` é chamado para um card que não está em `drillsMap` (e não tem alias), permanece o `console.warn`, mas **sem toast de erro** — silencioso para o usuário (é caso de card realmente inexistente, não bug).

4. **Chaves singulares**
   - Auditar chamadas de `openDrill(...)` na página para garantir que usem `provento`/`desconto` (singular) quando for drill de KPI. Os pontos que hoje passam `"proventos"`/`"descontos"` (linhas ~700 e ~738) são drills das **tabelas** Proventos+Vantagens e Descontos — esses cards existem no backend com esses nomes (plural) e continuam como estão. Apenas confirmar que os KPIs no topo usam singular (já usam via `kpiDrill("provento")` etc.).

5. **Descontos com valor positivo**
   - Confirmar no `ResumoFolhaDrillDrawer` que `item.valor` é renderizado como veio (sem `Math.abs` invertendo sinal). Hoje já é `formatCurrency(Number(it.valor))` — nenhuma mudança necessária, apenas verificação.

6. **Estado vazio**
   - Em `ResumoFolhaDrillDrawer`, quando `itens.length === 0` e `total === 0`, mostrar "Sem lançamentos no período" no lugar de "Sem itens neste agrupamento." Ajuste mínimo de copy.

## Fora de escopo

- Nenhuma mudança no backend/env — o prompt do usuário lembra que o restart da porta 8070 é responsabilidade dele.
- Nenhuma alteração em outras telas RH.

## Resultado esperado

- Tela nunca mais acusa "faltantes" para cards que o backend não expõe (salario_bruto, tipos_evento, filial).
- Cards/tabelas/gráficos ficam clicáveis quando e apenas quando `drills_menu` os inclui — qualquer card novo adicionado no backend aparece automaticamente.
- "Salário Bruto" continua drillável via alias para `salario_base`.
