import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Modulo =
  | "resumo-folha"
  | "quadro-colaboradores"
  | "contratos-experiencia"
  | "ferias"
  | "turnover";

const TITULOS: Record<Modulo, string> = {
  "resumo-folha": "Resumo de Folha de Pagamento",
  "quadro-colaboradores": "Quadro de Colaboradores",
  "contratos-experiencia": "Contratos de Experiência",
  "ferias": "Programação de Férias",
  "turnover": "Rotatividade / Turnover",
};

const FOCO: Record<Modulo, string> = {
  "resumo-folha":
    "Analise custo total da folha, evolução mensal, concentração por rubrica (proventos/descontos), impacto de encargos e horas extras. Aponte anomalias em rubricas específicas.",
  "quadro-colaboradores":
    "Analise headcount atual, evolução mensal, distribuição por sexo, faixa etária, tempo de casa, setor/filial e cargo. Identifique desbalanços demográficos e concentrações relevantes.",
  "contratos-experiencia":
    "Analise contratos ativos, vencimentos próximos (5/10 dias) e desligamentos pós-experiência. Foque em riscos de perda de prazo e efetividade de contratação.",
  "ferias":
    "Analise saldo de férias vencidas, a vencer (30/60/90 dias), colaboradores de férias no momento e limite por ano/mês. Foque em risco jurídico (dobra) e planejamento.",
  "turnover":
    "Analise taxa de rotatividade, admissões vs demissões, saldo, motivos de desligamento e empresas com maior movimentação. Identifique tendências de alta/queda e causas dominantes.",
};

const SYSTEM_BASE = `Você é um analista sênior de RH que gera insights executivos em PT-BR.
Seja objetivo, específico e numérico. Nunca invente números — use apenas o que está no payload.
Cada bullet deve ter no máximo 220 caracteres. Gere 3 a 5 bullets em cada categoria.
Categorias:
- diagnostico: leitura factual da situação atual (o que os dados dizem hoje).
- riscos: pontos de atenção, anomalias, prazos, concentrações, risco jurídico/financeiro.
- recomendacoes: ações práticas e acionáveis pela liderança de RH.`;

async function gerarInsights(modulo: Modulo, payload: unknown) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

  const system = `${SYSTEM_BASE}\n\nMódulo: ${TITULOS[modulo]}.\nFoco: ${FOCO[modulo]}`;
  const userContent = `Payload (JSON compacto com KPIs + amostras):\n${JSON.stringify(payload).slice(0, 18000)}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      tools: [{
        type: "function",
        function: {
          name: "responder_analise",
          description: "Devolve 3 listas de bullets: diagnóstico, riscos e recomendações.",
          parameters: {
            type: "object",
            properties: {
              diagnostico: { type: "array", items: { type: "string" } },
              riscos: { type: "array", items: { type: "string" } },
              recomendacoes: { type: "array", items: { type: "string" } },
            },
            required: ["diagnostico", "riscos", "recomendacoes"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "responder_analise" } },
    }),
  });

  if (response.status === 429) throw new Error("Limite de uso da IA atingido. Tente novamente em instantes.");
  if (response.status === 402) throw new Error("Créditos de IA esgotados no workspace.");
  if (!response.ok) {
    const t = await response.text();
    console.error("AI Gateway error", response.status, t);
    throw new Error(`Falha no gateway de IA (${response.status})`);
  }
  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("Resposta da IA sem tool_call");
  const parsed = JSON.parse(toolCall.function.arguments) as {
    diagnostico?: string[]; riscos?: string[]; recomendacoes?: string[];
  };
  const norm = (arr?: string[]) =>
    (Array.isArray(arr) ? arr : [])
      .map((s) => String(s ?? "").trim())
      .filter(Boolean)
      .slice(0, 6);
  return {
    diagnostico: norm(parsed.diagnostico),
    riscos: norm(parsed.riscos),
    recomendacoes: norm(parsed.recomendacoes),
    gerado_em: new Date().toISOString(),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const modulo = String(body?.modulo ?? "") as Modulo;
    const payload = body?.payload ?? {};
    if (!TITULOS[modulo]) {
      return new Response(JSON.stringify({ error: "modulo inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const result = await gerarInsights(modulo, payload);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("rh-ai-insights error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
