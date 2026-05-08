import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATALOG = `
COMPONENTES DISPONÍVEIS NA BIBLIOTECA BI (use exatamente esses nomes):

LAYOUT (section: "layout"):
- DashboardPage, DashboardHeader, DashboardSection, DashboardGrid, ChartGrid, DashboardTabs
- Timeline — eventos cronológicos verticais (histórico, log de aprovações)

KPIs (section: "kpis"):
- KpiCard — KPI básico com valor + ícone + variação
- KpiGrid — grid responsivo de KPIs
- KpiComparisonCard — comparação atual vs anterior
- KpiVariationCard — variação percentual destacada
- KpiStatusCard — KPI com badge de status
- KpiSparklineCard — KPI com micro-gráfico de tendência embutido
- KpiTargetCard — KPI com barra de progresso até a meta

GRÁFICOS (section: "charts"):
- BarChartCard — barras verticais
- HorizontalBarChartCard — barras horizontais
- LineChartCard — linha temporal
- AreaChartCard — área acumulada
- PieChartCard — pizza
- DonutChartCard — rosca
- StackedBarChartCard — barras empilhadas (recebido x pendente)
- ComboChartCard — barras + linha
- RankingChartCard — ranking horizontal Top N
- GaugeChartCard — velocímetro/atingimento de meta
- ProgressChartCard — múltiplas barras de progresso com metas
- TreemapChartCard — hierarquia por área (participação)
- RadarChartCard — comparação multi-dimensão (avaliação fornecedores)
- ScatterChartCard — dispersão x/y (correlação)
- HeatmapChartCard — matriz de calor (dia da semana × hora)
- WaterfallChartCard — composição entrada/saída (variação saldo)
- FunnelChartCard — funil de conversão
- SparklineCard — micro-gráfico inline
- CalendarHeatmapCard — heatmap de calendário (estilo GitHub)


TABELAS (section: "tables"):
- DataTableBI — tabela com paginação
- DrillDownTable — hierarquia colapsável (Tipo → Centro → Fornecedor)
- RankingTable — top N com posição
- SummaryTable — resumo com totais
- ComparisonTable — comparação atual vs anterior

HIERARQUIA (section: "tree"):
- TreeView — árvore expansível genérica (BOM, taxonomias, organograma)

FILTROS (section: "filters"):
- DashboardFilters, FilterBar, AdvancedFiltersPanel, FilterChips
- DateRangeFilter, SelectFilter, MultiSelectFilter, SearchFilter

DRILL-DOWN (section: "drill"):
- DrillBreadcrumb, DrillLevelSelector

ESTADOS (section: "states"):
- LoadingState, EmptyState, ErrorState, NoDataState

BADGES (section: "badges"):
- StatusBadge

TEMPLATES (section: "templates"):
- ComprasDashboardTemplate — exemplo completo de dashboard de gestão
`;

const SYSTEM_PROMPT = `Você é um especialista em design de dashboards BI corporativos. O usuário descreve o módulo/dashboard que quer construir, e você recomenda os componentes ideais da biblioteca interna.

${CATALOG}

REGRAS:
- Use SEMPRE os nomes EXATOS dos componentes acima.
- Use o "section" exato (layout, kpis, charts, tables, tree, filters, drill, states, badges, templates) — esse valor é usado para navegação na página.
- Recomende entre 5 e 10 componentes, priorizando os mais relevantes para o caso descrito.
- Para cada recomendação, justifique brevemente em português (1 frase).
- Inclua um KPI grid no topo, gráficos no meio, tabela detalhe no final — esse é o padrão.
- Gere um esqueleto JSX simples (apenas a estrutura, sem props completas) que o desenvolvedor pode copiar.
- Responda em português.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { description } = await req.json();
    if (!description || typeof description !== 'string') {
      return new Response(JSON.stringify({ error: 'description é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: description },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_components",
            description: "Sugere componentes BI para o caso de uso",
            parameters: {
              type: "object",
              properties: {
                analysis: { type: "string", description: "Resumo de 1-2 frases do que entendeu do pedido" },
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      component: { type: "string" },
                      reason: { type: "string" },
                      section: { type: "string" },
                    },
                    required: ["component", "reason", "section"],
                    additionalProperties: false,
                  },
                },
                skeletonJsx: { type: "string", description: "Código JSX esqueleto pronto para colar" },
              },
              required: ["analysis", "recommendations", "skeletonJsx"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_components" } },
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de uso da IA atingido. Tente em alguns instantes." }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("Gateway error:", response.status, t);
      throw new Error("Falha no gateway de IA");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : null;

    if (!args) throw new Error("Resposta da IA inválida");

    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error("Erro:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erro desconhecido' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
