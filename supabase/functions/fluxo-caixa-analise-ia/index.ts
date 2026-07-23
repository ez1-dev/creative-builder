// Edge function: Análise (IA) do Fluxo de Caixa usando Lovable AI Gateway.
// Recebe os payloads de projeção + realizado direto/indireto e streama a
// narrativa em formato SSE (event: meta | delta | done | erro) para a UI.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MODEL = 'google/gemini-2.5-pro';

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function buildPrompt(body: any): string {
  const { periodo, projecao, direto, indireto } = body ?? {};
  const trim = (obj: any) => JSON.stringify(obj ?? null);
  return `Você é um analista de tesouraria sênior. Escreva uma análise executiva do Fluxo de Caixa em PT-BR, em Markdown, usando EXATAMENTE as seções abaixo (H2):

## Resumo executivo
## Projeção e saldo mínimo
## Vencidos (não entram na curva)
## DFC Realizado — Método Direto
## DFC Realizado — Método Indireto
## Riscos
## Recomendações

Regras:
- Cite valores em R$ com 2 casas quando fizer sentido; use "mi"/"mil" para números grandes.
- Não invente dados fora do payload. Se um campo faltar, escreva "não informado no período".
- Frases curtas, voz ativa, sem jargão vazio ("sinergia", "alavancar").
- Se a conciliação (Direto/Indireto) estiver ativa (conciliado=true) reforce a confiabilidade; se estiver false, marque como alerta.
- Nas Recomendações use verbos no infinitivo + responsável sugerido + prazo + KPI alvo.

PERÍODO: ${trim(periodo)}
PROJEÇÃO: ${trim(projecao)}
REALIZADO DIRETO: ${trim(direto)}
REALIZADO INDIRETO: ${trim(indireto)}
`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    return new Response(
      sseEvent('erro', { erro: 'LOVABLE_API_KEY ausente no servidor.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } },
    );
  }

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  const prompt = buildPrompt(body);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => controller.enqueue(enc.encode(sseEvent(event, data)));

      try {
        send('meta', { modelo: MODEL, periodo: body?.periodo ?? null, provider: 'lovable-ai' });

        const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: MODEL,
            stream: true,
            messages: [
              { role: 'system', content: 'Você escreve análises financeiras claras e objetivas em PT-BR (Markdown).' },
              { role: 'user', content: prompt },
            ],
          }),
        });

        if (!resp.ok || !resp.body) {
          const txt = await resp.text().catch(() => '');
          if (resp.status === 429) {
            send('erro', { erro: 'Limite de requisições da IA do Lovable atingido. Aguarde alguns instantes e tente novamente.' });
          } else if (resp.status === 402) {
            send('erro', { erro: 'Créditos de IA esgotados no workspace Lovable. Adicione créditos em Configurações do workspace.' });
          } else {
            send('erro', { erro: txt || `Falha no gateway de IA (HTTP ${resp.status}).` });
          }
          controller.close();
          return;
        }

        const reader = resp.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        let chars = 0;
        let finishReason: string | undefined;

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const raw of lines) {
            const line = raw.trim();
            if (!line || !line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const j = JSON.parse(payload);
              const choice = j?.choices?.[0];
              const delta: string = choice?.delta?.content ?? '';
              if (delta) { chars += delta.length; send('delta', { text: delta }); }
              if (choice?.finish_reason) finishReason = String(choice.finish_reason);
            } catch { /* ignora frames parciais */ }
          }
        }

        send('done', { chars, finish_reason: finishReason ?? 'stop' });
        controller.close();
      } catch (e: any) {
        try { send('erro', { erro: e?.message || 'Falha inesperada ao gerar análise.' }); } catch { /* noop */ }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
});
