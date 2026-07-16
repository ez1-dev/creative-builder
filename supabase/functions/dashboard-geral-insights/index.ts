// Dashboard Geral — Insights com IA
// Recebe um snapshot de KPIs consolidados e devolve destaques priorizados.
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible";
import { generateText, Output, NoObjectGeneratedError } from "npm:ai";
import { z } from "npm:zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const InsightSchema = z.object({
  resumo: z.string(),
  itens: z.array(z.object({
    severidade: z.enum(["critico", "atencao", "ok"]),
    titulo: z.string(),
    descricao: z.string(),
    rota: z.string().nullable(),
  })),
});

const BodySchema = z.object({
  periodo: z.string(),
  kpis: z.record(z.string(), z.number()),
  status: z.record(z.string(), z.string()).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "missing_ai_key" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { periodo, kpis, status } = parsed.data;

    const provider = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    const model = provider("google/gemini-2.5-flash");

    const prompt = `Você é um analista executivo sênior de um ERP industrial escrevendo o pulso do negócio em PT-BR para a diretoria (período: ${periodo}).

KPIs (valores em BRL para monetários, fração 0-1 para percentuais):
${JSON.stringify(kpis, null, 2)}

Status dos módulos (ok/erro/carregando):
${JSON.stringify(status ?? {}, null, 2)}

PADRÃO EDITORIAL (obrigatório em CADA item):
1. Abertura numérica: o título e a descrição começam pelo número que importa em pt-BR ("Faturamento R$ 12,4 mi, −R$ 1,9 mi vs meta (−13,3%)"). Percentuais com 1 casa decimal; use "mi"/"mil" para abreviar.
2. Materialidade primeiro: priorize as 3–6 métricas de maior impacto no resultado; ignore o resto.
3. Causa provável: quando o snapshot permitir, cite o driver ("meta comercial 68% atingida puxada por queda em Revenda X").
4. Recomendação embutida na descrição: verbo no infinitivo + responsável sugerido + prazo + KPI alvo ("Acionar gerência comercial até dd/mm; meta de recuperar 5 p.p. no fechamento").
5. Higiene numérica: NUNCA invente valores fora do snapshot; se um KPI não estiver presente, não cite. Ignore módulos com status "erro" ou "carregando".
6. Tom executivo: PT-BR, voz ativa, frases curtas, sem jargão ("sinergia", "alavancar"), sem adjetivo vazio.

Regras de saída:
- Gere entre 3 e 6 itens, ordenados por impacto financeiro decrescente.
- Severidade "critico": risco imediato (faturamento −15% ou mais vs meta/anterior, meta <70%, turnover >10%, absenteísmo >6%, backlog crítico de pendências, exposição trabalhista/fiscal).
- Severidade "atencao": desvios moderados (5–15%).
- Severidade "ok": só para conquista com número concreto (superação de meta, redução relevante de custo).
- Título ≤60 chars, começa por número. Descrição ≤180 chars, inclui causa provável + próxima ação.
- "rota" opcional entre: /bi/comercial, /painel-compras, /rh/resumo-folha, /rh/turnover, /rh/absenteismo. Use null quando não fizer sentido.
- "resumo": 1–2 frases com o pulso geral em números (o que mudou, por que importa).`;

    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: InsightSchema }),
        prompt,
      });
      const itens = output.itens.map((it) => ({ ...it, rota: it.rota ?? undefined }));
      return new Response(JSON.stringify({ resumo: output.resumo, itens }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        return new Response(JSON.stringify({
          resumo: "Não foi possível estruturar a análise; texto bruto abaixo.",
          itens: [{ severidade: "atencao", titulo: "Análise degradada", descricao: err.text?.slice(0, 180) ?? "Sem detalhes.", rota: null }],
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw err;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
