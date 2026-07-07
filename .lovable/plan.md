## Objetivo
Adicionar opção de exibir o **percentual** (participação sobre o total) ao lado do valor em cada item do ranking (ex.: "Top Cidades de Destino"), controlável pela tela "Configurar gráfico".

## Escopo
Somente frontend/apresentação. Sem mudança de dados nem de backend.

## Mudanças

### 1. `src/components/bi/charts/RankingChartCard.tsx`
- Adicionar nova prop opcional `showPercent?: boolean` (default: `false`).
- Calcular `sumTotal` (soma de todos os itens ordenados, não só visíveis) para servir de base do %.
- Em cada `<li>`, quando `showPercent` for `true`, renderizar um badge/texto pequeno ao lado do valor: `12,3%` (usar `toFixed(1)` + vírgula PT-BR), com classe `text-muted-foreground text-[11px] tabular-nums`.
- Não alterar layout quando `showPercent=false` (comportamento atual preservado).

### 2. `src/lib/bi/componentRegistry.tsx` (render do `ranking-chart`)
- Ler `options.showPercent` e repassar para `<RankingChartCard showPercent={...} />`.

### 3. `src/components/passagens/ConfigureChartDialog.tsx`
- Quando `componentId === 'ranking-chart'`, exibir um `Switch` "Mostrar percentual (%) ao lado do valor", ligado a um novo estado `showPercent`.
- Inicializar com `initial?.options?.showPercent ?? false`.
- Incluir em `buildOptions()`: se `def.id === 'ranking-chart'` e `showPercent` for `true`, adicionar `options.showPercent = true`.

## Fora de escopo
- Não alterar `RankingTable` (já mostra % nativamente).
- Não mexer em `BarChartCard` nem em outros tipos de gráfico.
- Não mudar default global — precisa ser ligado explicitamente por bloco.

## Validação
- Abrir "Top Cidades de Destino" → Configurar → ativar "Mostrar percentual" → confirmar que cada linha passa a exibir `R$ 93.350,04 · 15,0%` (ou similar) e que desligar remove.
