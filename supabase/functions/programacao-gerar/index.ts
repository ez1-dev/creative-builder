import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Payload {
  data_ini?: string;
  data_fim?: string;
  data_inicio_programacao?: string;
  situacoes?: string; // 'A,L'
  unidade_negocio?: string;
  codcre?: string;
  permitir_quebra_operacao?: boolean;
  limpar_anterior?: boolean;
}

interface FilaRow {
  id: string;
  codemp: number;
  unidade_negocio: string | null;
  tipo_recurso: string | null;
  codcre: string;
  descre: string | null;
  codori: string | null;
  numorp: string;
  codpro: string | null;
  codopr: string | null;
  descricao_operacao: string | null;
  tempo_previsto_min: number;
  prioridade: number;
  data_geracao_op: string | null;
}

interface Capacidade {
  codemp: number;
  codcre: string;
  descre: string | null;
  minutos_dia: number;
  qtde_recursos: number;
  eficiencia_perc: number;
  hora_inicio: string;
  considerar_sabado: boolean;
  considerar_domingo: boolean;
  ativo: boolean;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function isWorkingDay(d: Date, cap: Capacidade): boolean {
  const dow = d.getUTCDay(); // 0=Dom 6=Sáb
  if (dow === 0 && !cap.considerar_domingo) return false;
  if (dow === 6 && !cap.considerar_sabado) return false;
  return true;
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addMinutesToTime(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload: Payload = await req.json().catch(() => ({}));
    const admin = createClient(supabaseUrl, serviceKey);

    // --- 1. Carregar fila ---
    const situacoes = (payload.situacoes ?? 'A,L')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let q = admin.from('bi_ops_fila').select('*').in('situacao', situacoes);
    if (payload.unidade_negocio) q = q.eq('unidade_negocio', payload.unidade_negocio);
    if (payload.codcre) q = q.eq('codcre', payload.codcre);
    const { data: fila, error: filaErr } = await q
      .order('prioridade', { ascending: true })
      .order('data_geracao_op', { ascending: true });
    if (filaErr) throw filaErr;

    const filaRows = (fila ?? []) as FilaRow[];

    // --- 1.b. Carregar overrides de prioridade manual (PCP) ---
    const { data: prioOv } = await admin
      .from('producao_prioridade_op')
      .select('codemp,numorp,prioridade');
    const prioMap = new Map<string, number>();
    for (const p of (prioOv ?? []) as { codemp: number; numorp: string; prioridade: number }[]) {
      prioMap.set(`${p.codemp}|${p.numorp}`, p.prioridade);
    }
    for (const r of filaRows) {
      const ov = prioMap.get(`${r.codemp}|${r.numorp}`);
      if (ov != null) r.prioridade = ov;
    }
    // Reordena com override aplicado
    filaRows.sort((a, b) => {
      if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
      const da = a.data_geracao_op ?? '9999-12-31';
      const db = b.data_geracao_op ?? '9999-12-31';
      return da.localeCompare(db);
    });


    // --- 2. Carregar capacidades ---
    const { data: caps, error: capErr } = await admin
      .from('programacao_capacidades')
      .select('*')
      .eq('ativo', true);
    if (capErr) throw capErr;
    const capByKey = new Map<string, Capacidade>();
    for (const c of (caps ?? []) as Capacidade[]) {
      capByKey.set(`${c.codemp}|${c.codcre}`, c);
    }

    // --- 3. Limpar anterior se solicitado ---
    if (payload.limpar_anterior) {
      let del = admin.from('programacao_agenda').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (payload.codcre) del = del.eq('codcre', payload.codcre);
      if (payload.unidade_negocio) del = del.eq('unidade_negocio', payload.unidade_negocio);
      if (payload.data_inicio_programacao) del = del.gte('data_programada', payload.data_inicio_programacao);
      await del;
    }

    // --- 4. Algoritmo: para cada codcre, manter cursor de (data, minutos_usados) ---
    const lote = crypto.randomUUID();
    const inicio = payload.data_inicio_programacao
      ? new Date(payload.data_inicio_programacao + 'T00:00:00Z')
      : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');

    type Cursor = { data: Date; usados: number };
    const cursores = new Map<string, Cursor>();

    const linhas: any[] = [];
    let semCapacidade = 0;
    const recursosSemCapSet = new Map<string, string>();

    for (const op of filaRows) {
      const key = `${op.codemp}|${op.codcre}`;
      const cap = capByKey.get(key);
      if (!cap) {
        semCapacidade += 1;
        recursosSemCapSet.set(op.codcre, op.descre ?? '');
        continue;
      }

      const capDia = Math.floor(cap.minutos_dia * cap.qtde_recursos * (cap.eficiencia_perc / 100));
      if (capDia <= 0) {
        semCapacidade += 1;
        recursosSemCapSet.set(op.codcre, op.descre ?? '');
        continue;
      }

      let cursor = cursores.get(key);
      if (!cursor) cursor = { data: new Date(inicio), usados: 0 };

      // Avança para próximo dia útil
      while (!isWorkingDay(cursor.data, cap)) {
        cursor.data = addDays(cursor.data, 1);
        cursor.usados = 0;
      }

      let restante = Math.max(0, Math.round(op.tempo_previsto_min));
      let segmento = 1;

      while (restante > 0) {
        const disponivel = capDia - cursor.usados;
        if (disponivel <= 0) {
          cursor.data = addDays(cursor.data, 1);
          cursor.usados = 0;
          while (!isWorkingDay(cursor.data, cap)) cursor.data = addDays(cursor.data, 1);
          continue;
        }

        const alocar = payload.permitir_quebra_operacao
          ? Math.min(restante, disponivel)
          : restante > disponivel
          ? restante // sem quebra: aloca tudo num dia (pode estourar)
          : restante;

        if (!payload.permitir_quebra_operacao && restante > disponivel) {
          // sem quebra → pula para próximo dia útil em que cabe inteiro
          cursor.data = addDays(cursor.data, 1);
          cursor.usados = 0;
          while (!isWorkingDay(cursor.data, cap)) cursor.data = addDays(cursor.data, 1);
          continue;
        }

        const horaInicio = addMinutesToTime(cap.hora_inicio, cursor.usados);
        const horaFim = addMinutesToTime(cap.hora_inicio, cursor.usados + alocar);

        linhas.push({
          lote_programacao: lote,
          data_programada: fmtDate(cursor.data),
          hora_inicio: horaInicio,
          hora_fim: horaFim,
          codemp: op.codemp,
          unidade_negocio: op.unidade_negocio,
          tipo_recurso: op.tipo_recurso,
          codcre: op.codcre,
          descre: op.descre ?? cap.descre,
          codori: op.codori,
          numorp: op.numorp,
          codpro: op.codpro,
          codopr: op.codopr,
          descricao_operacao: op.descricao_operacao,
          tempo_alocado_min: alocar,
          segmento,
          status_programacao: 'PROGRAMADO',
        });

        cursor.usados += alocar;
        restante -= alocar;
        segmento += 1;

        if (cursor.usados >= capDia && restante > 0) {
          cursor.data = addDays(cursor.data, 1);
          cursor.usados = 0;
          while (!isWorkingDay(cursor.data, cap)) cursor.data = addDays(cursor.data, 1);
        }
      }

      cursores.set(key, cursor);
    }

    if (linhas.length > 0) {
      // Inserir em lotes de 500
      for (let i = 0; i < linhas.length; i += 500) {
        const chunk = linhas.slice(i, i + 500);
        const { error: insErr } = await admin.from('programacao_agenda').insert(chunk);
        if (insErr) throw insErr;
      }
    }

    const recursos_sem_capacidade = Array.from(recursosSemCapSet.entries()).map(
      ([codcre, descre]) => ({ codcre, descre }),
    );

    return new Response(
      JSON.stringify({
        lote_programacao: lote,
        qtd_operacoes_fila: filaRows.length,
        qtd_linhas_programadas: linhas.length,
        qtd_sem_capacidade: semCapacidade,
        qtd_sem_saldo: 0,
        recursos_sem_capacidade,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
