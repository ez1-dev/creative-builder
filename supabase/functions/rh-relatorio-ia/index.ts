import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Você é um consultor sênior de RH gerando um relatório executivo gerencial em PT-BR.
Regras:
- Seja objetivo, específico e numérico. Nunca invente números — use apenas o que está no payload.
- Cite variações vs período anterior sempre que disponíveis (delta absoluto e percentual).
- Cada bullet deve ter no máximo 260 caracteres.
- Cada seção deve ter entre 3 e 6 bullets em cada categoria.
- Use tom executivo, direto, orientado a decisão.

O payload contém 6 módulos: resumo_folha, quadro, contratos_experiencia, ferias, turnover, absenteismo.
Cada módulo tem "atual" (KPIs+agregados do período atual) e "anterior" (mesma janela imediatamente anterior).

Para cada seção retorne:
- diagnostico: leitura factual do período atual com comparativo vs anterior.
- riscos: pontos de atenção, anomalias, concentrações, prazos, risco jurídico/financeiro/operacional.
- recomendacoes: ações práticas e acionáveis pela liderança de RH.

Também retorne:
- sumario_executivo: 3 a 5 bullets consolidados destacando o mais crítico.
- alertas: 3 a 8 alertas priorizados. Cada alerta tem: titulo, severidade (CRITICO|ALTO|MEDIO), secao (Folha|Quadro|Experiência|Férias|Turnover|Absenteísmo), impacto (frase curta), acao (recomendação curta).`;

const TOOL_SCHEMA = {
  type: "object",
  properties: {
    sumario_executivo: { type: "array", items: { type: "string" } },
    secoes: {
      type: "object",
      properties: {
        resumo_folha: sec(),
        quadro: sec(),
        contratos_experiencia: sec(),
        ferias: sec(),
        turnover: sec(),
        absenteismo: sec(),
      },
      required: ["resumo_folha", "quadro", "contratos_experiencia", "ferias", "turnover", "absenteismo"],
      additionalProperties: false,
    },
    alertas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          titulo: { type: "string" },
          severidade: { type: "string", enum: ["CRITICO", "ALTO", "MEDIO"] },
          secao: { type: "string" },
          impacto: { type: "string" },
          acao: { type: "string" },
        },
        required: ["titulo", "severidade", "secao", "impacto", "acao"],
        additionalProperties: false,
      },
    },
  },
  required: ["sumario_executivo", "secoes", "alertas"],
  additionalProperties: false,
};

function sec() {
  return {
    type: "object",
    properties: {
      diagnostico: { type: "array", items: { type: "string" } },
      riscos: { type: "array", items: { type: "string" } },
      recomendacoes: { type: "array", items: { type: "string" } },
    },
    required: ["diagnostico", "riscos", "recomendacoes"],
    additionalProperties: false,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    const body = await req.json().catch(() => ({}));
    const payload = body?.payload ?? {};
    const periodo = body?.periodo ?? {};

    const userContent = `Período atual: ${periodo?.atual?.ini ?? "?"} a ${periodo?.atual?.fim ?? "?"}.
Período anterior (mesma janela): ${periodo?.anterior?.ini ?? "?"} a ${periodo?.anterior?.fim ?? "?"}.

Payload consolidado (JSON):
${JSON.stringify(payload).slice(0, 40000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
        tools: [{
          type: "function",
          function: {
            name: "responder_relatorio",
            description: "Devolve relatório executivo consolidado de RH.",
            parameters: TOOL_SCHEMA,
          },
        }],
        tool_choice: { type: "function", function: { name: "responder_relatorio" } },
      }),
    });

    if (response.status === 429) throw new Error("Limite de uso da IA atingido. Tente em instantes.");
    if (response.status === 402) throw new Error("Créditos de IA esgotados no workspace.");
    if (!response.ok) {
      const t = await response.text();
      console.error("AI Gateway error", response.status, t);
      throw new Error(`Falha no gateway de IA (${response.status})`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Resposta da IA sem tool_call");
    const parsed = JSON.parse(toolCall.function.arguments);

    const norm = (arr: any) =>
      (Array.isArray(arr) ? arr : [])
        .map((s: any) => String(s ?? "").trim())
        .filter(Boolean)
        .slice(0, 8);

    const normSec = (s: any) => ({
      diagnostico: norm(s?.diagnostico),
      riscos: norm(s?.riscos),
      recomendacoes: norm(s?.recomendacoes),
    });

    const result = {
      sumario_executivo: norm(parsed.sumario_executivo).slice(0, 6),
      secoes: {
        resumo_folha: normSec(parsed?.secoes?.resumo_folha),
        quadro: normSec(parsed?.secoes?.quadro),
        contratos_experiencia: normSec(parsed?.secoes?.contratos_experiencia),
        ferias: normSec(parsed?.secoes?.ferias),
        turnover: normSec(parsed?.secoes?.turnover),
        absenteismo: normSec(parsed?.secoes?.absenteismo),
      },
      alertas: (Array.isArray(parsed?.alertas) ? parsed.alertas : [])
        .slice(0, 10)
        .map((a: any) => ({
          titulo: String(a?.titulo ?? "").slice(0, 160),
          severidade: ["CRITICO", "ALTO", "MEDIO"].includes(String(a?.severidade))
            ? String(a.severidade)
            : "MEDIO",
          secao: String(a?.secao ?? "").slice(0, 40),
          impacto: String(a?.impacto ?? "").slice(0, 260),
          acao: String(a?.acao ?? "").slice(0, 260),
        })),
      gerado_em: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("rh-relatorio-ia error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
