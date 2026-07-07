import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Origem = "web" | "nativo";

const FOCO: Record<Origem, string> = {
  web:
    "Portal Web (ERP Web Senior). Analise adoção do Portal, telas mais e menos usadas, dispersão de acesso por usuário, cobertura de módulos, oportunidades de treinamento e revisão de permissões. Considere que a telemetria vem da tabela USU_LOG_NAVEGACAO_ERP e ignora HEARTBEAT/FECHOU_TELA.",
  nativo:
    "ERP Senior Nativo. A telemetria depende da regra GER-000CONCX01 (evento OnAccess de processos) publicada no Senior. Analise cobertura de processos, telas legado com alto uso que poderiam migrar para o Portal Web, processos críticos sem monitoramento e integridade da regra nativa. Se o volume for baixo, sugerir revisão da regra.",
};

const SYSTEM_BASE = `Você é um analista sênior de adoção de ERP Senior Sistemas, especialista em telemetria de uso de telas/processos.
Responde SEMPRE em PT-BR, com bullets curtos (máx. 220 caracteres), específicos e numéricos. Nunca invente números — use apenas o que vier no payload.
Gere 3 a 5 bullets por categoria (diagnostico, riscos, recomendacoes).

Fontes de referência que você DEVE citar por nome quando fizer sentido (nunca fabricar URLs):
- "Central de Ajuda Senior" (documentação oficial de produtos e módulos).
- "TDN Senior" (portal técnico de desenvolvimento e integração).
- "Senior X Platform" (documentação da plataforma de tecnologia atual).
- Regra nativa "GER-000CONCX01" (captura de acesso a processos no ERP Senior Nativo).

Categorias:
- diagnostico: leitura factual do uso no período.
- riscos: telas críticas sem uso, concentração em poucos usuários, quedas bruscas no gráfico por dia, ausência de módulos esperados, cobertura de regra nativa.
- recomendacoes: ações práticas — treinamento por módulo, revisão de permissões, desativação de telas obsoletas, revisão/republicação da regra GER-000CONCX01, migração de telas nativas para o Portal, revisão de consultas SQL Senior, citando a fonte oficial (Central de Ajuda Senior / TDN Senior) quando aplicável.`;

async function gerarInsights(origem: Origem, filtros: unknown, payload: unknown) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

  const system = `${SYSTEM_BASE}\n\nOrigem analisada: ${origem === "web" ? "Portal Web" : "ERP Senior Nativo"}.\nFoco: ${FOCO[origem]}`;
  const userContent =
    `Filtros aplicados: ${JSON.stringify(filtros)}\n` +
    `Payload de telemetria (JSON compacto):\n${JSON.stringify(payload).slice(0, 15000)}`;

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
          description: "Devolve diagnóstico, riscos e recomendações em bullets.",
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
    (Array.isArray(arr) ? arr : []).map((s) => String(s ?? "").trim()).filter(Boolean).slice(0, 6);
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
    const origem = String(body?.origem ?? "") as Origem;
    if (origem !== "web" && origem !== "nativo") {
      return new Response(JSON.stringify({ error: "origem inválida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const result = await gerarInsights(origem, body?.filtros ?? {}, body?.payload ?? {});
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("monitor-telas-ia error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
