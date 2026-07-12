## Mascarar Unidade de Negócio no Modo Apresentação

Hoje o mascaramento cobre nomes de cliente/fornecedor/colaborador/etc., valores e documentos, mas os rótulos de **Unidade de Negócio** (GENIUS, ESTRUTURAL ZORTEA, APOIO, NÃO CLASSIFICADO, OUTROS) continuam aparecendo com o nome real em filtros, KPIs, tabelas, gráficos e drills. Precisamos mascará-los quando o Modo Apresentação estiver ligado.

### 1. Novo helper `maskUnidade` no `DemoModeContext`
- Adicionar tipo `MaskUnidadeKind = 'unidade'` e função `maskUnidade(v)` que:
  - Quando `presentationActive`: mapeia deterministicamente valores conhecidos para rótulos genéricos.
    - `GENIUS` → `Unidade A`
    - `ESTRUTURAL ZORTEA` / `ESTRUTURAL` → `Unidade B`
    - `APOIO` → `Unidade C`
    - `NAO_CLASSIFICADO` / `NÃO CLASSIFICADO` → `Unidade D`
    - `OUTROS` → `Unidade E`
    - Qualquer outro valor → `Unidade <letra>` via hash FNV-1a.
  - Preservar case original (`TODOS` e strings vazias passam sem alteração para não quebrar filtros que dependem do sentinel `'TODOS'`).
- Expor no `DemoModeContextValue` e no fallback do `useDemoMode`.

### 2. Estender o pipeline central de mascaramento
- `src/lib/demo/maskingSchema.ts`: adicionar seção `unidades: string[]` no `FieldSpec` e declarar as chaves `unidade_negocio`, `unidadeNegocio`, `projeto_macro`, `un`, `bu` nos schemas `comercial`, `frota`, `maquinas`, `producao`, `compras`, `financeiro`.
- `src/lib/demo/applyMask.ts`: aplicar `maskUnidade` para essas chaves durante a transformação recursiva. Assim, tudo que passa por `useMaskedData` já vem mascarado sem tocar nas páginas.

### 3. Componente utilitário `<DemoUnidade/>`
- Novo componente presentacional em `src/components/demo/DemoUnidade.tsx` (padrão dos existentes `DemoText`/`DemoMoney`) para uso em locais que renderizam o rótulo direto (títulos de card, badges, tooltips do Recharts, chips de filtro selecionado).

### 4. Aplicar nos pontos onde o valor ainda vaza
Locais identificados por `rg "unidade_negocio"` que renderizam o valor visível (não o valor do filtro/consulta ao backend):
- `src/components/producao/programacao/ProgramacaoFiltersBar.tsx` — rótulo do `SelectItem` (mostrar mascarado, mas manter `value` cru).
- `src/pages/producao/CargaDashboardPage.tsx` e `CargaRecursosDashboardPage.tsx` — labels de gráficos e cards.
- `src/pages/bi/FaturamentoValidacaoPage.tsx` e `RelatorioExecutivoFaturamentoPage.tsx` — cabeçalhos das tabelas Unidade Comercial/Técnica.
- `src/pages/PainelComprasPage.tsx`, `src/pages/NotasRecebimentoPage.tsx`, `src/pages/FaturamentoGeniusPage.tsx` — títulos, badges e séries.
- `src/components/bi/drill/ComercialDrillDrawer.tsx` — chips do path do drill.
- `src/components/producao/programacao/{MapaGargalosTab,LeadTimesTab,GerarProgramacaoTab,FilaOpsTab}.tsx` — eixos/legendas.

Regra: **nunca** transformar o `value` do `<Select>` nem o payload enviado à API; só o texto exibido. Os schemas cuidam dos datasets; os componentes usam `useDemoMode().maskUnidade(...)` só para labels estáticos.

### 5. Escopo mantido (frontend/apresentação apenas)
- Sem alterações em API, RLS, migrações, cálculos ou regras de negócio.
- Sem mudanças no `PresentationSettings` persistido (o mapeamento é determinístico, não precisa de nova preferência).

### 6. Validação
- Playwright: ativar Apresentação e visitar `/bi/comercial`, `/bi/faturamento-validacao`, `/painel-compras`, `/producao/programacao`, `/producao/carga`, `/faturamento-genius` capturando screenshots que confirmem que "GENIUS"/"ESTRUTURAL ZORTEA" não aparecem em nenhum título, filtro, tabela, gráfico ou drill.

### Detalhes técnicos
- Mapeamento fixo + hash garante estabilidade entre re-renders e sessões (mesmo cliente vê sempre `Unidade A` para GENIUS).
- Custo zero quando `presentationActive === false` (helper retorna o valor de entrada).
