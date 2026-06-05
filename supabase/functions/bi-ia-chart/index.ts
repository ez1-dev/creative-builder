import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TipoGrafico = "donut" | "pie" | "bar" | "line";
type Metrica =
  | "faturamento" | "faturamento_liquido" | "impostos" | "devolucao"
  | "quantidade" | "clientes" | "vendas";
type Dimensao =
  | "anomes_emissao" | "unidade_negocio" | "fonte_acao" | "cd_estado"
  | "cd_cliente" | "cd_prj" | "cd_fpj" | "cd_tns"
  | "cd_grupo_cliente" | "cd_representante";

const METRICAS: Metrica[] = [
  "faturamento", "faturamento_liquido", "impostos", "devolucao",
  "quantidade", "clientes", "vendas",
];
const DIMENSOES: Dimensao[] = [
  "anomes_emissao", "unidade_negocio", "fonte_acao", "cd_estado",
  "cd_cliente", "cd_prj", "cd_fpj", "cd_tns",
  "cd_grupo_cliente", "cd_representante",
];
const TIPOS: TipoGrafico[] = ["donut", "pie", "bar", "line"];

const METRICA_COL: Record<Exclude<Metrica, "clientes" | "vendas">, string> = {
  faturamento: "vl_bruto",
  faturamento_liquido: "vl_liquido",
  impostos: "impostos",
  devolucao: "vl_devolucao",
  quantidade: "qtd_produtos",
};

const METRICA_LABEL: Record<Metrica, string> = {
  faturamento: "Faturamento",
  faturamento_liquido: "Faturamento Líquido",
  impostos: "Impostos",
  devolucao: "Devolução",
  quantidade: "Quantidade",
  clientes: "Nº de Clientes",
  vendas: "Nº de Vendas",
};

const DIM_LABEL: Record<Dimensao, string> = {
  anomes_emissao: "Ano/Mês",
  unidade_negocio: "Unidade de Negócio",
  fonte_acao: "Origem (Peças/Serviços)",
  cd_estado: "Estado",
  cd_cliente: "Cliente",
  cd_prj: "Projeto/Obra",
  cd_fpj: "Forma Comercial (Revenda)",
  cd_tns: "TNS",
  cd_grupo_cliente: "Grupo de Cliente",
  cd_representante: "Representante",
};

const SYSTEM_PROMPT = `Você é um assistente de BI Comercial de um ERP.
Sua tarefa: interpretar um pedido em PT-BR e devolver uma configuração de gráfico.

DADOS DISPONÍVEIS:
- Fonte única: view de faturamento (notas fiscais).
- Métricas (escolha UMA): ${METRICAS.join(", ")}.
- Dimensões (escolha UMA): ${DIMENSOES.join(", ")}.
- tipo_grafico: ${TIPOS.join(", ")}.

MAPEAMENTOS OBRIGATÓRIOS:
- "Peças vs Serviços", "máquinas vs serviços", "origem", "tipo de item" => dimensao=fonte_acao.
- "por estado" / "UF" => cd_estado.
- "por cliente" => cd_cliente.
- "por revenda" / "forma comercial" => cd_fpj.
- "por obra" / "projeto" => cd_prj.
- "por grupo de cliente" => cd_grupo_cliente.
- "por representante" / "vendedor" => cd_representante.
- "por mês" / "evolução temporal" => anomes_emissao com tipo_grafico=line ou bar.
- "rosca / donut / pizza" => donut ou pie.

FILTROS:
- "Genius" => filtros_extras.unidade_negocio = "GENIUS".
- "Estrutural Zortea" => filtros_extras.unidade_negocio = "ESTRUTURAL ZORTEA".
- top_n entre 3 e 30 (default 10).
- titulo e subtitulo curtos em PT-BR.
- Use APENAS valores dos enums listados. NUNCA invente outro nome.`;

interface IAConfig {
  titulo: string;
  subtitulo: string;
  tipo_grafico: TipoGrafico;
  metrica: Metrica;
  dimensao: Dimensao;
  filtros_extras: Record<string, string>;
  top_n: number;
  mostrar_percentual: boolean;
}

const num = (v: any) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

async function callLovableAI(prompt: string, contexto: string): Promise<IAConfig> {
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
          description: "Gera configuração estruturada de gráfico BI",
          parameters: {
            type: "object",
            properties: {
              titulo: { type: "string" },
              subtitulo: { type: "string" },
              tipo_grafico: { type: "string", enum: TIPOS },
              metrica: { type: "string", enum: METRICAS },
              dimensao: { type: "string", enum: DIMENSOES },
              filtros_extras: {
                type: "object",
                additionalProperties: { type: "string" },
                description: "Filtros extras inferidos do pedido (ex: unidade_negocio).",
              },
              top_n: { type: "number" },
              mostrar_percentual: { type: "boolean" },
            },
            required: ["titulo", "subtitulo", "tipo_grafico", "metrica", "dimensao", "filtros_extras", "top_n", "mostrar_percentual"],
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
  const cfg = JSON.parse(toolCall.function.arguments) as IAConfig;

  if (!TIPOS.includes(cfg.tipo_grafico)) cfg.tipo_grafico = "bar";
  if (!METRICAS.includes(cfg.metrica)) cfg.metrica = "faturamento";
  if (!DIMENSOES.includes(cfg.dimensao)) cfg.dimensao = "unidade_negocio";
  cfg.top_n = Math.min(30, Math.max(3, Number(cfg.top_n) || 10));
  cfg.filtros_extras = cfg.filtros_extras && typeof cfg.filtros_extras === "object" ? cfg.filtros_extras : {};
  cfg.mostrar_percentual = Boolean(cfg.mostrar_percentual);
  return cfg;
}

interface ViewRow {
  anomes_emissao?: string | null;
  unidade_negocio?: string | null;
  fonte_acao?: string | null;
  cd_estado?: string | null;
  cd_cliente?: string | null;
  cd_prj?: string | null;
  cd_fpj?: string | null;
  cd_tns?: string | null;
  cd_grupo_cliente?: string | null;
  cd_representante?: string | null;
  id_nf?: string | null;
  vl_bruto?: number | null;
  vl_liquido?: number | null;
  impostos?: number | null;
  vl_devolucao?: number | null;
  qtd_produtos?: number | null;
}

async function fetchFromView(
  sb: ReturnType<typeof createClient>,
  filtros: Record<string, string>,
  dimensao: Dimensao,
  metrica: Metrica,
): Promise<ViewRow[]> {
  const cols = new Set<string>([dimensao]);
  if (metrica === "clientes") cols.add("cd_cliente");
  else if (metrica === "vendas") cols.add("id_nf");
  else cols.add(METRICA_COL[metrica]);

  const select = Array.from(cols).join(",");
  const PAGE = 1000;
  const HARD_LIMIT = 50000;
  const out: ViewRow[] = [];
  let from = 0;

  while (from < HARD_LIMIT) {
    let q = sb.from("v_bi_faturamento_comercial").select(select).range(from, from + PAGE - 1);
    for (const [k, v] of Object.entries(filtros)) {
      if (!DIMENSOES.includes(k as Dimensao)) continue;
      if (v == null || String(v).length === 0) continue;
      q = q.eq(k, String(v));
    }
    const { data, error } = await q;
    if (error) {
      console.error("Supabase query error", error);
      const err: any = new Error("Falha ao consultar dados de faturamento.");
      err.code = "SUPABASE_QUERY_ERROR";
      err.userFacing = true;
      throw err;
    }
    const rows = (data ?? []) as ViewRow[];
    out.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

function aggregate(
  rows: ViewRow[],
  metrica: Metrica,
  dimensao: Dimensao,
  topN: number,
  filtrosBase: Record<string, string>,
) {
  const buckets = new Map<string, { valor: number; nfSet?: Set<string>; cliSet?: Set<string> }>();
  for (const r of rows) {
    const rawKey = (r as any)[dimensao];
    const key = rawKey == null || rawKey === "" ? "(vazio)" : String(rawKey);
    let b = buckets.get(key);
    if (!b) {
      b = { valor: 0 };
      if (metrica === "vendas") b.nfSet = new Set();
      if (metrica === "clientes") b.cliSet = new Set();
      buckets.set(key, b);
    }
    switch (metrica) {
      case "faturamento": b.valor += num(r.vl_bruto); break;
      case "faturamento_liquido": b.valor += num(r.vl_liquido); break;
      case "impostos": b.valor += num(r.impostos); break;
      case "devolucao": b.valor += num(r.vl_devolucao); break;
      case "quantidade": b.valor += num(r.qtd_produtos); break;
      case "vendas":
        if (r.id_nf != null && r.id_nf !== "") b.nfSet!.add(String(r.id_nf));
        break;
      case "clientes":
        if (r.cd_cliente != null && r.cd_cliente !== "") b.cliSet!.add(String(r.cd_cliente));
        break;
    }
  }

  let series = Array.from(buckets.entries()).map(([label, b]) => ({
    label,
    valor: metrica === "vendas" ? b.nfSet!.size
         : metrica === "clientes" ? b.cliSet!.size
         : b.valor,
  }));

  if (dimensao === "anomes_emissao") {
    series.sort((a, b) => a.label.localeCompare(b.label));
  } else {
    series.sort((a, b) => b.valor - a.valor);
  }

  if (dimensao !== "anomes_emissao" && series.length > topN) {
    const outros = series.slice(topN).reduce((s, x) => s + x.valor, 0);
    series = series.slice(0, topN);
    if (outros > 0) series.push({ label: "Outros", valor: outros });
  }

  const total = series.reduce((s, x) => s + x.valor, 0);
  const out = series.map((s) => ({
    label: s.label,
    valor: s.valor,
    percentual: total > 0 ? (s.valor / total) * 100 : 0,
    filtros_drill: s.label === "Outros"
      ? null
      : { ...filtrosBase, [dimensao]: s.label },
  }));
  return { series: out, total };
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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({
        error: "Backend não configurado: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes.",
        code: "MISSING_CLOUD_CREDS",
        fallback: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    const ctxLines = Object.entries(filtrosBase)
      .filter(([, v]) => v != null && String(v).length > 0)
      .map(([k, v]) => `- ${k}: ${v}`).join("\n") || "(nenhum)";

    const cfg = await callLovableAI(prompt, ctxLines);

    // Mescla filtros: base + extras inferidos pela IA (apenas chaves whitelisted)
    const mergedFiltros: Record<string, string> = {};
    for (const [k, v] of Object.entries(filtrosBase)) {
      if (DIMENSOES.includes(k as Dimensao) && v != null && String(v).length > 0) {
        mergedFiltros[k] = String(v);
      }
    }
    for (const [k, v] of Object.entries(cfg.filtros_extras || {})) {
      if (DIMENSOES.includes(k as Dimensao) && v != null && String(v).length > 0) {
        mergedFiltros[k] = String(v);
      }
    }

    const rows = await fetchFromView(sb, mergedFiltros, cfg.dimensao, cfg.metrica);

    if (rows.length === 0) {
      return new Response(JSON.stringify({
        error: "Nenhum dado encontrado para os filtros informados.",
        code: "EMPTY_RESULT",
        fallback: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { series, total } = aggregate(rows, cfg.metrica, cfg.dimensao, cfg.top_n, mergedFiltros);

    if (total === 0) {
      return new Response(JSON.stringify({
        error: "Os filtros retornaram registros, mas a métrica selecionada ficou zerada.",
        code: "EMPTY_METRIC",
        fallback: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = {
      titulo: cfg.titulo || `${METRICA_LABEL[cfg.metrica]} por ${DIM_LABEL[cfg.dimensao]}`,
      subtitulo: cfg.subtitulo || "",
      tipo_grafico: cfg.tipo_grafico,
      metrica: cfg.metrica,
      dimensao: cfg.dimensao,
      mostrar_percentual: cfg.mostrar_percentual,
      total,
      series,
      filtros: mergedFiltros,
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e);
    const code = e?.code ?? "INTERNAL_ERROR";
    const userFacing = e?.userFacing === true;
    console.error("bi-ia-chart error:", code, msg);
    return new Response(JSON.stringify({ error: msg, code, fallback: userFacing }), {
      status: userFacing ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
