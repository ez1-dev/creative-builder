// Avaliador puro de regras de desconexão automática Senior.
// Não toca em rede; recebe sessões + regras + whitelist e devolve o que cairia.

export interface SessaoSeniorEval {
  numsec: number | string;
  usuario_senior?: string;
  computador?: string;
  cod_modulo?: string | number;
  modulo?: string;
  minutos_conectado?: number;
}

export type RuleKey = 'fora_horario' | 'ocioso_sem_modulo' | 'sessao_longa' | string;

export interface Rule {
  rule_key: RuleKey;
  enabled: boolean;
  params: Record<string, any>;
}

export interface Avaliacao {
  sessao: SessaoSeniorEval;
  rule_key: RuleKey;
  motivo: string;
}

const DIAS_LBL = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const horaBloqueada = (h: number, ini: number, fim: number) => {
  // Janela pode atravessar a meia-noite. Ex.: 22..06 = bloqueado se h>=22 OU h<6.
  if (ini === fim) return false;
  if (ini < fim) return h >= ini && h < fim;
  return h >= ini || h < fim;
};

const isUserSelf = (u: string | undefined, selfUpper?: string) =>
  !!selfUpper && (u ?? '').toUpperCase() === selfUpper;

export function avaliarSessoes(
  sessoes: SessaoSeniorEval[],
  rules: Rule[],
  whitelistUpper: string[],
  agora: Date = new Date(),
  selfErpUser?: string,
): Avaliacao[] {
  const wl = new Set(whitelistUpper.map((s) => s.trim().toUpperCase()).filter(Boolean));
  const selfUpper = selfErpUser ? selfErpUser.toUpperCase() : undefined;
  const ativas = rules.filter((r) => r.enabled);
  const out: Avaliacao[] = [];

  for (const s of sessoes) {
    const userUpper = (s.usuario_senior ?? '').toUpperCase();
    if (!userUpper) continue;
    if (wl.has(userUpper)) continue;
    if (isUserSelf(s.usuario_senior, selfUpper)) continue;

    for (const r of ativas) {
      const motivo = avaliarUmaRegra(s, r, agora);
      if (motivo) {
        out.push({ sessao: s, rule_key: r.rule_key, motivo });
        break; // primeira regra que disparar vence
      }
    }
  }
  return out;
}

function avaliarUmaRegra(s: SessaoSeniorEval, r: Rule, agora: Date): string | null {
  switch (r.rule_key) {
    case 'fora_horario': {
      const dias: number[] = Array.isArray(r.params?.dias_semana) ? r.params.dias_semana : [];
      const ini = Number(r.params?.hora_inicio_bloqueio ?? 22);
      const fim = Number(r.params?.hora_fim_bloqueio ?? 6);
      const dow = agora.getDay();
      const hora = agora.getHours();
      if (dias.includes(dow)) {
        return `${capitalize(DIAS_LBL[dow])} (regra: fora_horario)`;
      }
      if (horaBloqueada(hora, ini, fim)) {
        return `${capitalize(DIAS_LBL[dow])} ${pad(hora)}h fora do horário (${pad(ini)}h–${pad(fim)}h)`;
      }
      return null;
    }
    case 'ocioso_sem_modulo': {
      const minLim = Number(r.params?.minutos_sem_modulo ?? 30);
      const modsOciososRaw: string[] = Array.isArray(r.params?.modulos_considerados_ociosos)
        ? r.params.modulos_considerados_ociosos
        : ['', 'All', '-'];
      const modsOciosos = new Set(modsOciososRaw.map((m) => String(m).trim().toUpperCase()));
      const cod = String(s.cod_modulo ?? '').trim().toUpperCase();
      const modulo = String(s.modulo ?? '').trim().toUpperCase();
      const ehOcioso = modsOciosos.has(cod) || modsOciosos.has(modulo);
      if (!ehOcioso) return null;
      const min = Number(s.minutos_conectado ?? 0);
      if (min < minLim) return null;
      return `Ocioso sem módulo há ${min} min (limite ${minLim} min)`;
    }
    case 'sessao_longa': {
      const horasLim = Number(r.params?.horas_maximo ?? 12);
      const min = Number(s.minutos_conectado ?? 0);
      if (min < horasLim * 60) return null;
      const h = Math.floor(min / 60);
      return `Sessão de ${h}h (limite ${horasLim}h)`;
    }
    default:
      return null; // regras custom desconhecidas são ignoradas
  }
}

const pad = (n: number) => String(n).padStart(2, '0');
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
