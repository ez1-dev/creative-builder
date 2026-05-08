## Problemas

**1. Pré-visualização vazia** no "Adicionar novo gráfico" (e também no "Configurar gráfico").
- Causa: em `PassagensDashboard.tsx`, `<AddChartDialog>` e `<ConfigureChartDialog>` estão renderizados **fora** do `<PageDataProvider>` (que fecha na linha 1658). O hook `usePageData()` retorna `null`, então `previewNode` nunca é construído e o painel mostra "Selecione tipo e série…".

**2. Sem seletor de cor** das barras/linhas no novo gráfico.
- Os componentes BI (`BarChartCard`, `HorizontalBarChartCard`, `LineChartCard`, `AreaChartCard`) já aceitam prop `color` (default `hsl(var(--primary))`), mas o `componentRegistry.tsx` não repassa nenhum valor vindo de `options`.

## Correções

### A. Mover os dialogs para dentro do PageDataProvider
Em `src/components/passagens/PassagensDashboard.tsx`:
- Mover os blocos `{configureTarget && <ConfigureChartDialog … />}` e `<AddChartDialog … />` para **antes** do fechamento `</PageDataProvider>` (linha 1658). Assim o contexto fica disponível para a pré-visualização.

### B. Repassar `options.color` no registry
Em `src/lib/bi/componentRegistry.tsx`, atualizar os render() dos charts que aceitam `color`:
- `bar-chart`, `horizontal-bar-chart`, `line-chart`, `area-chart`, `ranking-chart`.
- Padrão: quando `options?.color` não for informado, **não passar a prop** (deixa o default do componente, que é `hsl(var(--primary))` — a cor padrão da página).

```tsx
render: ({ title, mapping, ctx, options }) => (
  <BarChartCard
    title={title || mapping.series}
    data={SERIES_LIKE(ctx.series?.[mapping.series])}
    {...(options?.color ? { color: options.color } : {})}
  />
),
```

### C. Adicionar seletor de cor no AddChartDialog
Em `src/components/passagens/AddChartDialog.tsx`:
- Novo state `color: string` (default `'hsl(var(--primary))'`).
- Mostrar o campo somente quando o `componentId` selecionado suportar cor única (set: `bar-chart`, `horizontal-bar-chart`, `line-chart`, `area-chart`, `ranking-chart`).
- UI: presets baseados em **tokens semânticos** do design system (Primário, Sucesso, Warning, Destructive, Accent, Muted) + `<input type="color">` para escolha livre. Cada preset traduz para a string `hsl(var(--primary))` etc. Padrão = "Padrão da página" (= `hsl(var(--primary))`).
- Incluir `color` em `options` ao montar o `NewChartValue`.
- Repassar `options.color` ao `def.render()` do preview.

### D. (Opcional, mesmo dialog) Espelhar o seletor no ConfigureChartDialog
Permite editar a cor de gráficos já existentes. Mesma lógica — mantém retrocompatibilidade quando `options.color` for indefinido.

## Arquivos afetados
- `src/components/passagens/PassagensDashboard.tsx` — reposicionar dialogs.
- `src/lib/bi/componentRegistry.tsx` — repassar `options.color` em 5 charts.
- `src/components/passagens/AddChartDialog.tsx` — campo cor + persistência.
- `src/components/passagens/ConfigureChartDialog.tsx` — campo cor (mesma UI).

## Validação
1. Em `/passagens-aereas` modo edição → "+ Novo gráfico":
   - Selecionar tipo e série → **pré-visualização aparece**.
   - Trocar cor (preset Sucesso, depois color picker custom) → preview reflete imediatamente.
   - Sem escolher cor → preview usa azul padrão (`--primary`).
2. Adicionar e salvar layout → recarregar página → cor persistida.
3. Abrir "Configurar gráfico" num bloco existente → editar cor → salvar → recarregar → mantém cor.
4. Bloco sem `options.color` continua azul padrão (sem regressão).

## Fora de escopo
- Cor por categoria (paleta multi-série) em donut/pie/treemap — esses já têm paletas próprias.
- Persistência de paleta global da página.