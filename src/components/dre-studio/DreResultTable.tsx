import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DreResultadoResponse, DreResultadoLinha } from '@/lib/contabil/dreStudioTypes';
import { anomesToLabel } from '@/lib/contabil/anomes';

interface Props {
  data: DreResultadoResponse | undefined;
  visao?: 'resumida' | 'mensal' | 'acumulada';
  onExport?: (rows: string[][]) => void;
}

interface Node extends DreResultadoLinha {
  children: Node[];
}

function buildTree(linhas: DreResultadoLinha[]): Node[] {
  const byId = new Map<string, Node>();
  linhas.forEach((l) => byId.set(l.linha_id, { ...l, children: [] }));
  const roots: Node[] = [];
  byId.forEach((n) => {
    if (n.linha_pai_id && byId.has(n.linha_pai_id)) byId.get(n.linha_pai_id)!.children.push(n);
    else roots.push(n);
  });
  const sortRec = (arr: Node[]) => {
    arr.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    arr.forEach((c) => sortRec(c.children));
  };
  sortRec(roots);
  return roots;
}

function fmtMoeda(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function sumByKeys(r: Record<string, number | null>): number {
  let s = 0;
  Object.values(r ?? {}).forEach((v) => { if (v != null && Number.isFinite(v)) s += v; });
  return s;
}

export function DreResultTable({ data, visao = 'resumida', onExport }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const linhas = data?.linhas ?? [];
  const tree = useMemo(() => buildTree(linhas), [linhas]);
  const periodos = useMemo(() => data?.periodos ?? data?.colunas ?? [], [data]);

  const totalReceita = useMemo(() => {
    // AV base: soma absoluta da maior linha positiva marcada como TOTAL ou primeira GRUPO
    const g = linhas.find((l) => /receita/i.test(l.descricao) || l.tipo_linha === 'TOTAL');
    if (!g) return 0;
    return Math.abs(sumByKeys(g.realizado));
  }, [linhas]);

  const toggle = (id: string) =>
    setCollapsed((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const exportCsv = () => {
    const header = ['Código', 'Descrição', ...(visao === 'mensal' ? periodos.map(anomesToLabel) : ['Realizado', 'Orçado', 'Var R$', 'Var %', 'AV %'])];
    const rows: string[][] = [header];
    const walk = (n: Node, depth = 0) => {
      const real = sumByKeys(n.realizado);
      const orc = sumByKeys(n.orcado);
      const vr = real - orc;
      const vp = orc ? (vr / orc) * 100 : null;
      const av = totalReceita ? (real / totalReceita) * 100 : null;
      if (visao === 'mensal') {
        rows.push([n.codigo, `${'  '.repeat(depth)}${n.descricao}`, ...periodos.map((p) => fmtMoeda(n.realizado?.[p]))]);
      } else {
        rows.push([n.codigo, `${'  '.repeat(depth)}${n.descricao}`, fmtMoeda(real), fmtMoeda(orc), fmtMoeda(vr), fmtPct(vp), fmtPct(av)]);
      }
      n.children.forEach((c) => walk(c, depth + 1));
    };
    tree.forEach((n) => walk(n));
    onExport?.(rows);
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `dre-resultado-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const renderRow = (n: Node, depth: number): React.ReactNode => {
    if (n.exibir === false) return null;
    const hasChildren = n.children.length > 0;
    const open = !collapsed.has(n.linha_id);
    const real = sumByKeys(n.realizado);
    const orc = sumByKeys(n.orcado);
    const vr = real - orc;
    const vp = orc ? (vr / orc) * 100 : null;
    const av = totalReceita ? (real / totalReceita) * 100 : null;

    const isTotal = n.tipo_linha === 'TOTAL';
    const isSub = n.tipo_linha === 'SUBTOTAL';
    const isGroup = n.tipo_linha === 'GRUPO';
    const bold = n.negrito || isTotal || isSub || isGroup;

    const cellClass = (v: number) => cn(
      'px-2 py-1.5 text-right tabular-nums',
      v < 0 && 'text-destructive',
      v > 0 && (isTotal || isSub) && 'text-emerald-600 dark:text-emerald-400',
    );

    const rowClass = cn(
      'border-b hover:bg-muted/40',
      isTotal && 'bg-primary/10 border-t-2 border-b-2 border-primary/30',
      isSub && 'bg-muted/40',
      isGroup && 'bg-muted/20',
    );

    return (
      <>
        <tr key={n.linha_id} className={rowClass}>
          <td className={cn('sticky left-0 z-10 bg-inherit px-2 py-1.5 text-sm', bold && 'font-semibold')}
              style={{ paddingLeft: 8 + depth * 16 }}>
            <div className="flex items-center gap-1">
              {hasChildren ? (
                <button onClick={() => toggle(n.linha_id)} className="p-0.5 rounded hover:bg-muted">
                  {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
              ) : <span className="w-4" />}
              <span className="text-xs text-muted-foreground font-mono">{n.codigo}</span>
              <span className={cn('truncate', bold && 'font-semibold')}>{n.descricao}</span>
            </div>
          </td>
          {visao === 'mensal' ? (
            periodos.map((p) => {
              const v = n.realizado?.[p] ?? 0;
              return <td key={p} className={cellClass(v)}>{fmtMoeda(v)}</td>;
            })
          ) : (
            <>
              <td className={cellClass(real)}>{fmtMoeda(real)}</td>
              <td className={cellClass(orc)}>{fmtMoeda(orc)}</td>
              <td className={cellClass(vr)}>{fmtMoeda(vr)}</td>
              <td className={cellClass(vp ?? 0)}>{fmtPct(vp)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{fmtPct(av)}</td>
            </>
          )}
        </tr>
        {hasChildren && open && n.children.map((c) => renderRow(c, depth + 1))}
      </>
    );
  };

  if (!data || linhas.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        Não foram encontrados valores para o período e os filtros informados.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="text-xs text-muted-foreground">
          {data.origem && <>Origem: <span className="font-medium">{data.origem}</span> · </>}
          {data.atualizado_em && <>Atualizado em {new Date(data.atualizado_em).toLocaleString('pt-BR')}</>}
        </div>
        <Button size="sm" variant="outline" className="gap-1" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </Button>
      </div>
      <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-20 bg-card border-b">
            <tr className="text-xs uppercase text-muted-foreground">
              <th className="sticky left-0 bg-card px-2 py-2 text-left">Descrição</th>
              {visao === 'mensal'
                ? periodos.map((p) => <th key={p} className="px-2 py-2 text-right">{anomesToLabel(p)}</th>)
                : (<>
                    <th className="px-2 py-2 text-right">Realizado</th>
                    <th className="px-2 py-2 text-right">Orçado</th>
                    <th className="px-2 py-2 text-right">Var R$</th>
                    <th className="px-2 py-2 text-right">Var %</th>
                    <th className="px-2 py-2 text-right">A.V. %</th>
                  </>)}
            </tr>
          </thead>
          <tbody>{tree.map((n) => renderRow(n, 0))}</tbody>
        </table>
      </div>
    </div>
  );
}
