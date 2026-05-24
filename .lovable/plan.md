## Objetivo

Padronizar **responsividade (mobile→desktop)** e **drill-down via sheet lateral** em todos os dashboards do sistema. Como é trabalho grande, faço em fases: primitivos compartilhados na biblioteca BI → aplicação em ondas, começando pelo Dashboard de Carga (que você está vendo agora) como referência.

## Fase 1 — Primitivos reutilizáveis em `@/components/bi`

1. **`drill/DrillSheet.tsx`** (novo) — Sheet lateral (`shadcn/ui Sheet`, `side="right"`, `w-full sm:max-w-2xl lg:max-w-4xl`) com:
   - Header com título, subtítulo, chips de filtros ativos, botão "Exportar CSV" e fechar.
   - Body com `<DrillDownTable>` da própria lib (já existe) ou children livres.
   - Footer com contagem de registros e paginação.
   - Hook auxiliar `useDrillSheet<TFiltro>()` que devolve `{ open, openWith(filters, meta), close, filters, meta }`.

2. **Estender `kpis/KpiCard.tsx` e cards de chart** (`ChartCardShell`, `BarChartCard`, `DonutChartCard`, `HorizontalBarChartCard`, `PieChartCard`, `LineChartCard`, `RankingChartCard`):
   - Adicionar prop opcional `onDrill?: (ctx) => void`. Onde `ctx` traz `{ label, value, raw, datum }` (para barras/fatias) ou `{ value }` (para KPI).
   - Renderizar ícone "Ver detalhes" no canto quando `onDrill` definido; cursor pointer; tooltip "Clique para detalhar".
   - Recharts: usar `onClick` da série pra disparar `onDrill` com o `payload`.

3. **`utils/responsive.ts`** (novo) — classes utilitárias padronizadas:
   - `kpiGrid` → `"grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3"`
   - `chartGrid2` → `"grid grid-cols-1 lg:grid-cols-2 gap-3"`
   - `chartGrid3` → `"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"`
   - `pagePad` → `"p-3 md:p-4 lg:p-6 space-y-3 md:space-y-4"`
   - Reaproveitar nos dashboards (substitui o "p-4 lg:p-6" e grids hardcoded).

4. **Atualizar `docs/biblioteca-bi-guia-uso.md`** com seção "Drill-down padrão" e "Breakpoints".

## Fase 2 — Aplicar no Dashboard de Carga (referência)

Em `src/pages/producao/CargaDashboardPage.tsx`:
- Trocar grids hardcoded pelos utilitários responsivos.
- Adicionar `onDrill` em cada KPI e gráfico, abrindo `<DrillSheet>` com a tabela de `/api/producao/carga/detalhe` filtrada por:
  - KPI "OPs" → todos os filtros atuais.
  - KPI "Recursos" → mesma coisa, agrupado por `codcre`.
  - KPI "Sem mapeamento" → filtro `origem_mapeamento=PADRAO_API`.
  - Barra "Top recursos" → filtro `codcre` da barra clicada.
  - Fatia "Centro de custo" → filtro `codccu` da fatia.
  - Fatia "Unidade de negócio" → filtro `unidade_negocio`.
  - Fatia "Fila por situação" → filtro `situacoes` da fatia.
  - Linha da tabela "Centros mais demandados" → filtros `codcre` + `codccu`.
- Mobile: cards KPI 2 colunas, charts 1 coluna, tabela com scroll horizontal.

## Fase 3 — Migrar demais dashboards (ondas)

Aplicar o mesmo padrão (responsividade + DrillSheet onde fizer sentido) nos seguintes, **uma onda por mensagem futura** (volume grande pra um turno só):

- Onda A (Produção): `ProducaoDashboardPage`, `ExpedidoObraPage`, `LeadTimeProducaoPage`, `NaoCarregadosPage`, `ProduzidoPeriodoPage`, `SaldoPatioPage`, `RelatorioSemanalObraPage`.
- Onda B (Comercial/Financeiro): `FaturamentoGeniusPage`, `AuditoriaApontamentoGeniusPage`, `AuditoriaTributariaPage`, `ContasPagarPage`, `ContasReceberPage`, `BalancoPatrimonialPage`.
- Onda C (Suprimentos/Estoque): `PainelComprasPage`, `NotasRecebimentoPage`, `DemonstrativoComprasRecebimentosPage`, `EstoqueMinMaxPage`, `EstoquePage`, `ComprasProdutoPage`, `SugestaoMinMaxPage`.
- Onda D (Operacional/Apoio): `ManutencaoFrotaPage`, `ManutencaoMaquinasPage`, `PassagensAereasPage`, `RegrasSeniorDashboardPage`.

## Entrega deste turno

Implemento **Fase 1 + Fase 2 completas** (primitivos + Dashboard de Carga responsivo com drill). Confirmo as ondas seguintes em mensagens dedicadas — assim cada dashboard recebe atenção sem virar um turno gigante e arriscado.