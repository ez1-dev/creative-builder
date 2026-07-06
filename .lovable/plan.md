## Redesign dos gráficos "Por Segmento" e "Por Tipo de Veículo" — Donut + legenda lateral rica

Trocar o layout atual (pizza cheia com leader-lines) por um **donut moderno com legenda lateral rica**, padrão Stripe / Tremor / Linear.

### Como fica

```text
┌───────────────────────────────────────────────────────────────┐
│ Por Segmento (Categoria)                                    ⛶│
│ Manutenção / Combustível / Pedágio — % e valor               │
│                                                               │
│                       ╭──────╮      ● Manutenção veículo      │
│                     ╭─╯      ╰─╮     R$ 121,0 mil     82,2%   │
│                     │          │                              │
│                     │  R$ 147  │    ● Pedágio                  │
│                     │   mil    │     R$ 26,1 mil       17,8%  │
│                     │  Total   │                              │
│                     ╰─╮      ╭─╯    ● Combustível              │
│                       ╰──────╯       R$ 0,00           0,0%   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

- **Rosca à esquerda** (~40% da largura) com total grande + label "Total" no centro. Sem rótulos flutuantes na fatia — nada de leader-lines nem texto radial.
- **Legenda à direita** (~60%), lista vertical clicável:
  - bolinha colorida (cor da fatia),
  - nome da categoria (truncado com tooltip se estourar),
  - valor em R$ formatado à direita,
  - % em cinza logo abaixo do valor,
  - hover destaca a fatia correspondente (aumenta opacidade das outras, sublinha o item),
  - clique aciona o `onItemClick` existente (cross-filter mantido).
- Fatia clicada/hovered ganha leve `outerRadius` maior (efeito "puxar para fora" suave).
- Tooltip da fatia mantém: nome + valor + %.
- Cores: paleta `BI_PALETTE` existente. Nada de cores hardcoded.
- Responsivo: em telas estreitas (`<640px`) a legenda cai abaixo do donut em grid de 2 colunas.

### Onde muda

Criar um **novo componente** dedicado (não mexer no `PieChartCard`, que é compartilhado por Máquinas, Comercial, IA, etc.):

- **Novo**: `src/components/bi/charts/DonutSideLegendCard.tsx`
  - API: `{ title, subtitle, data: {label, valor}[], loading, height, onItemClick, valueFormatter, centerLabel }`
  - Usa `ChartCardShell` como wrapper (mesma header/loading/empty que os outros cards).
  - Usa `recharts` `PieChart`+`Pie`+`Cell` para o donut; a legenda é HTML/Tailwind (não `<Legend/>` do recharts — dá mais controle).
  - Estado interno `hoverIdx` para o realce cruzado donut ↔ legenda.

- **Alterado**: `src/components/frota/FrotaDashboard.tsx`
  - Trocar os dois `PieChartCard` (blocos `chart-categoria` linha ~480 e `chart-tipo-veiculo` linha ~543) pelo novo `DonutSideLegendCard`. Remover o `visualConfig` inline adicionado antes.

### Detalhes técnicos

- Tokens semânticos: `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`. Zero cor hardcoded.
- Layout: `grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4` no desktop; `grid-cols-1` no mobile.
- Lista lateral com `max-h-full overflow-y-auto` para casos com muitas categorias (ex.: Tipo de Veículo tem 10+).
- Ordenação da legenda: decrescente por valor.
- Formatação: `formatCurrency` já disponível em `@/components/bi/utils/formatters`; % com 1 casa decimal, vírgula pt-BR.
- Sem novas dependências. Sem migration. Sem alterações de dados/filtros/layout do grid.

### Arquivos

- Criar: `src/components/bi/charts/DonutSideLegendCard.tsx`
- Editar: `src/components/frota/FrotaDashboard.tsx` (dois blocos)
