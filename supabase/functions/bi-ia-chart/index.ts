import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TipoGrafico = "donut" | "pie" | "bar" | "line";
type Metrica =
  | "faturamento" | "impostos" | "devolucao" | "custo"
  | "quantidade" | "numero_clientes" | "numero_vendas";
type Dimensao =
  | "unidade_negocio" | "cd_origem" | "cd_estado" | "cd_cliente"
  | "cd_tns" | "cd_rev_pedido" | "anomes_emissao";

const METRICAS: Metrica[] = [
  "faturamento", "impostos", "devolucao", "custo",
  "quantidade", "numero_clientes", "numero_vendas",
];
const DIMENSOES: Dimensao[] = [
  "unidade_negocio", "cd_origem", "cd_estado", "cd_cliente",
  "cd_tns", "cd_rev_pedido", "anomes_emissao",
];
const TIPOS: TipoGrafico[] = ["donut", "pie", "bar", "line"];

const METRICA_LABEL: Record<Metrica, string> = {
  faturamento: "Faturamento",
  impostos: "Impostos",
  devolucao: "Devolução",
  custo: "Custo",
  quantidade: "Quantidade",
  numero_clientes: "Nº de Clientes",
  numero_vendas: "Nº de Vendas",
};

const SYSTEM_PROMPT = `Você é um assistente de BI para o módulo Comercial de um ERP.
Sua tarefa: interpretar um pedido em linguagem natural (PT-BR) e devolver uma configuração de gráfico.

REGRAS:
- Sempre escolha UMA métrica e UMA dimensão.
- tipo_grafico ∈ ${TIPOS.join(", ")}.
- metrica ∈ ${METRICAS.join(", ")}.
- dimensao ∈ ${DIMENSOES.join(", ")}.
- Quando o usuário pedir "peças vs serviços" ou "máquinas vs serviços" use dimensao=cd_origem.
- Quando o usuário pedir "por estado/UF" use cd_estado.
- Quando o usuário pedir "por cliente" use cd_cliente.
- Quando o usuário pedir "por revenda" use cd_rev_pedido.
- Quando o usuário pedir "por mês/evolução temporal" use anomes_emissao e tipo_grafico=line ou bar.
- Para "rosca/donut/pizza" use donut/pie.
- Se o pedido citar "Genius" => filtros_extras.unidade_negocio = "GENIUS".
- Se o pedido citar "Estrutural Zortea" => filtros_extras.unidade_negocio = "ESTRUTURAL ZORTEA".
- top_n entre 3 e 30 (default 10).
- titulo e subtitulo curtos, em PT-BR.
- Use APENAS valores dos enums listados. Nunca invente outro nome.`;

interface IAConfig {
  titulo: string;
  subtitulo: string;
  tipo_grafico: TipoGrafico;
  metrica: Metrica;
  dimensao: Dimensao;
  filtros_extras: Record<string, string>;
  top_n: number;
}

interface DetalheRow {
  anomes_emissao?: string | null;
  unidade_negocio?: string | null;
  cd_tp_movimento?: string | null;
  cd_origem?: string | null;
  cd_empresa?: string | null;
  cd_filial?: string | null;
  cd_nf?: string | null;
  cd_serie?: string | null;
  cd_estado?: string | null;
  cd_cliente?: string | null;
  cd_prj?: string | null;
  cd_rev_pedido?: string | null;
  cd_tns?: string | null;
  vl_bruto?: number | null;
  vl_impostos?: number | null;
  vl_liquido?: number | null;
  vl_devolucao?: number | null;
  qtd_produtos?: number | null;
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
                description: "Filtros extras inferidos do pedido (ex: unidade_negocio, cd_estado).",
              },
              top_n: { type: "number" },
            },
            required: ["titulo", "subtitulo", "tipo_grafico", "metrica", "dimensao", "filtros_extras", "top_n"],
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

  // Validações duras
  if (!TIPOS.includes(cfg.tipo_grafico)) cfg.tipo_grafico = "bar";
  if (!METRICAS.includes(cfg.metrica)) cfg.metrica = "faturamento";
  if (!DIMENSOES.includes(cfg.dimensao)) cfg.dimensao = "unidade_negocio";
  cfg.top_n = Math.min(30, Math.max(3, Number(cfg.top_n) || 10));
  cfg.filtros_extras = cfg.filtros_extras && typeof cfg.filtros_extras === "object" ? cfg.filtros_extras : {};
  return cfg;
}

function validateFastapiBase(): { ok: true; base: string } | { ok: false; code: string; message: string } {
  const raw = Deno.env.get("FASTAPI_BASE_URL");
  if (!raw) return { ok: false, code: "MISSING_BASE_URL", message: "Backend não configurado: defina FASTAPI_BASE_URL nos secrets do Cloud." };
  const trimmed = raw.trim();
  const cron = Deno.env.get("CRON_SECRET");
  if (cron && trimmed === cron.trim()) {
    return { ok: false, code: "INVALID_BASE_URL", message: "FASTAPI_BASE_URL está com o mesmo valor de CRON_SECRET. Corrija o secret para a URL pública da FastAPI (ex.: https://xxxx.ngrok-free.app)." };
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: false, code: "INVALID_BASE_URL", message: `FASTAPI_BASE_URL inválido: "${trimmed}". Deve começar com http:// ou https:// (ex.: https://xxxx.ngrok-free.app).` };
  }
  let parsed: URL;
  try { parsed = new URL(trimmed); } catch {
    return { ok: false, code: "INVALID_BASE_URL", message: `FASTAPI_BASE_URL inválido: "${trimmed}".` };
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
    return { ok: false, code: "LOCALHOST_NOT_ALLOWED", message: `FASTAPI_BASE_URL aponta para "${host}" — a Edge Function roda na nuvem. Use uma URL pública (ngrok, domínio próprio etc.).` };
  }
  return { ok: true, base: trimmed.replace(/\/$/, "") };
}

async function fetchDetalhes(filtros: Record<string, string>): Promise<DetalheRow[]> {
  const v = validateFastapiBase();
  if (!v.ok) {
    const err: any = new Error(v.message);
    err.code = v.code;
    err.userFacing = true;
    throw err;
  }
  const cronSecret = (Deno.env.get("CRON_SECRET") ?? "").trim();
  if (!cronSecret) {
    const err: any = new Error("CRON_SECRET ausente nos secrets do Cloud — configure para autenticar contra a FastAPI.");
    err.code = "MISSING_CRON_SECRET";
    err.userFacing = true;
    throw err;
  }

  const url = new URL(`${v.base}/api/bi/comercial/detalhes`);
  Object.entries(filtros).forEach(([k, val]) => {
    if (val != null && String(val).length > 0) url.searchParams.set(k, String(val));
  });
  url.searchParams.set("escopo", "todas");
  url.searchParams.set("limit", "20000");

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 45000);
  let resp: Response;
  try {
    resp = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "ngrok-skip-browser-warning": "true",
        "x-cron-secret": cronSecret,
        "Authorization": `Bearer ${cronSecret}`,
      },
      signal: controller.signal,
    });
  } catch (e: any) {
    clearTimeout(tid);
    const isAbort = e?.name === "AbortError";
    const err: any = new Error(isAbort
      ? "Não foi possível conectar à FastAPI (tempo esgotado). Verifique se o backend está online."
      : "Não foi possível conectar à FastAPI. Verifique se o backend está online.");
    err.code = isAbort ? "FASTAPI_TIMEOUT" : "FASTAPI_UNREACHABLE";
    err.userFacing = true;
    console.error("FastAPI fetch failed:", e?.name, e?.message);
    throw err;
  }
  try {
    if (!resp.ok) {
      const t = await resp.text();
      console.error("FastAPI error", resp.status, t);
      const err: any = new Error(`Não foi possível conectar à FastAPI (HTTP ${resp.status}).`);
      err.code = "FASTAPI_HTTP_ERROR";
      err.userFacing = true;
      throw err;
    }
    const data = await resp.json();
    if (Array.isArray(data)) {
      if (data.length === 1 && data[0] && typeof data[0] === "object" && "bi_comercial_detalhes" in data[0]) {
        return (data[0] as any).bi_comercial_detalhes ?? [];
      }
      return data;
    }
    if (data && typeof data === "object" && "bi_comercial_detalhes" in data) {
      return (data as any).bi_comercial_detalhes ?? [];
    }
    return [];
  } finally {
    clearTimeout(tid);
  }
}

function aggregate(rows: DetalheRow[], metrica: Metrica, dimensao: Dimensao, topN: number) {
  const buckets = new Map<string, { valor: number; nfSet?: Set<string>; cliSet?: Set<string> }>();
  for (const r of rows) {
    const rawKey = (r as any)[dimensao];
    const key = rawKey == null || rawKey === "" ? "(vazio)" : String(rawKey);
    let b = buckets.get(key);
    if (!b) {
      b = { valor: 0 };
      if (metrica === "numero_vendas") b.nfSet = new Set();
      if (metrica === "numero_clientes") b.cliSet = new Set();
      buckets.set(key, b);
    }
    switch (metrica) {
      case "faturamento": b.valor += num(r.vl_bruto); break;
      case "impostos":    b.valor += num(r.vl_impostos); break;
      case "devolucao":   b.valor += num(r.vl_devolucao); break;
      case "custo":       b.valor += num((r as any).vl_custo ?? (r as any).vl_cmv ?? 0); break;
      case "quantidade":  b.valor += num(r.qtd_produtos); break;
      case "numero_vendas": {
        const id = `${r.cd_empresa ?? ""}|${r.cd_filial ?? ""}|${r.cd_serie ?? ""}|${r.cd_nf ?? ""}`;
        if (id !== "|||") b.nfSet!.add(id);
        break;
      }
      case "numero_clientes": {
        if (r.cd_cliente != null && r.cd_cliente !== "") b.cliSet!.add(String(r.cd_cliente));
        break;
      }
    }
  }

  let series = Array.from(buckets.entries()).map(([label, b]) => ({
    label,
    valor: metrica === "numero_vendas" ? b.nfSet!.size
         : metrica === "numero_clientes" ? b.cliSet!.size
         : b.valor,
  }));

  series.sort((a, b) => b.valor - a.valor);

  let outros = 0;
  if (series.length > topN) {
    outros = series.slice(topN).reduce((s, x) => s + x.valor, 0);
    series = series.slice(0, topN);
    if (outros > 0) series.push({ label: "Outros", valor: outros });
  }

  const total = series.reduce((s, x) => s + x.valor, 0);
  const out = series.map((s) => ({
    label: s.label,
    valor: s.valor,
    percentual: total > 0 ? (s.valor / total) * 100 : 0,
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

    const ctxLines = Object.entries(filtrosBase)
      .filter(([, v]) => v != null && String(v).length > 0)
      .map(([k, v]) => `- ${k}: ${v}`).join("\n") || "(nenhum)";

    const cfg = await callLovableAI(prompt, ctxLines);

    // Mescla filtros: base + extras inferidos pela IA (extras sobrescrevem se houver)
    const mergedFiltros: Record<string, string> = { ...filtrosBase };
    for (const [k, v] of Object.entries(cfg.filtros_extras || {})) {
      if (v != null && String(v).length > 0) mergedFiltros[k] = String(v);
    }

    const rows = await fetchDetalhes(mergedFiltros);
    const { series, total } = aggregate(rows, cfg.metrica, cfg.dimensao, cfg.top_n);

    const payload = {
      titulo: cfg.titulo || `${METRICA_LABEL[cfg.metrica]} por ${cfg.dimensao}`,
      subtitulo: cfg.subtitulo || "",
      tipo_grafico: cfg.tipo_grafico,
      metrica: cfg.metrica,
      dimensao: cfg.dimensao,
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
