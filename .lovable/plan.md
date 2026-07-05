## Objetivo
Investigar por que o gráfico "Histórico Nº Colaboradores" não bate com os valores esperados e ajustar o mapeamento de `fetchQuadroHistorico`.

## Mudanças

Arquivo único: `src/lib/rh/quadroDashboardApi.ts` → função `fetchQuadroHistorico`.

1. **Log do payload bruto** (`console.log("[RH Quadro] historico", { anomesIni, anomesFim, raw: resp })`) para inspeção na próxima interação.
2. **Ampliar aliases**:
   - competência: adicionar `ano_mes_competencia`, `periodo`, `dt_competencia`.
   - valor: adicionar `ativos`, `qtd_ativos`, `headcount`, `qtd`, `qtde`, `nr_colaboradores`.
3. **Agrupar por competência**: se a API devolver várias linhas para o mesmo `anomes` (ex.: quebrado por empresa), somar os valores antes de ordenar.
4. Manter ordenação ascendente por `anomes`.

## Fora de escopo
- KPIs, Sexo, Situação, Empresa, layout.
- Backend / regra de headcount.
