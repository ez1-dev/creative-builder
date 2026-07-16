// Edge function: gera comentários executivos (destaques, alertas, recomendações)
// Aceita `modulo` (faturamento | passagens | frota | maquinas) com prompt específico.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface IaResponse {
  destaques: string[];
  alertas: string[];
  recomendacoes: string[];
  pareto_analise?: string;
}

const MODULO_DESC: Record<string, { titulo: string; foco: string; persona: string }> = {
  faturamento: {
    titulo: 'FATURAMENTO',
    foco: 'receita, mix de produtos/clientes/regiões, margem, impostos, devoluções, atingimento de metas',
    persona: 'analista financeiro sênior',
  },
  passagens: {
    titulo: 'PASSAGENS AÉREAS / VIAGENS',
    foco: 'custos com viagens, top colaboradores, destinos, companhias aéreas, sazonalidade de viagens, oportunidades de redução de despesa',
    persona: 'controller de despesas corporativas',
  },
  frota: {
    titulo: 'MANUTENÇÃO DE FROTA',
    foco: 'custo total de manutenção, custo por veículo, tipos de serviço mais caros, fornecedores recorrentes, sinais de manutenção preventiva, custos por km',
    persona: 'gestor de frota',
  },
  maquinas: {
    titulo: 'MANUTENÇÃO DE MÁQUINAS / EQUIPAMENTOS',
    foco: 'custo total de manutenção, máquinas críticas, tipos de equipamento mais caros, fornecedores recorrentes, indicação de manutenção preventiva, concentração de gastos',
    persona: 'gestor industrial / engenharia de manutenção',
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY ausente' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const modulo = String(body?.modulo ?? 'faturamento').toLowerCase();
    const cfg = MODULO_DESC[modulo] ?? MODULO_DESC.faturamento;

    const { contexto, kpis, mensal, rankings, metas, pareto } = body ?? {};

    const paretoSection = pareto
      ? `\nPARETO 80/20 (${pareto.dimensao}): ${JSON.stringify(pareto)}\n` +
        `Inclua nos arrays acima pelo menos 1 destaque, 1 alerta e 1 recomendação ESPECÍFICOS sobre a concentração 80/20. ` +
        `Adicione também "pareto_analise": parágrafo de 2-3 frases analisando a concentração (quantos itens vitais, % do top 5).`
      : '';

    const prompt = `Você é ${cfg.persona}. Escreva comentários para um relatório executivo de ${cfg.titulo} destinado à diretoria.
Foco: ${cfg.foco}.

PADRÃO EDITORIAL (obrigatório em CADA bullet):
1. Abertura numérica: comece pelo número que importa em pt-BR — valor absoluto + Δ absoluto + Δ % ("R$ 12,4 mi (+R$ 1,3 mi, +11,7% vs mês anterior)"). Percentuais com 1 casa decimal; use "mi"/"mil".
2. Comparativo triplo quando o payload permitir: vs mês anterior, YTD e meta (destaque o gap em R$ e p.p. até a meta).
3. Materialidade primeiro: cite apenas os 3–5 movimentos de maior impacto no resultado.
4. Causa provável: identifique os top 3 clientes/produtos/regiões/veículos/máquinas/fornecedores que explicam o desvio, com % de contribuição.
5. Recomendação acionável: verbo no infinitivo + responsável + prazo + KPI alvo ("Renegociar contrato com Fornecedor X até dd/mm; meta de reduzir 8% do custo unitário").
6. Risco classificado: rotule alertas como [Financeiro], [Operacional], [Comercial] ou [Fiscal] com exposição em R$ quando possível.
7. Higiene numérica: NUNCA invente números fora do payload; se um campo faltar, escreva "não informado no período".
8. Tom executivo: PT-BR, voz ativa, frases curtas (≤22 palavras), sem jargão ("sinergia", "alavancar"), sem adjetivo vazio.

CONTEXTO: ${JSON.stringify(contexto ?? {})}
KPIS: ${JSON.stringify(kpis ?? {})}
EVOLUÇÃO (últimos pontos): ${JSON.stringify(Array.isArray(mensal) ? mensal.slice(-12) : (mensal ?? []))}
RANKINGS (top): ${JSON.stringify(rankings ?? {})}
${metas ? `METAS: ${JSON.stringify(metas)}` : ''}${paretoSection}

Responda APENAS um JSON com este formato exato:
{
  "destaques": ["...", "...", "..."],
  "alertas": ["...", "..."],
  "recomendacoes": ["...", "...", "..."]${pareto ? ',\n  "pareto_analise": "..."' : ''}
}
- 3 a 5 destaques: fatos positivos quantificados (superação de meta, ganho de mix, redução de custo), sempre com número na abertura.
- 2 a 4 alertas: riscos rotulados com exposição em R$ e o cliente/produto/veículo que puxa o desvio.
- 3 a 5 recomendações: ações com responsável, prazo e KPI alvo mensurável.`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: `Você é ${cfg.persona} escrevendo em PT-BR para diretoria. Cada bullet começa por número (valor + Δ absoluto + Δ %), cita causa provável (top clientes/produtos/fornecedores) e recomendação com responsável e prazo. Nunca invente números fora do payload. Responda em JSON válido conforme o schema solicitado.` },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      const status = res.status === 429 || res.status === 402 ? res.status : 500;
      return new Response(JSON.stringify({ error: `Lovable AI falhou (${res.status}): ${txt}` }), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? '{}';
    let parsed: IaResponse;
    try {
      parsed = typeof content === 'string' ? JSON.parse(content) : content;
    } catch {
      parsed = { destaques: [], alertas: [], recomendacoes: [] };
    }

    const safeList = (v: any) => Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, 6) : [];

    return new Response(JSON.stringify({
      destaques: safeList(parsed.destaques),
      alertas: safeList(parsed.alertas),
      recomendacoes: safeList(parsed.recomendacoes),
      pareto_analise: typeof parsed.pareto_analise === 'string' ? parsed.pareto_analise : null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'erro desconhecido' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
