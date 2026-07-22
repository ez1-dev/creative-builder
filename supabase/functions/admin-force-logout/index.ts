import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: isAdmin } = await admin.rpc('is_admin', { _uid: userData.user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas administradores' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const scope: string | undefined = body?.scope;
    const currentUserId = userData.user.id;

    // ============ MODO EM MASSA ============
    if (scope === 'all') {
      const onlyOnline: boolean = body?.onlyOnline !== false; // default true
      let targetIds: string[] = [];

      if (onlyOnline) {
        const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const { data: sessions, error: sErr } = await admin
          .from('user_sessions')
          .select('user_id')
          .gte('last_seen_at', since);
        if (sErr) throw sErr;
        targetIds = Array.from(new Set((sessions ?? []).map((s: any) => s.user_id).filter(Boolean)));
      } else {
        // todos os usuários da base
        const { data: users, error: uErr } = await admin.auth.admin.listUsers({ perPage: 1000 });
        if (uErr) throw uErr;
        targetIds = (users?.users ?? []).map((u) => u.id);
      }

      // não derrubar o próprio admin
      targetIds = targetIds.filter((id) => id !== currentUserId);

      let ok = 0;
      let falhas = 0;
      const nowIso = new Date().toISOString();

      for (const id of targetIds) {
        try {
          // @ts-ignore
          await admin.auth.admin.signOut(id, 'global');
          ok++;
        } catch (e) {
          console.warn('signOut falhou para', id, e);
          falhas++;
        }
      }

      if (targetIds.length > 0) {
        try {
          await admin
            .from('user_sessions')
            .update({ force_logout_at: nowIso })
            .in('user_id', targetIds);
        } catch (e) {
          console.warn('update user_sessions em massa falhou:', e);
        }
      }

      return new Response(JSON.stringify({ ok: true, total: targetIds.length, sucesso: ok, falhas }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============ MODO INDIVIDUAL ============
    const targetUserId: string | undefined = body?.userId;
    if (!targetUserId || typeof targetUserId !== 'string') {
      return new Response(JSON.stringify({ error: 'userId obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (targetUserId === currentUserId) {
      return new Response(JSON.stringify({ error: 'Não é possível derrubar a própria sessão' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      // @ts-ignore
      await admin.auth.admin.signOut(targetUserId, 'global');
    } catch (e) {
      console.warn('signOut admin falhou (seguindo com flag):', e);
    }

    await admin
      .from('user_sessions')
      .update({ force_logout_at: new Date().toISOString() })
      .eq('user_id', targetUserId);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('admin-force-logout error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
