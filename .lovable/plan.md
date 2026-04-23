

## Novo KPI: OPs com apontamentos abaixo de 5 minutos

### Objetivo
Adicionar um card de KPI na tela `/auditoria-apontamento-genius` que destaca apontamentos com tempo realizado **> 0 e < 5 minutos** (apontamentos suspeitos de "bater ponto" ou erro de operação), com drill-down até o último nível, seguindo o mesmo padrão dos demais KPIs.

### Mudanças (arquivo único: `src/pages/AuditoriaApontamentoGeniusPage.tsx`)

**1. Novo status de discrepância**
Adicionar `'APONTAMENTO_MENOR_5MIN'` ao conjunto de status de classificação (junto com `APONTAMENTO_MAIOR_8H`, `SEM_INICIO`, etc.). Regra:
```ts
const min = Number(row.horas_realizadas) || 0;
if (min > 0 && min < 5) status = 'APONTAMENTO_MENOR_5MIN';
```
Prioridade: abaixo de `FIM_MENOR_INICIO`/`SEM_INICIO`/`SEM_FIM`/`APONTAMENTO_MAIOR_8H` e acima de `OPERADOR_MAIOR_8H_DIA`.

**2. Atualizar `atualizarKpisApontGenius`**
- Novo contador `abaixo5min` no objeto de KPIs.
- Incluir essa condição no cálculo de `total_discrepancias` (passa a contar também `> 0 && < 5min`).
- Incluir em `isLinhaDiscrepante(r)` para que o KPI "Discrepâncias" e o drill genérico considerem essas linhas.

**3. Novo `KpiDrillKind`**
Adicionar `{ kind: 'abaixo5min' }` ao type union.

**4. `linhasDoKpi`**
```ts
case 'abaixo5min':
  return all.filter(r => {
    const m = Number(r.horas_realizadas) || 0;
    return m > 0 && m < 5;
  });
```

**5. Novo card na grid de KPIs**
Inserir um `KpiDrillCard` ao lado dos cards de discrepância:
- título: `Abaixo de 5 min`
- valor: `kpis.abaixo5min`
- variant: `warning` (ou `destructive` se quiser alarmar mais)
- ícone: `AlertTriangle`
- tooltip: "Apontamentos com tempo > 0 e < 5 minutos — possível erro de operação ou apontamento incorreto"
- drill: `{ kind: 'abaixo5min' }`
- pré-filtro `statusDrillSomenteInconsist=true` ao abrir (mesma lógica já aplicada para `semInicio`/`acima8h`).

**6. Visual de destaque na tabela principal**
- `rowClassName`: linhas com `APONTAMENTO_MENOR_5MIN` ganham fundo amarelo claro (mesmo tom do `acima8h` ou um tom distinto warning).
- Badge de status na coluna "Status" ganha label "Abaixo de 5 min" com cor `warning`.

**7. Mini-KPIs do `KpiDeepSheet`**
O contador "Linhas com inconsistência" do header já cobre via `isLinhaDiscrepante`. Sem mudança adicional.

**8. Resumo do backend**
Se `data.resumo.abaixo_5min` existir no payload, usar como source-of-truth (pattern dos demais campos). Caso contrário, usar fallback local (que é o caso atual). Sem mudança no backend nesta tarefa — só consumir se vier.

### Fora de escopo
- Mudar backend / contrato `docs/backend-auditoria-apontamento-genius.md` (pode ser feito em tarefa separada).
- Filtro dedicado `somente_abaixo_5min` na query — usuário usa o drill do card.
- Exportação Excel filtrada por essa regra.

### Resultado
Novo card amarelo "Abaixo de 5 min" no topo, contando apontamentos suspeitos de tempo mínimo, com drill de 3 níveis (popover top 30 → Sheet com OPs → apontamentos brutos) idêntico aos demais KPIs. Linhas correspondentes ganham destaque na tabela principal.

