## Objetivo

Aplicar em **Resumo Folha, Quadro Colaboradores, Contratos de Experiência, Férias, Turnover e Absenteísmo/Afastamentos** o mesmo padrão usado no **BI Comercial**: grid editável (arrastar, redimensionar, ocultar, configurar variante) com widgets substituíveis por componentes da **Biblioteca BI**, e layout persistido por usuário no Lovable Cloud.

## Arquitetura (espelha BI Comercial)

Reaproveita 100% da infra já existente (`dashboards` + `dashboard_widgets` no Cloud, `PassagensLayoutGrid`, `COMPONENT_REGISTRY`, `ApplyComponentDialog`). **Nenhuma migration nova** — as tabelas atuais já suportam qualquer `module`.

1. **Hook de layout genérico**: `src/hooks/useRhModuleLayout.ts`
   - Baseado em `useComercialLayout`, parametrizado por `module` (ex.: `rh-resumo-folha`, `rh-quadro`, `rh-contratos-exp`, `rh-ferias`, `rh-turnover`, `rh-absenteismo`) e `defaultWidgets`.
   - Modo **oficial** (layout padrão do módulo) vs **pessoal** (layout do usuário salvo em `dashboards`/`dashboard_widgets`, `module = <module>`, `owner_user_id = auth.uid()`).
   - Mesmas ações: `save`, `hide/show`, `reset`, `duplicate`, `switchMode`.

2. **Catálogo de widgets por página**: `src/lib/rh/widgetCatalogs.ts`
   - Um `RhWidgetDef[]` por módulo com: `type`, `title`, `kind` (`kpi | bar | line | donut | ranking | table | treemap | heatmap | ...`), `variants` (built-in) e `libraryComponentIds` (ids do `COMPONENT_REGISTRY` compatíveis para substituir via Biblioteca).
   - Inventário inicial (extraído das páginas atuais):
     - **Resumo Folha**: KPIs (headcount, custo folha, encargos, benefícios, hora extra %, absenteísmo %…), série mensal de custo, breakdown por evento, ranking por CC/filial, tabela detalhe.
     - **Quadro Colaboradores**: KPIs (ativos, admissões, demissões, saldo), donut por cargo/setor/gênero, mapa por filial, tabela.
     - **Contratos Experiência**: KPIs (qtd, a vencer 5/10 dias, demitidos 30d), tabela vencimentos.
     - **Férias**: KPIs (a vencer, vencidas, agendadas), pivot por período, ranking colaborador.
     - **Turnover**: KPIs (%, admissões, demissões), série mensal, ranking por filial/setor.
     - **Absenteísmo**: KPIs (% absenteísmo, horas, dias), série mensal, top motivos, heatmap dia×hora.

3. **Grid**: `src/components/rh/RhDashboardGrid.tsx` — wrapper fino sobre `PassagensLayoutGrid` (mesmo padrão de `ComercialDashboardGrid`), recebendo `widgets` + `blocks: Record<type, ReactNode>`.

4. **Página RH refatorada** (mesmo shape em todas as 6):
   ```tsx
   const { widgets, mode, save, hide, reset, editing, setEditing, switchMode } =
     useRhModuleLayout('rh-resumo-folha', RESUMO_FOLHA_DEFAULT_WIDGETS);

   const blocks = useMemo(() => ({
     'kpi-headcount': <KpiCard ... />,   // dado local já calculado
     'serie-custo':   <LineChartCard ... />,
     'ranking-cc':    <RankingChartCard ... />,
     // ...
   }), [dashboard]);

   return (
     <DashboardPage>
       <RhPageHeader ... actions={<RhLayoutToolbar mode={mode} editing={editing} onToggle={setEditing} onReset={reset} onSwitchMode={switchMode} />} />
       <RhFiltrosBar ... />
       <RhDashboardGrid widgets={widgets} blocks={blocks} editing={editing} onLayoutChange={save} onHide={hide} onConfigure={...} />
     </DashboardPage>
   );
   ```
   - **Filtros, fetch, KPIs, exportações, PDF/IA continuam idênticos** — só a renderização vira grid.

5. **Substituição por Biblioteca BI** — reutiliza `ApplyComponentDialog` já existente. O `configure` de cada widget abre o dialog com `libraryComponentIds` do catálogo; a escolha grava `componentId + mapping + options` no `dashboard_widgets` (colunas já existem). O grid, ao renderizar, se `widget.componentId` estiver setado, resolve via `COMPONENT_REGISTRY` em vez do bloco built-in — exatamente como o Comercial faz.

6. **Toolbar `RhLayoutToolbar`** (novo, pequeno): botões "Editar layout / Salvar", "Resetar", switch "Oficial ↔ Meu layout" — copiado do padrão Comercial.

## Escopo dos arquivos

**Novos**
- `src/hooks/useRhModuleLayout.ts`
- `src/lib/rh/widgetCatalogs.ts`
- `src/components/rh/RhDashboardGrid.tsx`
- `src/components/rh/RhLayoutToolbar.tsx`

**Editados** (mesmas 6 páginas, mantendo fetch/filtros/PDF/IA/export)
- `src/pages/rh/ResumoFolhaPage.tsx`
- `src/pages/rh/QuadroColaboradoresPage.tsx`
- `src/pages/rh/ContratoExperienciaPage.tsx`
- `src/pages/rh/ProgramacaoFeriasPage.tsx`
- `src/pages/rh/TurnoverPage.tsx`
- `src/pages/rh/AbsenteismoPage.tsx`

**Não muda**
- APIs `src/lib/rh/api.ts`, tipos, filtros client-side, permissões, PDF, IA insights.
- Tabelas do Cloud (`dashboards`, `dashboard_widgets`, `dashboard_blocks`) — já suportam.
- `src/integrations/supabase/*` e `.env`.

## Detalhes técnicos

- Persistência: `dashboards.module = 'rh-<pagina>'`, `owner_user_id = auth.uid()`. RLS já existente cobre.
- Defaults: se o usuário não tiver dashboard salvo, renderiza `DEFAULT_WIDGETS` do catálogo (modo oficial). "Salvar" cria o dashboard pessoal.
- Widgets ocultos: `hidden=true` no registro; toolbar mostra "Widgets ocultos (n)" para reexibir (padrão Comercial).
- KPIs/gráficos built-in continuam usando `@/components/bi` (KpiCard, LineChartCard, RankingChartCard, DonutChartCard, DataTableBI…), garantindo aderência à Biblioteca BI já no default.
- Nada de cores hardcoded — tokens semânticos existentes.

## Fora do escopo

- Novas métricas ou endpoints RH.
- Alteração da lógica de filtro/PDF/IA.
- Editor livre de queries (o usuário troca **apresentação** entre variantes e componentes da Biblioteca, não a fonte de dados).
