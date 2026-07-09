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

    const prompt = `Você é um analista executivo de um ERP industrial. Analise o snapshot de KPIs consolidados abaixo (período: ${periodo}) e produza destaques priorizados.

KPIs (valores em BRL para monetários, fração 0-1 para percentuais):
${JSON.stringify(kpis, null, 2)}

Status dos módulos (ok/erro/carregando):
${JSON.stringify(status ?? {}, null, 2)}

Regras:
- Gere entre 3 e 6 itens.
- Severidade "critico" quando há risco imediato (queda >15% faturamento, meta <70%, turnover >10%, absenteísmo >6%, pendentes altos).
- Severidade "atencao" para desvios moderados; "ok" apenas para conquistas relevantes.
- Cada item tem título curto (≤60 chars), descrição objetiva (≤180 chars) e opcionalmente "rota" (uma das: /bi/comercial, /painel-compras, /rh/resumo-folha, /rh/turnover, /rh/absenteismo). Se não fizer sentido, use null.
- Ignore módulos com status "erro" ou "carregando".
- "resumo" = 1-2 frases descrevendo o pulso geral do negócio.
- Não invente valores; use apenas o que está no snapshot.`;

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
