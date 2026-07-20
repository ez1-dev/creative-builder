import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { DadosConsolidados, RelatorioIa, SecaoIa } from "@/lib/rh/relatorio";
import { delta } from "@/lib/rh/relatorio";
import { pdfStyles as s, PDF_COLORS, sevColor, fmtBRL, fmtNum, fmtPct, fmtAnoMes } from "./pdfStyles";

interface Props {
  dados: DadosConsolidados;
  ia: RelatorioIa | null;
  empresa?: string;
}

function Footer({ empresa }: { empresa: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>{empresa} • Relatório Gerencial de RH</Text>
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
          {up ? "▲" : down ? "▼" : "▬"} {formatter(Math.abs(deltaAbs ?? 0))} ({fmtPct(deltaPct, 1)}) vs período anterior
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

function IaSecao({ titulo, secao }: { titulo: string; secao?: SecaoIa }) {
  if (!secao) return null;
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={s.h3}>Análise IA — {titulo}</Text>
      <Text style={s.h4}>Diagnóstico</Text>
      <Bullets items={secao.diagnostico} />
      <Text style={s.h4}>Riscos</Text>
      <Bullets items={secao.riscos} />
      <Text style={s.h4}>Recomendações</Text>
      <Bullets items={secao.recomendacoes} />
    </View>
  );
}

export function RelatorioPdf({ dados, ia, empresa = "HUB de Gestão" }: Props) {
  const periodoTxt = `${fmtAnoMes(dados.periodo.atual.ini)} a ${fmtAnoMes(dados.periodo.atual.fim)}`;
  const periodoAntTxt = `${fmtAnoMes(dados.periodo.anterior.ini)} a ${fmtAnoMes(dados.periodo.anterior.fim)}`;
  const geradoEm = new Date().toLocaleString("pt-BR");

  // Folha
  const fA = dados.resumo_folha.atual?.kpis;
  const fB = dados.resumo_folha.anterior?.kpis;
  const dCusto = delta(fA?.custo_total, fB?.custo_total);
  const dLiq = delta(fA?.total_liquido, fB?.total_liquido);
  const dHE = delta(fA?.hora_extra, fB?.hora_extra);
  const dBen = delta(fA?.beneficios, fB?.beneficios);
  const dInss = delta(fA?.inss_total, fB?.inss_total);
  const dFgts = delta(fA?.fgts, fB?.fgts);

  // Turnover
  const tA = dados.turnover.atual?.kpis;
  const tB = dados.turnover.anterior?.kpis;
  const dTaxa = delta(tA?.taxa_rotatividade_pct, tB?.taxa_rotatividade_pct);
  const dAdm = delta(tA?.admitidos, tB?.admitidos);
  const dDem = delta(tA?.demitidos, tB?.demitidos);

  // Absenteísmo
  const aA = dados.absenteismo.atual?.kpis;
  const aB = dados.absenteismo.anterior?.kpis;
  const dAbsTaxa = delta(aA?.taxa_absenteismo_pct, aB?.taxa_absenteismo_pct);
  const dDias = delta(aA?.dias_perdidos, aB?.dias_perdidos);
  const dAfast = delta(aA?.afastamentos, aB?.afastamentos);

  const topProv = (dados.resumo_folha.atual?.proventos_vantagens ?? []).slice(0, 5);
  const topDesc = (dados.resumo_folha.atual?.descontos ?? []).slice(0, 5);

  const topFiliais = Object.entries(dados.quadro.atual.por_filial).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topCargos = Object.entries(dados.quadro.atual.por_cargo).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const porSit = Object.entries(dados.quadro.atual.por_situacao).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const ceKpis = dados.contratos_experiencia.atual?.kpis;
  const frKpis = dados.ferias.atual?.kpis;

  return (
    <Document title="Relatório Gerencial de RH" author={empresa}>
      {/* CAPA */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverInner}>
          <View>
            <Text style={s.coverBadge}>RELATÓRIO GERENCIAL</Text>
            <Text style={[s.coverTitle, { marginTop: 12 }]}>Recursos Humanos</Text>
            <Text style={s.coverSubtitle}>Análise consolidada com inteligência artificial</Text>
          </View>
          <View>
            <Text style={s.coverMeta}>Período: {periodoTxt}</Text>
            <Text style={s.coverMeta}>Comparativo: {periodoAntTxt}</Text>
            <Text style={s.coverMeta}>Empresa: {empresa}</Text>
            <Text style={[s.coverMeta, { marginTop: 20, fontSize: 9, color: "#93C5FD" }]}>Gerado em {geradoEm}</Text>
          </View>
        </View>
      </Page>

      {/* SUMÁRIO EXECUTIVO */}
      <Page size="A4" style={s.page}>
        <PageHeader title="Sumário Executivo" periodo={periodoTxt} />
        <Text style={s.sectionTitle}>Visão geral</Text>
        <Text style={s.sectionSubtitle}>Destaques consolidados dos 6 módulos de RH no período.</Text>
        <Bullets items={ia?.sumario_executivo ?? ["Análise da IA indisponível para este período."]} />

        <View style={s.divider} />
        <Text style={s.sectionTitle}>Alertas Priorizados</Text>
        {(ia?.alertas ?? []).length === 0 && (
          <Text style={{ fontSize: 9, color: PDF_COLORS.muted, fontStyle: "italic" }}>Sem alertas gerados.</Text>
        )}
        {(ia?.alertas ?? []).map((a, i) => (
          <View key={i} style={[s.alertRow, { borderLeftColor: sevColor(a.severidade) }]}>
            <Text style={[s.alertBadge, { backgroundColor: sevColor(a.severidade) }]}>{a.severidade}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.alertTitle}>{a.titulo} <Text style={{ color: PDF_COLORS.muted, fontWeight: "normal" }}>· {a.secao}</Text></Text>
              <Text style={s.alertBody}>Impacto: {a.impacto}</Text>
              <Text style={s.alertBody}>Ação: {a.acao}</Text>
            </View>
          </View>
        ))}
        <Footer empresa={empresa} />
      </Page>

      {/* 1. RESUMO FOLHA */}
      <Page size="A4" style={s.page}>
        <PageHeader title="1. Resumo da Folha" periodo={periodoTxt} />
        <View style={s.kpiGrid}>
          <Kpi label="Custo Total" value={fA?.custo_total} deltaAbs={dCusto.abs} deltaPct={dCusto.pct} formatter={fmtBRL} />
          <Kpi label="Total Líquido" value={fA?.total_liquido} deltaAbs={dLiq.abs} deltaPct={dLiq.pct} formatter={fmtBRL} />
          <Kpi label="Hora Extra" value={fA?.hora_extra} deltaAbs={dHE.abs} deltaPct={dHE.pct} formatter={fmtBRL} />
          <Kpi label="Benefícios" value={fA?.beneficios} deltaAbs={dBen.abs} deltaPct={dBen.pct} formatter={fmtBRL} />
          <Kpi label="INSS" value={fA?.inss_total} deltaAbs={dInss.abs} deltaPct={dInss.pct} formatter={fmtBRL} />
          <Kpi label="FGTS" value={fA?.fgts} deltaAbs={dFgts.abs} deltaPct={dFgts.pct} formatter={fmtBRL} />
        </View>

        <Text style={s.h3}>Top 5 Proventos</Text>
        <View style={s.table}>
          <View style={[s.tableRow, s.tableRowHead]}>
            <Text style={[s.th, { width: "18%" }]}>Cód.</Text>
            <Text style={[s.th, { flex: 1 }]}>Descrição</Text>
            <Text style={[s.th, { width: "25%", textAlign: "right" }]}>Valor</Text>
          </View>
          {topProv.map((r, i) => (
            <View style={s.tableRow} key={i}>
              <Text style={[s.td, { width: "18%" }]}>{r.codigo ?? r.cd_evento ?? "-"}</Text>
              <Text style={[s.td, { flex: 1 }]}>{r.descricao ?? r.ds_evento ?? "-"}</Text>
              <Text style={[s.td, { width: "25%", textAlign: "right" }]}>{fmtBRL(r.valor)}</Text>
            </View>
          ))}
        </View>

        <Text style={s.h3}>Top 5 Descontos</Text>
        <View style={s.table}>
          <View style={[s.tableRow, s.tableRowHead]}>
            <Text style={[s.th, { width: "18%" }]}>Cód.</Text>
            <Text style={[s.th, { flex: 1 }]}>Descrição</Text>
            <Text style={[s.th, { width: "25%", textAlign: "right" }]}>Valor</Text>
          </View>
          {topDesc.map((r, i) => (
            <View style={s.tableRow} key={i}>
              <Text style={[s.td, { width: "18%" }]}>{r.codigo ?? r.cd_evento ?? "-"}</Text>
              <Text style={[s.td, { flex: 1 }]}>{r.descricao ?? r.ds_evento ?? "-"}</Text>
              <Text style={[s.td, { width: "25%", textAlign: "right" }]}>{fmtBRL(r.valor)}</Text>
            </View>
          ))}
        </View>

        <IaSecao titulo="Resumo da Folha" secao={ia?.secoes?.resumo_folha} />
        <Footer empresa={empresa} />
      </Page>

      {/* 2. QUADRO */}
      <Page size="A4" style={s.page}>
        <PageHeader title="2. Quadro de Colaboradores" periodo={periodoTxt} />
        <View style={s.kpiGrid}>
          <Kpi label="Headcount Total" value={dados.quadro.atual.total} />
          <Kpi label="Ativos" value={porSit.find(([k]) => /ATIV/i.test(k))?.[1] ?? dados.quadro.atual.total} />
          <Kpi label="Filiais" value={Object.keys(dados.quadro.atual.por_filial).length} />
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
          {topFiliais.map(([k, v], i) => (
            <View style={s.tableRow} key={i}>
              <Text style={[s.td, { flex: 1 }]}>{k}</Text>
              <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{fmtNum(v)}</Text>
            </View>
          ))}
        </View>

        <Text style={s.h3}>Top Cargos</Text>
        <View style={s.table}>
          {topCargos.map(([k, v], i) => (
            <View style={s.tableRow} key={i}>
              <Text style={[s.td, { flex: 1 }]}>{k}</Text>
              <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{fmtNum(v)}</Text>
            </View>
          ))}
        </View>

        <IaSecao titulo="Quadro de Colaboradores" secao={ia?.secoes?.quadro} />
        <Footer empresa={empresa} />
      </Page>

      {/* 3. CONTRATOS EXPERIÊNCIA */}
      <Page size="A4" style={s.page}>
        <PageHeader title="3. Contratos de Experiência" periodo={periodoTxt} />
        <View style={s.kpiGrid}>
          <Kpi label="Contratos Ativos" value={ceKpis?.qtde_contratos} />
          <Kpi label="A vencer em 5 dias" value={ceKpis?.a_vencer_5_dias} />
          <Kpi label="A vencer em 10 dias" value={ceKpis?.a_vencer_10_dias} />
          <Kpi label="Demitidos pós-experiência" value={ceKpis?.demitidos_30_apos_exp} />
        </View>

        <Text style={s.h3}>Vencimentos críticos (amostra)</Text>
        <View style={s.table}>
          <View style={[s.tableRow, s.tableRowHead]}>
            <Text style={[s.th, { width: "15%" }]}>Matr.</Text>
            <Text style={[s.th, { flex: 1 }]}>Colaborador</Text>
            <Text style={[s.th, { width: "18%" }]}>Vencimento</Text>
            <Text style={[s.th, { width: "12%", textAlign: "right" }]}>Dias</Text>
          </View>
          {(dados.contratos_experiencia.atual?.vencimentos ?? []).slice(0, 10).map((r: any, i: number) => (
            <View style={s.tableRow} key={i}>
              <Text style={[s.td, { width: "15%" }]}>{r.matricula ?? "-"}</Text>
              <Text style={[s.td, { flex: 1 }]}>{r.colaborador ?? r.nome ?? "-"}</Text>
              <Text style={[s.td, { width: "18%" }]}>{r.dt_vencimento ?? "-"}</Text>
              <Text style={[s.td, { width: "12%", textAlign: "right" }]}>{fmtNum(r.dias_restantes)}</Text>
            </View>
          ))}
        </View>

        <IaSecao titulo="Contratos de Experiência" secao={ia?.secoes?.contratos_experiencia} />
        <Footer empresa={empresa} />
      </Page>

      {/* 4. FÉRIAS */}
      <Page size="A4" style={s.page}>
        <PageHeader title="4. Programação de Férias" periodo={periodoTxt} />
        <View style={s.kpiGrid}>
          <Kpi label="Vencidas" value={frKpis?.ferias_vencidas} />
          <Kpi label="A vencer 30d" value={frKpis?.a_vencer_30} />
          <Kpi label="A vencer 60d" value={frKpis?.a_vencer_60} />
          <Kpi label="A vencer 90d" value={frKpis?.a_vencer_90} />
          <Kpi label="Em férias" value={frKpis?.de_ferias} />
          <Kpi label="Total programadas" value={frKpis?.ferias_total} />
        </View>

        <Text style={s.h3}>Limite por Ano (pivot mensal)</Text>
        <View style={s.table}>
          <View style={[s.tableRow, s.tableRowHead]}>
            <Text style={[s.th, { width: "12%" }]}>Ano</Text>
            {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((m) => (
              <Text style={[s.th, { flex: 1, textAlign: "right" }]} key={m}>{m}</Text>
            ))}
          </View>
          {(dados.ferias.atual?.limite_ferias_pivot ?? []).slice(0, 4).map((r: any, i: number) => (
            <View style={s.tableRow} key={i}>
              <Text style={[s.td, { width: "12%" }]}>{r.ano}</Text>
              {["m1","m2","m3","m4","m5","m6","m7","m8","m9","m10","m11","m12"].map((k) => (
                <Text style={[s.td, { flex: 1, textAlign: "right" }]} key={k}>{r[k] || "-"}</Text>
              ))}
            </View>
          ))}
        </View>

        <IaSecao titulo="Férias" secao={ia?.secoes?.ferias} />
        <Footer empresa={empresa} />
      </Page>

      {/* 5. TURNOVER */}
      <Page size="A4" style={s.page}>
        <PageHeader title="5. Rotatividade / Turnover" periodo={periodoTxt} />
        <View style={s.kpiGrid}>
          <Kpi label="Taxa Turnover (%)" value={tA?.taxa_rotatividade_pct} deltaAbs={dTaxa.abs} deltaPct={dTaxa.pct} formatter={(n) => fmtPct(n, 2)} />
          <Kpi label="Admitidos" value={tA?.admitidos} deltaAbs={dAdm.abs} deltaPct={dAdm.pct} />
          <Kpi label="Demitidos" value={tA?.demitidos} deltaAbs={dDem.abs} deltaPct={dDem.pct} />
          <Kpi label="Saldo" value={tA?.saldo} />
          <Kpi label="Headcount Médio" value={tA?.headcount_medio} />
          <Kpi label="Headcount Fim" value={tA?.headcount_fim} />
        </View>

        <Text style={s.h3}>Top Motivos de Desligamento</Text>
        <View style={s.table}>
          <View style={[s.tableRow, s.tableRowHead]}>
            <Text style={[s.th, { flex: 1 }]}>Motivo</Text>
            <Text style={[s.th, { width: "20%", textAlign: "right" }]}>Qtd</Text>
          </View>
          {(dados.turnover.atual?.por_motivo ?? []).slice(0, 8).map((r: any, i: number) => (
            <View style={s.tableRow} key={i}>
              <Text style={[s.td, { flex: 1 }]}>{r.motivo ?? r.ds_motivo ?? "-"}</Text>
              <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{fmtNum(r.qtd ?? r.qtde ?? r.total ?? 0)}</Text>
            </View>
          ))}
        </View>

        <IaSecao titulo="Turnover" secao={ia?.secoes?.turnover} />
        <Footer empresa={empresa} />
      </Page>

      {/* 6. ABSENTEÍSMO */}
      <Page size="A4" style={s.page}>
        <PageHeader title="6. Absenteísmo / Afastamentos" periodo={periodoTxt} />
        <View style={s.kpiGrid}>
          <Kpi label="Taxa Absenteísmo (%)" value={aA?.taxa_absenteismo_pct} deltaAbs={dAbsTaxa.abs} deltaPct={dAbsTaxa.pct} formatter={(n) => fmtPct(n, 2)} />
          <Kpi label="Dias Perdidos" value={aA?.dias_perdidos} deltaAbs={dDias.abs} deltaPct={dDias.pct} />
          <Kpi label="Afastamentos" value={aA?.afastamentos} deltaAbs={dAfast.abs} deltaPct={dAfast.pct} />
          <Kpi label="Colaboradores Afastados" value={aA?.colaboradores_afastados} />
          <Kpi label="Duração Média (dias)" value={aA?.duracao_media_dias} formatter={(n) => fmtNum(n, 1)} />
          <Kpi label="Headcount Médio" value={aA?.headcount_medio} />
        </View>

        <Text style={s.h3}>Top Categorias</Text>
        <View style={s.table}>
          <View style={[s.tableRow, s.tableRowHead]}>
            <Text style={[s.th, { flex: 1 }]}>Categoria</Text>
            <Text style={[s.th, { width: "20%", textAlign: "right" }]}>Dias</Text>
          </View>
          {(dados.absenteismo.atual?.por_categoria ?? []).slice(0, 8).map((r: any, i: number) => (
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
          {(dados.absenteismo.atual?.por_motivo ?? []).slice(0, 8).map((r: any, i: number) => (
            <View style={s.tableRow} key={i}>
              <Text style={[s.td, { flex: 1 }]}>{r.motivo ?? r.ds_motivo ?? r.cid ?? "-"}</Text>
              <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{fmtNum(r.qtd ?? r.qtde ?? r.total ?? 0)}</Text>
            </View>
          ))}
        </View>

        <IaSecao titulo="Absenteísmo" secao={ia?.secoes?.absenteismo} />
        <Footer empresa={empresa} />
      </Page>
    </Document>
  );
}
