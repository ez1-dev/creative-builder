## Melhorar "Por Segmento (Categoria)" e "Por Tipo de Veículo" no dashboard de Frota

Deixar os dois gráficos com o mesmo visual do gráfico **"Por Motivo de Viagem"** (Passagens Aéreas): pizza cheia com rótulos externos ricos (nome + valor + %), leader-lines coloridos, tooltip enriquecido e legenda compacta abaixo.

### O que muda

Só na renderização em `src/components/frota/FrotaDashboard.tsx` (blocos `chart-categoria` e `chart-tipo-veiculo`, linhas ~480 e ~543). Nenhum cálculo, filtro ou dado é alterado.

**Para cada um dos dois `PieChartCard`:**

1. Trocar `donut` para pizza cheia (`donut={false}` — remove o prop).
2. Passar `visualConfig` habilitando rótulos ricos, o que ativa o layer de leader-lines já existente no `PieChartCard`:
   ```ts
   visualConfig={{
     dataLabels: { visible: true, richLabel: true, position: 'outside', fontSize: 11 },
     tooltip:    { visible: true },
     legend:     { visible: true },
   }}
   ```
3. Aumentar `height` para `460` (mesmo tamanho do gráfico de Motivo em modo confortável), para garantir espaço para os rótulos externos.
4. Manter comportamento de clique (`onItemClick`) para cross-filter (categoria/tipo).

### Detalhes técnicos

- O componente `PieChartCard` (`src/components/bi/charts/PieChartCard.tsx`) já implementa **exatamente** o layout do "Por Motivo de Viagem" quando `dataLabels.richLabel` está ligado: seleciona top 6 fatias ≥4%, distribui rótulos em duas colunas, resolve colisões e desenha leader-lines na cor da fatia (linhas 106-176). Basta ativar via `visualConfig`.
- O `mergeVisualConfig` (usado internamente) preenche defaults, então só é preciso passar as chaves que queremos sobrescrever.
- Não altero `PieChartCard` nem os outros consumidores (`MaquinasDashboard`, `ComercialPage`, etc.). Mudança fica isolada em `FrotaDashboard.tsx`.
- Layout do grid (`useFrotaLayout.ts` — `w:12` full-width para os dois) já está adequado; não precisa mexer.

### Arquivos alterados

- `src/components/frota/FrotaDashboard.tsx` — apenas os dois blocos `chart-categoria` e `chart-tipo-veiculo`.
