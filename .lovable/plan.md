## Onda A — Padronizar drill-down e responsividade nos dashboards de Produção

Aplicar nas demais páginas de Produção o mesmo padrão já entregue em `CargaDashboardPage`:
- **Responsividade**: usar `biResponsive` (`kpiGrid`, `chartGrid2`, `chartGrid3`, `pagePad`) em vez de `grid-cols-*` hardcoded → quebra correta em mobile (375px), tablet (768px) e desktop (1280px+).
- **Drill-down**: abrir `<DrillSheet>` (sheet lateral) com tabela filtrada quando o usuário clica num KPI, barra de gráfico, fatia de donut ou linha de tabela. Filtros do contexto viram badges no header do sheet.
- **Sem destrutivo gratuito**: não usar `variant="danger"`/`text-destructive` em KPIs apenas informativos.

### Páginas no escopo da Onda A

| # | Página | Estado atual | Ação |
|---|---|---|---|
| 1 | `ProducaoDashboardPage.tsx` | Já usa `@/components/bi` (KpiCard tem `onClick` + `tooltip` nativos) | Adicionar `onClick` em cada KPI abrindo `DrillSheet` com tabela filtrada (Kg Previsto/Produzido/Expedido/Pátio → projetos do período; Itens Não Carreg. → lista de itens; Em Produção/Aguardando/Parcial Expedido/Total → projetos por status). Trocar `grid` por `kpiGrid`/`chartGrid2`. |
| 2 | `LeadTimeProducaoPage.tsx` | `grid grid-cols-2 md:grid-cols-4` cru | Migrar KPIs para `KpiCard` BI + `kpiGrid`, drill por faixa de lead-time. |
| 3 | `ProduzidoPeriodoPage.tsx` | idem | KPIs → drill em "Produzido por obra/dia"; tabela detalhe filtrada. |
| 4 | `ExpedidoObraPage.tsx` | idem | KPIs → drill por obra/data de expedição. |
| 5 | `SaldoPatioPage.tsx` | idem | KPIs → drill em itens em pátio filtrados por obra/idade. |
| 6 | `NaoCarregadosPage.tsx` | idem | KPIs → drill em lista de itens não carregados (já é o "detalhe"; usar sheet só se houver agrupamento; caso contrário, manter e só normalizar grid). |
| 7 | `RelatorioSemanalObraPage.tsx` | `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` | KPIs → `kpiGrid`; cards de gráfico → `chartGrid2`; drill por obra/semana. |

Fora do escopo desta onda (não são dashboards): `ImpressaoOrdemProducaoPage`, `CargaProducaoPage` (wrapper), `MetaEntregaSemanalChart` (componente puro).

### Padrão de implementação por página

1. **Imports**: `import { biResponsive } from '@/components/bi/utils/responsive'` e `import { DrillSheet, useDrillSheet } from '@/components/bi/drill/DrillSheet'`.
2. **Hook**: `const drill = useDrillSheet<Filtros>()` no topo da página.
3. **Grids**: substituir `className="grid grid-cols-2 md:grid-cols-4 gap-4"` por `className={biResponsive.kpiGrid}`; gráficos lado-a-lado por `biResponsive.chartGrid2/3`.
4. **KPIs**: passar `onClick={() => drill.open({ title: 'Kg Produzido', filtros: { ...filtrosAtuais, foco: 'kg_produzido' } })}` e (quando aplicável) `tooltip="..."`.
5. **Gráficos**: nos charts da biblioteca BI que já expõem `onPointClick`/`onSliceClick`, passar handler equivalente abrindo o sheet com filtro do item.
6. **Tabelas**: linhas com `onRowClick` quando fizer sentido (ex.: obra → drill por obra).
7. **`DrillSheet`** no fim do JSX: `<DrillSheet state={drill} renderContent={(ctx) => <TabelaDetalhe filtros={ctx.filtros} />}/>`. Cada página define seu `TabelaDetalhe` apontando para o endpoint existente da própria página (ex.: `/api/producao/produzido?...`, `/api/producao/expedido?...`).

### Reuso e refactor

- Se duas ou mais páginas usarem o mesmo "detalhe", extrair `TabelaDetalheProducao` em `src/components/producao/drill/` para evitar duplicação.
- Padronizar formatadores via `@/components/bi/utils/formatters` (já existe).
- Não tocar em endpoints — apenas consumir os já existentes com filtros adicionais derivados do contexto do drill.

### Critério de pronto

- Em viewport 375px: KPIs em 2 colunas, gráficos empilhados, tabelas com scroll horizontal.
- Em 768px: KPIs 3–4 col, gráficos 1 col.
- Em ≥1280px: layout cheio idêntico ao atual.
- Cada KPI/gráfico/linha clicável abre `DrillSheet` com badges de filtro corretos.
- Nenhuma cor hardcoded; uso exclusivo de tokens semânticos.
- Build TypeScript verde.

### Entrega

Implementar todas as 7 páginas numa única passada de build mode, commitando arquivo a arquivo. Onda B (Comercial/Financeiro) fica para próxima mensagem.