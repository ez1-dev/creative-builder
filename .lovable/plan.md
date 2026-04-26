## Objetivo

Melhorar o espaçamento e a responsividade do `ResponsiveGridLayout` no `DashboardBuilder`, que atualmente fica com widgets visualmente colados (sem `margin`/`containerPadding` definidos) e com `rowHeight` baixo.

## Configuração atual (src/components/dashboard-builder/DashboardBuilder.tsx, linhas 368-378)

```tsx
<ResponsiveGridLayout
  className="layout"
  layouts={layouts}
  breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
  cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
  rowHeight={60}
  isDraggable={editing}
  isResizable={editing}
  onLayoutChange={onLayoutChange}
  draggableCancel=".no-drag"
>
```

Problemas:
- Sem `margin` → widgets sem respiro entre si (default 10px é apertado para cards com sombra/borda).
- Sem `containerPadding` → grid colado nas bordas do painel.
- `rowHeight={60}` é baixo demais — widgets de KPI/gráfico ficam achatados ou exigem altura grande em "rows".
- Breakpoint `md: 996` deixa o viewport atual (1183px) cair em `md` com 12 cols, mas o `lg: 1200` corta logo acima — convém alinhar melhor com o layout do app (sidebar reduz a área útil).

## Mudanças propostas

Atualizar as props do `ResponsiveGridLayout`:

```tsx
<ResponsiveGridLayout
  className="layout"
  layouts={layouts}
  breakpoints={{ lg: 1280, md: 1024, sm: 768, xs: 480, xxs: 0 }}
  cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
  rowHeight={80}
  margin={[16, 16]}
  containerPadding={[8, 8]}
  isDraggable={editing}
  isResizable={editing}
  onLayoutChange={onLayoutChange}
  draggableCancel=".no-drag"
  useCSSTransforms
  compactType="vertical"
>
```

Resumo das alterações:
- `margin={[16, 16]}` — espaçamento horizontal/vertical entre widgets.
- `containerPadding={[8, 8]}` — respiro nas bordas internas do grid.
- `rowHeight={80}` — linhas mais altas, melhor para KPIs e gráficos.
- `breakpoints` ajustados para alinhar com larguras reais (sidebar do app reduz a área útil; `lg` agora começa em 1280px).
- `cols` em `md` reduzido para 10 (viewport intermediário com menos espaço útil que `lg`).
- `compactType="vertical"` e `useCSSTransforms` explicitados para comportamento previsível e performance.

## Arquivo afetado

- `src/components/dashboard-builder/DashboardBuilder.tsx` (linhas 368-378)

## Validação

Após aplicar, abrir `/passagens-aereas` e verificar:
- Widgets com espaço visível entre si.
- Sem corte nas bordas do painel.
- Cards de KPI mantêm altura confortável (1-2 rows).
- Redimensionamento fluido ao alternar viewport (sm/md/lg).
