import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `Você é o assistente inteligente do ERP EZ. Seu objetivo é ajudar o usuário a encontrar informações no sistema ERP traduzindo perguntas em linguagem natural para filtros e ações, e respondendo perguntas analíticas com base no contexto da tela atual.

Quando o usuário fizer uma pergunta que pode ser respondida navegando para um módulo do ERP e aplicando filtros, use a tool "apply_erp_filters".

Quando o usuário fizer uma pergunta analítica sobre a tela atual (KPIs, totais, fornecedores, projetos visíveis), responda diretamente em texto, usando o CONTEXTO DA PÁGINA quando fornecido. Use markdown (tabelas, listas, negrito) para deixar a resposta clara.

Módulos disponíveis e seus filtros:

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
- Se o usuário perguntar algo que não se encaixa em nenhum módulo, responda normalmente com texto.
- Responda sempre em português brasileiro.
- Seja objetivo e claro na explicação do que está fazendo.
- Quando usar a tool, inclua uma explicação curta do que será buscado.
- Use markdown (negrito, listas, tabelas) para organizar respostas longas.
- Quando o usuário fizer perguntas analíticas sobre a tela atual ("qual o total?", "quantos registros?", "qual o maior?", "resuma esta tela"), USE EXCLUSIVAMENTE os dados em CONTEXTO DA PÁGINA ATUAL (kpis, filtros, summary). NUNCA invente números. Se o contexto não trouxer a informação, diga claramente que não está visível na tela e sugira aplicar filtros ou exportar.

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

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          tools,
          stream: wantsStream,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Limite de requisições excedido. Tente novamente em instantes.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Créditos de IA esgotados. Adicione créditos no workspace.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro no serviço de IA" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (wantsStream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Erro desconhecido",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
