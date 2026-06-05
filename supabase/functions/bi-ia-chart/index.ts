import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TipoGrafico = "donut" | "pie" | "bar" | "line";
type Metrica =
  | "faturamento" | "faturamento_liquido" | "impostos" | "devolucao"
  | "quantidade" | "clientes" | "vendas" | "ticket_medio" | "preco_medio";
type Dimensao =
  | "anomes_emissao" | "unidade_negocio" | "cd_origem" | "cd_tp_movimento"
  | "cd_estado" | "cd_cliente" | "cd_prj" | "cd_rev_pedido" | "cd_tns"
  | "categoria_custom";

const METRICAS: Metrica[] = [
  "faturamento", "faturamento_liquido", "impostos", "devolucao",
  "quantidade", "clientes", "vendas", "ticket_medio", "preco_medio",
];
const DIMENSOES: Dimensao[] = [
  "anomes_emissao", "unidade_negocio", "cd_origem", "cd_tp_movimento",
  "cd_estado", "cd_cliente", "cd_prj", "cd_rev_pedido", "cd_tns",
  "categoria_custom",
];
const TIPOS: TipoGrafico[] = ["donut", "pie", "bar", "line"];

const SYSTEM_PROMPT = `Você é um assistente de BI Comercial de um ERP.
Sua tarefa: interpretar um pedido em PT-BR e devolver APENAS uma configuração estruturada de gráfico.
NUNCA gere SQL. NUNCA invente nomes fora dos enums abaixo.

Métricas (escolha UMA): ${METRICAS.join(", ")}.
Dimensões (escolha UMA): ${DIMENSOES.join(", ")}.
tipo_grafico: ${TIPOS.join(", ")}.

MAPEAMENTOS DE DIMENSÃO:
- "Peças e Serviços" / "peças vs serviços" / "categoria" / "tipo (peças/serviços)" => dimensao=categoria_custom, categorias=["PEÇAS","SERVIÇOS"].
- "por origem" (sem mencionar peças/serviços) => cd_origem.
- "tipo de movimento" / "entrada vs saída" => cd_tp_movimento.
- "por estado" / "UF" => cd_estado.
- "por cliente" => cd_cliente.
- "por revenda" / "forma comercial" => cd_rev_pedido.
- "por obra" / "projeto" => cd_prj.
- "por TNS" / "transação" => cd_tns.
- "por unidade" / "unidade de negócio" => unidade_negocio.
- "por mês" / "evolução temporal" => anomes_emissao com tipo_grafico=line ou bar.
- "rosca / donut / pizza" => donut ou pie.
- "ticket médio" => ticket_medio. "preço médio" => preco_medio.

REGRAS DE UNIDADE DE NEGÓCIO (CRÍTICO):
- Se o prompt mencionar "Genius" => filtros.unidade_negocio = "GENIUS".
- Se mencionar "Estrutural" ou "Zortea" => filtros.unidade_negocio = "ESTRUTURAL ZORTEA".
- Se mencionar "total", "consolidado" ou "geral", OU não mencionar nenhuma unidade => filtros.unidade_negocio = "CONSOLIDADO" (o backend interpreta como "sem filtro de unidade").
- NUNCA forçar GENIUS por padrão. NUNCA inferir GENIUS sem que a palavra apareça.

OUTRAS REGRAS:
- top_n entre 3 e 30 (default 10).
- mostrar_valor: true se o prompt pedir "valor", "em reais", "R$"; senão default true.
- mostrar_percentual: true se o prompt pedir "percentual", "porcentagem", "%"; senão default false.
- titulo e subtitulo curtos em PT-BR.`;


interface IAChartSpec {
  titulo: string;
  subtitulo: string;
  tipo_grafico: TipoGrafico;
  metrica: Metrica;
  dimensao: Dimensao;
  filtros: Record<string, string>;
  top_n: number;
  mostrar_percentual: boolean;
}

async function callLovableAI(prompt: string, contexto: string): Promise<IAChartSpec> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

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
        { role: "user", content: `Contexto atual (filtros já aplicados):\n${contexto}\n\nPedido:\n${prompt}` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "gerar_grafico",
          description: "Devolve configuração estruturada de gráfico BI (sem SQL).",
          parameters: {
            type: "object",
            properties: {
              titulo: { type: "string" },
              subtitulo: { type: "string" },
              tipo_grafico: { type: "string", enum: TIPOS },
              metrica: { type: "string", enum: METRICAS },
              dimensao: { type: "string", enum: DIMENSOES },
              filtros: {
                type: "object",
                additionalProperties: { type: "string" },
                description: "Filtros inferidos do pedido. Apenas chaves da whitelist de dimensões.",
              },
              top_n: { type: "number" },
              mostrar_percentual: { type: "boolean" },
            },
            required: ["titulo", "subtitulo", "tipo_grafico", "metrica", "dimensao", "filtros", "top_n", "mostrar_percentual"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "gerar_grafico" } },
    }),
  });

  if (response.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em alguns instantes.");
  if (response.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
  if (!response.ok) {
    const t = await response.text();
    console.error("AI Gateway error", response.status, t);
    throw new Error(`Falha no gateway de IA (${response.status})`);
  }
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("Resposta da IA sem tool_call");
  const cfg = JSON.parse(toolCall.function.arguments) as IAChartSpec;

  if (!TIPOS.includes(cfg.tipo_grafico)) cfg.tipo_grafico = "bar";
  if (!METRICAS.includes(cfg.metrica)) cfg.metrica = "faturamento";
  if (!DIMENSOES.includes(cfg.dimensao)) cfg.dimensao = "unidade_negocio";
  cfg.top_n = Math.min(30, Math.max(3, Number(cfg.top_n) || 10));
  cfg.filtros = cfg.filtros && typeof cfg.filtros === "object" ? cfg.filtros : {};
  cfg.mostrar_percentual = Boolean(cfg.mostrar_percentual);
  return cfg;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const prompt = String(body?.prompt ?? "").trim();
    const filtrosBase: Record<string, string> = body?.filtros_base ?? {};
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt vazio" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (prompt.length > 1000) {
      return new Response(JSON.stringify({ error: "Prompt muito longo (max 1000 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctxLines = Object.entries(filtrosBase)
      .filter(([, v]) => v != null && String(v).length > 0)
      .map(([k, v]) => `- ${k}: ${v}`).join("\n") || "(nenhum)";

    const cfg = await callLovableAI(prompt, ctxLines);

    // Mescla filtros base + inferidos, mantendo apenas chaves da whitelist
    const mergedFiltros: Record<string, string> = {};
    for (const [k, v] of Object.entries(filtrosBase)) {
      if (DIMENSOES.includes(k as Dimensao) && v != null && String(v).length > 0) {
        mergedFiltros[k] = String(v);
      }
    }
    for (const [k, v] of Object.entries(cfg.filtros || {})) {
      if (DIMENSOES.includes(k as Dimensao) && v != null && String(v).length > 0) {
        mergedFiltros[k] = String(v);
      }
    }
    cfg.filtros = mergedFiltros;

    return new Response(JSON.stringify(cfg), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("bi-ia-chart error:", msg);
    return new Response(JSON.stringify({ error: msg, code: "INTERNAL_ERROR" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
