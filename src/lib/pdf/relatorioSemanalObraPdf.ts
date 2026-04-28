import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { formatNumber } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import {
  topByMetric,
  groupByWeek,
  clientShare,
  pesoMedioCargaTop,
  obraLabel,
  type RelatorioRow,
} from '@/pages/producao/RelatorioSemanalObraCharts';
import {
  groupWeeklyPeso,
  groupMonthlyPeso,
  META_KEY,
  SEMANAS_POR_MES,
} from '@/pages/producao/MetaEntregaSemanalChart';

interface KpiTotals {
  totalObras: number;
  totalProjetos: number;
  totalCargas: number;
  totalPecas: number;
  pesoTotal: number;
}

interface Filters {
  obra?: string;
  numero_projeto?: string;
  data_ini?: string;
  data_fim?: string;
  peso_min?: string;
  peso_max?: string;
}

interface Params {
  rows: RelatorioRow[];
  kpis: KpiTotals | null;
  filters: Filters;
  chartContainer: HTMLElement | null;
  userEmail?: string | null;
  partial?: boolean;
}

const A4_LANDSCAPE = { w: 297, h: 210 };
const MARGIN = 12;
// Largura útil da página em mm
const USABLE_W = A4_LANDSCAPE.w - MARGIN * 2; // 273
// Tamanho do gráfico embutido
const IMG_W = USABLE_W;
const IMG_H = 105;
const IMG_Y = 24;
// Largura forçada do clone off-screen para captura em alta resolução
const CAPTURE_WIDTH_PX = 1600;

/**
 * Captura um nó com qualidade alta:
 * 1) Clona o nó num container off-screen com largura fixa grande (1600px)
 * 2) Recharts/ResponsiveContainer recalcula e renderiza em alta resolução
 * 3) html2canvas com scale 2 sobre 1600px → ~3200px de largura
 * 4) Elementos com classe .pdf-hide ficam invisíveis na captura
 */
async function captureChart(
  container: HTMLElement | null,
  chartId: string,
): Promise<string | null> {
  if (!container) return null;
  const original = container.querySelector<HTMLElement>(`[data-chart-id="${chartId}"]`);
  if (!original) return null;

  // Cria sandbox off-screen
  const sandbox = document.createElement('div');
  sandbox.style.position = 'fixed';
  sandbox.style.left = '-10000px';
  sandbox.style.top = '0';
  sandbox.style.width = `${CAPTURE_WIDTH_PX}px`;
  sandbox.style.background = '#ffffff';
  sandbox.style.padding = '16px';
  sandbox.style.zIndex = '-1';

  const clone = original.cloneNode(true) as HTMLElement;
  clone.style.width = `${CAPTURE_WIDTH_PX - 32}px`;
  clone.style.maxWidth = 'none';

  // Esconde itens marcados como pdf-hide na cópia
  clone.querySelectorAll<HTMLElement>('.pdf-hide').forEach((el) => {
    el.style.visibility = 'hidden';
  });
  // Garantir que conteúdos dentro do card tenham altura suficiente para o ResponsiveContainer
  clone.querySelectorAll<HTMLElement>('[class*="h-["]').forEach((el) => {
    // mantém alturas existentes; só garante mínimo razoável caso 0
    if (el.clientHeight === 0) el.style.minHeight = '320px';
  });

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  // Aguarda o Recharts re-renderizar no novo tamanho
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 120));

  try {
    const canvas = await html2canvas(clone, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      windowWidth: CAPTURE_WIDTH_PX,
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error(`[pdf] captura falhou para ${chartId}`, err);
    return null;
  } finally {
    document.body.removeChild(sandbox);
  }
}

function addHeader(doc: jsPDF, pageTitle: string) {
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, A4_LANDSCAPE.w, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Sapiens Control Center — Relatório Semanal Obra', MARGIN, 6.8);
  doc.text(pageTitle, A4_LANDSCAPE.w - MARGIN, 6.8, { align: 'right' });
  doc.setTextColor(0, 0, 0);
}

function addFooter(doc: jsPDF, page: number, total: number) {
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, MARGIN, A4_LANDSCAPE.h - 5);
  doc.text(`Página ${page} de ${total}`, A4_LANDSCAPE.w - MARGIN, A4_LANDSCAPE.h - 5, {
    align: 'right',
  });
  doc.setTextColor(0, 0, 0);
}

function drawCover(doc: jsPDF, params: Params) {
  addHeader(doc, 'Capa');
  let y = 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Relatório Semanal Obra', MARGIN, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Resumo gerencial dos gráficos e indicadores', MARGIN, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Filtros aplicados', MARGIN, y);
  const f = params.filters || {};
  const filtros = [
    ['Obra', f.obra || '—'],
    ['Projeto', f.numero_projeto || '—'],
    ['Data inicial', f.data_ini || '—'],
    ['Data final', f.data_fim || '—'],
    ['Peso mín. (kg)', f.peso_min || '—'],
    ['Peso máx. (kg)', f.peso_max || '—'],
  ];
  autoTable(doc, {
    startY: y + 2,
    head: [['Campo', 'Valor']],
    body: filtros,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 64, 175] },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: 130,
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Indicadores', MARGIN, y);
  const k = params.kpis;
  const kpiBody = k
    ? [
        ['Total de Obras', formatNumber(k.totalObras, 0)],
        ['Total de Projetos', formatNumber(k.totalProjetos, 0)],
        ['Total de Cargas', formatNumber(k.totalCargas, 0)],
        ['Total de Peças', formatNumber(k.totalPecas, 0)],
        ['Peso Total (kg)', `${formatNumber(k.pesoTotal, 2)} kg`],
      ]
    : [['—', '—']];
  autoTable(doc, {
    startY: y + 2,
    head: [['Indicador', 'Valor']],
    body: kpiBody,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 64, 175] },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: 130,
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const metaX = 160;
  let metaY = 36;
  doc.text(`Usuário: ${params.userEmail || '—'}`, metaX, metaY);
  metaY += 5;
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, metaX, metaY);
  metaY += 5;
  doc.text(`Registros consolidados: ${formatNumber(params.rows.length, 0)}`, metaX, metaY);
  metaY += 5;
  if (params.partial) {
    doc.setTextColor(180, 100, 0);
    doc.text('Atenção: dados parciais — consolidação ainda em andamento.', metaX, metaY);
    doc.setTextColor(0, 0, 0);
  }
}

function addChartSection(
  doc: jsPDF,
  title: string,
  chartImg: string | null,
  tableHead: string[],
  tableBody: (string | number)[][],
) {
  doc.addPage();
  addHeader(doc, title);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, MARGIN, 18);

  if (chartImg) {
    try {
      doc.addImage(chartImg, 'PNG', MARGIN, IMG_Y, IMG_W, IMG_H, undefined, 'FAST');
    } catch {
      doc.setFontSize(10);
      doc.text('(falha ao renderizar gráfico)', MARGIN, IMG_Y + 10);
    }
  } else {
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('(gráfico não disponível)', MARGIN, IMG_Y + 10);
    doc.setTextColor(0, 0, 0);
  }

  // Tabela ABAIXO do gráfico (sem sobreposição)
  autoTable(doc, {
    startY: IMG_Y + IMG_H + 4,
    head: [tableHead],
    body: tableBody.length > 0 ? tableBody : [['—', ...Array(tableHead.length - 1).fill('')]],
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 64, 175] },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: USABLE_W,
  });
}

async function getMetaSemanal(): Promise<number | null> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', META_KEY)
      .maybeSingle();
    const v = data?.value ? Number(data.value) : null;
    return v != null && Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export async function gerarRelatorioSemanalObraPdf(params: Params): Promise<void> {
  const { rows, chartContainer } = params;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  drawCover(doc, params);

  // Captura em sequência (sandbox usa o mesmo nó e estilos podem conflitar em paralelo)
  const chartIds = [
    'top-peso',
    'top-pecas',
    'top-cargas',
    'evolucao',
    'peso-medio-carga',
    'clientes',
    'meta-entrega-semanal',
    'meta-entrega-mensal',
  ];
  const captured: Record<string, string | null> = {};
  for (const id of chartIds) {
    captured[id] = await captureChart(chartContainer, id);
  }

  const metaSemanal = await getMetaSemanal();
  const metaMensal = metaSemanal != null ? metaSemanal * SEMANAS_POR_MES : null;

  // 1. Top peso
  const topPeso = topByMetric(rows, obraLabel, (r) => r.peso_total || 0);
  addChartSection(
    doc,
    'Top 10 Obras por Peso (kg)',
    captured['top-peso'],
    ['#', 'Obra', 'Peso (kg)'],
    topPeso.map((r, i) => [i + 1, r.name, formatNumber(r.value, 2)]),
  );

  // 2. Top peças
  const topPecas = topByMetric(rows, obraLabel, (r) => r.quantidade_pecas || 0);
  addChartSection(
    doc,
    'Top 10 Obras por Peças',
    captured['top-pecas'],
    ['#', 'Obra', 'Peças'],
    topPecas.map((r, i) => [i + 1, r.name, formatNumber(r.value, 0)]),
  );

  // 3. Top cargas
  const topCargas = topByMetric(rows, obraLabel, (r) => r.quantidade_cargas || 0);
  addChartSection(
    doc,
    'Top 10 Obras por Cargas',
    captured['top-cargas'],
    ['#', 'Obra', 'Cargas'],
    topCargas.map((r, i) => [i + 1, r.name, formatNumber(r.value, 0)]),
  );

  // 4. Evolução semanal
  const evolucao = groupByWeek(rows);
  addChartSection(
    doc,
    'Evolução Semanal',
    captured['evolucao'],
    ['Semana', 'Peso (kg)', 'Peças', 'Cargas'],
    evolucao.map((r) => [
      r.week,
      formatNumber(r.peso, 2),
      formatNumber(r.pecas, 0),
      formatNumber(r.cargas, 0),
    ]),
  );

  // 5. Peso médio por carga
  const pmc = pesoMedioCargaTop(rows, 10);
  addChartSection(
    doc,
    'Peso Médio por Carga (Top 10 Obras)',
    captured['peso-medio-carga'],
    ['#', 'Obra', 'kg/carga'],
    pmc.map((r, i) => [i + 1, r.name, formatNumber(r.value, 2)]),
  );

  // 6. Participação por cliente
  const clientes = clientShare(rows, 8);
  const totalCli = clientes.reduce((acc, c) => acc + c.value, 0) || 1;
  addChartSection(
    doc,
    'Participação por Cliente (Peso)',
    captured['clientes'],
    ['Cliente', 'Peso (kg)', '%'],
    clientes.map((c) => [
      c.name,
      formatNumber(c.value, 2),
      `${formatNumber((c.value / totalCli) * 100, 1)}%`,
    ]),
  );

  // 7. Meta de Entrega Semanal
  const semanal = groupWeeklyPeso(rows);
  addChartSection(
    doc,
    `Meta de Entrega Semanal${metaSemanal != null ? ` — Meta: ${formatNumber(metaSemanal, 0)} kg` : ''}`,
    captured['meta-entrega-semanal'],
    ['Semana', 'Peso entregue (kg)', 'Meta (kg)', 'Atingiu?'],
    semanal.map((r) => [
      r.week,
      formatNumber(r.peso, 2),
      metaSemanal != null ? formatNumber(metaSemanal, 2) : '—',
      metaSemanal != null ? (r.peso >= metaSemanal ? 'Sim' : 'Não') : '—',
    ]),
  );

  // 8. Meta de Entrega Mensal
  const mensal = groupMonthlyPeso(rows);
  addChartSection(
    doc,
    `Meta de Entrega Mensal${metaMensal != null ? ` — Meta: ${formatNumber(metaMensal, 0)} kg` : ''}`,
    captured['meta-entrega-mensal'],
    ['Mês', 'Peso entregue (kg)', 'Meta (kg)', 'Atingiu?'],
    mensal.map((r) => [
      r.month,
      formatNumber(r.peso, 2),
      metaMensal != null ? formatNumber(metaMensal, 2) : '—',
      metaMensal != null ? (r.peso >= metaMensal ? 'Sim' : 'Não') : '—',
    ]),
  );

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  const date = new Date().toISOString().slice(0, 10);
  doc.save(`relatorio-semanal-obra-${date}.pdf`);
}
