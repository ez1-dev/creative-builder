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
  | "turnover"
  | "absenteismo";

const TITULOS: Record<Modulo, string> = {
  "resumo-folha": "Resumo de Folha de Pagamento",
  "quadro-colaboradores": "Quadro de Colaboradores",
  "contratos-experiencia": "Contratos de Experiência",
  "ferias": "Programação de Férias",
  "turnover": "Rotatividade / Turnover",
  "absenteismo": "Absenteísmo / Afastamentos",
};

const FOCO: Record<Modulo, string> = {
  "resumo-folha":
    "Custo total, líquido, HE, benefícios, INSS e FGTS: cite cada um com Δ R$, Δ % e peso relativo. Aponte as 3 rubricas que mais cresceram/caíram em R$ e as filiais concentradoras do delta. Sinalize se HE > 8% do custo total (alerta operacional) ou benefícios > 15% (alerta de política).",
  "quadro-colaboradores":
    "Headcount atual e saldo do período (admissões − demissões). Identifique as 3 filiais e 3 cargos com maior movimentação líquida em nº e %. Cite desbalanço demográfico (sexo, faixa etária, tempo de casa) somente quando concentração > 60% em uma classe. Aponte cargos com >2 desligamentos no período.",
  "contratos-experiencia":
    "Contratos ativos, vencimentos em 5 dias, 10 dias e >10 dias, taxa de efetivação (%). Liste as empresas com maior nº de vencimentos próximos e o risco financeiro de omissão (contrato virar CLT sem decisão). Recomende decisão nominal (efetivar/desligar) para cada bloco de vencimento crítico.",
  "ferias":
    "Dias vencidos totais + colaboradores em risco de dobra + exposição estimada em R$ (dias vencidos × salário/30 × 2). Separe a vencer em 30/60/90 dias com nº de colaboradores. Cite as filiais concentradoras. Rotule risco como [Trabalhista] com exposição em R$.",
  "turnover":
    "Taxa (%), admissões, demissões, saldo e Δ vs período anterior em pontos percentuais. Motivo dominante com % de participação. Cargos e filiais com maior saída. Aponte coorte de tempo de casa < 12 meses (custo de recontratação) e estimativa de custo do turnover se possível.",
  "absenteismo":
    "Taxa (%), dias afastados totais, duração média e Δ vs período anterior. Top 3 CIDs/motivos com % e nº de casos. Concentração por setor/filial/dia da semana. Rotule risco como [Operacional] ou [Trabalhista] (nexo causal em CID recorrente) com exposição estimada em dias-homem.",
};

const SYSTEM_BASE = `Você é um analista sênior de RH escrevendo insights executivos em PT-BR para a diretoria.

PADRÃO EDITORIAL (obrigatório em CADA bullet):
1. Abertura numérica: comece pelo número que importa — valor absoluto + Δ absoluto + Δ % vs período anterior, formato pt-BR ("R$ 1,61 mi (+R$ 177 mil, +12,4%)"). Percentuais com 1 casa decimal.
2. Materialidade primeiro: só cite os 3–5 movimentos de maior impacto; ignore ruído.
3. Peso relativo: informe participação sobre o total quando calculável.
4. Causa provável: cite o driver (filial, rubrica, cargo, motivo, CID) com o quanto explica do delta.
5. Recomendação acionável: verbo no infinitivo + responsável + prazo + KPI alvo.
6. Risco classificado: rotule como [Financeiro], [Trabalhista], [Operacional] ou [Reputacional] com exposição estimada em R$ quando possível.
7. Higiene numérica: NUNCA invente números fora do payload; se faltar, escreva "não informado no período".
8. Tom executivo: PT-BR, voz ativa, frases curtas (≤220 caracteres), sem jargão, sem adjetivo vazio.

Gere 3 a 5 bullets em cada categoria:
- diagnostico: leitura factual do período atual com comparativo quantificado vs anterior.
- riscos: pontos de atenção rotulados + exposição em R$ quando possível.
- recomendacoes: ações práticas com responsável, prazo e KPI alvo.`;

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
