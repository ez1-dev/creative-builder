import PptxGenJS from 'pptxgenjs';
import { toPng } from 'html-to-image';
import type { ComentariosIa } from './ia';
import type { KpiCard } from './chassis';

const AZUL = '1e3a8a';
const CINZA = '475569';
const VERDE = '16a34a';
const VERMELHO = 'dc2626';
const AMARELO = 'd97706';

async function capturar(selector: string): Promise<string | null> {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  try { return await toPng(el, { pixelRatio: 2, backgroundColor: '#ffffff' }); }
  catch { return null; }
}

const ACCENT_HEX: Record<string, string> = {
  primary: AZUL, success: VERDE, warning: AMARELO, destructive: VERMELHO,
};

export interface PptxConfig {
  titulo: string;
  subtitulo?: string;
  periodo?: string;
  fileName: string;
  kpis?: KpiCard[];
  evolucaoChartId?: string;
  evolucaoTitulo?: string;
  rankings?: { titulo: string; chartId: string }[];
  comentariosIa?: ComentariosIa | null;
  tabela?: { titulo: string; head: string[]; rows: (string | number)[][]; colW?: number[] };
}

export async function gerarPptxGenerico(cfg: PptxConfig) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = cfg.titulo;

  const capa = pptx.addSlide();
  capa.background = { color: AZUL };
  capa.addText(cfg.titulo, { x: 0.6, y: 1.8, w: 12, h: 1.0, fontSize: 40, bold: true, color: 'FFFFFF' });
  if (cfg.subtitulo) capa.addText(cfg.subtitulo, { x: 0.6, y: 2.9, w: 12, h: 0.6, fontSize: 24, color: 'CADCFC' });
  if (cfg.periodo) capa.addText(cfg.periodo, { x: 0.6, y: 4.0, w: 12, h: 0.5, fontSize: 18, color: 'CADCFC' });
  capa.addText(new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    { x: 0.6, y: 6.4, w: 12, h: 0.4, fontSize: 14, color: 'CADCFC' });

  if (cfg.kpis?.length) {
    const s = pptx.addSlide();
    s.addText('Visão Geral', { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 28, bold: true, color: AZUL });
    cfg.kpis.slice(0, 6).forEach((c, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 0.5 + col * 4.3, y = 1.2 + row * 2.6;
      const cor = ACCENT_HEX[c.accent ?? 'primary'] ?? AZUL;
      s.addShape('rect', { x, y, w: 4.0, h: 2.3, fill: { color: 'F1F5F9' }, line: { color: cor, width: 2 } });
      s.addText(c.label, { x: x + 0.2, y: y + 0.2, w: 3.6, h: 0.4, fontSize: 12, color: CINZA });
      s.addText(c.value, { x: x + 0.2, y: y + 0.7, w: 3.6, h: 1.0, fontSize: 26, bold: true, color: cor });
      if (c.sub) s.addText(c.sub, { x: x + 0.2, y: y + 1.7, w: 3.6, h: 0.4, fontSize: 11, color: CINZA });
    });
  }

  if (cfg.evolucaoChartId) {
    const s = pptx.addSlide();
    s.addText(cfg.evolucaoTitulo ?? 'Evolução', { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 26, bold: true, color: AZUL });
    const img = await capturar(`[data-rel-chart="${cfg.evolucaoChartId}"]`);
    if (img) s.addImage({ data: img, x: 0.5, y: 1.1, w: 12.3, h: 5.6 });
  }

  if (cfg.rankings?.length) {
    for (const r of cfg.rankings) {
      const s = pptx.addSlide();
      s.addText(r.titulo, { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 26, bold: true, color: AZUL });
      const img = await capturar(`[data-rel-chart="${r.chartId}"]`);
      if (img) s.addImage({ data: img, x: 0.5, y: 1.1, w: 12.3, h: 5.6 });
    }
  }

  if (cfg.comentariosIa) {
    const s = pptx.addSlide();
    s.addText('Comentários Executivos (IA)', { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 26, bold: true, color: AZUL });
    const blocks = [
      { titulo: 'Destaques', items: cfg.comentariosIa.destaques, cor: VERDE },
      { titulo: 'Alertas', items: cfg.comentariosIa.alertas, cor: AMARELO },
      { titulo: 'Recomendações', items: cfg.comentariosIa.recomendacoes, cor: AZUL },
    ];
    blocks.forEach((b, i) => {
      const x = 0.5 + i * 4.3;
      s.addText(b.titulo, { x, y: 1.1, w: 4.0, h: 0.5, fontSize: 16, bold: true, color: b.cor });
      s.addText(b.items.map((t) => ({ text: t, options: { bullet: true } })),
        { x, y: 1.7, w: 4.0, h: 5.0, fontSize: 12, color: '1F2937', valign: 'top' });
    });
  }

  if (cfg.tabela?.rows?.length) {
    const s = pptx.addSlide();
    s.addText(cfg.tabela.titulo, { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: AZUL });
    const head = cfg.tabela.head.map((t) => ({ text: t, options: { bold: true, fill: { color: 'E2E8F0' } } }));
    const body = cfg.tabela.rows.slice(0, 25).map((row) => row.map((c) => ({ text: String(c) })));
    s.addTable([head, ...body], {
      x: 0.5, y: 1.0, w: 12.3, fontSize: 9,
      border: { type: 'solid', pt: 0.5, color: 'CBD5E1' },
      colW: cfg.tabela.colW,
    });
  }

  await pptx.writeFile({ fileName: cfg.fileName });
}
