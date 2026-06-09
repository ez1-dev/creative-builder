import PptxGenJS from 'pptxgenjs';
import { toPng } from 'html-to-image';
import type { RelatorioDados, BlocosSelecionados } from '@/hooks/useRelatorioExecutivoFaturamento';
import type { BiComercialFilters } from '@/lib/bi/comercialFilters';

const num = (v: any) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
const fmtPct = (v: number | null) => v == null ? '—' : `${v.toFixed(1)}%`;
const fmtAnomes = (v: string) => !v || v.length < 6 ? v : `${v.slice(4)}/${v.slice(2, 4)}`;

async function captureChart(selector: string): Promise<string | null> {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  try {
    return await toPng(el, { pixelRatio: 2, backgroundColor: '#ffffff' });
  } catch {
    return null;
  }
}

export async function gerarRelatorioPptx(
  dados: RelatorioDados,
  filtros: BiComercialFilters,
  blocos: BlocosSelecionados,
  comentariosIa: { destaques: string[]; alertas: string[]; recomendacoes: string[] } | null,
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = 'Relatório Executivo de Faturamento';

  const AZUL = '1e3a8a';
  const CINZA = '475569';
  const VERDE = '16a34a';
  const VERMELHO = 'dc2626';
  const AMARELO = 'd97706';

  // --- Capa ---
  const capa = pptx.addSlide();
  capa.background = { color: AZUL };
  capa.addText('Relatório Executivo', { x: 0.6, y: 1.8, w: 12, h: 0.9, fontSize: 44, bold: true, color: 'FFFFFF', fontFace: 'Calibri' });
  capa.addText('Faturamento', { x: 0.6, y: 2.7, w: 12, h: 0.8, fontSize: 36, color: 'FFFFFF', fontFace: 'Calibri' });
  capa.addText(`Período: ${fmtAnomes(filtros.anomes_ini)} a ${fmtAnomes(filtros.anomes_fim)}`, { x: 0.6, y: 4.0, w: 12, h: 0.5, fontSize: 20, color: 'CADCFC', fontFace: 'Calibri' });
  capa.addText(`Unidade: ${filtros.unidade_negocio}`, { x: 0.6, y: 4.5, w: 12, h: 0.5, fontSize: 18, color: 'CADCFC', fontFace: 'Calibri' });
  capa.addText(new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }), {
    x: 0.6, y: 6.4, w: 12, h: 0.4, fontSize: 14, color: 'CADCFC', fontFace: 'Calibri',
  });

  // --- KPIs ---
  if (blocos.kpis && dados.kpis) {
    const s = pptx.addSlide();
    s.addText('Visão Geral', { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 28, bold: true, color: AZUL });
    const k: any = dados.kpis;
    const fat = num(k.faturamento);
    const liq = num(k.fat_liquido ?? k.faturamento_liquido);
    const imp = num(k.impostos);
    const dev = num(k.devolucao);
    const meta = num(k.meta ?? k.vl_meta);
    const cards = [
      { l: 'Faturamento Bruto', v: fmtBRL(fat), c: AZUL },
      { l: 'Faturamento Líquido', v: fmtBRL(liq), c: VERDE },
      { l: 'Impostos', v: fmtBRL(imp), c: AMARELO },
      { l: 'Devolução', v: fmtBRL(dev), c: VERMELHO },
      { l: 'Ticket Médio', v: fmtBRL(num(k.ticket_medio)), c: AZUL },
      { l: '% Atingimento Meta', v: fmtPct(meta > 0 ? (fat / meta) * 100 : null), c: AZUL },
    ];
    cards.forEach((c, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = 0.5 + col * 4.3, y = 1.2 + row * 2.6;
      s.addShape('rect', { x, y, w: 4.0, h: 2.3, fill: { color: 'F1F5F9' }, line: { color: c.c, width: 2 } });
      s.addText(c.l, { x: x + 0.2, y: y + 0.2, w: 3.6, h: 0.4, fontSize: 12, color: CINZA, fontFace: 'Calibri' });
      s.addText(c.v, { x: x + 0.2, y: y + 0.7, w: 3.6, h: 1.2, fontSize: 28, bold: true, color: c.c, fontFace: 'Calibri' });
    });
  }

  // --- Evolução ---
  if (blocos.evolucao) {
    const s = pptx.addSlide();
    s.addText('Evolução Mensal — Realizado vs Meta', { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 26, bold: true, color: AZUL });
    const img = await captureChart('[data-rel-chart="evolucao"]');
    if (img) s.addImage({ data: img, x: 0.5, y: 1.1, w: 12.3, h: 5.6 });
  }

  // --- Rankings ---
  if (blocos.rankings) {
    const ranks: { titulo: string; chartId: string }[] = [
      { titulo: 'Top Revendas', chartId: 'rk-rev' },
      { titulo: 'Top Estados', chartId: 'rk-est' },
      { titulo: 'Top Obras/Projetos', chartId: 'rk-obr' },
    ];
    for (const r of ranks) {
      const s = pptx.addSlide();
      s.addText(r.titulo, { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 26, bold: true, color: AZUL });
      const img = await captureChart(`[data-rel-chart="${r.chartId}"]`);
      if (img) s.addImage({ data: img, x: 0.5, y: 1.1, w: 12.3, h: 5.6 });
    }
  }

  // --- Margem ---
  if (blocos.margem) {
    const s = pptx.addSlide();
    s.addText('Margem e Impostos (% do Bruto)', { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 26, bold: true, color: AZUL });
    const img = await captureChart('[data-rel-chart="margem"]');
    if (img) s.addImage({ data: img, x: 0.5, y: 1.1, w: 12.3, h: 5.6 });
  }

  // --- Comentários IA ---
  if (blocos.comentariosIa && comentariosIa) {
    const s = pptx.addSlide();
    s.addText('Comentários Executivos (IA)', { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 26, bold: true, color: AZUL });
    const blocks = [
      { titulo: 'Destaques', items: comentariosIa.destaques, cor: VERDE },
      { titulo: 'Alertas', items: comentariosIa.alertas, cor: AMARELO },
      { titulo: 'Recomendações', items: comentariosIa.recomendacoes, cor: AZUL },
    ];
    blocks.forEach((b, i) => {
      const x = 0.5 + i * 4.3;
      s.addText(b.titulo, { x, y: 1.1, w: 4.0, h: 0.5, fontSize: 16, bold: true, color: b.cor, fontFace: 'Calibri' });
      s.addText(b.items.map((t) => ({ text: t, options: { bullet: true } })), {
        x, y: 1.7, w: 4.0, h: 5.0, fontSize: 12, color: '1F2937', fontFace: 'Calibri', valign: 'top',
      });
    });
  }

  // --- Tabela analítica (resumo) ---
  if (blocos.tabela && dados.detalhes.length) {
    const s = pptx.addSlide();
    s.addText('Tabela Analítica (top 20)', { x: 0.5, y: 0.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: AZUL });
    const head = ['Mês', 'UN', 'NF', 'Estado', 'Cliente', 'Bruto', 'Imposto', 'Líquido']
      .map((t) => ({ text: t, options: { bold: true, fill: { color: 'E2E8F0' } } }));
    const body = dados.detalhes.slice(0, 20).map((r) => [
      { text: fmtAnomes(r.anomes_emissao ?? '') },
      { text: r.unidade_negocio ?? '—' },
      { text: r.cd_nf ?? '—' },
      { text: r.cd_estado ?? '—' },
      { text: String(r.cd_cliente ?? '—') },
      { text: fmtBRL(num(r.vl_bruto)) },
      { text: fmtBRL(num(r.vl_impostos)) },
      { text: fmtBRL(num(r.vl_liquido)) },
    ]);
    s.addTable([head, ...body], {
      x: 0.5, y: 1.0, w: 12.3, fontSize: 9, fontFace: 'Calibri',
      border: { type: 'solid', pt: 0.5, color: 'CBD5E1' },
      colW: [1.0, 1.6, 1.1, 1.0, 2.6, 1.6, 1.6, 1.8],
    });
  }


  const ts = new Date().toISOString().slice(0, 10);
  await pptx.writeFile({ fileName: `relatorio-faturamento-${ts}.pptx` });
}
