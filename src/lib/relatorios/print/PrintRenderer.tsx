import React from 'react';
import { Barcode } from '@/components/producao/Barcode';
import type {
  Block,
  PrintDocument,
  PrintHeaderFooter,
  TableBlock,
} from './types';
import './relatorio-print.css';

interface PrintRendererProps {
  doc: PrintDocument;
  /** Modo preview: mostra borda e sombra de página. */
  preview?: boolean;
}

/**
 * Renderiza um PrintDocument. Em preview, mostra páginas separadas; em
 * impressão, o navegador quebra pelas regras CSS (@page / break-after).
 *
 * Estratégia de paginação:
 *  - Blocos do tipo `pagebreak` forçam nova página explicitamente.
 *  - Caso contrário, o motor coloca todos os blocos em uma única
 *    `.rp-page` e deixa o navegador quebrar conforme `break-inside`.
 *  - Adapters que precisam controlar páginas manualmente devem inserir
 *    `pagebreak` entre os grupos de blocos.
 */
export function PrintRenderer({ doc }: PrintRendererProps) {
  const pages = splitIntoPages(doc.blocks);
  const cssVars: React.CSSProperties = {
    ['--rp-margin-top' as any]: `${doc.page.margins.top}mm`,
    ['--rp-margin-right' as any]: `${doc.page.margins.right}mm`,
    ['--rp-margin-bottom' as any]: `${doc.page.margins.bottom}mm`,
    ['--rp-margin-left' as any]: `${doc.page.margins.left}mm`,
    ['--rp-page-w' as any]: doc.page.size === 'A3' ? '297mm' : doc.page.size === 'Letter' ? '216mm' : '210mm',
    ['--rp-page-h' as any]: doc.page.size === 'A3' ? '420mm' : doc.page.size === 'Letter' ? '279mm' : '297mm',
  };
  const totalPages = pages.length;
  return (
    <div className="rp-root print-root" style={cssVars}>
      {pages.map((blocks, idx) => (
        <article
          key={idx}
          className={`rp-page ${doc.page.orientation === 'landscape' ? 'landscape' : ''}`}
        >
          {doc.header && <HeaderFooter slot="header" data={doc.header} page={idx + 1} pages={totalPages} />}
          <div className="rp-body">
            {blocks.map((b, i) => (
              <BlockRenderer key={b.id ?? `b-${idx}-${i}`} block={b} />
            ))}
          </div>
          {doc.footer && <HeaderFooter slot="footer" data={doc.footer} page={idx + 1} pages={totalPages} />}
        </article>
      ))}
    </div>
  );
}

function splitIntoPages(blocks: Block[]): Block[][] {
  const pages: Block[][] = [[]];
  for (const b of blocks) {
    if (b.type === 'pagebreak') {
      pages.push([]);
      continue;
    }
    pages[pages.length - 1].push(b);
  }
  return pages.filter((p) => p.length > 0);
}

function HeaderFooter({
  slot, data, page, pages,
}: { slot: 'header' | 'footer'; data: PrintHeaderFooter; page: number; pages: number }) {
  const render = (n?: React.ReactNode) => {
    if (n == null) return null;
    if (typeof n === 'string') {
      return n.replace('{page}', String(page)).replace('{pages}', String(pages));
    }
    return n;
  };
  return (
    <div className={`rp-${slot} ${data.border ? 'bordered' : ''}`}>
      <div className="left">{render(data.left)}</div>
      <div className="center">{render(data.center)}</div>
      <div className="right">{render(data.right)}</div>
    </div>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  const wrap = (children: React.ReactNode) => (
    <div className={`${block.keepTogether ? 'rp-keep-together' : ''} ${block.className ?? ''}`}>
      {children}
    </div>
  );

  switch (block.type) {
    case 'title':
      return wrap(<div className={`rp-title l${block.level ?? 2}`}>{block.text}</div>);

    case 'text':
      return wrap(
        <div
          className={[
            'rp-text',
            block.bold && 'bold',
            block.italic && 'italic',
            block.align,
          ].filter(Boolean).join(' ')}
        >
          {block.text}
        </div>,
      );

    case 'spacer':
      return <div style={{ height: `${block.heightMm}mm` }} />;

    case 'pagebreak':
      return <div className={`rp-pagebreak ${block.mode === 'avoid' ? 'avoid' : ''}`} />;

    case 'kv':
      return wrap(
        <div className={`rp-kv cols-${block.columns ?? 2} ${block.bordered ? 'bordered' : ''}`}>
          {block.items.flatMap((it, i) => [
            <div key={`k-${i}`} className={`k ${it.highlight ? 'hl' : ''}`}>{it.label}</div>,
            <div
              key={`v-${i}`}
              className={`v ${it.full ? 'full' : ''} ${it.highlight ? 'hl' : ''}`}
            >
              {it.value as React.ReactNode}
            </div>,
          ])}
        </div>,
      );

    case 'barcode':
      return wrap(
        <div className="rp-barcode">
          <Barcode value={block.value} height={block.heightPx ?? 32} displayValue={false} />
          {(block.caption ?? (block.displayValue !== false ? block.value : null)) && (
            <div className="rp-barcode-caption">{block.caption ?? block.value}</div>
          )}
        </div>,
      );

    case 'image':
      return wrap(
        <div className={`rp-image-wrap ${block.fullPage ? 'full-page' : ''}`}>
          <img
            src={block.src}
            alt={block.alt ?? ''}
            className={block.rotate ? `rot-${block.rotate}` : ''}
          />
        </div>,
      );

    case 'group':
      return wrap(
        <div className={`rp-group ${block.keepTogether ? 'rp-keep-together' : ''}`}>
          {block.children.map((c, i) => (
            <BlockRenderer key={c.id ?? `g-${i}`} block={c} />
          ))}
        </div>,
      );

    case 'raw':
      return wrap(<>{block.content}</>);

    case 'table':
      return wrap(<TableRenderer block={block} />);
  }
}

function TableRenderer({ block }: { block: TableBlock }) {
  const { columns, rows, groupBy, showTotals, totalColumns, fontSizePt, repeatHeader } = block;
  const grouped = groupBy
    ? rows.reduce<Record<string, Record<string, unknown>[]>>((acc, r) => {
        const k = String(r[groupBy] ?? '');
        (acc[k] ||= []).push(r);
        return acc;
      }, {})
    : null;

  const totals: Record<string, number> = {};
  if (showTotals && totalColumns) {
    for (const c of totalColumns) {
      totals[c] = rows.reduce((sum, r) => {
        const v = Number(r[c]);
        return Number.isFinite(v) ? sum + v : sum;
      }, 0);
    }
  }

  const style: React.CSSProperties | undefined = fontSizePt ? { fontSize: `${fontSizePt}pt` } : undefined;

  return (
    <table className="rp-table" style={style}>
      <thead style={{ display: repeatHeader === false ? 'table-row-group' : 'table-header-group' }}>
        <tr>
          {columns.map((c) => (
            <th key={c.key} style={{ width: c.width, textAlign: c.align ?? 'left' }}>{c.title}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {grouped
          ? Object.entries(grouped).flatMap(([groupKey, groupRows]) => [
              <tr key={`g-${groupKey}`} className="rp-group-row">
                <td colSpan={columns.length}>{groupKey || '—'}</td>
              </tr>,
              ...groupRows.map((r, i) => (
                <tr key={`g-${groupKey}-${i}`}>
                  {columns.map((c) => (
                    <td key={c.key} className={c.align ? `align-${c.align}` : undefined}>
                      {renderCell(c, r, i)}
                    </td>
                  ))}
                </tr>
              )),
            ])
          : rows.map((r, i) => (
              <tr key={`r-${i}`}>
                {columns.map((c) => (
                  <td key={c.key} className={c.align ? `align-${c.align}` : undefined}>
                    {renderCell(c, r, i)}
                  </td>
                ))}
              </tr>
            ))}
      </tbody>
      {showTotals && totalColumns && (
        <tfoot>
          <tr>
            {columns.map((c, i) => (
              <td key={c.key} className={c.align ? `align-${c.align}` : undefined}>
                {i === 0 ? 'Total' : totalColumns.includes(c.key) ? formatNum(totals[c.key]) : ''}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function renderCell(c: { key: string; render?: (r: Record<string, unknown>, i: number) => React.ReactNode }, row: Record<string, unknown>, i: number) {
  if (c.render) return c.render(row, i) as React.ReactNode;
  const v = row[c.key];
  if (v == null) return '';
  return String(v);
}

function formatNum(n: number) {
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
