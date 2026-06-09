## Adicionar Mapa do Brasil ao showcase `/bi-components-demo`

O `BrazilMapCard` já está registrado em `componentRegistry.tsx` e aparece em `/biblioteca-bi`, mas o catálogo visual hard-coded em `src/pages/BiComponentsDemoPage.tsx` não o renderiza. Esta é a razão de ele estar "faltando" no preview de gráficos.

### Mudança

**Arquivo:** `src/pages/BiComponentsDemoPage.tsx`

1. Incluir `BrazilMapCard` no import barrel `@/components/bi`.
2. Criar mock estático com ~8 UFs (SP, RJ, MG, RS, PR, BA, SC, CE) com valores fictícios em reais.
3. Inserir novo bloco dentro do `<ChartGrid>` envolvido por `<WithApply componentId="brazil-map">`, posicionado após o `FunnelChartCard` e antes do `HeatmapChartCard`, com:
   - `title="Faturamento por UF"`
   - `subtitle="Cartograma — intensidade por valor"`
   - `valueFormatter={formatCurrency}`

### Fora de escopo

- Não alterar `BrazilMapCard.tsx`, `componentRegistry.tsx` ou `visualCatalog.ts`.
- Não mexer na seção "Estados visuais" (LoadingState, ErrorState, etc.) — está correta.
- Sem nova permissão dedicada agora (pode ser adicionada depois se necessário).
