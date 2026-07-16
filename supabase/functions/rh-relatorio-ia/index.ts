import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Você é um consultor sênior de RH escrevendo um relatório executivo gerencial em PT-BR para a diretoria.

PADRÃO EDITORIAL (obrigatório em CADA bullet, sem exceção):
1. Abertura numérica: comece pelo número que importa — valor absoluto + Δ absoluto + Δ % vs período anterior, no formato pt-BR. Ex.: "Custo total R$ 7,99 mi (+R$ 1,53 mi, +23,6% vs período anterior)". Percentuais sempre com 1 casa decimal; use "mi" acima de 6 dígitos e "mil" acima de 3.
2. Materialidade primeiro: destaque apenas os 3–5 movimentos de maior impacto financeiro/trabalhista. Ignore ruído.
3. Peso relativo: informe a participação sobre o total quando calculável ("HE representa 20,2% do custo total").
4. Causa provável: quando o payload permitir cruzamento, cite o driver com o quanto ele explica do delta — filial, rubrica, cargo, evento, empresa. Ex.: "puxado por Filial X (68% do delta)" ou "concentrado em 3 eventos: HE 100%, HE 60%, adicional noturno".
5. Recomendação acionável: verbo no infinitivo + área responsável + prazo + KPI alvo mensurável. Ex.: "Revisar escala de HE na Filial X até o próximo fechamento; meta de reduzir 15% do custo de HE".
6. Risco classificado: rotule cada risco como [Financeiro], [Trabalhista], [Operacional] ou [Reputacional] e estime a exposição em R$ sempre que o payload permitir (ex.: dias de férias vencidos × salário/30 × 2 para risco de dobra).
7. Higiene numérica: NUNCA invente números fora do payload. Se um campo faltar, escreva "não informado no período".
8. Tom executivo: PT-BR, voz ativa, frases curtas (≤260 caracteres), sem jargão ("sinergia", "alavancar", "robusto"), sem adjetivo vazio.

O payload contém 6 módulos: resumo_folha, quadro, contratos_experiencia, ferias, turnover, absenteismo.
Cada módulo tem "atual" (KPIs+agregados do período atual) e "anterior" (mesma janela imediatamente anterior).

REGRAS ESPECÍFICAS POR SEÇÃO:
- resumo_folha: cite obrigatoriamente Custo Total, Total Líquido, Horas Extras, Benefícios, INSS e FGTS com Δ absoluto, Δ % e peso relativo sobre o custo total. Aponte a rubrica que mais cresceu em R$ e a que mais caiu.
- quadro: cite headcount atual, saldo (admissões − demissões), turnover no período e as 2 filiais/cargos de maior movimento. Sinalize desbalanço demográfico crítico.
- contratos_experiencia: liste vencimentos em 5 e 10 dias, taxa de efetivação e principais empresas concentradoras; sinalize risco de perda de prazo (contrato virar CLT por omissão).
- ferias: quantifique dias vencidos, colaboradores em risco de dobra e exposição estimada em R$; separe a vencer em 30/60/90 dias.
- turnover: informe taxa, admissões, demissões, saldo e o motivo dominante com % de participação. Compare com período anterior.
- absenteismo: informe taxa, dias afastados, principais CIDs/motivos e concentração por setor/dia da semana.

Para cada seção retorne:
- diagnostico: 3–6 bullets factuais do período atual com comparativo vs anterior, seguindo o PADRÃO EDITORIAL.
- riscos: 3–6 bullets com rótulo de risco e exposição em R$ quando possível.
- recomendacoes: 3–6 bullets acionáveis com responsável, prazo e KPI alvo.

Retorne também:
- sumario_executivo: 3–5 bullets consolidando o que a diretoria precisa saber primeiro (o que mudou em R$, por que mudou, o que fazer).
- alertas: 3–8 alertas priorizados por severidade e impacto financeiro. Cada alerta traz: titulo (≤120 chars, começa com número), severidade (CRITICO|ALTO|MEDIO), secao (Folha|Quadro|Experiência|Férias|Turnover|Absenteísmo), impacto (frase curta com R$ estimado ou "impacto não quantificável no período"), acao (recomendação curta com prazo).`;

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
