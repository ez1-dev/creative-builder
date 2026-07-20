import { Document, Page, Text, View } from "@react-pdf/renderer";
import type {
  ResumoFolhaDashboard,
  QuadroColaboradorItem,
  ContratoExperienciaDashboard,
  ProgramacaoFeriasDashboard,
  TurnoverDashboard,
  AbsenteismoDashboard,
} from "@/lib/rh/types";
import { pdfStyles as s, PDF_COLORS, fmtBRL, fmtNum, fmtPct, fmtAnoMes } from "./pdfStyles";
import { delta } from "@/lib/rh/relatorio";

export type ModuloRh =
  | "resumo-folha"
  | "quadro-colaboradores"
  | "contratos-experiencia"
  | "ferias"
  | "turnover"
  | "absenteismo";

export interface Insights {
  diagnostico: string[];
  riscos: string[];
  recomendacoes: string[];
  gerado_em?: string;
}

interface FiltrosPdf {
  anomes_ini?: string;
  anomes_fim?: string;
  codemp?: number | string;
  outros?: Record<string, string>;
}

interface Props {
  modulo: ModuloRh;
  titulo: string;
  filtros?: FiltrosPdf;
  ia?: Insights | null;
  empresa?: string;
  dados:
    | { tipo: "resumo-folha"; atual: ResumoFolhaDashboard | null; anterior?: ResumoFolhaDashboard | null }
    | { tipo: "quadro-colaboradores"; itens: QuadroColaboradorItem[] }
    | { tipo: "contratos-experiencia"; atual: ContratoExperienciaDashboard | null }
    | { tipo: "ferias"; atual: ProgramacaoFeriasDashboard | null }
    | { tipo: "turnover"; atual: TurnoverDashboard | null; anterior?: TurnoverDashboard | null }
    | { tipo: "absenteismo"; atual: AbsenteismoDashboard | null; anterior?: AbsenteismoDashboard | null };
}

function Footer({ empresa, titulo }: { empresa: string; titulo: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{empresa} • {titulo}</Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

function PageHeader({ title, periodo }: { title: string; periodo: string }) {
  return (
    <View style={s.headerBar}>
      <Text style={s.headerTitle}>{title}</Text>
      <Text style={s.headerMeta}>{periodo}</Text>
    </View>
  );
}

function Kpi({ label, value, deltaAbs, deltaPct, formatter = fmtNum }: {
  label: string; value: number | undefined | null;
  deltaAbs?: number; deltaPct?: number;
  formatter?: (n: any) => string;
}) {
  const hasDelta = deltaAbs !== undefined && deltaPct !== undefined;
  const up = (deltaAbs ?? 0) > 0;
  const down = (deltaAbs ?? 0) < 0;
  return (
    <View style={s.kpiCard}>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={s.kpiValue}>{formatter(value ?? 0)}</Text>
      {hasDelta && (
        <Text style={[s.kpiDelta, up ? s.deltaUp : down ? s.deltaDown : s.deltaFlat]}>
          {up ? "+" : down ? "-" : "="}{formatter(Math.abs(deltaAbs ?? 0))}  ({fmtPct(deltaPct, 1)})  vs anterior
        </Text>
      )}
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (!items?.length) return <Text style={{ fontSize: 9, color: PDF_COLORS.muted, fontStyle: "italic" }}>Sem itens.</Text>;
  return (
    <View>
      {items.map((b, i) => (
        <View style={s.bulletRow} key={i}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

function IaBlock({ ia }: { ia?: Insights | null }) {
  if (!ia) {
    return (
      <View style={{ marginTop: 10 }}>
        <Text style={s.h3}>Análise IA</Text>
        <Text style={{ fontSize: 9, color: PDF_COLORS.muted, fontStyle: "italic" }}>
          Análise IA indisponível para este relatório.
        </Text>
      </View>
    );
  }
  return (
    <View style={{ marginTop: 10 }} wrap={false}>
      <Text style={s.h3}>Análise IA</Text>
      <Text style={s.h4}>Diagnóstico</Text>
      <Bullets items={ia.diagnostico} />
      <Text style={s.h4}>Riscos</Text>
      <Bullets items={ia.riscos} />
      <Text style={s.h4}>Recomendações</Text>
      <Bullets items={ia.recomendacoes} />
    </View>
  );
}

function tally(items: any[], keyGetter: (i: any) => string | undefined) {
  const out: Record<string, number> = {};
  for (const it of items) {
    const k = String(keyGetter(it) ?? "-").trim() || "-";
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
}

export function ModuloPdf({ modulo, titulo, filtros, dados, ia, empresa = "HUB de Gestão" }: Props) {
  const periodoTxt = filtros?.anomes_ini && filtros?.anomes_fim
    ? `${fmtAnoMes(filtros.anomes_ini)} a ${fmtAnoMes(filtros.anomes_fim)}`
    : new Date().toLocaleDateString("pt-BR");
  const geradoEm = new Date().toLocaleString("pt-BR");

  return (
    <Document title={titulo} author={empresa}>
      {/* Capa compacta */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverInner}>
          <View>
            <Text style={s.coverBadge}>RELATÓRIO GERENCIAL DE RH</Text>
            <Text style={[s.coverTitle, { marginTop: 12 }]}>{titulo}</Text>
            <Text style={s.coverSubtitle}>Análise executiva com inteligência artificial</Text>
          </View>
          <View>
            {filtros?.anomes_ini && filtros?.anomes_fim && (
              <Text style={s.coverMeta}>Período: {periodoTxt}</Text>
            )}
            <Text style={s.coverMeta}>Empresa: {empresa}</Text>
            {filtros?.codemp !== undefined && <Text style={s.coverMeta}>Cód. empresa: {filtros.codemp}</Text>}
            {filtros?.outros && Object.entries(filtros.outros).map(([k, v]) => v ? (
              <Text style={s.coverMeta} key={k}>{k}: {v}</Text>
            ) : null)}
            <Text style={[s.coverMeta, { marginTop: 20, fontSize: 9, color: "#93C5FD" }]}>Gerado em {geradoEm}</Text>
          </View>
        </View>
      </Page>

      {/* Conteúdo por módulo */}
      <Page size="A4" style={s.page}>
        <PageHeader title={titulo} periodo={periodoTxt} />

        {modulo === "resumo-folha" && dados.tipo === "resumo-folha" && (() => {
          const a = dados.atual?.kpis;
          const b = dados.anterior?.kpis;
          const dC = delta(a?.custo_total, b?.custo_total);
          const dL = delta(a?.total_liquido, b?.total_liquido);
          const dH = delta(a?.hora_extra, b?.hora_extra);
          const dB = delta(a?.beneficios, b?.beneficios);
          const dI = delta(a?.inss_total, b?.inss_total);
          const dF = delta(a?.fgts, b?.fgts);
          const proventos = (dados.atual?.proventos_vantagens ?? []).slice(0, 10);
          const descontos = (dados.atual?.descontos ?? []).slice(0, 10);
          const mensal = dados.atual?.mensal ?? [];
          return (
            <>
              <View style={s.kpiGrid}>
                <Kpi label="Custo Total" value={a?.custo_total} deltaAbs={b ? dC.abs : undefined} deltaPct={b ? dC.pct : undefined} formatter={fmtBRL} />
                <Kpi label="Total Líquido" value={a?.total_liquido} deltaAbs={b ? dL.abs : undefined} deltaPct={b ? dL.pct : undefined} formatter={fmtBRL} />
                <Kpi label="Hora Extra" value={a?.hora_extra} deltaAbs={b ? dH.abs : undefined} deltaPct={b ? dH.pct : undefined} formatter={fmtBRL} />
                <Kpi label="Benefícios" value={a?.beneficios} deltaAbs={b ? dB.abs : undefined} deltaPct={b ? dB.pct : undefined} formatter={fmtBRL} />
                <Kpi label="INSS" value={a?.inss_total} deltaAbs={b ? dI.abs : undefined} deltaPct={b ? dI.pct : undefined} formatter={fmtBRL} />
                <Kpi label="FGTS" value={a?.fgts} deltaAbs={b ? dF.abs : undefined} deltaPct={b ? dF.pct : undefined} formatter={fmtBRL} />
              </View>

              <Text style={s.h3}>Top 10 Proventos</Text>
              <View style={s.table}>
                <View style={[s.tableRow, s.tableRowHead]}>
                  <Text style={[s.th, { width: "15%" }]}>Cód.</Text>
                  <Text style={[s.th, { flex: 1 }]}>Descrição</Text>
                  <Text style={[s.th, { width: "25%", textAlign: "right" }]}>Valor</Text>
                </View>
                {proventos.map((r, i) => (
                  <View style={s.tableRow} key={i}>
                    <Text style={[s.td, { width: "15%" }]}>{r.codigo ?? r.cd_evento ?? "-"}</Text>
                    <Text style={[s.td, { flex: 1 }]}>{r.descricao ?? r.ds_evento ?? "-"}</Text>
                    <Text style={[s.td, { width: "25%", textAlign: "right" }]}>{fmtBRL(r.valor)}</Text>
                  </View>
                ))}
              </View>

              <Text style={s.h3}>Top 10 Descontos</Text>
              <View style={s.table}>
                <View style={[s.tableRow, s.tableRowHead]}>
                  <Text style={[s.th, { width: "15%" }]}>Cód.</Text>
                  <Text style={[s.th, { flex: 1 }]}>Descrição</Text>
                  <Text style={[s.th, { width: "25%", textAlign: "right" }]}>Valor</Text>
                </View>
                {descontos.map((r, i) => (
                  <View style={s.tableRow} key={i}>
                    <Text style={[s.td, { width: "15%" }]}>{r.codigo ?? r.cd_evento ?? "-"}</Text>
                    <Text style={[s.td, { flex: 1 }]}>{r.descricao ?? r.ds_evento ?? "-"}</Text>
                    <Text style={[s.td, { width: "25%", textAlign: "right" }]}>{fmtBRL(r.valor)}</Text>
                  </View>
                ))}
              </View>

              {mensal.length > 0 && (
                <>
                  <Text style={s.h3}>Série Mensal</Text>
                  <View style={s.table}>
                    <View style={[s.tableRow, s.tableRowHead]}>
                      <Text style={[s.th, { width: "18%" }]}>Compet.</Text>
                      <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Custo</Text>
                      <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Líquido</Text>
                      <Text style={[s.th, { flex: 1, textAlign: "right" }]}>HE</Text>
                    </View>
                    {mensal.map((m, i) => (
                      <View style={s.tableRow} key={i}>
                        <Text style={[s.td, { width: "18%" }]}>{fmtAnoMes(m.competencia)}</Text>
                        <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{fmtBRL(m.custo_mensal)}</Text>
                        <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{fmtBRL(m.total_liquido)}</Text>
                        <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{fmtBRL(m.custo_hora_extra)}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          );
        })()}

        {modulo === "quadro-colaboradores" && dados.tipo === "quadro-colaboradores" && (() => {
          const itens = dados.itens ?? [];
          const porSit = tally(itens, (i) => i.situacao);
          const porFil = tally(itens, (i) => i.filial).slice(0, 10);
          const porCargo = tally(itens, (i) => i.cargo).slice(0, 10);
          const porSexo = tally(itens, (i) => i.sexo);
          return (
            <>
              <View style={s.kpiGrid}>
                <Kpi label="Headcount Total" value={itens.length} />
                <Kpi label="Filiais" value={Object.keys(tally(itens, (i) => i.filial)).length} />
                <Kpi label="Cargos distintos" value={Object.keys(tally(itens, (i) => i.cargo)).length} />
              </View>

              <Text style={s.h3}>Distribuição por Situação</Text>
              <View style={s.table}>
                {porSit.map(([k, v], i) => (
                  <View style={s.tableRow} key={i}>
                    <Text style={[s.td, { flex: 1 }]}>{k}</Text>
                    <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{fmtNum(v)}</Text>
                  </View>
                ))}
              </View>

              <Text style={s.h3}>Top Filiais</Text>
              <View style={s.table}>
                {porFil.map(([k, v], i) => (
                  <View style={s.tableRow} key={i}>
                    <Text style={[s.td, { flex: 1 }]}>{k}</Text>
                    <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{fmtNum(v)}</Text>
                  </View>
                ))}
              </View>

              <Text style={s.h3}>Top Cargos</Text>
              <View style={s.table}>
                {porCargo.map(([k, v], i) => (
                  <View style={s.tableRow} key={i}>
                    <Text style={[s.td, { flex: 1 }]}>{k}</Text>
                    <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{fmtNum(v)}</Text>
                  </View>
                ))}
              </View>

              <Text style={s.h3}>Distribuição por Sexo</Text>
              <View style={s.table}>
                {porSexo.map(([k, v], i) => (
                  <View style={s.tableRow} key={i}>
                    <Text style={[s.td, { flex: 1 }]}>{k}</Text>
                    <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{fmtNum(v)}</Text>
                  </View>
                ))}
              </View>
            </>
          );
        })()}

        {modulo === "contratos-experiencia" && dados.tipo === "contratos-experiencia" && (() => {
          const k = dados.atual?.kpis;
          const venc = (dados.atual?.vencimentos ?? []).slice(0, 20);
          return (
            <>
              <View style={s.kpiGrid}>
                <Kpi label="Contratos Ativos" value={k?.qtde_contratos} />
                <Kpi label="A vencer 5 dias" value={k?.a_vencer_5_dias} />
                <Kpi label="A vencer 10 dias" value={k?.a_vencer_10_dias} />
                <Kpi label="Demitidos pós-exp." value={k?.demitidos_30_apos_exp} />
              </View>

              <Text style={s.h3}>Vencimentos críticos</Text>
              <View style={s.table}>
                <View style={[s.tableRow, s.tableRowHead]}>
                  <Text style={[s.th, { width: "15%" }]}>Matr.</Text>
                  <Text style={[s.th, { flex: 1 }]}>Colaborador</Text>
                  <Text style={[s.th, { width: "18%" }]}>Vencimento</Text>
                  <Text style={[s.th, { width: "10%", textAlign: "right" }]}>Dias</Text>
                  <Text style={[s.th, { width: "20%" }]}>Status</Text>
                </View>
                {venc.map((r: any, i: number) => (
                  <View style={s.tableRow} key={i}>
                    <Text style={[s.td, { width: "15%" }]}>{r.matricula ?? "-"}</Text>
                    <Text style={[s.td, { flex: 1 }]}>{r.colaborador ?? r.nome ?? "-"}</Text>
                    <Text style={[s.td, { width: "18%" }]}>{r.dt_vencimento ?? "-"}</Text>
                    <Text style={[s.td, { width: "10%", textAlign: "right" }]}>{fmtNum(r.dias_restantes)}</Text>
                    <Text style={[s.td, { width: "20%" }]}>{r.status ?? "-"}</Text>
                  </View>
                ))}
              </View>
            </>
          );
        })()}

        {modulo === "ferias" && dados.tipo === "ferias" && (() => {
          const k = dados.atual?.kpis;
          const pivot = (dados.atual?.limite_ferias_pivot ?? []).slice(0, 6);
          const semProg = (dados.atual?.primeiro_vencimento_sem_programacao ?? []).slice(0, 15);
          return (
            <>
              <View style={s.kpiGrid}>
                <Kpi label="Vencidas" value={k?.ferias_vencidas} />
                <Kpi label="A vencer 30d" value={k?.a_vencer_30} />
                <Kpi label="A vencer 60d" value={k?.a_vencer_60} />
                <Kpi label="A vencer 90d" value={k?.a_vencer_90} />
                <Kpi label="Em férias" value={k?.de_ferias} />
                <Kpi label="Total programadas" value={k?.ferias_total} />
              </View>

              <Text style={s.h3}>Limite por Ano (pivot mensal)</Text>
              <View style={s.table}>
                <View style={[s.tableRow, s.tableRowHead]}>
                  <Text style={[s.th, { width: "12%" }]}>Ano</Text>
                  {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((m) => (
                    <Text style={[s.th, { flex: 1, textAlign: "right" }]} key={m}>{m}</Text>
                  ))}
                </View>
                {pivot.map((r: any, i: number) => (
                  <View style={s.tableRow} key={i}>
                    <Text style={[s.td, { width: "12%" }]}>{r.ano}</Text>
                    {["m1","m2","m3","m4","m5","m6","m7","m8","m9","m10","m11","m12"].map((kk) => (
                      <Text style={[s.td, { flex: 1, textAlign: "right" }]} key={kk}>{r[kk] || "-"}</Text>
                    ))}
                  </View>
                ))}
              </View>

              {semProg.length > 0 && (
                <>
                  <Text style={s.h3}>Sem programação — primeiros vencimentos</Text>
                  <View style={s.table}>
                    <View style={[s.tableRow, s.tableRowHead]}>
                      <Text style={[s.th, { width: "15%" }]}>Matr.</Text>
                      <Text style={[s.th, { flex: 1 }]}>Colaborador</Text>
                      <Text style={[s.th, { width: "20%" }]}>Limite saída</Text>
                    </View>
                    {semProg.map((r: any, i: number) => (
                      <View style={s.tableRow} key={i}>
                        <Text style={[s.td, { width: "15%" }]}>{r.matricula ?? "-"}</Text>
                        <Text style={[s.td, { flex: 1 }]}>{r.colaborador ?? r.nome ?? "-"}</Text>
                        <Text style={[s.td, { width: "20%" }]}>{r.dt_limite_saida ?? "-"}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          );
        })()}

        {modulo === "turnover" && dados.tipo === "turnover" && (() => {
          const a = dados.atual?.kpis;
          const b = dados.anterior?.kpis;
          const dT = delta(a?.taxa_rotatividade_pct, b?.taxa_rotatividade_pct);
          const dA = delta(a?.admitidos, b?.admitidos);
          const dD = delta(a?.demitidos, b?.demitidos);
          const porMes = dados.atual?.por_mes ?? [];
          const porMotivo = [...(dados.atual?.por_motivo ?? [])].sort((x: any, y: any) => (y.qtd || 0) - (x.qtd || 0)).slice(0, 10);
          const porEmp = dados.atual?.por_empresa ?? [];
          return (
            <>
              <View style={s.kpiGrid}>
                <Kpi label="Taxa Turnover" value={a?.taxa_rotatividade_pct} deltaAbs={b ? dT.abs : undefined} deltaPct={b ? dT.pct : undefined} formatter={(n) => fmtPct(n, 2)} />
                <Kpi label="Admitidos" value={a?.admitidos} deltaAbs={b ? dA.abs : undefined} deltaPct={b ? dA.pct : undefined} />
                <Kpi label="Demitidos" value={a?.demitidos} deltaAbs={b ? dD.abs : undefined} deltaPct={b ? dD.pct : undefined} />
                <Kpi label="Saldo" value={a?.saldo} />
                <Kpi label="Headcount Médio" value={a?.headcount_medio} />
                <Kpi label="Headcount Fim" value={a?.headcount_fim} />
              </View>

              <Text style={s.h3}>Movimentação Mensal</Text>
              <View style={s.table}>
                <View style={[s.tableRow, s.tableRowHead]}>
                  <Text style={[s.th, { width: "18%" }]}>Compet.</Text>
                  <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Admit.</Text>
                  <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Demit.</Text>
                  <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Saldo</Text>
                </View>
                {porMes.map((r: any, i: number) => (
                  <View style={s.tableRow} key={i}>
                    <Text style={[s.td, { width: "18%" }]}>{fmtAnoMes(r.anomes)}</Text>
                    <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{fmtNum(r.admitidos)}</Text>
                    <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{fmtNum(r.demitidos)}</Text>
                    <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{fmtNum((r.admitidos || 0) - (r.demitidos || 0))}</Text>
                  </View>
                ))}
              </View>

              <Text style={s.h3}>Top Motivos de Desligamento</Text>
              <View style={s.table}>
                <View style={[s.tableRow, s.tableRowHead]}>
                  <Text style={[s.th, { flex: 1 }]}>Motivo</Text>
                  <Text style={[s.th, { width: "20%", textAlign: "right" }]}>Qtd</Text>
                </View>
                {porMotivo.map((r: any, i: number) => (
                  <View style={s.tableRow} key={i}>
                    <Text style={[s.td, { flex: 1 }]}>{r.motivo ?? r.ds_motivo ?? "-"}</Text>
                    <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{fmtNum(r.qtd ?? r.total ?? 0)}</Text>
                  </View>
                ))}
              </View>

              {porEmp.length > 0 && (
                <>
                  <Text style={s.h3}>Por Empresa</Text>
                  <View style={s.table}>
                    <View style={[s.tableRow, s.tableRowHead]}>
                      <Text style={[s.th, { flex: 1 }]}>Empresa</Text>
                      <Text style={[s.th, { width: "18%", textAlign: "right" }]}>Admit.</Text>
                      <Text style={[s.th, { width: "18%", textAlign: "right" }]}>Demit.</Text>
                    </View>
                    {porEmp.map((r: any, i: number) => (
                      <View style={s.tableRow} key={i}>
                        <Text style={[s.td, { flex: 1 }]}>{r.empresa ?? "-"}</Text>
                        <Text style={[s.td, { width: "18%", textAlign: "right" }]}>{fmtNum(r.admitidos)}</Text>
                        <Text style={[s.td, { width: "18%", textAlign: "right" }]}>{fmtNum(r.demitidos)}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          );
        })()}

        {modulo === "absenteismo" && dados.tipo === "absenteismo" && (() => {
          const a = dados.atual?.kpis;
          const b = dados.anterior?.kpis;
          const dT = delta(a?.taxa_absenteismo_pct, b?.taxa_absenteismo_pct);
          const dD = delta(a?.dias_perdidos, b?.dias_perdidos);
          const dAf = delta(a?.afastamentos, b?.afastamentos);
          const porCat = (dados.atual?.por_categoria ?? []).slice(0, 10);
          const porMot = (dados.atual?.por_motivo ?? []).slice(0, 10);
          const porMes = dados.atual?.por_mes ?? [];
          return (
            <>
              <View style={s.kpiGrid}>
                <Kpi label="Taxa Absenteísmo" value={a?.taxa_absenteismo_pct} deltaAbs={b ? dT.abs : undefined} deltaPct={b ? dT.pct : undefined} formatter={(n) => fmtPct(n, 2)} />
                <Kpi label="Dias Perdidos" value={a?.dias_perdidos} deltaAbs={b ? dD.abs : undefined} deltaPct={b ? dD.pct : undefined} />
                <Kpi label="Afastamentos" value={a?.afastamentos} deltaAbs={b ? dAf.abs : undefined} deltaPct={b ? dAf.pct : undefined} />
                <Kpi label="Colab. afastados" value={a?.colaboradores_afastados} />
                <Kpi label="Duração média (d)" value={a?.duracao_media_dias} formatter={(n) => fmtNum(n, 1)} />
                <Kpi label="Headcount Médio" value={a?.headcount_medio} />
              </View>

              <Text style={s.h3}>Por Categoria</Text>
              <View style={s.table}>
                <View style={[s.tableRow, s.tableRowHead]}>
                  <Text style={[s.th, { flex: 1 }]}>Categoria</Text>
                  <Text style={[s.th, { width: "20%", textAlign: "right" }]}>Dias</Text>
                </View>
                {porCat.map((r: any, i: number) => (
                  <View style={s.tableRow} key={i}>
                    <Text style={[s.td, { flex: 1 }]}>{r.categoria ?? r.ds_categoria ?? r.tipo ?? "-"}</Text>
                    <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{fmtNum(r.dias ?? r.dias_perdidos ?? r.total ?? 0)}</Text>
                  </View>
                ))}
              </View>

              <Text style={s.h3}>Top Motivos</Text>
              <View style={s.table}>
                <View style={[s.tableRow, s.tableRowHead]}>
                  <Text style={[s.th, { flex: 1 }]}>Motivo</Text>
                  <Text style={[s.th, { width: "20%", textAlign: "right" }]}>Qtd</Text>
                </View>
                {porMot.map((r: any, i: number) => (
                  <View style={s.tableRow} key={i}>
                    <Text style={[s.td, { flex: 1 }]}>{r.motivo ?? r.ds_motivo ?? r.cid ?? "-"}</Text>
                    <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{fmtNum(r.qtd ?? r.total ?? 0)}</Text>
                  </View>
                ))}
              </View>

              {porMes.length > 0 && (
                <>
                  <Text style={s.h3}>Evolução Mensal</Text>
                  <View style={s.table}>
                    <View style={[s.tableRow, s.tableRowHead]}>
                      <Text style={[s.th, { width: "18%" }]}>Compet.</Text>
                      <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Afastamentos</Text>
                      <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Dias</Text>
                      <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Taxa (%)</Text>
                    </View>
                    {porMes.map((r: any, i: number) => (
                      <View style={s.tableRow} key={i}>
                        <Text style={[s.td, { width: "18%" }]}>{fmtAnoMes(r.anomes)}</Text>
                        <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{fmtNum(r.afastamentos)}</Text>
                        <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{fmtNum(r.dias_perdidos ?? r.dias)}</Text>
                        <Text style={[s.td, { flex: 1, textAlign: "right" }]}>{fmtPct(r.taxa_absenteismo_pct ?? r.taxa, 2)}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          );
        })()}

        <IaBlock ia={ia} />
        <Footer empresa={empresa} titulo={titulo} />
      </Page>
    </Document>
  );
}
