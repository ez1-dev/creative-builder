import { formatCurrency, formatByKind, KpiFormat } from '../utils/formatters';

export interface SummaryRow { label: string; value: number; format?: KpiFormat; bold?: boolean }

export function SummaryTable({ rows, total }: { rows: SummaryRow[]; total?: SummaryRow }) {
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <table className="w-full text-xs">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t first:border-t-0">
              <td className={`px-3 py-2 ${r.bold ? 'font-semibold' : ''}`}>{r.label}</td>
              <td className={`px-3 py-2 text-right tabular-nums ${r.bold ? 'font-semibold' : ''}`}>
                {formatByKind(r.value, r.format ?? 'currency')}
              </td>
            </tr>
          ))}
          {total && (
            <tr className="border-t bg-muted/40">
              <td className="px-3 py-2 font-bold">{total.label}</td>
              <td className="px-3 py-2 text-right font-bold tabular-nums">
                {formatByKind(total.value, total.format ?? 'currency')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
