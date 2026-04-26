## Objetivo

Adicionar um botão **"Organizar automaticamente"** no `DashboardBuilder` que reposiciona e redimensiona os widgets existentes seguindo regras inteligentes — sem precisar arrastar nada manualmente.

## Comportamento

Botão fica no modo edição, ao lado de "Aplicar layout Power BI". Ao clicar, executa `autoArrangeLayout()`:

### Regras de tamanho por tipo (grid 12 colunas)

| Tipo | Largura (w) | Altura (h) | Observação |
|---|---|---|---|
| `kpi` | 3 | 3 | Cards pequenos, lado a lado no topo |
| `pie` / `treemap` | 6 | 5 | Meia largura |
| `bar` / `line` / `area` / `scatter` | 6 | 5 | Meia largura |
| `table` (compacta) | 5 | 5 | Lateral |
| `table` (completa) | 12 | 6 | Largura total |

### Algoritmo de posicionamento

1. **Separar** widgets em 3 grupos preservando ordem original:
   - **KPIs** (linha superior, 3 cols cada → até 4 por linha)
   - **Gráficos médios** (bar/line/area/pie/treemap/scatter — 6 cols cada → 2 por linha)
   - **Tabelas largas** (12 cols, uma por linha)

2. **Empilhar verticalmente** na ordem: KPIs → Gráficos → Tabelas largas, cada grupo preenchendo da esquerda para a direita, quebrando linha quando estoura 12 cols.

3. **Tabelas compactas** (`config.compact === true`) entram no grupo de gráficos médios com w=5/h=5, ocupando o lado de algum gráfico equivalente.

### Pseudo-código

```ts
function autoArrangeLayout() {
  const sized = widgets.map(w => ({ ...w, layout: { ...w.layout, ...sizeFor(w) } }));
  const ordered = [
    ...sized.filter(w => w.type === 'kpi'),
    ...sized.filter(w => isMidChart(w)),
    ...sized.filter(w => w.type === 'table' && !w.config.compact),
  ];
  let x = 0, y = 0, rowH = 0;
  const placed = ordered.map(w => {
    if (x + w.layout.w > 12) { x = 0; y += rowH; rowH = 0; }
    const pos = { x, y, w: w.layout.w, h: w.layout.h };
    x += w.layout.w;
    rowH = Math.max(rowH, w.layout.h);
    return { ...w, layout: pos };
  });
  setWidgets(placed);
}
```

Não persiste imediatamente — atualiza estado local; o usuário clica **Salvar** para confirmar (mantém padrão atual de edição).

## Arquivos afetados

- `src/components/dashboard-builder/DashboardBuilder.tsx`
  - Função `autoArrangeLayout()`
  - Botão **"Organizar automaticamente"** (`LayoutGrid` icon) no toolbar de edição

## Validação

1. Em `/passagens-aereas`, entrar em **Personalizar**.
2. Adicionar/mover widgets bagunçados → clicar **Organizar automaticamente**.
3. Conferir que KPIs ficam no topo lado a lado, gráficos em duas colunas abaixo, tabelas largas no rodapé. Sem sobreposição.
4. Clicar **Salvar** para persistir.
