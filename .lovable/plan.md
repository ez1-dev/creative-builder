## Plano: Semanas completas + novo gráfico mensal de entregas

### Objetivo
1. **Gráfico semanal existente** — passar a exibir uma barra para **cada semana do período filtrado**, inclusive semanas sem entrega (barra zerada), em vez de mostrar só as semanas que tiveram dados.
2. **Novo gráfico mensal** — adicionar um segundo card com a **somatória do peso entregue por mês**, comparado a uma **meta mensal derivada automaticamente** da meta semanal (meta_semanal × 4,33).

### O que o usuário verá
- **Card "Entrega Semanal para Fábrica vs. Meta (kg)"** (já existente):
  - Eixo X agora mostra todas as semanas entre a primeira e a última data dos dados filtrados.
  - Semanas sem entrega aparecem como barra de altura zero (deixa claro o gap).
  - Demais comportamentos preservados (cor verde quando ≥ meta, linha tracejada de meta, tooltip).
- **Novo card "Entrega Mensal para Fábrica vs. Meta (kg)"** (logo abaixo do semanal):
  - Uma barra por mês do período filtrado (ex.: jan/26, fev/26, mar/26…), preenchendo meses vazios com zero.
  - Linha tracejada de **Meta Mensal = meta_semanal × 4,33**, apresentada no rótulo como "Meta: X kg (≈ semanal × 4,33)".
  - Cores condicionais: verde quando o mês atinge/supera a meta, azul caso contrário.
  - Resumo no topo: "X de Y meses atingiram a meta (Z%)".
  - Tooltip mostra peso do mês, % da meta e diferença em kg.
  - Sem cadastro extra: a meta mensal acompanha automaticamente a meta semanal já salva.

### Mudanças técnicas
- **Arquivo editado:** `src/pages/producao/MetaEntregaSemanalChart.tsx`
  - Atualizar `groupWeeklyPeso` para preencher semanas vazias entre `min(ts)` e `max(ts)` (passos de 7 dias).
  - Adicionar função `groupMonthlyPeso` análoga, agrupando por `YYYY-MM` e preenchendo meses vazios.
  - Renderizar **dois `Card`s** dentro de um wrapper `<div className="space-y-4">`: o semanal (atual) e o novo mensal.
  - Reaproveitar o mesmo estado de `meta` (semanal); calcular `metaMensal = meta * 4.33` no render.
  - Reaproveitar o mesmo `ComposedChart` + `ReferenceLine` + `Cell` do semanal para o mensal.
  - Manter campo de edição de meta apenas no card semanal (admins); o mensal apenas exibe a meta derivada como `Badge`.
- **Sem mudanças no backend** (mesma chave `app_settings`).
- **Sem mudanças em** `RelatorioSemanalObraPage.tsx` (já importa o componente único).

### Validação
- Filtrar período de 2 meses → semanal mostra ~8–9 barras, mensal mostra 2 barras.
- Filtrar período sem dados em algumas semanas → semanas zeradas aparecem.
- Editar meta semanal de 20.000 → meta mensal exibida vira ~86.600 kg automaticamente.
- Sem meta cadastrada → ambos os gráficos aparecem sem linha de referência, barras em azul.
