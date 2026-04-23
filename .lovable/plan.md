

## Corrigir filtro "Só c/ inconsistência" no drill de KPI

### Diagnóstico
No `KpiDeepSheet`, quando o usuário abre o drill de um KPI de problema (`Acima de 8h`, `Sem Início`, `Sem Fim`, `Fim < Início`, `Abaixo 5 min`, `Discrepâncias`), as linhas (`linhas`) já chegam **pré-filtradas** apenas com apontamentos problemáticos (vide `linhasDoKpi` em `AuditoriaApontamentoGeniusPage.tsx`, linhas 933–948).

Como consequência, ao agrupar essas linhas em OPs (`groupOpsFromRows`), **toda OP** resultante já tem `inconsistencias > 0`. O toggle "Só c/ inconsistência" então não tem nada a remover — alternar liga/desliga não muda a lista, dando a sensação de filtro quebrado.

Para drills "não-problema" (`Total`, `Em andamento`, `Finalizadas`, `Status`, `Maior Total Dia`), as linhas vêm cruas e a OP pode ter inconsistencias = 0; nesses casos o toggle funciona corretamente.

### Mudança (arquivo único: `src/pages/AuditoriaApontamentoGeniusPage.tsx`)

**1. Esconder o toggle quando o drill já é de um KPI de problema**

No bloco da Toolbar do `KpiDeepSheet` (linhas ~1916–1919), envolver o `<div>` do Switch + Label com `{!isProblema && ( ... )}`. A variável `isProblema` já existe (linha 1822).

**2. Forçar o estado para `false` quando o drill é de problema**

No `useEffect` de inicialização do drill (`abrirKpiDrill`, linha ~460), continuar setando `setStatusDrillSomenteInconsist(isProblema)` apenas para que o estado não interfira — porém como o toggle some, o valor é irrelevante. Deixar como está.

**3. (Opcional, mas recomendado) Pequeno hint visual**

Logo abaixo da `SheetDescription` (linha ~1877), adicionar — somente quando `isProblema` — um texto `text-[11px] text-muted-foreground`: "Recorte já contém apenas linhas com inconsistência deste tipo." Isso explica por que o toggle não aparece.

### Fora de escopo
- Mudar a lógica de `linhasDoKpi` ou de `groupOpsFromRows`.
- Alterar comportamento do toggle nos drills `total` / `status` / `emAndamento` / `finalizadas` / `maiorTotalDia` (já funcionam).
- Ajustes em outras telas.

### Resultado
- Em drills de KPIs de problema, o toggle "Só c/ inconsistência" deixa de aparecer (não é aplicável) e exibimos uma frase curta indicando que o recorte já está filtrado.
- Em drills "neutros" (Total/Status/Em andamento/Finalizadas/Maior Total Dia), o toggle continua aparecendo e funcionando como antes.

