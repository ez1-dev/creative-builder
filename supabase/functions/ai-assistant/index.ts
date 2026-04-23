import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODULES_CATALOG = `MÓDULOS DISPONÍVEIS PARA query_erp_data (use o nome exato em "module"). Cada módulo tem uma "unidade de contagem" — use-a em distinct_field para perguntas "quantos X?":
- estoque: Saldos em estoque. campos: codpro, despro, saldo, coddep, codfam | filtros: codpro, despro, codfam, codori, coddep, somente_com_estoque | ord. padrão: saldo | unidade de contagem: codpro (produtos)
- painel-compras: Ordens de compra (OCs). ATENÇÃO: 1 OC = N linhas (1 por item). campos: numero_oc, fantasia_fornecedor, codigo_item, descricao_item, valor_liquido, data_emissao, data_entrega, dias_atraso | filtros: codigo_item, descricao_item, fornecedor, numero_oc, numero_projeto, somente_pendentes, situacao_oc, tipo_item | ord. padrão: valor_liquido | unidade de contagem: numero_oc (OCs) | aliases: fornecedor→fantasia_fornecedor, valor_liquido_total→valor_liquido | ex: "quantas OCs em aberto?" → aggregate:"count_distinct", distinct_field:"numero_oc", filters:{somente_pendentes:true}, scope:"global" | ex: "fornecedor com maior atraso?" → scope:"global", filters:{somente_pendentes:true}, client_filters:{dias_atraso:{gt:0}}, order_by:"dias_atraso", top_n:10, fields:["fantasia_fornecedor","numero_oc","descricao_item","dias_atraso","data_entrega"]
- compras-produto: Compras/custos por produto. campos: codpro, despro, fornecedor, quantidade, valor_unitario, data_emissao | filtros: codpro, despro, codfam, codori, codder, somente_com_oc_aberta | ord. padrão: quantidade | unidade de contagem: codpro (produtos)
- contas-pagar: Títulos a pagar. campos: numero_titulo, fornecedor, valor_original, valor_aberto, data_vencimento | filtros: fornecedor, numero_titulo, data_vencimento_ini, data_vencimento_fim, somente_em_aberto | ord. padrão: valor_aberto | unidade de contagem: numero_titulo (títulos)
- contas-receber: Títulos a receber. campos: numero_titulo, cliente, valor_original, valor_aberto, data_vencimento | filtros: cliente, numero_titulo, data_vencimento_ini, data_vencimento_fim, somente_em_aberto | ord. padrão: valor_aberto | unidade de contagem: numero_titulo (títulos)
- notas-recebimento: NFs de entrada. campos: numero_nf, fornecedor, codigo_item, descricao_item, valor_liquido_total, data_emissao | filtros: fornecedor, numero_nf, codigo_item, data_emissao_ini, data_emissao_fim | ord. padrão: valor_liquido_total | unidade de contagem: numero_nf (NFs)
- engenharia-producao: Engenharia x Produção. campos: numero_projeto, numero_desenho, numero_op, status_producao, kg_patio, data_entrega | filtros: numero_projeto, numero_desenho, numero_op, status_producao, unidade_negocio, data_entrega_ini, data_entrega_fim | ord. padrão: data_entrega | unidade de contagem: numero_op (OPs)
- apontamento-genius: Horas em OPs GENIUS. campos: numero_op, operador, descricao_op, tempo_total_horas, data_apontamento | filtros: numero_op, operador, data_inicio, data_fim | ord. padrão: tempo_total_horas | unidade de contagem: numero_op (OPs) | ex: "OPs Genius acima de 8h" → client_filters:{tempo_total_horas:{gte:8}}
- producao-saldo-patio: Peças em pátio. campos: numero_projeto, descricao, kg_patio, dias_em_patio, cliente | filtros: numero_projeto, cliente, data_ini, data_fim | ord. padrão: kg_patio | unidade de contagem: numero_projeto (projetos) | ex: "parados >30 dias" → client_filters:{dias_em_patio:{gte:30}}
- producao-expedido-obra: Itens expedidos. campos: numero_projeto, cliente, kg_expedido, data_expedicao | filtros: numero_projeto, cliente, data_ini, data_fim | ord. padrão: kg_expedido | unidade de contagem: numero_projeto (projetos)
- producao-nao-carregados: Itens não carregados. campos: numero_projeto, numero_desenho, codigo_peca, quantidade, cliente | filtros: numero_projeto, numero_desenho, cliente, cidade | ord. padrão: quantidade | unidade de contagem: numero_projeto (projetos)
- producao-lead-time: Lead time por OP. campos: numero_op, numero_projeto, lead_time_dias, data_inicio, data_fim, status | filtros: numero_op, numero_projeto, data_ini, data_fim | ord. padrão: lead_time_dias | unidade de contagem: numero_op (OPs)
- producao-produzido-periodo: Produção por período. campos: data, kg_produzido, qtd_ops, unidade_negocio | filtros: data_ini, data_fim, unidade_negocio | ord. padrão: kg_produzido
- auditoria-tributaria: NFs com divergências. campos: numero_nf, fornecedor, divergencia_valor, data_emissao, tipo_divergencia | filtros: fornecedor, numero_nf, data_ini, data_fim, somente_com_divergencia | ord. padrão: divergencia_valor | unidade de contagem: numero_nf (NFs)
- conciliacao-edocs: Conciliação NF-e. campos: chave_nfe, fornecedor, numero_nf, situacao, divergencias, data_emissao | filtros: fornecedor, numero_nf, data_emissao_ini, data_emissao_fim, somente_divergencia | ord. padrão: data_emissao | unidade de contagem: chave_nfe (NF-e)
- numero-serie: Números de série (GS). campos: numero_serie, numero_op, numero_pedido, codigo_item, status | filtros: numero_op, numero_pedido, codigo_item, numero_serie | ord. padrão: numero_serie | unidade de contagem: numero_serie
- bom: Estrutura BOM. USE FILTROS RESTRITIVOS. campos: codigo_modelo, codigo_componente, descricao_componente, quantidade, nivel | filtros: codigo_modelo, codigo_componente | ord. padrão: nivel | unidade de contagem: codigo_componente (componentes)
- onde-usa: Onde componente é usado. campos: codigo_componente, codigo_pai, descricao_pai, quantidade_usada | filtros: codcmp, dercmp, codmod | ord. padrão: quantidade_usada | unidade de contagem: codigo_pai (modelos)
- estoque-min-max: Estoque vs mín/máx. campos: codpro, despro, saldo_atual, estoque_minimo, estoque_maximo | filtros: codpro, despro, codfam | ord. padrão: saldo_atual | unidade de contagem: codpro (produtos) | ex: "abaixo do mínimo" → client_filters:{saldo_atual:{lte:0}}
- sugestao-min-max: Sugestão de compra. campos: codpro, despro, sugestao_compra, prioridade, estoque_minimo | filtros: codpro, codfam, prioridade | ord. padrão: sugestao_compra | unidade de contagem: codpro (produtos)

Use "client_filters" {campo:{gte|lte|gt|lt|eq|contains}} quando o backend não tiver o filtro nativo (faixas de horas/dias/valores).`;

const BASE_SYSTEM_PROMPT = `Você é o assistente inteligente do ERP EZ. Seu objetivo é ajudar o usuário a encontrar informações no sistema ERP traduzindo perguntas em linguagem natural para filtros e ações, e respondendo perguntas analíticas com base no contexto da tela atual.

Quando o usuário fizer uma pergunta que pode ser respondida navegando para um módulo do ERP e aplicando filtros, use a tool "apply_erp_filters".

Quando o usuário perguntar sobre o **histórico de pesquisas dele mesmo** ("o que pesquisei?", "qual filtro usei ontem?", "minha última busca de estoque", "repita a busca anterior"), use a tool "recall_user_searches". Esta tool consulta apenas as buscas do próprio usuário autenticado. Se houver uma busca relevante, sugira aplicá-la chamando a tool "apply_erp_filters" em seguida com os mesmos filtros.

Se o CONTEXTO DA PÁGINA ATUAL incluir MEMÓRIA DO USUÁRIO (módulos preferidos, filtros frequentes, buscas recentes), use essas informações para personalizar respostas e sugestões. Por exemplo: se o usuário costuma filtrar família 001 com situação Ativo, ofereça aplicar esses filtros proativamente.

Quando o usuário fizer uma pergunta sobre **usuários cadastrados, perfis de acesso, quem é admin, quem está pendente de aprovação ou quem tem acesso a determinada tela**, use a tool "list_system_users". Esses dados ficam no Lovable Cloud (não no ERP Senior). NUNCA mande o usuário consultar o ERP para esse tipo de informação. Apenas administradores podem usar esta tool — se o usuário não for admin, a edge function retornará erro e você deve responder de forma educada que essa informação é restrita a administradores.

Para perguntas analíticas que exigem **dados reais do ERP** (rankings, totais agregados, top N, contagens, somas, ordenação por saldo/valor/data/horas/dias), use a tool "query_erp_data". SEMPRE prefira "query_erp_data" antes de "apply_erp_filters" para perguntas analíticas — só use apply_erp_filters quando o objetivo é apenas abrir uma tela com filtros para o usuário ver.

**REGRAS DE ESCOPO (CRÍTICO)** — antes de chamar query_erp_data, decida o escopo:
- "nesta tela", "nos resultados atuais", "no que está filtrado", "aqui" → use o CONTEXTO DA PÁGINA quando ele já trouxer a resposta exata nos KPIs; só chame a tool com scope:"page" se precisar drill-down.
- "no total", "no geral", "em todo o ERP", "ao todo", "sem filtro", ou perguntas SEM referência clara à tela atual ("quantas OCs em aberto?", "quantos títulos vencidos?") → SEMPRE scope:"global" e IGNORE os filtros visíveis na tela. Use apenas os filtros que a pergunta exige (ex: somente_pendentes, somente_em_aberto).
- Em caso de ambiguidade, padrão é scope:"global" e mencione na resposta os filtros considerados.

**REGRAS DE CONTAGEM (CRÍTICO)**:
- "quantos X?" / "quantas Y?" / "qual o número de…" → use aggregate:"count_distinct" + distinct_field = unidade de contagem do módulo (ver catálogo). NUNCA conte por linhas — em painel-compras, contas-pagar, notas-recebimento etc. cada registro é um item, não a entidade pai.
- "qual o total de" / "soma de" valor/quantidade → use aggregate:"sum" + sum_field.
- "média de" → aggregate:"avg" + sum_field.
- NUNCA estime contagens a partir de top_n — sempre use aggregate.

Para rankings ("top 5 fornecedores", "OCs mais antigas"), inclua "module", "order_by", "top_n" (default 10). Use "client_filters" {campo:{gte|lte|gt|lt|eq|contains}} para faixas que não existem como filtro nativo.

Após receber o resultado:
- Se aggregate: responda em texto curto destacando o valor (ex: "Há **187 OCs em aberto** no ERP, somando 1.240 itens"). Mencione filtros considerados e scope.
- Se top N: formate em **tabela markdown** (máx 10 linhas) destacando o campo ordenado.
- Sempre ofereça drill-down via apply_erp_filters quando relevante.

${MODULES_CATALOG}

**EXEMPLOS DE PERGUNTAS GLOBAIS** (sempre usar query_erp_data com scope:"global", IGNORANDO filtros da tela):
- "quantas ordens de compra temos em aberto?" → painel-compras / count_distinct numero_oc / filters:{somente_pendentes:true}
- "qual o fornecedor com maior atraso?" → painel-compras / order_by:"dias_atraso" / client_filters:{dias_atraso:{gt:0}} / fields:["fantasia_fornecedor","numero_oc","dias_atraso"] — depois agregue por fantasia_fornecedor.
- "quantos títulos vencidos?" → contas-pagar / count_distinct numero_titulo / filters:{somente_em_aberto:true}

**DRILL-DOWN ("ver detalhes deste título/OC/projeto") — REGRA CRÍTICA**:
Quando sua última resposta identificou **1 registro específico** (ex: "É o título 1669 de R$ 485.481,43 vencendo 20/04/2026") e o usuário confirma com "sim", "abrir", "ver detalhes":
- **NUNCA** use apenas o "número" do título/OC como filtro. Em contas-pagar/contas-receber, numero_titulo é busca por SUBSTRING e retornará dezenas de registros não relacionados (1669 casa também 11669, 21669, 116691, 011669/01...).
- Use uma **CERCA DE FILTROS** combinando todos os identificadores conhecidos: valor exato (valor_min ≈ valor_max), data exata (data_vencimento_ini = data_vencimento_fim), fornecedor/cliente quando souber.
- Para Contas a Pagar/Receber, **SEMPRE** inclua `somente_em_aberto:true` se o registro de origem era "em aberto".

EXEMPLO:
USER: "qual o maior título em aberto?"
ASSISTANT: "É R$ 485.481,43 vencendo 20/04/2026 (título 1669). Abrir?"
USER: "sim"
→ apply_erp_filters({ module:"contas-pagar", filters:{ valor_min:485481.43, valor_max:485481.44, data_vencimento_ini:"2026-04-20", data_vencimento_fim:"2026-04-20", somente_em_aberto:true }})

**FOLLOW-UP CURTO**: se o usuário responder apenas "sim", "pode", "quero", "faça", "ok" depois de você ter oferecido uma busca/consulta global OU uma navegação para drill-down, EXECUTE imediatamente a tool que você acabou de propor. NUNCA repita o contexto da tela. NUNCA pergunte de novo "deseja...?".

Quando o usuário pedir uma resposta analítica exclusivamente sobre o que está visível ("resuma esta tela", "qual o KPI X aqui"), e o CONTEXTO DA PÁGINA já trouxer a informação nos KPIs/summary, responda direto em texto sem chamar tools. Em qualquer outro caso (pergunta global, contagem, soma), use query_erp_data.

Módulos disponíveis e seus filtros (tool apply_erp_filters):

1. **estoque** (rota: /estoque) — Consulta de saldos em estoque
   Filtros: codpro, despro, codfam, codori, coddep, somente_com_estoque (boolean, default true)

2. **painel-compras** (rota: /painel-compras) — Ordens de compra
   Filtros: codigo_item, descricao_item, fornecedor, numero_oc, numero_projeto, centro_custo, transacao, familia, origem_material, somente_pendentes (boolean), data_emissao_ini, data_emissao_fim, data_entrega_ini, data_entrega_fim, situacao_oc (1=Aberto Total, 2=Aberto Parcial, 3=Suspenso, 4=Liquidado, 5=Cancelado), tipo_item (PRODUTO/SERVICO)

3. **onde-usa** (rota: /onde-usa) — Onde um componente é utilizado
   Filtros: codcmp, dercmp, codmod

4. **compras-produto** (rota: /compras-produto) — Compras e custos por produto
   Filtros: codpro, despro, codfam, codori, codder, somente_com_oc_aberta (boolean)

5. **engenharia-producao** (rota: /engenharia-producao) — Engenharia x Produção
   Filtros: numero_projeto, numero_desenho, revisao, numero_op, origem, familia, data_entrega_ini, data_entrega_fim, status_producao, unidade_negocio

Regras gerais:
- Sempre envie apenas os filtros relevantes. Não envie filtros vazios.
- Se a pergunta for sobre usuários/permissões/aprovações, use list_system_users.
- Responda sempre em português brasileiro, objetivo e claro.
- Use markdown (negrito, listas, tabelas) para organizar respostas longas.
- NUNCA invente números. Se não tem como obter, diga claramente.`;

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
  {
    type: "function",
    function: {
      name: "recall_user_searches",
      description:
        "Consulta o histórico de pesquisas do PRÓPRIO usuário autenticado nos últimos 30 dias. Use para responder 'o que pesquisei?', 'qual filtro usei?', 'minha última busca'. Pode filtrar por módulo.",
      parameters: {
        type: "object",
        properties: {
          module: {
            type: "string",
            description:
              "Filtra por módulo (ex: 'estoque', 'painel-compras'). Omitir para buscar em todos.",
          },
          search: {
            type: "string",
            description:
              "Texto a buscar dentro dos filtros salvos (ex: '001', 'fornecedor X').",
          },
          limit: {
            type: "number",
            description: "Máximo de registros (default 10, máximo 30).",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_erp_data",
      description:
        "Consulta dados reais do ERP. Suporta dois modos: (1) top N ordenado para rankings; (2) aggregate (count/count_distinct/sum/avg) para totais e contagens. Use scope:'global' para ignorar filtros da tela atual e perguntar sobre todo o ERP. Executada no navegador do usuário.",
      parameters: {
        type: "object",
        properties: {
          module: {
            type: "string",
            enum: [
              "estoque",
              "painel-compras",
              "compras-produto",
              "contas-pagar",
              "contas-receber",
              "notas-recebimento",
              "engenharia-producao",
              "apontamento-genius",
              "producao-saldo-patio",
              "producao-expedido-obra",
              "producao-nao-carregados",
              "producao-lead-time",
              "producao-produzido-periodo",
              "auditoria-tributaria",
              "conciliacao-edocs",
              "numero-serie",
              "bom",
              "onde-usa",
              "estoque-min-max",
              "sugestao-min-max",
            ],
            description: "Módulo do ERP a consultar.",
          },
          filters: {
            type: "object",
            description: "Filtros nativos do módulo (enviados ao backend).",
            additionalProperties: true,
          },
          client_filters: {
            type: "object",
            description:
              "Filtros pós-busca para faixas (gte/lte/gt/lt/eq/contains). Ex: {tempo_total_horas:{gte:8}}.",
            additionalProperties: true,
          },
          scope: {
            type: "string",
            enum: ["page", "global"],
            description:
              "'global' (default): ignora filtros da tela atual, consulta todo o ERP. 'page': use os filtros visíveis na tela. Para perguntas como 'quantas X no total?' use SEMPRE 'global'.",
          },
          aggregate: {
            type: "string",
            enum: ["count", "count_distinct", "sum", "avg"],
            description:
              "Use para perguntas de TOTAL/CONTAGEM/SOMA/MÉDIA. Para 'quantos X?' use 'count_distinct' com distinct_field = unidade de contagem do módulo.",
          },
          distinct_field: {
            type: "string",
            description:
              "Campo a contar distintos (use a 'unidade de contagem' do módulo, ex: numero_oc para painel-compras).",
          },
          sum_field: {
            type: "string",
            description: "Campo numérico a somar/promediar (ex: valor_liquido_total).",
          },
          order_by: {
            type: "string",
            description:
              "Campo para ordenar no modo top N (ex: 'saldo', 'valor_aberto'). Não usado quando aggregate está presente.",
          },
          order_dir: {
            type: "string",
            enum: ["asc", "desc"],
            description: "Direção da ordenação. Default desc.",
          },
          top_n: {
            type: "number",
            description: "Quantos registros retornar no modo top N (default 10, máx 50).",
          },
          fields: {
            type: "array",
            items: { type: "string" },
            description: "Campos a devolver (reduz payload).",
          },
        },
        required: ["module"],
        additionalProperties: false,
      },
    },
  },
];

function buildSystemPrompt(pageContext: any, userMemory: any): string {
  let out = BASE_SYSTEM_PROMPT;
  if (pageContext && typeof pageContext === "object") {
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
    if (pageContext.summary) lines.push(`Resumo: ${pageContext.summary}`);
    out += "\n" + lines.join("\n");
  }

  if (userMemory && typeof userMemory === "object") {
    const ml: string[] = ["", "---", "MEMÓRIA DO USUÁRIO (privada, somente este usuário):"];
    if (userMemory.topModules?.length) {
      ml.push(`Módulos mais usados: ${userMemory.topModules.join(", ")}`);
    }
    if (userMemory.frequentFilters && Object.keys(userMemory.frequentFilters).length) {
      ml.push("Filtros frequentes:");
      for (const [mod, f] of Object.entries(userMemory.frequentFilters)) {
        ml.push(`  - ${mod}: ${JSON.stringify(f)}`);
      }
    }
    if (userMemory.recentSearches?.length) {
      ml.push("Buscas recentes:");
      for (const s of userMemory.recentSearches.slice(0, 5)) {
        ml.push(`  - ${s.module}: ${JSON.stringify(s.filters)}`);
      }
    }
    if (ml.length > 3) out += "\n" + ml.join("\n");
  }
  return out;
}

async function loadUserMemory(
  callerUserId: string | null,
  currentModule: string | null
) {
  if (!callerUserId) return null;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const [prefsRes, recentRes] = await Promise.all([
      admin
        .from("user_preferences")
        .select("favorite_modules, frequent_filters")
        .eq("user_id", callerUserId)
        .maybeSingle(),
      admin
        .from("user_search_history")
        .select("module, filters, created_at")
        .eq("user_id", callerUserId)
        .order("created_at", { ascending: false })
        .limit(currentModule ? 30 : 10),
    ]);

    const prefs = prefsRes.data || {};
    const recent = (recentRes.data || []).filter((r: any) =>
      currentModule ? r.module === currentModule : true
    );

    const topModules = ((prefs as any).favorite_modules || [])
      .map((m: any) => m.module)
      .slice(0, 5);
    const frequentFilters = (prefs as any).frequent_filters || {};

    return {
      topModules,
      frequentFilters,
      recentSearches: recent.slice(0, 5),
    };
  } catch (e) {
    console.warn("loadUserMemory failed:", e);
    return null;
  }
}

async function executeRecallUserSearches(
  args: any,
  callerUserId: string | null
): Promise<{ ok: boolean; data?: any; error?: string }> {
  if (!callerUserId) {
    return { ok: false, error: "Usuário não autenticado." };
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const limit = Math.min(Math.max(Number(args?.limit) || 10, 1), 30);
  const moduleFilter = (args?.module || "").toString().trim();
  const search = (args?.search || "").toString().trim().toLowerCase();

  let q = admin
    .from("user_search_history")
    .select("module, filters, result_count, created_at")
    .eq("user_id", callerUserId)
    .order("created_at", { ascending: false })
    .limit(limit * 3);

  if (moduleFilter) q = q.eq("module", moduleFilter);

  const { data, error } = await q;
  if (error) {
    return { ok: false, error: "Erro ao consultar histórico." };
  }
  let rows = data || [];
  if (search) {
    rows = rows.filter((r) =>
      JSON.stringify(r.filters || {}).toLowerCase().includes(search)
    );
  }
  rows = rows.slice(0, limit);
  return { ok: true, data: { count: rows.length, searches: rows } };
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
    // Try modern getClaims first; fall back to getUser for older SDK runtimes.
    const anyAuth = client.auth as any;
    if (typeof anyAuth.getClaims === "function") {
      const { data, error } = await anyAuth.getClaims(token);
      if (error || !data?.claims) return null;
      return data.claims.sub as string;
    }
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch (e) {
    console.error("getCallerUserId error:", e);
    return null;
  }
}

// ============================================================
// Intent resolver (determinístico)
// ============================================================

interface ResolvedIntent {
  /** System note adicional injetada no prompt para forçar comportamento */
  systemNote?: string;
  /** Reescreve a última mensagem do usuário (ex: "sim" → ação pendente) */
  rewrittenUserMessage?: string;
}

const SHORT_CONFIRMATIONS = new Set([
  "sim", "s", "ok", "okay", "claro", "pode", "pode sim", "quero", "quero sim",
  "faça", "faz", "faça sim", "manda", "manda ver", "vai", "yes", "y", "confirmo",
  "confirma", "positivo", "perfeito", "isso", "isso mesmo", "exato",
]);

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[?!.,;:]/g, "")
    .trim();
}

function isShortConfirmation(text: string): boolean {
  const n = normalize(text);
  if (!n) return false;
  if (n.length > 25) return false;
  return SHORT_CONFIRMATIONS.has(n);
}

function lastAssistantOfferedGlobal(messages: any[]): boolean {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant" && typeof m.content === "string") {
      const c = m.content.toLowerCase();
      return /(busca\s+global|consulta\s+global|todo\s+o\s+(erp|sistema)|todos\s+(os|as)\s+(fornecedores|registros|ocs|t[ií]tulos)|sem\s+(o\s+)?filtro|remover\s+(o\s+)?filtro|consulta\s+sem\s+filtro|globalmente)/i.test(
        c
      );
    }
    if (m.role === "user") return false;
  }
  return false;
}

function lastAssistantText(messages: any[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant" && typeof m.content === "string") return m.content;
  }
  return "";
}

/**
 * Detecta intenções analíticas globais de alta confiança e devolve
 * um systemNote para forçar query_erp_data com os parâmetros certos.
 */
function detectGlobalAnalyticalIntent(
  userText: string,
  pageContext: any
): string | null {
  const n = normalize(userText);
  if (!n) return null;

  const isLocalScope = /(nesta\s+tela|nessa\s+tela|aqui|nos?\s+resultados\s+atuais|filtrad)/.test(
    n
  );
  if (isLocalScope) return null;

  // ---- painel-compras: contagem de OCs em aberto ----
  if (
    /(quant[ao]s?|numero\s+de|n[ºo°]\s*de|total\s+de)/.test(n) &&
    /(ordens?\s+de\s+compra|ocs?)/.test(n) &&
    /(em\s+aberto|abertas?|pendentes?|sem\s+liquidar|n[aã]o\s+liquidad|atrasad)/.test(n)
  ) {
    return [
      "INTENÇÃO DETECTADA (alta confiança): contagem global de Ordens de Compra em aberto.",
      "OBRIGATÓRIO: chame a tool query_erp_data EXATAMENTE com:",
      '{ "module": "painel-compras", "scope": "global", "aggregate": "count_distinct", "distinct_field": "numero_oc", "filters": { "somente_pendentes": true } }',
      "NÃO use o contexto da página. NÃO use apply_erp_filters. NÃO responda em texto antes da tool.",
    ].join("\n");
  }

  // ---- painel-compras: fornecedor com maior atraso ----
  if (
    /(fornecedor|fornecedores)/.test(n) &&
    /(maior|maiores|mais|top|pior|piores)\s+(atras[oa]|atrasos?|dias|atrasad)/.test(n)
  ) {
    return [
      "INTENÇÃO DETECTADA (alta confiança): ranking global de fornecedor com maior atraso em OCs pendentes.",
      "OBRIGATÓRIO: chame a tool query_erp_data EXATAMENTE com:",
      '{ "module": "painel-compras", "scope": "global", "filters": { "somente_pendentes": true }, "client_filters": { "dias_atraso": { "gt": 0 } }, "order_by": "dias_atraso", "order_dir": "desc", "top_n": 10, "fields": ["fantasia_fornecedor", "numero_oc", "descricao_item", "dias_atraso", "data_entrega"] }',
      "Após receber o resultado, agregue por fantasia_fornecedor e responda quem tem o MAIOR dias_atraso (e quantas OCs/itens). NÃO use o contexto da página.",
    ].join("\n");
  }

  // ---- painel-compras: valor total das OCs em aberto ----
  if (
    /(valor|total|soma|montante)/.test(n) &&
    /(ocs?|ordens?\s+de\s+compra)/.test(n) &&
    /(em\s+aberto|pendentes?|abertas?)/.test(n)
  ) {
    return [
      "INTENÇÃO DETECTADA: valor total global das OCs em aberto.",
      "OBRIGATÓRIO: chame query_erp_data com:",
      '{ "module": "painel-compras", "scope": "global", "aggregate": "sum", "sum_field": "valor_liquido", "filters": { "somente_pendentes": true } }',
      "NÃO use o contexto da página.",
    ].join("\n");
  }

  // ---- contas-pagar: títulos vencidos / em aberto ----
  if (
    /(quant[ao]s?|numero\s+de|total\s+de)/.test(n) &&
    /(titulos?|contas?\s+a\s+pagar)/.test(n) &&
    /(vencid|em\s+aberto|abertos?|pendentes?)/.test(n)
  ) {
    return [
      "INTENÇÃO DETECTADA: contagem global de títulos a pagar.",
      "OBRIGATÓRIO: chame query_erp_data com:",
      '{ "module": "contas-pagar", "scope": "global", "aggregate": "count_distinct", "distinct_field": "numero_titulo", "filters": { "somente_em_aberto": true } }',
    ].join("\n");
  }

  return null;
}

/**
 * Resolvedor principal de intenção: aplica heurísticas determinísticas
 * antes de chamar o modelo.
 */
function resolveIntent(messages: any[], pageContext: any): ResolvedIntent {
  if (!Array.isArray(messages) || messages.length === 0) return {};
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser || typeof lastUser.content !== "string") return {};

  const userText = lastUser.content;

  // Caso 1: confirmação curta após oferta de busca global OU drill-down de registro único
  if (isShortConfirmation(userText)) {
    const prevAssistant = lastAssistantText(messages);
    const lower = prevAssistant.toLowerCase();

    // 1a) Drill-down: a última fala identificou 1 título com valor + vencimento (contas-pagar/receber)
    // Regex: "R$ 485.481,43" e "20/04/2026"
    const valorMatch = prevAssistant.match(/R\$\s*([\d.]+,\d{2})/);
    const dataMatch = prevAssistant.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const tituloMatch = prevAssistant.match(/t[ií]tulo\s+(?:n[º°]?\s*)?([\w/\\\-*.]+)/i);
    const mencionaContasPagar = /(contas?\s+a\s+pagar|t[ií]tulo\s+a\s+pagar|t[ií]tulos?\s+a\s+pagar)/i.test(prevAssistant);
    const mencionaContasReceber = /(contas?\s+a\s+receber|t[ií]tulo\s+a\s+receber|t[ií]tulos?\s+a\s+receber)/i.test(prevAssistant);
    const mencionaAbrirNavegar = /(abrir|navegar|ir\s+para|levar|ver\s+detalhes|abro|levo)/i.test(lower);
    const mencionaEmAberto = /(em\s+aberto|saldo\s+aberto|aberto)/i.test(lower);

    if (valorMatch && dataMatch && (mencionaContasPagar || mencionaContasReceber) && mencionaAbrirNavegar) {
      const valorNum = parseFloat(valorMatch[1].replace(/\./g, "").replace(",", "."));
      const valorMin = (valorNum - 0.01).toFixed(2);
      const valorMax = (valorNum + 0.01).toFixed(2);
      const isoDate = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`;
      const moduloAlvo = mencionaContasReceber ? "contas-receber" : "contas-pagar";
      const numeroTitulo = tituloMatch ? tituloMatch[1] : null;

      const filtersJson: any = {
        valor_min: parseFloat(valorMin),
        valor_max: parseFloat(valorMax),
        data_vencimento_ini: isoDate,
        data_vencimento_fim: isoDate,
      };
      if (mencionaEmAberto) filtersJson.somente_em_aberto = true;

      const pendingAction = `Faça AGORA a NAVEGAÇÃO de drill-down chamando apply_erp_filters com {"module":"${moduloAlvo}","filters":${JSON.stringify(filtersJson)},"explanation":"Abrindo o título de R$ ${valorMatch[1]} com vencimento ${dataMatch[0]}${numeroTitulo ? ` (nº ${numeroTitulo})` : ""}."}. NÃO use apenas numero_titulo (busca por substring traz dezenas de títulos não relacionados). Use a CERCA DE FILTROS valor_min/valor_max + data exata + somente_em_aberto:true para abrir EXATAMENTE 1 linha.`;
      return {
        rewrittenUserMessage: `(confirmação do usuário) ${pendingAction}`,
        systemNote:
          "FOLLOW-UP DRILL-DOWN: o usuário acabou de confirmar abrir um título específico. Use cerca de filtros (valor + data exata + somente_em_aberto), NUNCA apenas numero_titulo.",
      };
    }

    // 1b) Confirmação após oferta de busca global
    if (lastAssistantOfferedGlobal(messages)) {
      let pendingAction = "Execute a busca/consulta global que você acabou de propor, ignorando os filtros da tela atual.";

      if (/(ordens?\s+de\s+compra|ocs?).*(em\s+aberto|pendent|abert)/.test(lower)) {
        pendingAction =
          'Faça AGORA a busca global de Ordens de Compra em aberto chamando query_erp_data com {"module":"painel-compras","scope":"global","aggregate":"count_distinct","distinct_field":"numero_oc","filters":{"somente_pendentes":true}}. NÃO use o contexto da página.';
      } else if (/(fornecedor).*(atras|maior|pior)/.test(lower)) {
        pendingAction =
          'Faça AGORA a consulta global do fornecedor com maior atraso chamando query_erp_data com {"module":"painel-compras","scope":"global","filters":{"somente_pendentes":true},"client_filters":{"dias_atraso":{"gt":0}},"order_by":"dias_atraso","order_dir":"desc","top_n":10,"fields":["fantasia_fornecedor","numero_oc","descricao_item","dias_atraso","data_entrega"]}. Agregue por fantasia_fornecedor no texto da resposta. NÃO use o contexto da página.';
      } else if (/(t[ií]tulos?|contas?\s+a\s+pagar).*(vencid|em\s+aberto|aberto|pendent)/.test(lower)) {
        pendingAction =
          'Faça AGORA a busca global de títulos a pagar em aberto via query_erp_data com {"module":"contas-pagar","scope":"global","aggregate":"count_distinct","distinct_field":"numero_titulo","filters":{"somente_em_aberto":true}}.';
      }

      return {
        rewrittenUserMessage: `(confirmação do usuário) ${pendingAction}`,
        systemNote:
          "FOLLOW-UP: o usuário acabou de confirmar (\"sim\") uma ação global pendente. Execute a tool indicada imediatamente, SEM voltar a perguntar e SEM responder com base no contexto da página.",
      };
    }
  }

  // Caso 2: pergunta analítica global de alta confiança
  const note = detectGlobalAnalyticalIntent(userText, pageContext);
  if (note) {
    return { systemNote: note };
  }

  return {};
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
    const { messages, pageContext, priorAssistant, toolResults } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const wantsStream = req.headers.get("accept") === "text/event-stream";
    const callerUserId = await getCallerUserId(req);
    const userMemory = await loadUserMemory(
      callerUserId,
      pageContext?.module || null
    );
    const systemPrompt = buildSystemPrompt(pageContext, userMemory);

    // Determinist intent resolver: detects global analytical questions
    // and short confirmations ("sim") so the model is forced to use the
    // correct tool with global scope instead of relying on page context.
    const isContinuation =
      Array.isArray(toolResults) && toolResults.length > 0 && priorAssistant;
    let effectiveMessages = messages;
    let extraSystemNote: string | null = null;
    if (!isContinuation) {
      const intent = resolveIntent(messages, pageContext);
      if (intent.systemNote) extraSystemNote = intent.systemNote;
      if (intent.rewrittenUserMessage && Array.isArray(messages) && messages.length > 0) {
        const rewritten = [...messages];
        for (let i = rewritten.length - 1; i >= 0; i--) {
          if (rewritten[i].role === "user") {
            rewritten[i] = { ...rewritten[i], content: intent.rewrittenUserMessage };
            break;
          }
        }
        effectiveMessages = rewritten;
      }
    }

    const baseMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...(extraSystemNote ? [{ role: "system", content: extraSystemNote }] : []),
      ...effectiveMessages,
    ];

    // Continuation flow: client executed a client-side tool and is sending results back
    if (Array.isArray(toolResults) && toolResults.length > 0 && priorAssistant) {
      const assistantMsg = {
        role: "assistant",
        content: priorAssistant.content || "",
        tool_calls: priorAssistant.tool_calls || [],
      };
      const toolMsgs = toolResults.map((tr: any) => ({
        role: "tool",
        tool_call_id: tr.tool_call_id,
        name: tr.name,
        content: typeof tr.result === "string" ? tr.result : JSON.stringify(tr.result),
      }));
      const followupMessages = [...baseMessages, assistantMsg, ...toolMsgs];
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
        if (followup.status === 429 || followup.status === 402) {
          return new Response(
            JSON.stringify({ error: followup.status === 429 ? "Limite de requisições excedido." : "Créditos esgotados." }),
            { status: followup.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const t = await followup.text();
        console.error("AI gateway continuation error:", followup.status, t);
        return new Response(JSON.stringify({ error: "Erro no serviço de IA (continuação)" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (wantsStream) {
        return new Response(followup.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
      const data = await followup.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Server-side tools (executed in this edge function)
    const SERVER_TOOL_NAMES = new Set([
      "list_system_users",
      "recall_user_searches",
    ]);
    const serverToolCalls = toolCalls.filter((tc: any) =>
      SERVER_TOOL_NAMES.has(tc.function?.name)
    );

    if (serverToolCalls.length > 0) {
      const toolMessages: any[] = [];
      for (const tc of serverToolCalls) {
        let parsedArgs: any = {};
        try {
          parsedArgs = JSON.parse(tc.function.arguments || "{}");
        } catch {
          parsedArgs = {};
        }
        const name = tc.function.name;
        const result =
          name === "list_system_users"
            ? await executeListSystemUsers(parsedArgs, callerUserId)
            : await executeRecallUserSearches(parsedArgs, callerUserId);
        toolMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          name,
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
