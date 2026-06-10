## Por que o mapa não aparece

Quando você clica **Aplicar** no card do heatmap, o sistema salva um *user widget* vinculado à página `bi-comercial` (seção `charts`).

Porém, ao abrir `/bi/comercial`, descobri que essa página **não renderiza `<UserWidgetsSlot/>`** — diferente das páginas Faturamento Genius, Painel Compras, Contas a Pagar, Notas Recebimento, Estoque Min/Max e Produção, que já incluem esses slots.

Resultado: o widget é salvo corretamente no Cloud, mas a página Comercial nunca o lê → o mapa não aparece.

## O que vou fazer

1. Em `src/pages/bi/ComercialPage.tsx`, dentro do `<PageDataProvider>` (que já existe na linha 1110), adicionar os 3 slots padrão da Biblioteca BI logo após o último bloco fixo da página (antes dos diálogos de configuração):

```tsx
<UserWidgetsSlot section="kpis"   cols={4} emptyHint={false} />
<UserWidgetsSlot section="charts" cols={3} emptyHint={false} />
<UserWidgetsSlot section="tables" cols={2} emptyHint={false} />
```

2. Importar `UserWidgetsSlot` de `@/components/bi`.

3. Não mexer no `componentRegistry`, no `comercialWidgetCatalog` nem no BrazilHeatMap — eles já estão corretos. O `PageDataProvider` já fornece `kpis`, `series`, `rows` e `filtros`, então o `brazil-heat-map-comercial` (que lê `usePageData()`) renderiza com os dados/filtros vivos da página.

## Resultado esperado

- Heatmap (e qualquer outro componente que você aplicar via botão **Aplicar** do `BiComponentsDemoPage`) passa a aparecer em `/bi/comercial`, abaixo dos blocos fixos, reagindo aos mesmos filtros da página.
- Demais páginas continuam funcionando como hoje (mudança isolada à página Comercial).
