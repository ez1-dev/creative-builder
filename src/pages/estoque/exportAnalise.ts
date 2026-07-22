import type { EstoqueAnaliseItem } from '@/lib/estoque/analiseApi';
import type { AnaliseFiltros } from './components/AnaliseFiltrosHeader';

export interface ExportColumn {
  key: string;
  label: string;
  type?: 'number' | 'currency' | 'text' | 'date' | 'percent';
  get?: (item: EstoqueAnaliseItem) => any;
}

function ctxHeader(f: AnaliseFiltros, titulo: string) {
  return [
    [titulo],
    [`Empresa: ${f.codemp ?? ''}`],
    [`Filial: ${f.codfil || 'Todas'}`],
    [`Consumo: ${f.meses_consumo} meses`],
    [`Critério ABC: ${f.criterio_abc === 'CONSUMO' ? 'Consumo no período' : 'Valor atual em estoque'}`],
    [`Cortes: A ${f.corte_a}% | B ${f.corte_b}%`],
    [`Data da análise: ${new Date().toLocaleString('pt-BR')}`],
    [],
  ];
}

function valorCel(item: EstoqueAnaliseItem, col: ExportColumn) {
  const v = col.get ? col.get(item) : (item as any)[col.key];
  if (v == null || v === '') return '';
  if (col.type === 'number' || col.type === 'currency' || col.type === 'percent') {
    const n = Number(v);
    return Number.isFinite(n) ? n : '';
  }
  return v;
}

export async function exportAnaliseXlsx(opts: {
  titulo: string;
  filtros: AnaliseFiltros;
  columns: ExportColumn[];
  data: EstoqueAnaliseItem[];
  filename?: string;
}) {
  const XLSX = await import('xlsx');
  const header = ctxHeader(opts.filtros, opts.titulo);
  const colHeader = opts.columns.map((c) => c.label);
  const rows = opts.data.map((it) => opts.columns.map((c) => valorCel(it, c)));
  const aoa = [...header, colHeader, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // format numeric cells
  const startRow = header.length + 1; // 0-indexed row of data
  opts.columns.forEach((c, ci) => {
    if (c.type !== 'number' && c.type !== 'currency' && c.type !== 'percent') return;
    for (let r = startRow; r < startRow + rows.length; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: ci });
      const cell = (ws as any)[addr];
      if (cell && typeof cell.v === 'number') {
        cell.t = 'n';
        cell.z = c.type === 'currency' ? 'R$ #,##0.00' : c.type === 'percent' ? '0.00%' : '#,##0.000';
      }
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, opts.titulo.slice(0, 30));
  XLSX.writeFile(wb, opts.filename ?? `${opts.titulo.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
}

export function exportAnaliseCsv(opts: {
  titulo: string;
  filtros: AnaliseFiltros;
  columns: ExportColumn[];
  data: EstoqueAnaliseItem[];
  filename?: string;
}) {
  const header = ctxHeader(opts.filtros, opts.titulo).map((l) => l.join(''));
  const colHeader = opts.columns.map((c) => c.label).join(';');
  const rows = opts.data.map((it) =>
    opts.columns
      .map((c) => {
        const v = valorCel(it, c);
        if (typeof v === 'number') return String(v).replace('.', ',');
        return String(v ?? '').replace(/;/g, ',');
      })
      .join(';'),
  );
  const csv = '\uFEFF' + [...header, colHeader, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.filename ?? `${opts.titulo.toLowerCase().replace(/\s+/g, '-')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportAnalisePdf(opts: {
  titulo: string;
  filtros: AnaliseFiltros;
  columns: ExportColumn[];
  data: EstoqueAnaliseItem[];
  filename?: string;
}) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(opts.titulo, 14, 14);
  doc.setFontSize(9);
  const ctx = ctxHeader(opts.filtros, opts.titulo).flat().filter((s) => s && s !== opts.titulo);
  ctx.forEach((line, i) => doc.text(String(line), 14, 22 + i * 5));
  autoTable(doc, {
    startY: 22 + ctx.length * 5 + 4,
    head: [opts.columns.map((c) => c.label)],
    body: opts.data.map((it) =>
      opts.columns.map((c) => {
        const v = valorCel(it, c);
        if (typeof v === 'number') {
          if (c.type === 'currency') return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          if (c.type === 'percent') return `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
          return v.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
        }
        return String(v ?? '—');
      }),
    ),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [11, 29, 51] },
  });
  doc.save(opts.filename ?? `${opts.titulo.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
