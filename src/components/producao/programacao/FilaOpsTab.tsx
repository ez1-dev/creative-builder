import { useMemo, useState } from 'react';
import { useFilaOps } from '@/hooks/useProgramacao';
import type { ProgramacaoFiltros, FilaOpRow } from '@/lib/producao/programacaoApi';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, AlertCircle } from 'lucide-react';
import { UnidadeNegocioBadge } from '@/components/producao/carga/badges';
import { CodeWithDesc } from '@/components/producao/carga-dashboard/CodeWithDesc';
import { GroupByBar } from '@/components/producao/carga-dashboard/GroupByBar';
import { GroupedRows } from '@/components/producao/carga-dashboard/GroupedRows';
import { collectAllGroupKeys, useTableGrouping, type GroupField } from '@/components/producao/carga-dashboard/useTableGrouping';

const fmt = (n: number) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const fmtData = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

const NUMERIC_KEYS = ['quantidade_prevista', 'tempo_previsto_min', 'tempo_previsto_horas'];

export function FilaOpsTab({ filtros }: { filtros: ProgramacaoFiltros }) {
  const { data, isLoading, isError, error } = useFilaOps(filtros);
  const [busca, setBusca] = useState('');
  const [groupFields, setGroupFields] = useState<GroupField[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const list = data?.dados ?? [];
    const term = busca.trim().toLowerCase();
    const filtered = term
      ? list.filter((r) =>
          [r.codcre, r.descre, r.codpro, r.descricao_produto, String(r.numorp)].some((v) =>
            String(v ?? '').toLowerCase().includes(term),
          ),
        )
      : list;
    return [...filtered].sort((a, b) => (b.prioridade ?? 0) - (a.prioridade ?? 0) || (b.tempo_previsto_horas ?? 0) - (a.tempo_previsto_horas ?? 0));
  }, [data, busca]);

  const tree = useTableGrouping(rows, groupFields, NUMERIC_KEYS);

  const toggleGroup = (k: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const renderLeaf = (r: FilaOpRow, i: number) => (
    <TableRow key={`${r.codcre}-${r.numorp}-${r.codopr}-${i}`}>
      <TableCell><UnidadeNegocioBadge value={r.unidade_negocio} /></TableCell>
      <TableCell><CodeWithDesc code={r.codcre} desc={r.descre} /></TableCell>
      <TableCell className="text-xs">{r.codori}</TableCell>
      <TableCell className="text-xs font-mono">{r.numorp}</TableCell>
      <TableCell><CodeWithDesc code={r.codpro} desc={r.descricao_produto} /></TableCell>
      <TableCell><CodeWithDesc code={r.codopr} desc={r.descricao_operacao} /></TableCell>
      <TableCell className="text-right text-xs">{fmt(r.quantidade_prevista)}</TableCell>
      <TableCell className="text-right text-xs">{fmt(r.tempo_previsto_min)}</TableCell>
      <TableCell className="text-right text-xs font-semibold">{fmt(r.tempo_previsto_horas)}</TableCell>
      <TableCell className="text-center"><Badge variant="outline" className="text-xs">{r.prioridade ?? '—'}</Badge></TableCell>
      <TableCell className="text-xs">{fmtData(r.data_geracao_op)}</TableCell>
    </TableRow>
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por OP, recurso, produto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-8 max-w-sm text-xs"
        />
        <div className="ml-auto text-xs text-muted-foreground">{rows.length} OPs na fila</div>
      </div>

      <GroupByBar
        value={groupFields}
        onChange={(v) => { setGroupFields(v); setExpanded(new Set()); }}
        available={['unidade_negocio', 'codcre']}
        onExpandAll={() => setExpanded(new Set(collectAllGroupKeys(tree)))}
        onCollapseAll={() => setExpanded(new Set())}
      />

      {isError && (
        <div className="p-6 flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" /> {(error as Error)?.message}
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidade</TableHead>
              <TableHead>Centro recurso</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>OP</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Operação</TableHead>
              <TableHead className="text-right">Qtd prevista</TableHead>
              <TableHead className="text-right">Tempo (min)</TableHead>
              <TableHead className="text-right">Tempo (h)</TableHead>
              <TableHead className="text-center">Prio.</TableHead>
              <TableHead>Geração OP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={11}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
            ))}
            {!isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">Nenhuma OP na fila</TableCell></TableRow>
            )}
            {!isLoading && rows.length > 0 && (
              groupFields.length === 0
                ? rows.map((r, i) => renderLeaf(r, i))
                : (
                  <GroupedRows
                    nodes={tree}
                    expanded={expanded}
                    onToggle={toggleGroup}
                    labelColspan={6}
                    renderTotals={(t) => (
                      <>
                        <TableCell className="text-right text-xs font-semibold">{fmt(t.quantidade_prevista)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">{fmt(t.tempo_previsto_min)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">{fmt(t.tempo_previsto_horas)}</TableCell>
                      </>
                    )}
                    trailingCells={<><TableCell /><TableCell /></>}
                    renderLeaf={renderLeaf}
                  />
                )
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
