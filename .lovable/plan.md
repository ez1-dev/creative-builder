## Plano: Gráfico "Entrega Semanal para Fábrica" com Meta no Relatório Semanal Obra

### Objetivo
Adicionar um novo gráfico de barras na seção **Gráficos & Dashboards** da tela `/producao/relatorio-semanal-obra` que mostre o **peso total entregue por semana** comparado a uma **meta única** definida pelo administrador. A meta será salva no backend (Lovable Cloud) e visível para todos os usuários.

### O que o usuário verá
- Um novo card de gráfico chamado **"Entrega Semanal para Fábrica vs. Meta (kg)"** dentro da grade de gráficos existente.
- Barras (azul) representando o peso entregue por semana, respeitando os filtros aplicados.
- Linha horizontal tracejada (laranja) marcando a **meta semanal** definida.
- Indicador visual nas barras: verdes quando atingem/superam a meta, neutras quando ficam abaixo.
- Acima do gráfico, um campo numérico **"Meta semanal (kg)"** com botão **Salvar** (visível apenas para administradores; demais usuários apenas visualizam o valor atual).
- Tooltip mostrando: peso da semana, meta, % de atingimento e diferença (kg).
- Resumo discreto no topo do card: "X de Y semanas atingiram a meta (Z%)".

### Mudanças técnicas

**1. Backend (Lovable Cloud) — nova configuração**
- Reaproveitar a tabela existente `app_settings` (key/value) para armazenar a meta:
  - `key = 'producao.relatorio_semanal_obra.meta_semanal_kg'`
  - `value = '<número como texto>'`
- Sem migração de schema necessária. RLS já permite leitura por autenticados e escrita por admins.

**2. Novo componente `MetaEntregaSemanalChart.tsx`**
- Localização: `src/pages/producao/MetaEntregaSemanalChart.tsx`
- Recebe `rows: RelatorioRow[]` (mesma fonte consolidada já usada pelos demais gráficos).
- Reutiliza a lógica `groupByWeek` (extraída para função utilitária se necessário) para agregar `peso_total` por semana.
- Usa `recharts` `ComposedChart` com `Bar` + `ReferenceLine` (meta).
- Cores condicionais por barra (`<Cell>`): `hsl(var(--success))` se peso ≥ meta, `hsl(var(--primary))` caso contrário.
- Estados: `meta` (number | null), `loadingMeta`, `savingMeta`, `isAdmin`.
- Carrega a meta com `supabase.from('app_settings').select('value').eq('key', '...').maybeSingle()`.
- Salva com `upsert` na mesma tabela (apenas admins; botão escondido para os demais).
- Detecta admin via `useUserPermissions` (já existente no projeto) ou via consulta à função `is_admin`.

**3. Integração na página**
- Editar `src/pages/producao/RelatorioSemanalObraPage.tsx`:
  - Importar `MetaEntregaSemanalChart`.
  - Renderizar logo acima (ou abaixo) de `<RelatorioSemanalObraCharts>`, passando `consolidatedRows` e `kpiLoading`.
- Não alterar lógica de filtros, KPIs ou consolidação já existente.

**4. Design system**
- Usar exclusivamente tokens semânticos (`hsl(var(--primary))`, `--success`, `--warning`, `--muted-foreground`) — sem cores hardcoded.
- Layout consistente com os demais `ChartCard` (altura 280px, `Card` do shadcn).

### Arquivos
- **Criado:** `src/pages/producao/MetaEntregaSemanalChart.tsx`
- **Editado:** `src/pages/producao/RelatorioSemanalObraPage.tsx`
- **Backend:** apenas inserção via UI na tabela `app_settings` (sem migração).

### Validação após implementação
- Admin consegue digitar uma meta (ex.: 50000) e salvar; valor persiste após reload.
- Usuário não-admin vê a meta e o gráfico, mas não vê o botão Salvar.
- Aplicar filtro de obra/cliente: as barras semanais e o cálculo de "atingimento" reagem ao filtro.
- Linha de meta aparece corretamente no eixo Y, e barras mudam de cor ao cruzar a meta.
- Sem dados → estado vazio amigável; sem meta cadastrada → barras aparecem normalmente em azul, sem linha de referência.

Posso prosseguir com a implementação?
