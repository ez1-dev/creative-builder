// Edge Function: sync-metas-upquery
// Proxy seguro entre o frontend autenticado e a FastAPI que sincroniza
// as metas de faturamento da UpQuery. Mantém o CRON_SECRET no servidor.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, ngrok-skip-browser-warning',
};

const BodySchema = z.object({
  anomes_ini: z.string().regex(/^\d{6}$/),
  anomes_fim: z.string().regex(/^\d{6}$/),
  origem: z.string().trim().min(1).default('UPQUERY_VM_FATURAMENTO'),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Autenticação: exige usuário Lovable Cloud logado.
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid body', detalhes: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const body = parsed.data;

    const baseUrl = (Deno.env.get('FASTAPI_BASE_URL') ?? '').replace(/\/+$/, '');
    const cronSecret = Deno.env.get('CRON_SECRET') ?? '';
    if (!baseUrl || !cronSecret) {
      return new Response(
        JSON.stringify({ error: 'FastAPI não configurada (FASTAPI_BASE_URL ou CRON_SECRET ausentes).' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const url = `${baseUrl}/api/bi/comercial/metas/sincronizar`;
    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': cronSecret,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      return new Response(
        JSON.stringify({
          ok: false,
          status: 0,
          error: `Falha de rede ao chamar a FastAPI: ${String((e as Error)?.message ?? e)}`,
          periodo: body,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const text = await resp.text();
    let data: unknown = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!resp.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          status: resp.status,
          error: typeof data === 'object' && data && 'detail' in (data as any)
            ? (data as any).detail
            : (typeof data === 'string' ? data : 'Erro na FastAPI'),
          data,
          periodo: body,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, status: resp.status, data, periodo: body }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String((e as Error)?.message ?? e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
