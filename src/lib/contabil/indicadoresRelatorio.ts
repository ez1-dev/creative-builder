import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Indicador, IndicadorUnidade } from './indicadoresApi';
import { normalizarNarrativa } from './indicadoresNarrativa';
import { formatCurrency, formatNumberBR } from '@/lib/format';

function fmtValor(v: number | null, unidade: IndicadorUnidade): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  switch (unidade) {
    case 'R$': return formatCurrency(v);
    case '%': return `${formatNumberBR(v, 2)}%`;
    case 'dias': return `${formatNumberBR(v, 0)} dias`;
    case 'índice': return formatNumberBR(v, 2);
    default: return String(v);
  }
}

function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

export interface GerarPdfIndicadoresParams {
  periodoIni: number;
  periodoFim: number;
  codemp: number;
  codfil?: number;
  grupos: Record<string, Indicador[]>;
  ordemSecoes: string[];
  outros: Indicador[];
  tecnicos: Indicador[];
  duplicidade612?: boolean;
  narrativa?: string;
  modeloIA?: string;
}

const PRIMARY: [number, number, number] = [21, 101, 255]; // #1565FF
const WARNING: [number, number, number] = [217, 119, 6];

export function gerarPdfIndicadores(p: GerarPdfIndicadoresParams): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 40;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...PRIMARY);
  doc.text('Indicadores Contábeis', marginX, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60);
  const periodo = `Período: ${p.periodoIni} – ${p.periodoFim}`;
  const empresa = `Empresa: ${p.codemp}${p.codfil ? ` · Filial: ${p.codfil}` : ''}`;
  const geradoEm = `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
  doc.text(`${periodo}   ·   ${empresa}   ·   ${geradoEm}`, marginX, y);
  y += 16;

  if (p.duplicidade612) {
    doc.setFillColor(255, 243, 205);
    doc.setDrawColor(...WARNING);
    doc.rect(marginX, y, pageW - marginX * 2, 42, 'FD');
    doc.setTextColor(...WARNING);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Duplicidade 612 ativa no cadastro do Senior', marginX + 8, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60);
    doc.setFontSize(9);
    doc.text(
      'Indicadores de resultado na versão simulada (sem a duplicidade). Corrija em E045CAG no ERP.',
      marginX + 8, y + 30,
    );
    y += 52;
  }

  const renderSecao = (titulo: string, itens: Indicador[]) => {
    if (!itens?.length) return;
    autoTable(doc, {
      startY: y,
      head: [[titulo, 'Valor', 'Fórmula', 'Status']],
      body: itens.map((i) => [
        i.indicador,
        fmtValor(i.valor, i.unidade),
        i.formula,
        i.status,
      ]),
      styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: PRIMARY, textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 170 },
        1: { cellWidth: 90, halign: 'right' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 60, halign: 'center' },
      },
      margin: { left: marginX, right: marginX },
    });
    // @ts-expect-error autotable adds lastAutoTable
    y = doc.lastAutoTable.finalY + 14;
  };

  for (const titulo of p.ordemSecoes) {
    renderSecao(titulo, p.grupos[titulo] || []);
  }
  if (p.outros.length) renderSecao('Outros', p.outros);
  if (p.tecnicos.length) renderSecao('Conferências técnicas', p.tecnicos);

  // Análise IA em nova página
  doc.addPage();
  y = 40;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PRIMARY);
  doc.text('Análise (IA)', marginX, y);
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40);

  const texto = p.narrativa?.trim()
    ? stripMarkdown(normalizarNarrativa(p.narrativa))
    : 'Análise da IA não gerada nesta sessão.';
  const linhas = doc.splitTextToSize(texto, pageW - marginX * 2);
  const pageH = doc.internal.pageSize.getHeight();
  const lineH = 13;
  for (const linha of linhas) {
    if (y > pageH - 60) {
      doc.addPage();
      y = 40;
    }
    doc.text(linha, marginX, y);
    y += lineH;
  }

  if (p.modeloIA) {
    if (y > pageH - 40) { doc.addPage(); y = 40; }
    y += 8;
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Modelo: ${p.modeloIA}`, marginX, y);
  }

  const nome = `indicadores_contabeis_${p.codemp}_${p.periodoIni}_${p.periodoFim}.pdf`;
  doc.save(nome);
}
