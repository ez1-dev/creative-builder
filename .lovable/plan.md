## Reverter raio e offset das labels do Pie "Por Motivo de Viagem"

Em `src/components/passagens/PassagensDashboard.tsx`:

1. Linha 822: `outerRadius={isCompact ? 70 : 78}` → `outerRadius={isCompact ? 70 : 85}`
2. Linha 836: `const radius = e.outerRadius + 14;` → `const radius = e.outerRadius + 22;`

Mantém:
- `overflow: visible` no SVG/wrapper (que é o que efetivamente impede o corte)
- Truncamento em 18 chars como segurança extra
- Layout compacto (% dentro + legenda abaixo) em telas <1024px

Não mexer em mais nada.