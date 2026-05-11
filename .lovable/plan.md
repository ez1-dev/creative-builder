## Objetivo

Permitir seleção múltipla nos filtros da barra superior do `/frota`: **Segmento**, **Placa**, **Centro de Custo** e **Motorista** (o campo "Buscar" permanece como está, texto livre).

## Mudanças (apenas em `src/components/frota/FrotaDashboard.tsx`)

1. **Estado** — trocar os 4 estados `useState<string>('all')` por `useState<string[]>([])`:
   - `segmento` → `segmentoSel: string[]`
   - `placa` → `placaSel: string[]`
   - `centroCusto` → `centroCustoSel: string[]`
   - `motorista` → `motoristaSel: string[]`

2. **Filtro `filtered`** — substituir as comparações `=== 'all'` por verificações `array.length === 0 || array.includes(valor)`.

3. **Limpeza (`clearCross`)** — resetar os arrays para `[]` em vez de `'all'`.

4. **UI da `FilterBar`** — trocar os 4 `<SelectFilter>` por `<MultiSelectFilter>` (já existe em `src/components/bi/filters/MultiSelectFilter.tsx`), usando as mesmas options (`optsSeg`, `optsPlaca`, `optsCC`, `optsMot`) sem o item "Todos/Todas" (o placeholder já indica "Todos" quando nada está selecionado).

5. **Cross-filter por clique nos gráficos** — manter intacto. Os arrays `selSegmento`, `selPlaca`, `selCC`, `selMotorista` (filtros vindos de clique) continuam separados dos filtros da barra; ambos se aplicam em cadeia, como hoje.

## Fora de escopo

- Não alterar gráficos, layout, edição de dashboard, drill-down, exportações nem o backend.
- Não mexer no campo "Buscar".
- Não alterar `PassagensDashboard` nem componentes compartilhados.
