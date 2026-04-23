import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `Você é o assistente inteligente do ERP EZ. Seu objetivo é ajudar o usuário a encontrar informações no sistema ERP traduzindo perguntas em linguagem natural para filtros e ações, e respondendo perguntas analíticas com base no contexto da tela atual.

Quando o usuário fizer uma pergunta que pode ser respondida navegando para um módulo do ERP e aplicando filtros, use a tool "apply_erp_filters".

Quando o usuário fizer uma pergunta sobre **usuários cadastrados, perfis de acesso, quem é admin, quem está pendente de aprovação ou quem tem acesso a determinada tela**, use a tool "list_system_users". Esses dados ficam no Lovable Cloud (não no ERP Senior). NUNCA mande o usuário consultar o ERP para esse tipo de informação. Apenas administradores podem usar esta tool — se o usuário não for admin, a edge function retornará erro e você deve responder de forma educada que essa informação é restrita a administradores.

Quando o usuário fizer uma pergunta analítica sobre a tela atual (KPIs, totais, fornecedores, projetos visíveis), responda diretamente em texto, usando o CONTEXTO DA PÁGINA quando fornecido. Use markdown (tabelas, listas, negrito) para deixar a resposta clara.

Módulos disponíveis e seus filtros (tool apply_erp_filters):

1. **estoque** (rota: /estoque) — Consulta de saldos em estoque
   Filtros: codpro (código produto), despro (descrição), codfam (família), codori (origem), coddep (depósito), somente_com_estoque (boolean, default true)

2. **painel-compras** (rota: /painel-compras) — Ordens de compra
   Filtros: codigo_item, descricao_item, fornecedor, numero_oc, numero_projeto, centro_custo, transacao, familia, origem_material, somente_pendentes (boolean), data_emissao_ini, data_emissao_fim, data_entrega_ini, data_entrega_fim, situacao_oc (1=Aberto Total, 2=Aberto Parcial, 3=Suspenso, 4=Liquidado, 5=Cancelado), tipo_item (PRODUTO/SERVICO)

3. **onde-usa** (rota: /onde-usa) — Onde um componente é utilizado
   Filtros: codcmp (código componente), dercmp (derivação componente), codmod (código modelo)

4. **compras-produto** (rota: /compras-produto) — Compras e custos por produto
   Filtros: codpro, despro, codfam, codori, codder, somente_com_oc_aberta (boolean)

5. **engenharia-producao** (rota: /engenharia-producao) — Engenharia x Produção
   Filtros: numero_projeto, numero_desenho, revisao, numero_op, origem, familia, data_entrega_ini, data_entrega_fim, status_producao (ATENDEU/PARCIAL/SEM PRODUÇÃO/SEM BASE), unidade_negocio (TODAS/ESTRUTURAL/GENIUS)

Regras:
- Sempre envie apenas os filtros relevantes para a pergunta. Não envie filtros vazios.
- Se a pergunta for sobre usuários do sistema/permissões/aprovações, use list_system_users em vez de apply_erp_filters.
- Se o usuário perguntar algo que não se encaixa em nenhum módulo nem em usuários do sistema, responda normalmente com texto.
- Responda sempre em português brasileiro.
- Seja objetivo e claro na explicação do que está fazendo.
- Quando usar uma tool, inclua uma explicação curta do que será buscado.
- Use markdown (negrito, listas, tabelas) para organizar respostas longas. Para list_system_users, apresente o resultado em **tabela markdown**.
- Quando o usuário fizer perguntas analíticas sobre a tela atual ("qual o total?", "quantos registros?", "qual o maior?", "resuma esta tela"), USE EXCLUSIVAMENTE os dados em CONTEXTO DA PÁGINA ATUAL (kpis, filtros, summary). NUNCA invente números. Se o contexto não trouxer a informação, diga claramente que não está visível na tela e sugira aplicar filtros ou exportar.`;

const tools = [
  {
    type: "function",
    function: {
      name: "apply_erp_filters",
      description:
        "Navega para um módulo do ERP e aplica filtros automaticamente para responder a pergunta do usuário",
      parameters: {
        type: "object",
        properties: {
          module: {
            type: "string",
            enum: [
              "estoque",
              "painel-compras",
              "onde-usa",
              "compras-produto",
              "engenharia-producao",
            ],
            description: "O módulo do ERP para navegar",
          },
          filters: {
            type: "object",
            description:
              "Objeto com os filtros a serem aplicados. As chaves devem corresponder aos filtros do módulo.",
            additionalProperties: true,
          },
          explanation: {
            type: "string",
            description:
              "Explicação curta em português do que está sendo buscado",
          },
        },
        required: ["module", "filters", "explanation"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_system_users",
      description:
        "Lista usuários cadastrados no sistema (Lovable Cloud) com seus perfis de acesso. Apenas administradores podem usar. Use para perguntas como 'quem tem acesso ao sistema', 'quais usuários estão pendentes', 'quem é admin'.",
      parameters: {
        type: "object",
        properties: {
          approved: {
            type: "boolean",
            description:
              "true=apenas aprovados, false=apenas pendentes de aprovação. Omitir para listar todos.",
          },
          profile_name: {
            type: "string",
            description:
              "Filtra por nome do perfil de acesso (ex: 'Administrador').",
          },
          search: {
            type: "string",
            description:
              "Texto a buscar em nome, email ou login ERP do usuário (case-insensitive).",
          },
          limit: {
            type: "number",
            description: "Máximo de registros (default 50, máximo 200).",
          },
        },
        additionalProperties: false,
      },
    },
  },
];

function buildSystemPrompt(pageContext: any): string {
  if (!pageContext || typeof pageContext !== "object") return BASE_SYSTEM_PROMPT;
  const lines: string[] = ["", "---", "CONTEXTO DA PÁGINA ATUAL:"];
  if (pageContext.title) lines.push(`Tela: ${pageContext.title}`);
  if (pageContext.route) lines.push(`Rota: ${pageContext.route}`);
  if (pageContext.module) lines.push(`Módulo: ${pageContext.module}`);
  if (pageContext.kpis && Object.keys(pageContext.kpis).length) {
    lines.push("KPIs visíveis:");
    for (const [k, v] of Object.entries(pageContext.kpis)) {
      lines.push(`  - ${k}: ${v}`);
    }
  }
  if (pageContext.filters && Object.keys(pageContext.filters).length) {
    const active = Object.entries(pageContext.filters).filter(
      ([_, v]) => v !== "" && v !== null && v !== undefined && v !== false
    );
    if (active.length) {
      lines.push("Filtros ativos:");
      for (const [k, v] of active) lines.push(`  - ${k}: ${JSON.stringify(v)}`);
    }
  }
  if (pageContext.summary) {
    lines.push(`Resumo: ${pageContext.summary}`);
  }
  return BASE_SYSTEM_PROMPT + "\n" + lines.join("\n");
}

async function executeListSystemUsers(
  args: any,
  callerUserId: string | null
): Promise<{ ok: boolean; data?: any; error?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  if (!callerUserId) {
    return { ok: false, error: "Usuário não autenticado." };
  }

  // Validate caller is admin
  const { data: isAdminRes, error: isAdminErr } = await admin.rpc("is_admin", {
    _uid: callerUserId,
  });
  if (isAdminErr) {
    console.error("is_admin error:", isAdminErr);
    return { ok: false, error: "Falha ao validar permissões do usuário." };
  }
  if (!isAdminRes) {
    return {
      ok: false,
      error: "Acesso restrito: apenas administradores podem consultar usuários.",
    };
  }

  const limit = Math.min(Math.max(Number(args?.limit) || 50, 1), 200);
  const search = (args?.search || "").toString().trim();
  const profileNameFilter = (args?.profile_name || "").toString().trim();
  const approvedFilter =
    typeof args?.approved === "boolean" ? args.approved : null;

  // Fetch profiles
  let profilesQuery = admin
    .from("profiles")
    .select("id, display_name, email, erp_user, approved");
  if (approvedFilter !== null) {
    profilesQuery = profilesQuery.eq("approved", approvedFilter);
  }
  const { data: profilesData, error: pErr } = await profilesQuery;
  if (pErr) {
    console.error("profiles query error:", pErr);
    return { ok: false, error: "Erro ao buscar usuários." };
  }

  const { data: accessData } = await admin
    .from("user_access")
    .select("user_login, profile_id, access_profiles(name)");

  const { data: sessionsData } = await admin
    .from("user_sessions")
    .select("user_id, last_seen_at");

  const accessMap = new Map<string, string>();
  for (const a of accessData || []) {
    const login = String(a.user_login || "").toUpperCase();
    const pname = (a as any).access_profiles?.name || null;
    if (pname) accessMap.set(login, pname);
  }

  const sessionMap = new Map<string, string>();
  for (const s of sessionsData || []) {
    sessionMap.set(s.user_id, s.last_seen_at);
  }

  let users = (profilesData || []).map((p: any) => {
    const erpKey = String(p.erp_user || "").toUpperCase();
    return {
      display_name: p.display_name,
      email: p.email,
      erp_user: p.erp_user,
      approved: p.approved,
      profile_name: erpKey ? accessMap.get(erpKey) || null : null,
      last_seen_at: sessionMap.get(p.id) || null,
    };
  });

  if (profileNameFilter) {
    const needle = profileNameFilter.toLowerCase();
    users = users.filter((u) =>
      (u.profile_name || "").toLowerCase().includes(needle)
    );
  }
  if (search) {
    const needle = search.toLowerCase();
    users = users.filter(
      (u) =>
        (u.display_name || "").toLowerCase().includes(needle) ||
        (u.email || "").toLowerCase().includes(needle) ||
        (u.erp_user || "").toLowerCase().includes(needle)
    );
  }

  users.sort((a, b) =>
    (a.display_name || a.email || "").localeCompare(
      b.display_name || b.email || ""
    )
  );

  const total = users.length;
  users = users.slice(0, limit);

  return {
    ok: true,
    data: {
      total_found: total,
      returned: users.length,
      users,
    },
  };
}

async function getCallerUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const client = createClient(supabaseUrl, anon);
    const { data, error } = await client.auth.getClaims(token);
    if (error || !data?.claims) return null;
    return data.claims.sub as string;
  } catch (e) {
    console.error("getCallerUserId error:", e);
    return null;
  }
}

async function callAiGateway(
  body: any,
  apiKey: string,
  stream: boolean
): Promise<Response> {
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...body, stream }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, pageContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const wantsStream = req.headers.get("accept") === "text/event-stream";
    const systemPrompt = buildSystemPrompt(pageContext);
    const callerUserId = await getCallerUserId(req);

    const baseMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // First pass: non-streaming to detect server-side tools (list_system_users)
    const firstResp = await callAiGateway(
      {
        model: "google/gemini-3-flash-preview",
        messages: baseMessages,
        tools,
      },
      LOVABLE_API_KEY,
      false
    );

    if (!firstResp.ok) {
      if (firstResp.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Limite de requisições excedido. Tente novamente em instantes.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (firstResp.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Créditos de IA esgotados. Adicione créditos no workspace.",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await firstResp.text();
      console.error("AI gateway error:", firstResp.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstData = await firstResp.json();
    const choice = firstData.choices?.[0];
    const toolCalls = choice?.message?.tool_calls || [];

    // Check for server-side tool: list_system_users
    const serverToolCalls = toolCalls.filter(
      (tc: any) => tc.function?.name === "list_system_users"
    );

    if (serverToolCalls.length > 0) {
      // Execute server-side tools and feed results back to model
      const toolMessages: any[] = [];
      for (const tc of serverToolCalls) {
        let parsedArgs: any = {};
        try {
          parsedArgs = JSON.parse(tc.function.arguments || "{}");
        } catch {
          parsedArgs = {};
        }
        const result = await executeListSystemUsers(parsedArgs, callerUserId);
        toolMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          name: "list_system_users",
          content: JSON.stringify(result),
        });
      }

      // Also pass through any client-side tool calls in the assistant message,
      // but those are handled client-side. To keep tool_call_id wiring clean,
      // we forward only the assistant message + server tool results, without re-asking
      // about apply_erp_filters in the same turn.
      const assistantMsg = {
        role: "assistant",
        content: choice.message.content || "",
        tool_calls: serverToolCalls,
      };

      const followupMessages = [
        ...baseMessages,
        assistantMsg,
        ...toolMessages,
      ];

      const followup = await callAiGateway(
        {
          model: "google/gemini-3-flash-preview",
          messages: followupMessages,
          tools,
        },
        LOVABLE_API_KEY,
        wantsStream
      );

      if (!followup.ok) {
        const t = await followup.text();
        console.error("AI gateway follow-up error:", followup.status, t);
        return new Response(
          JSON.stringify({ error: "Erro no serviço de IA (follow-up)" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (wantsStream) {
        return new Response(followup.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
      const followupData = await followup.json();
      return new Response(JSON.stringify(followupData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No server-side tools: if client wanted stream, replay the request as a stream
    // so the client gets streaming UX consistent with previous behavior.
    if (wantsStream) {
      const streamResp = await callAiGateway(
        {
          model: "google/gemini-3-flash-preview",
          messages: baseMessages,
          tools,
        },
        LOVABLE_API_KEY,
        true
      );
      if (!streamResp.ok) {
        const t = await streamResp.text();
        console.error("AI gateway stream error:", streamResp.status, t);
        return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(streamResp.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(JSON.stringify(firstData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
