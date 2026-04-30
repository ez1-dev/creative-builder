## Cross-filters multi-seleção nos gráficos e mapa

Hoje, clicar em uma barra/fatia/UF substitui a seleção anterior (single-select). Vou tornar **todos os 5 cross-filters** multi-seleção, com lógica **OR dentro do mesmo filtro** e **AND entre filtros diferentes** (padrão BI).

### Comportamento esperado

- Clicar em CURITIBA no Top Destinos → filtra Curitiba.
- Clicar em SANTARÉM em seguida → adiciona Santarém (filtro vira `destino ∈ {Curitiba, Santarém}`).
- Clicar de novo em CURITIBA → remove apenas Curitiba do conjunto, mantém Santarém.
- Vale também para: Evolução Mensal (mês), Por Motivo, Top CC, mapa por UF.
- O destaque visual atual (opacidade dim em barras/fatias não-selecionadas) continua, considerando o **conjunto** de selecionados.
- Os badges de "filtros ativos" no topo passam a listar cada item selecionado individualmente, com X para remover só aquele.
- Botão "Limpar tudo" zera todos os conjuntos.

### Alterações

Arquivo único: `src/components/passagens/PassagensDashboard.tsx`

1. **Trocar tipos de estado** de `string | null` para `string[]`:
   - `selectedMes`, `selectedMotivo`, `selectedCC`, `selectedDestino`, `selectedUF` → arrays.
2. **Helper `toggleItem(arr, item)`** que adiciona se ausente, remove se presente. Usar em todos os onClick dos gráficos e do mapa.
3. **Atualizar `applyCross`**: substituir `if (selectedX) ... !== selectedX` por `if (selectedX.length && !selectedX.includes(value))`.
4. **Atualizar `hasCrossFilter`**: `arr.length > 0` para cada um.
5. **Atualizar a lógica de `fillOpacity`** nos `<Cell>` dos charts: dim quando há seleção e o item atual **não** está no array.
6. **Badges de filtros ativos** (linhas ~611-): renderizar um badge por item selecionado, com X que chama `toggleItem` (remove só aquele).
7. **`limparTudo`**: setar todos os arrays para `[]`.
8. **`MapaDestinosCard`**: passa a receber `selectedUFs: string[]` (renomeio interno da prop) e `onSelectUF` continua chamando `toggleItem`. Verificar a assinatura atual e ajustar destaque condicional do mapa para usar `includes`.
9. **Texto auxiliar** "(clique novamente para limpar)" nos títulos: trocar para "(clique para adicionar/remover)".

### Fora do escopo

- Não mexer nos filtros do topo (Colaborador, CC, Motivo, Tipo, Mês, datas).
- Não alterar agrupamento, paginação, KPIs ou exportações.
- Não mexer em compartilhamento público.
