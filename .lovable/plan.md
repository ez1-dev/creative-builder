

## Drill-down até o último nível em TODOS os KPIs da Auditoria Apontamento Genius

### Diagnóstico
Hoje só os 5 cards de status real (E/L/A/F/C) têm drill profundo (Sheet com OPs → apontamentos brutos). Os demais 7 KPIs (`Total Apontamentos`, `Discrepâncias`, `Sem Início`, `Sem Fim`, `Fim < Início`, `Acima de 8h`, `Maior Total Dia`, além de `Em Andamento` e `Finalizadas`) abrem apenas Popover compacto com top 15 itens (`label/value`), sem chegar ao registro bruto.

O usuário quer o mesmo padrão de drill profundo (Sheet lateral com tabela de OPs filtráveis + accordion com apontamentos brutos) em **todos os KPIs**.

### Mudanças (arquivo único: `src/pages/AuditoriaApontamentoGeniusPage.tsx`)

**1. Generalizar o `StatusOpDrillCard` → `KpiDrillCard`**

Renomear/expandir o componente atual para aceitar qualquer KPI, não só status real:

```ts
type KpiDrillKind =
  | { kind: 'status'; letra: 'E'|'L'|'A'|'F'|'C' }
  | { kind: 'total' }
  | { kind: 'discrepancias' }
  | { kind: 'semInicio' }
  | { kind: 'semFim' }
  | { kind: 'fimMenorInicio' }
  | { kind: 'acima8h' }
  | { kind: 'maiorTotalDia' }
  | { kind: 'emAndamento' }       // E+L+A
  | { kind: 'finalizadas' };      // F
```

Cada card recebe `drill={kind: ...}` + título + valor + variant. Mantém Popover (top 30) + botão "Ver tudo →".

**2. Função única `linhasDoKpi(kind): RowApont[]`**

Centraliza a regra de filtragem das linhas brutas de `data.dados` por KPI:

```ts
const linhasDoKpi = (k: KpiDrillKind): RowApont[] => {
  const all = data?.dados ?? [];
  switch (k.kind) {
    case 'total':            return all;
    case 'status':           return all.filter(r => normSitorp(r) === k.letra);
    case 'emAndamento':      return all.filter(r => ['E','L','A'].includes(normSitorp(r)));
    case 'finalizadas':      return all.filter(r => normSitorp(r) === 'F');
    case 'semInicio':        return all.filter(r => !r.hora_inicial);
    case 'semFim':           return all.filter(r => !r.hora_final);
    case 'fimMenorInicio':   return all.filter(r => r.hora_inicial && r.hora_final && r.hora_final < r.hora_inicial);
    case 'acima8h':          return all.filter(r => minToHours(r.horas_realizadas) > 8 || minToHours(r.total_horas_dia_operador) > 8);
    case 'discrepancias':    return all.filter(isLinhaDiscrepante); // união das 4 regras
    case 'maiorTotalDia':    return all.filter(r => Number(r.total_horas_dia_operador||0) === maxTotalDiaMin); // top operador-dia
  }
};
```

Adicionar helper `isLinhaDiscrepante(r)` reutilizando a mesma lógica do `atualizarKpisApontGenius`.

**3. Agregar essas linhas no formato `OpAgg[]` reusando função existente**

Extrair da `kpiDrilldowns` a parte que constrói `OpAgg` em uma função pura:

```ts
const agregarPorOp = (linhas: RowApont[]): OpAgg[] => { ...mesma lógica de hoje... };
```

E reutilizar tanto na agregação por status (já existente) quanto no novo Sheet genérico.

**4. Generalizar `StatusOpDeepSheet` → `KpiDeepSheet`**

Mesmo Sheet de 920px, mas parametrizado:

- Props: `aberto`, `onOpenChange`, `titulo`, `subtitulo`, `linhas: RowApont[]`, `corVariant`.
- Header: mini-KPIs calculados sobre `linhas` (nº linhas, OPs únicas, OPs c/ inconsistência, soma min/h, operadores únicos, top 3 origens, top 3 status nativos).
- Tabela nível 2 (OPs únicas via `agregarPorOp`): mesmas colunas e filtros (`Só com inconsistência`, busca, ordenação) — funciona igual para todos os KPIs.
- Accordion nível 3 (`OpLinhasInline`): inalterado, já mostra apontamentos brutos com botões "Filtrar grid" / "Abrir drawer OP".
- Quando o KPI é `semInicio`/`semFim`/`fimMenorInicio`/`acima8h`, **pré-aplicar** `statusDrillSomenteInconsist=true` por padrão e marcar a regra correspondente em destaque visual nos badges da tabela.

**5. Estado**

Substituir os 2 estados atuais por um par genérico:

```ts
const [kpiDrillAberto, setKpiDrillAberto] = useState(false);
const [kpiDrillKind, setKpiDrillKind] = useState<KpiDrillKind | null>(null);
```

Manter `statusDrillBusca`, `statusDrillSomenteInconsist`, `statusDrillOrdem`, `opExpandidaNoDrill` (compartilhados pelo Sheet).

**6. Substituir os `KPICard` da grid principal**

Trocar cada um dos 9 KPIs do topo por `KpiDrillCard` com seu `drill={...}`. Continuam usando o mesmo visual/variant. Popover compacto continua mostrando os top 30 itens via `agregarPorOp(linhasDoKpi(kind)).slice(0,30)` já formatados como `OP {numop} · {produto curto}` / `{apt} apt · {min·h}` com prefixo ⚠ quando há inconsistência.

**7. KPI especial "Maior Total Dia"**

Em vez de `OpAgg` por OP, o nível 2 é uma **tabela operador-dia** ordenada por `total_horas_dia_operador` desc. Cada linha expande para os apontamentos daquele operador naquele dia (já é um caso de `OpLinhasInline` filtrado por `numcad+data`). Tratamento dedicado dentro do Sheet quando `kind === 'maiorTotalDia'`.

**8. Aviso de escopo**

Mantém o alerta atual dentro do Sheet (`discrepanciasParciais`) — alerta amarelo da página principal continua removido (decisão anterior).

### Comportamento resultante

- Todos os 9 KPIs ganham:
  - Popover rápido com top 30 OPs (com ⚠ destacando inconsistências).
  - Botão "Ver tudo →" abre Sheet lateral (920px).
  - Sheet mostra mini-KPIs do recorte + tabela de OPs únicas filtráveis + accordion com **apontamentos brutos** (último nível).
- KPI "Maior Total Dia" abre tabela operador-dia → drill nos apontamentos daquele dia.
- Reuso máximo: 1 Sheet, 1 função de agregação, 1 função de filtragem por kind.

### Fora de escopo
- Buscar páginas adicionais do backend para drill global (continua escopo "página atual").
- Mudar backend / exportação.
- Persistir estado do drill entre buscas.

### Resultado
Todos os cards de KPI da tela `/auditoria-apontamento-genius` chegam ao último nível de informação (apontamento bruto), com o mesmo padrão de UX já validado nos cards de status real.

