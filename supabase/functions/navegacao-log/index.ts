// Edge Function: navegacao-log
// Recebe POST com payload de navegação, valida JWT, captura IP/user_agent
// e grava em public.usu_log_navegacao_erp.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, ngrok-skip-browser-warning',
};

const ACOES = [
  'ABRIU_TELA', 'TROCOU_TELA', 'FECHOU_TELA', 'HEARTBEAT',
  'entrar', 'sair', 'click', 'erro',
] as const;

const BodySchema = z.object({
  sistema: z.string().trim().min(1).max(50).default('ERP_WEB'),
  cod_tela: z.string().trim().min(1).max(200),
  nome_tela: z.string().trim().min(1).max(200),
  acao: z.enum(ACOES),
  path_url: z.string().trim().max(500).optional().nullable(),
  observacao: z.string().trim().max(1000).optional().nullable(),
  session_id: z.string().trim().max(200).optional().nullable(),
  computador: z.string().trim().max(200).optional().nullable(),
  origem_evento: z.string().trim().max(50).optional().default('ERP_WEB'),
  detalhes: z.record(z.any()).optional(),
});

function pickIp(req: Request): string | null {
  const h = req.headers;
  const xfwd = h.get('x-forwarded-for');
  if (xfwd) return xfwd.split(',')[0].trim();
  return h.get('cf-connecting-ip') || h.get('x-real-ip') || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');

    const supaUserScope = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: claimsData, error: claimsErr } = await supaUserScope.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string | undefined) ?? null;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Body inválido (JSON)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Validação falhou', detalhes: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const p = parsed.data;

    // Cliente service-role para gravar (RLS exige user_id = auth.uid(); usamos service_role
    // e atribuímos manualmente o user_id já validado pelo JWT).
    const supaAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Resolve erp_user a partir de profiles
    let erpUser: string | null = null;
    try {
      const { data: prof } = await supaAdmin
        .from('profiles')
        .select('erp_user')
        .eq('id', userId)
        .maybeSingle();
      erpUser = (prof as any)?.erp_user ?? null;
    } catch { /* segue sem erp_user */ }

    const ip = pickIp(req);
    const userAgent = req.headers.get('user-agent');

    const { data: inserted, error: insErr } = await supaAdmin
      .from('usu_log_navegacao_erp')
      .insert({
        user_id: userId,
        user_email: userEmail,
        erp_user: erpUser,
        sistema: p.sistema,
        tela_codigo: p.cod_tela,
        tela_nome: p.nome_tela,
        acao: p.acao,
        path_url: p.path_url ?? null,
        observacao: p.observacao ?? null,
        origem_evento: p.origem_evento ?? 'ERP_WEB',
        session_id: p.session_id ?? null,
        computador: p.computador ?? null,
        ip,
        user_agent: userAgent,
        detalhes: p.detalhes ?? {},
      })
      .select('id')
      .maybeSingle();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: (inserted as any)?.id ?? null }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
