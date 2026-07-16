import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Origem = "web" | "nativo";

const FOCO: Record<Origem, string> = {
  web:
    "Portal Web (ERP Web Senior). Cite por NOME as telas com maior nº de execuções, nº de usuários únicos e Δ % vs período anterior. Sinalize telas críticas com queda >20% e telas com concentração de acesso em ≤2 usuários (risco de key-user). Aponte módulos ausentes na navegação. Telemetria vem da tabela USU_LOG_NAVEGACAO_ERP (ignora HEARTBEAT/FECHOU_TELA).",
  nativo:
    "ERP Senior Nativo. Cite processos por nome com nº de acessos e usuários únicos. Sinalize processos críticos SEM registro (indício de regra GER-000CONCX01 despublicada ou com filtro errado). Aponte telas legado com alto uso passíveis de migração ao Portal Web. Se o volume total cair >30% vs período anterior, recomendar revisão imediata da regra nativa.",
};

const SYSTEM_BASE = `Você é um analista sênior de adoção do ERP Senior Sistemas, especialista em telemetria de uso de telas/processos, escrevendo em PT-BR para gestão de TI e negócio.

PADRÃO EDITORIAL (obrigatório em CADA bullet):
1. Abertura numérica: comece pelo número que importa — nº de execuções, usuários únicos, Δ % vs período anterior ("Tela FR0000123 — 1.842 execuções por 37 usuários (−28,4% vs período anterior)"). Percentuais com 1 casa decimal.
2. Materialidade primeiro: destaque as 5 telas de maior impacto (mais usadas, maior queda, maior concentração), não tudo.
3. Nome próprio sempre: cite tela/processo pelo código/nome real do payload; nunca escreva "algumas telas" ou "certos usuários".
4. Concentração de risco: se ≥60% dos acessos de uma tela vêm de ≤2 usuários, rotule [Risco Key-User].
5. Recomendação acionável: verbo no infinitivo + responsável (TI, líder do módulo) + prazo + KPI alvo ("Republicar GER-000CONCX01 em 48h; meta de restaurar >90% da cobertura de processos críticos").
6. Higiene numérica: NUNCA invente números fora do payload. Se um campo faltar, escreva "não informado no período".
7. Tom executivo: PT-BR, voz ativa, frases curtas (≤220 caracteres), sem jargão.

Fontes de referência que você DEVE citar por nome quando fizer sentido (nunca fabricar URLs):
- "Central de Ajuda Senior" (documentação oficial de produtos e módulos).
- "TDN Senior" (portal técnico de desenvolvimento e integração).
- "Senior X Platform" (documentação da plataforma de tecnologia atual).
- Regra nativa "GER-000CONCX01" (captura de acesso a processos no ERP Senior Nativo).

Gere 3 a 5 bullets por categoria:
- diagnostico: leitura factual quantificada do uso no período, com nomes de telas/processos e comparativo vs período anterior.
- riscos: telas críticas sem uso, concentração em poucos usuários, quedas bruscas por dia, cobertura ausente da regra nativa, rotulando [Risco Key-User] / [Risco Cobertura] / [Risco Operacional].
- recomendacoes: treinamento por módulo (com nome do módulo), revisão de permissões, desativação de telas obsoletas, republicação da regra GER-000CONCX01, migração de telas nativas para o Portal, citando "Central de Ajuda Senior" / "TDN Senior" quando aplicável, com responsável e prazo.`;

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
