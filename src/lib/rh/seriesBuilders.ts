/**
 * Builders puros que derivam TODAS as séries possíveis de cada dashboard RH
 * a partir dos dados brutos já retornados pelos endpoints — sem chamada nova
 * ao backend.
 *
 * Formato uniforme (mesmo contrato do backend):
 *   { chave, label, pontos: [{ label, valor }] }
 *
 * Uso: cada página RH passa `derivedSeries={buildXxxSeries(dashboard)}` para
 * `RhDashboardWithBiLibrary`, que faz merge com o array `series[]` vindo do
 * backend (backend tem prioridade — derivadas só preenchem chaves ausentes).
 */
import type { RhSerie, RhSeriePonto } from "./seriesAdapter";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function num(v: any): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return isFinite(n) ? n : 0;
}

function fmtCompetencia(anomes: string | undefined | null): string {
  const s = String(anomes ?? "").replace(/\D/g, "");
  if (s.length !== 6) return String(anomes ?? "");
  return `${s.slice(4, 6)}/${s.slice(0, 4)}`;
}

function groupSum<T>(
  rows: T[] | undefined | null,
  keyFn: (r: T) => string | undefined | null,
  valueFn: (r: T) => number = () => 1,
  { limit, sort = "desc" }: { limit?: number; sort?: "desc" | "asc" | "none" } = {},
): RhSeriePonto[] {
  const map = new Map<string, number>();
  (rows ?? []).forEach((r) => {
    const k = (keyFn(r) ?? "").toString().trim();
    if (!k) return;
    map.set(k, (map.get(k) ?? 0) + valueFn(r));
  });
  let pts: RhSeriePonto[] = Array.from(map.entries()).map(([label, valor]) => ({ label, valor }));
  if (sort === "desc") pts.sort((a, b) => b.valor - a.valor);
  else if (sort === "asc") pts.sort((a, b) => a.valor - b.valor);
  if (limit && pts.length > limit) pts = pts.slice(0, limit);
  return pts;
}

function serie(chave: string, label: string, pontos: RhSeriePonto[]): RhSerie | null {
  if (!pontos.length) return null;
  return { chave, label, pontos };
}

function compact(list: (RhSerie | null | undefined)[]): RhSerie[] {
  return list.filter((s): s is RhSerie => !!s && s.pontos.length > 0);
}

function mesFromISO(d: string | null | undefined): string | null {
  if (!d) return null;
  const m = /^(\d{4})-(\d{2})/.exec(String(d));
  if (!m) return null;
  return `${m[2]}/${m[1]}`;
}

function faixaEtaria(dob: string | null | undefined): string | null {
  if (!dob) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dob));
  if (!m) return null;
  const age = new Date().getFullYear() - Number(m[1]);
  if (age < 20) return "<20";
  if (age < 30) return "20-29";
  if (age < 40) return "30-39";
  if (age < 50) return "40-49";
  if (age < 60) return "50-59";
  return "60+";
}

function tempoCasa(admissao: string | null | undefined): string | null {
  if (!admissao) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(admissao));
  if (!m) return null;
  const anos = (Date.now() - new Date(`${m[1]}-${m[2]}-${m[3]}`).getTime()) / (365.25 * 86400_000);
  if (anos < 1) return "<1 ano";
  if (anos < 3) return "1-3 anos";
  if (anos < 5) return "3-5 anos";
  if (anos < 10) return "5-10 anos";
  return "10+ anos";
}

// ─────────────────────────────────────────────────────────────────────────────
// RH-01 Resumo Folha
// ─────────────────────────────────────────────────────────────────────────────

export function buildResumoFolhaSeries(dash: any): RhSerie[] {
  if (!dash) return [];
  const mensal: any[] = dash.mensal ?? [];
  const filiais: any[] = dash.filiais ?? [];
  const proventos: any[] = dash.proventos_vantagens ?? [];
  const descontos: any[] = dash.descontos ?? [];
  const tiposEvento: any[] = dash.tipos_evento ?? [];

  const mensalSort = [...mensal].sort((a, b) =>
    String(a.competencia ?? "").localeCompare(String(b.competencia ?? "")),
  );

  return compact([
    serie(
      "custo_por_mes",
      "Custo Mensal por Competência",
      mensalSort.map((m) => ({ label: fmtCompetencia(m.competencia), valor: num(m.custo_mensal) })),
    ),
    serie(
      "provento_por_mes",
      "Proventos por Competência",
      mensalSort.map((m) => ({ label: fmtCompetencia(m.competencia), valor: num(m.provento) })),
    ),
    serie(
      "desconto_por_mes",
      "Descontos por Competência",
      mensalSort.map((m) => ({ label: fmtCompetencia(m.competencia), valor: num(m.desconto) })),
    ),
    serie(
      "liquido_por_mes",
      "Líquido por Competência",
      mensalSort.map((m) => ({ label: fmtCompetencia(m.competencia), valor: num(m.total_liquido) })),
    ),
    serie(
      "hora_extra_por_mes",
      "Custo Hora Extra por Competência",
      mensalSort.map((m) => ({ label: fmtCompetencia(m.competencia), valor: num(m.custo_hora_extra) })),
    ),
    serie(
      "custo_por_filial",
      "Custo Total por Filial",
      groupSum(filiais, (f) => f.filial, (f) => num(f.custo_total)),
    ),
    serie(
      "liquido_por_filial",
      "Líquido por Filial",
      groupSum(filiais, (f) => f.filial, (f) => num(f.liquido)),
    ),
    serie(
      "he_por_filial",
      "Hora Extra por Filial",
      groupSum(filiais, (f) => f.filial, (f) => num(f.custo_hora_extra)),
    ),
    serie(
      "beneficios_por_filial",
      "Benefícios por Filial",
      groupSum(filiais, (f) => f.filial, (f) => num(f.beneficios)),
    ),
    serie(
      "top_proventos",
      "Top 15 Proventos e Vantagens",
      groupSum(
        proventos,
        (p) => p.descricao ?? p.ds_evento ?? p.codigo ?? p.cd_evento,
        (p) => num(p.valor),
        { limit: 15 },
      ),
    ),
    serie(
      "top_descontos",
      "Top 15 Descontos",
      groupSum(
        descontos,
        (p) => p.descricao ?? p.ds_evento ?? p.codigo ?? p.cd_evento,
        (p) => num(p.valor),
        { limit: 15 },
      ),
    ),
    serie(
      "por_tipo_evento",
      "Distribuição por Tipo de Evento",
      groupSum(tiposEvento, (t) => t.tipo ?? t.cd_tp_evento, (t) => num(t.valor)),
    ),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// RH-02 Quadro Colaboradores
// ─────────────────────────────────────────────────────────────────────────────

export function buildQuadroSeries(dash: any, rows?: any[] | null): RhSerie[] {
  if (!dash && !rows?.length) return [];
  const bd = (arr: any[] | undefined | null): RhSeriePonto[] =>
    (arr ?? [])
      .filter((x) => x && x.label != null)
      .map((x) => ({ label: String(x.label), valor: num(x.valor) }));

  const list = rows ?? [];

  return compact([
    serie("por_sexo", "Distribuição por Sexo", bd(dash?.sexo)),
    serie("por_situacao", "Por Situação", bd(dash?.situacao)),
    serie("por_vinculo", "Por Tipo de Vínculo", bd(dash?.vinculo)),
    serie("por_escolaridade", "Por Escolaridade", bd(dash?.escolaridade)),
    serie("por_faixa_etaria", "Por Faixa Etária", bd(dash?.faixa_etaria)),
    serie("por_tempo_casa", "Por Tempo de Casa", bd(dash?.tempo_casa)),
    serie("por_filial", "Por Filial", bd(dash?.filial)),
    serie("por_empresa", "Por Empresa", bd(dash?.empresa)),

    // Derivadas a partir dos rows crus (quando disponíveis)
    serie(
      "por_cargo",
      "Top 20 Cargos",
      groupSum(list, (r) => r.cargo, () => 1, { limit: 20 }),
    ),
    serie(
      "por_centro_custo",
      "Top 20 Centros de Custo",
      groupSum(list, (r) => r.centro_custo, () => 1, { limit: 20 }),
    ),
    serie(
      "por_local",
      "Por Local",
      groupSum(list, (r) => r.local, () => 1, { limit: 20 }),
    ),
    serie(
      "por_faixa_etaria_calc",
      "Por Faixa Etária (calculada)",
      groupSum(list, (r) => faixaEtaria(r.data_nascimento), () => 1, { sort: "none" }),
    ),
    serie(
      "por_tempo_casa_calc",
      "Por Tempo de Casa (calculado)",
      groupSum(list, (r) => tempoCasa(r.data_admissao), () => 1, { sort: "none" }),
    ),
    serie(
      "admissoes_por_mes",
      "Admissões por Mês",
      groupSum(list, (r) => mesFromISO(r.data_admissao), () => 1, { sort: "asc" }).slice(-24),
    ),
    serie(
      "demissoes_por_mes",
      "Demissões por Mês",
      groupSum(list, (r) => mesFromISO(r.data_demissao), () => 1, { sort: "asc" }).slice(-24),
    ),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// RH-03 Contrato de Experiência
// ─────────────────────────────────────────────────────────────────────────────

export function buildContratoExpSeries(dash: any): RhSerie[] {
  const rows: any[] = dash?.vencimentos ?? [];
  if (!rows.length) return [];

  const faixaRest = (d: number | null | undefined): string | null => {
    if (d == null) return null;
    if (d <= 5) return "<=5 dias";
    if (d <= 10) return "6-10 dias";
    if (d <= 30) return "11-30 dias";
    if (d <= 60) return "31-60 dias";
    return "60+ dias";
  };
  const faixaVenc = (d: number | null | undefined): string | null => {
    if (d == null || d <= 0) return null;
    if (d <= 5) return "1-5 dias";
    if (d <= 15) return "6-15 dias";
    if (d <= 30) return "16-30 dias";
    return "30+ dias";
  };

  return compact([
    serie("por_status", "Contratos por Status", groupSum(rows, (r) => r.status)),
    serie("por_empresa", "Contratos por Empresa", groupSum(rows, (r) => r.empresa)),
    serie("por_filial", "Contratos por Filial", groupSum(rows, (r) => r.filial)),
    serie("por_cargo", "Top 15 Cargos", groupSum(rows, (r) => r.cargo, () => 1, { limit: 15 })),
    serie(
      "por_mes_1o_vencimento",
      "1º Vencimento por Mês",
      groupSum(rows, (r) => mesFromISO(r.dt_primeiro_vencimento), () => 1, { sort: "asc" }),
    ),
    serie(
      "por_mes_2o_vencimento",
      "2º Vencimento por Mês",
      groupSum(rows, (r) => mesFromISO(r.dt_segundo_vencimento), () => 1, { sort: "asc" }),
    ),
    serie(
      "por_mes_admissao",
      "Admissões por Mês",
      groupSum(rows, (r) => mesFromISO(r.dt_admissao), () => 1, { sort: "asc" }),
    ),
    serie(
      "faixa_dias_restantes",
      "Faixa de Dias Restantes",
      groupSum(rows, (r) => faixaRest(r.dias_restantes), () => 1, { sort: "none" }),
    ),
    serie(
      "faixa_dias_vencido",
      "Faixa de Dias Vencido",
      groupSum(rows, (r) => faixaVenc(r.dias_vencido), () => 1, { sort: "none" }),
    ),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// RH-04 Férias
// ─────────────────────────────────────────────────────────────────────────────

export function buildFeriasSeries(dash: any): RhSerie[] {
  if (!dash) return [];
  const detalhe: any[] = dash.detalhe ?? [];
  const prox90: any[] = dash.programacao_proximos_90_dias ?? [];
  const deFerias: any[] = dash.de_ferias_detalhe ?? [];
  const semProg: any[] = dash.primeiro_vencimento_sem_programacao ?? [];
  const pivot: any[] = dash.limite_ferias_pivot ?? [];

  const faixaSaldo = (n: number | null | undefined): string | null => {
    if (n == null) return null;
    if (n <= 0) return "0 dias";
    if (n <= 10) return "1-10 dias";
    if (n <= 20) return "11-20 dias";
    if (n <= 30) return "21-30 dias";
    return "30+ dias";
  };

  // Pivot ano→meses vira uma série de totais por ano
  const pivotSerie: RhSeriePonto[] = pivot.map((row) => ({
    label: String(row.ano ?? ""),
    valor: num(row.total),
  }));

  return compact([
    serie("por_status", "Períodos por Status", groupSum(detalhe, (r) => r.status)),
    serie("por_empresa", "Períodos por Empresa", groupSum(detalhe, (r) => r.empresa)),
    serie("por_filial", "Períodos por Filial", groupSum(detalhe, (r) => r.filial)),
    serie("por_cargo", "Top 15 Cargos", groupSum(detalhe, (r) => r.cargo, () => 1, { limit: 15 })),
    serie(
      "por_mes_limite",
      "Limite de Saída por Mês",
      groupSum(detalhe, (r) => mesFromISO(r.dt_limite_saida), () => 1, { sort: "asc" }),
    ),
    serie(
      "por_ano_limite",
      "Limite de Saída por Ano",
      groupSum(detalhe, (r) => (r.ano_limite ? String(r.ano_limite) : null), () => 1, { sort: "asc" }),
    ),
    serie(
      "saldo_por_faixa",
      "Saldo de Dias por Faixa",
      groupSum(detalhe, (r) => faixaSaldo(r.qtd_dias_saldo), () => 1, { sort: "none" }),
    ),
    serie(
      "programados_por_mes",
      "Programações por Mês (Próximos 90d)",
      groupSum(prox90, (r) => mesFromISO(r.dt_programacao), (r) => num(r.qtd_dias_programado), { sort: "asc" }),
    ),
    serie("de_ferias_por_empresa", "De Férias por Empresa", groupSum(deFerias, (r) => r.empresa)),
    serie("de_ferias_por_filial", "De Férias por Filial", groupSum(deFerias, (r) => r.filial)),
    serie("sem_programacao_por_empresa", "Sem Programação por Empresa", groupSum(semProg, (r) => r.empresa)),
    serie("sem_programacao_por_filial", "Sem Programação por Filial", groupSum(semProg, (r) => r.filial)),
    serie("limite_pivot_por_ano", "Limite de Férias — Total por Ano", pivotSerie),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// RH-05 Turnover
// ─────────────────────────────────────────────────────────────────────────────

export function buildTurnoverSeries(dash: any): RhSerie[] {
  if (!dash) return [];
  const porMes: any[] = dash.por_mes ?? [];
  const porMotivo: any[] = dash.por_motivo ?? [];
  const porEmpresa: any[] = dash.por_empresa ?? [];
  const admitidos: any[] = dash.detalhe_admitidos ?? [];
  const demitidos: any[] = dash.detalhe_demitidos ?? [];

  const porMesSort = [...porMes].sort((a, b) => String(a.anomes).localeCompare(String(b.anomes)));

  return compact([
    serie(
      "admitidos_por_mes",
      "Admissões por Mês",
      porMesSort.map((m) => ({ label: fmtCompetencia(m.anomes), valor: num(m.admitidos) })),
    ),
    serie(
      "demitidos_por_mes",
      "Demissões por Mês",
      porMesSort.map((m) => ({ label: fmtCompetencia(m.anomes), valor: num(m.demitidos) })),
    ),
    serie(
      "saldo_por_mes",
      "Saldo (Admitidos - Demitidos) por Mês",
      porMesSort.map((m) => ({ label: fmtCompetencia(m.anomes), valor: num(m.admitidos) - num(m.demitidos) })),
    ),
    serie(
      "por_motivo",
      "Motivos de Desligamento",
      porMotivo.map((r) => ({ label: String(r.motivo ?? ""), valor: num(r.qtd) })),
    ),
    serie(
      "admitidos_por_empresa",
      "Admitidos por Empresa",
      porEmpresa.map((r) => ({ label: String(r.label ?? ""), valor: num(r.admitidos) })),
    ),
    serie(
      "demitidos_por_empresa",
      "Demitidos por Empresa",
      porEmpresa.map((r) => ({ label: String(r.label ?? ""), valor: num(r.demitidos) })),
    ),
    serie(
      "admitidos_por_cargo",
      "Admitidos por Cargo (Top 15)",
      groupSum(admitidos, (r) => r.cargo, () => 1, { limit: 15 }),
    ),
    serie(
      "demitidos_por_cargo",
      "Demitidos por Cargo (Top 15)",
      groupSum(demitidos, (r) => r.cargo, () => 1, { limit: 15 }),
    ),
    serie("admitidos_por_filial", "Admitidos por Filial", groupSum(admitidos, (r) => r.filial)),
    serie("demitidos_por_filial", "Demitidos por Filial", groupSum(demitidos, (r) => r.filial)),
    serie(
      "demitidos_por_motivo_detalhe",
      "Demitidos por Motivo (detalhe)",
      groupSum(demitidos, (r) => r.motivo, () => 1, { limit: 20 }),
    ),
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// RH-06 Absenteísmo
// ─────────────────────────────────────────────────────────────────────────────

export function buildAbsenteismoSeries(dash: any): RhSerie[] {
  if (!dash) return [];
  const porCategoria: any[] = dash.por_categoria ?? [];
  const porMotivo: any[] = dash.por_motivo ?? [];
  const porMes: any[] = dash.por_mes ?? [];
  const porEmpresa: any[] = dash.por_empresa ?? [];
  const detalhe: any[] = dash.detalhe ?? [];

  const mesSort = [...porMes].sort((a, b) => String(a.anomes).localeCompare(String(b.anomes)));

  return compact([
    serie(
      "dias_por_categoria",
      "Dias por Categoria",
      porCategoria.map((r) => ({ label: String(r.categoria ?? ""), valor: num(r.dias) })),
    ),
    serie(
      "afastamentos_por_categoria",
      "Afastamentos por Categoria",
      porCategoria.map((r) => ({ label: String(r.categoria ?? ""), valor: num(r.afastamentos) })),
    ),
    serie(
      "colab_por_categoria",
      "Colaboradores por Categoria",
      porCategoria.map((r) => ({ label: String(r.categoria ?? ""), valor: num(r.colaboradores) })),
    ),
    serie(
      "dias_por_mes",
      "Dias por Mês",
      mesSort.map((r) => ({ label: fmtCompetencia(r.anomes), valor: num(r.dias) })),
    ),
    serie(
      "afastamentos_por_mes",
      "Afastamentos por Mês",
      mesSort.map((r) => ({ label: fmtCompetencia(r.anomes), valor: num(r.afastamentos) })),
    ),
    serie(
      "dias_por_empresa",
      "Dias por Empresa",
      porEmpresa.map((r) => ({ label: String(r.label ?? ""), valor: num(r.dias) })),
    ),
    serie(
      "afastamentos_por_empresa",
      "Afastamentos por Empresa",
      porEmpresa.map((r) => ({ label: String(r.label ?? ""), valor: num(r.afastamentos) })),
    ),
    serie(
      "colab_por_empresa",
      "Colaboradores por Empresa",
      porEmpresa.map((r) => ({ label: String(r.label ?? ""), valor: num(r.colaboradores) })),
    ),
    serie(
      "dias_por_motivo",
      "Dias por Motivo (Top 15)",
      groupSum(porMotivo, (r) => r.motivo, (r) => num(r.dias), { limit: 15 }),
    ),
    serie(
      "afastamentos_por_motivo",
      "Afastamentos por Motivo (Top 15)",
      groupSum(porMotivo, (r) => r.motivo, (r) => num(r.afastamentos), { limit: 15 }),
    ),
    serie(
      "dias_por_cargo",
      "Dias por Cargo (Top 15)",
      groupSum(detalhe, (r) => r.cargo, (r) => num(r.dias), { limit: 15 }),
    ),
    serie(
      "dias_por_filial",
      "Dias por Filial",
      groupSum(detalhe, (r) => r.filial, (r) => num(r.dias)),
    ),
    serie(
      "duracao_media_por_categoria",
      "Duração Média (dias) por Categoria",
      porCategoria
        .map((r) => {
          const af = num(r.afastamentos);
          return {
            label: String(r.categoria ?? ""),
            valor: af > 0 ? num(r.dias) / af : 0,
          };
        })
        .filter((p) => p.valor > 0),
    ),
  ]);
}
