import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em planejamento de materiais (PCP/Suprimentos) que sugere política de estoque (mínimo, máximo, ponto de pedido, lote de compra) com base na movimentação histórica do ERP.

Fórmulas base (ajuste conforme variabilidade/sazonalidade observada):
- consumo_diario_medio = total_saidas / dias_periodo
- consumo_mensal = consumo_diario_medio * 30
- estoque_seguranca = consumo_diario_medio * lead_time_dias * 0.5  (aumente se houver alta variabilidade nas saídas)
- minimo_sugerido = consumo_diario_medio * lead_time_dias + estoque_seguranca
- ponto_pedido = minimo_sugerido
- lote_compra = aproximar de consumo_mensal, arredondando para múltiplos práticos
- maximo_sugerido = minimo_sugerido + lote_compra

Regras:
- Se o item tiver pouquíssimas saídas (1-2 movimentos), seja conservador: mínimo baixo, justifique baixa demanda.
- Se houver picos atípicos, considere mediana em vez de média.
- Se lead_time não for conhecido, use 15 dias como default.
- Sempre retorne números >= 0, sem decimais excessivos (max 2 casas).
- Justificativa em PT-BR, curta (até 140 caracteres), explicando o critério usado.

Use OBRIGATORIAMENTE a tool sugerir_politicas para retornar a resposta estruturada.`;

const tools = [
  {
    type: "function",
    function: {
      name: "sugerir_politicas",
      description: "Retorna sugestões de política de estoque por item",
      parameters: {
        type: "object",
        properties: {
          itens: {
            type: "array",
            items: {
              type: "object",
              properties: {
                codemp: { type: "number" },
                codpro: { type: "string" },
                codder: { type: "string" },
                coddep: { type: "string" },
                consumo_diario_medio: { type: "number" },
                consumo_mensal: { type: "number" },
                lead_time_dias: { type: "number" },
                estoque_seguranca: { type: "number" },
                minimo_sugerido: { type: "number" },
                maximo_sugerido: { type: "number" },
                ponto_pedido: { type: "number" },
                lote_compra: { type: "number" },
                justificativa: { type: "string" },
              },
              required: [
                "codpro", "consumo_diario_medio", "consumo_mensal",
                "lead_time_dias", "minimo_sugerido", "maximo_sugerido",
                "ponto_pedido", "lote_compra", "justificativa",
              ],
            },
          },
        },
        required: ["itens"],
        additionalProperties: false,
      },
    },
  },
];

type Mov = {
  codemp?: number;
  codpro?: string;
  despro?: string;
  codder?: string;
  coddep?: string;
  data_movimento?: string;
  tipo_movimento?: string;
  quantidade?: number | string;
  saldo_atual?: number | string;
  fornecedor?: string;
  origem?: string;
  lead_time_dias?: number | string;
};

function groupMovimentacoes(movs: Mov[]) {
  const groups = new Map<string, any>();
  for (const m of movs) {
    const key = `${m.codemp ?? ''}|${m.codpro ?? ''}|${m.codder ?? ''}|${m.coddep ?? ''}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        codemp: m.codemp,
        codpro: m.codpro,
        despro: m.despro,
        codder: m.codder,
        coddep: m.coddep,
        total_entradas: 0,
        total_saidas: 0,
        n_movimentos: 0,
        primeira_data: m.data_movimento,
        ultima_data: m.data_movimento,
        saldo_atual: Number(m.saldo_atual ?? 0),
        fornecedores: new Map<string, number>(),
        lead_times: [] as number[],
      };
      groups.set(key, g);
    }
    const qtd = Number(m.quantidade ?? 0);
    const tipo = (m.tipo_movimento ?? '').toUpperCase();
    if (tipo.includes('ENTRADA') || tipo.includes('E')) g.total_entradas += qtd;
    if (tipo.includes('SAIDA') || tipo.includes('SAÍDA') || tipo.includes('S')) g.total_saidas += Math.abs(qtd);
    g.n_movimentos++;
    if (m.data_movimento) {
      if (!g.primeira_data || m.data_movimento < g.primeira_data) g.primeira_data = m.data_movimento;
      if (!g.ultima_data || m.data_movimento > g.ultima_data) g.ultima_data = m.data_movimento;
    }
    g.saldo_atual = Number(m.saldo_atual ?? g.saldo_atual);
    const forn = m.fornecedor || m.origem;
    if (forn) g.fornecedores.set(forn, (g.fornecedores.get(forn) ?? 0) + 1);
    if (m.lead_time_dias) g.lead_times.push(Number(m.lead_time_dias));
  }
  return Array.from(groups.values()).map((g) => {
    const fornArr = (Array.from(g.fornecedores.entries()) as [string, number][]).sort((a, b) => b[1] - a[1]);
    return {
      codemp: g.codemp,
      codpro: g.codpro,
      despro: g.despro,
      codder: g.codder,
      coddep: g.coddep,
      saldo_atual: g.saldo_atual,
      total_entradas: g.total_entradas,
      total_saidas: g.total_saidas,
      n_movimentos: g.n_movimentos,
      primeira_data: g.primeira_data,
      ultima_data: g.ultima_data,
      fornecedor_principal: fornArr[0]?.[0] ?? null,
      lead_time_medio: g.lead_times.length
        ? g.lead_times.reduce((a: number, b: number) => a + b, 0) / g.lead_times.length
        : null,
    };
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { movimentacoes, filtros } = await req.json();
    if (!Array.isArray(movimentacoes) || movimentacoes.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma movimentação para analisar. Consulte movimentação primeiro." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const grupos = groupMovimentacoes(movimentacoes as Mov[]);

    // Calcular período em dias a partir dos filtros (default 180)
    let dias_periodo = 180;
    if (filtros?.data_ini && filtros?.data_fim) {
      const ini = new Date(filtros.data_ini).getTime();
      const fim = new Date(filtros.data_fim).getTime();
      const d = Math.round((fim - ini) / (1000 * 60 * 60 * 24));
      if (d > 0) dias_periodo = d;
    }

    const userPrompt = `Analise os ${grupos.length} item(ns) abaixo (período: ${dias_periodo} dias) e sugira política de estoque para cada um.

Itens (resumo agregado):
${JSON.stringify(grupos, null, 2)}

Use a tool sugerir_politicas. Considere o período de ${dias_periodo} dias para calcular consumo diário (total_saidas / ${dias_periodo}).`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "sugerir_politicas" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições da IA excedido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("IA não retornou tool call:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "IA não retornou sugestões estruturadas. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed: { itens: any[] };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Falha ao parsear tool args:", e);
      return new Response(
        JSON.stringify({ error: "Resposta da IA inválida." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mesclar com saldo_atual / despro do agrupamento (IA não tem)
    const byKey = new Map<string, any>();
    for (const g of grupos) {
      byKey.set(`${g.codemp ?? ''}|${g.codpro ?? ''}|${g.codder ?? ''}|${g.coddep ?? ''}`, g);
    }

    const dados = (parsed.itens || []).map((it: any) => {
      const k = `${it.codemp ?? ''}|${it.codpro ?? ''}|${it.codder ?? ''}|${it.coddep ?? ''}`;
      const g = byKey.get(k) || {};
      return {
        codemp: it.codemp ?? g.codemp,
        codpro: it.codpro,
        despro: g.despro,
        codder: it.codder ?? g.codder,
        coddep: it.coddep ?? g.coddep,
        data_movimento: g.ultima_data,
        saldo_atual: g.saldo_atual ?? 0,
        consumo_medio: it.consumo_diario_medio,
        consumo_mensal: it.consumo_mensal,
        lead_time_dias: it.lead_time_dias,
        estoque_seguranca: it.estoque_seguranca,
        minimo_sugerido: it.minimo_sugerido,
        maximo_sugerido: it.maximo_sugerido,
        ponto_pedido: it.ponto_pedido,
        lote_compra: it.lote_compra,
        justificativa: it.justificativa,
        fornecedor: g.fornecedor_principal,
        status: null,
      };
    });

    // Resumo agregado
    let saldoTotal = 0, minTotal = 0, maxTotal = 0, ltSum = 0, ltCount = 0, consumoTotal = 0;
    for (const r of dados) {
      saldoTotal += Number(r.saldo_atual || 0);
      minTotal += Number(r.minimo_sugerido || 0);
      maxTotal += Number(r.maximo_sugerido || 0);
      consumoTotal += Number(r.consumo_medio || 0);
      if (r.lead_time_dias) { ltSum += Number(r.lead_time_dias); ltCount++; }
    }
    const consumo_90d = consumoTotal * 90;
    const consumo_180d = consumoTotal * 180;

    return new Response(
      JSON.stringify({
        dados,
        resumo: {
          saldo_atual_total: saldoTotal,
          consumo_90d,
          consumo_180d,
          lead_time_medio_dias: ltCount ? ltSum / ltCount : 0,
          minimo_sugerido_total: minTotal,
          maximo_sugerido_total: maxTotal,
        },
        total_registros: dados.length,
        total_paginas: 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("sugestao-minmax-ia error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
