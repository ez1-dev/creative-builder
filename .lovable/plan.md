# Biblioteca BI — Expansão de Componentes + Dashboard Pré-Pronto + IA Sugestões

## Objetivo
Transformar `/biblioteca-bi` em um catálogo completo padrão indústria, adicionando componentes que faltam (mapas, hierarquia, novos gráficos), um **Dashboard Pré-Pronto** demonstrando composição real, e um **assistente IA contextual** que analisa o módulo escolhido e sugere quais componentes/visualizações usar.

---

## 1. Novos componentes a adicionar à lib `src/components/bi/`

### Gráficos (charts/)
- **TreemapChartCard** — hierarquia por área (recharts `Treemap`). Útil para participação de fornecedores/categorias.
- **SankeyChartCard** — fluxo entre origens/destinos (recharts `Sankey`). Ex: orçamento → centro → projeto.
- **RadarChartCard** — comparação multi-dimensão (recharts `RadarChart`). Ex: avaliação de fornecedores.
- **ScatterChartCard** — dispersão x/y (recharts `ScatterChart`). Ex: prazo x valor.
- **HeatmapChartCard** — matriz de calor (grid div + escala HSL). Ex: vendas por dia da semana × hora.
- **WaterfallChartCard** — composição entrada/saída (recharts `BarChart` com offsets). Ex: variação de saldo.
- **FunnelChartCard** — funil de conversão (recharts `FunnelChart`). Ex: cotação → pedido → recebimento.
- **BulletChartCard** — meta vs atual com ranges qualitativos (composto custom).
- **SparklineCard** — micro-gráfico inline para KPIs (recharts `LineChart` minimal).

### Mapas (charts/maps/)
- **BrazilMapCard** — choropleth dos estados usando `public/geo/brasil-uf.json` (já existe). API: `data: { uf: 'SP', valor: 1200 }[]`, escala automática, tooltip com formatador customizável. Reaproveitar lógica de `MapaDestinosCard.tsx`.
- **BrazilCitiesMapCard** — bolhas em coordenadas (lat/lng) sobre o mapa do Brasil. Reaproveitar `cidadesBrasil.ts` para resolver cidade→coords.
- **WorldMapCard** (opcional, fase 2 — fica no plano mas não implemento agora se ficar pesado).

### Hierarquia / Árvore (tree/)
- **TreeView** — árvore expansível genérica com chevron (lista aninhada). Para taxonomias, BOM, estrutura organizacional.
- **OrgChartCard** — organograma horizontal/vertical simples (CSS grid + linhas). Para hierarquia de áreas/responsáveis.
- **TreemapTable** — tabela hierárquica com indentação + barras de proporção (já temos `DrillDownTable`, este é variante "compacto com bar inline").

### KPIs adicionais (kpis/)
- **KpiSparklineCard** — KPI grande + sparkline embutido + variação.
- **KpiTargetCard** — KPI com barra de progresso até a meta (separado do `ProgressChartCard` que é multi-item).

### Outros
- **Timeline** (layout/) — eventos cronológicos verticais. Ex: histórico de uma OC, log de aprovações.
- **CalendarHeatmap** (charts/) — estilo "GitHub contributions". Ex: atividade diária.

Atualizar `src/components/bi/index.ts` com todos os exports.

---

## 2. Página `/biblioteca-bi` — reorganização

Adicionar novas seções na sidebar do catálogo (`SECTIONS`):
- **Mapas** (Map icon)
- **Hierarquia / Árvore** (Network icon)
- **Linha do Tempo** (Clock icon)
- **Dashboards Prontos** (LayoutDashboard icon) — nova seção destaque

Cada novo componente terá um `<DemoBlock>` com mock controlado, igual ao padrão existente.

---

## 3. Dashboard Pré-Pronto (template demonstrativo)

Nova subseção **"Dashboard Pronto — Gestão de Compras"** dentro da página, mostrando composição real de ~10 componentes trabalhando juntos com mock unificado:

```
┌─────────────────────────────────────────────────┐
│ Header + FilterBar (período, tipo, fornecedor)  │
├──────────────┬──────────────┬───────────────────┤
│ KpiCard x4 (Compras / Recebido / Pendente / %)  │
├──────────────┴──────────────┴───────────────────┤
│ ComboChartCard (mensal)  │  DonutChartCard      │
│                          │  (tipos despesa)     │
├──────────────────────────┼───────────────────────┤
│ BrazilMapCard (UF)       │  RankingChartCard    │
│                          │  (top fornecedores)  │
├──────────────────────────┴───────────────────────┤
│ TreemapChartCard (categoria → subcategoria)     │
├──────────────────────────────────────────────────┤
│ DrillDownTable (Tipo → Centro → Fornecedor)     │
└──────────────────────────────────────────────────┘
```

Servirá como exemplo "copie e adapte" para novos módulos.

Arquivo: `src/components/bi/templates/ComprasDashboardTemplate.tsx` (exportado pela lib).

---

## 4. Assistente IA — "Sugestor de Componentes por Módulo"

### UX
Um card destacado no topo da página `/biblioteca-bi`:

```
┌─ Assistente de Composição ──────────────────────┐
│ Descreva o módulo/dashboard que você quer       │
│ construir e sugiro os componentes ideais:       │
│ [ textarea: "ex: dashboard de RH com headcount, │
│    turnover e absenteísmo por filial" ]         │
│ [ Selecione módulo: combo opcional pré-definido]│
│ [ Botão: Analisar e sugerir ]                   │
│                                                  │
│ → Resultado: lista de componentes recomendados, │
│   cada um com link "Ver exemplo" que rola até   │
│   o DemoBlock correspondente, + um esqueleto    │
│   JSX pronto para copiar.                       │
└──────────────────────────────────────────────────┘
```

### Implementação
- **Edge function**: `supabase/functions/biblioteca-bi-suggest/index.ts`
  - Recebe `{ description: string, modulo?: string }`
  - Chama Lovable AI Gateway (`google/gemini-3-flash-preview`) com system prompt contendo o **catálogo completo de componentes** da lib + descrição de quando usar cada um
  - Usa **tool calling** (structured output) para retornar:
    ```ts
    {
      analysis: string,           // resumo do que entendeu
      recommendations: Array<{
        component: string,        // ex: "BrazilMapCard"
        reason: string,
        section: string,          // ex: "maps" — para fazer scroll
      }>,
      skeletonJsx: string,        // código JSX pronto para colar
    }
    ```
  - Tratar 429/402 e retornar erro amigável
- **Frontend**: novo componente `src/components/bi/ai/ComponentSuggester.tsx`
  - Form + chamada via `supabase.functions.invoke`
  - Renderiza recomendações como cards clicáveis (scroll para `#section`)
  - Bloco de código com botão "Copiar JSX"
- **Sem persistência** — sugestão é stateless por enquanto

---

## 5. Detalhes técnicos

- **Recharts** já está no projeto (usado em todos os charts) — Treemap, Sankey, Radar, Scatter, Funnel são módulos nativos. Sem novas dependências.
- **Mapa**: reaproveitar `public/geo/brasil-uf.json` e padrão de `MapaDestinosCard.tsx` (react-simple-maps já está em uso lá). Verificar antes de implementar — se não estiver, usar SVG path direto do GeoJSON com d3-geo (que é leve).
- **Cores**: usar `BI_PALETTE` de `chartHelpers.ts` em todos os novos charts.
- **Estados**: cada novo card herda `ChartCardShell` para ter loading/error/empty consistente.
- **Tokens semânticos**: sem cores hardcoded — usar `hsl(var(--primary))` etc.
- **Sem mexer** em `src/integrations/supabase/{client,types}.ts` ou `.env`.

---

## 6. Ordem de execução

1. Criar componentes faltantes em `src/components/bi/` (charts, maps, tree, layout)
2. Atualizar `src/components/bi/index.ts` com exports
3. Adicionar novas seções e DemoBlocks em `BiComponentsDemoPage.tsx`
4. Criar `ComprasDashboardTemplate.tsx` e adicionar seção "Dashboard Pronto"
5. Criar edge function `biblioteca-bi-suggest`
6. Criar `ComponentSuggester.tsx` e plugar no topo da página

---

## Fora do escopo (fica para fase 2)
- Mapa-mundi (WorldMapCard)
- Persistência das sugestões da IA
- Geração visual interativa de dashboard (drag-drop) — já existe em outro lugar (`mem://features/dashboard-builder`)
- Integração das sugestões da IA diretamente em outros módulos do ERP
