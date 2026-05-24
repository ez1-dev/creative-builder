import { useMemo, useState } from 'react';
import { useCargaDetalhe } from '@/hooks/useCargaProducao';
import { CargaDetalheRow, CargaFiltros } from '@/lib/producao/cargaApi';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { UnidadeNegocioBadge, OrigemMapeamentoBadge, TipoRecursoBadge } from './badges';
import { GroupByBar } from '@/components/producao/carga-dashboard/GroupByBar';
import { GroupedRows } from '@/components/producao/carga-dashboard/GroupedRows';
import { collectAllGroupKeys, useTableGrouping, type GroupField } from '@/components/producao/carga-dashboard/useTableGrouping';
import { CodeWithDesc } from '@/components/producao/carga-dashboard/CodeWithDesc';


const fmt = (n: number | undefined) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const fmtData = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

const NUMERIC_KEYS = [
  'quantidade_prevista',
  'tempo_unitario_min',
  'tempo_fixo_min',
  'tempo_total_previsto_original',
  'tempo_previsto_min',
  'tempo_previsto_horas',
];

export function DetalheOpsTab({ filtros }: { filtros: CargaFiltros }) {
  const [pagina, setPagina] = useState(1);
  const tamanho_pagina = 50;
  const { data, isLoading, isError, error } = useCargaDetalhe({ ...filtros, pagina, tamanho_pagina });

  const rows = data?.dados ?? [];
  const total = data?.total_registros ?? 0;
  const totalPaginas = data?.total_paginas ?? 1;

  const [groupFields, setGroupFields] = useState<GroupField[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const tree = useTableGrouping(rows, groupFields, NUMERIC_KEYS);

  const toggleGroup = (k: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const renderLeaf = (r: CargaDetalheRow, i: number) => (
    <TableRow key={i}>
      <TableCell><UnidadeNegocioBadge value={r.unidade_negocio} /></TableCell>
      <TableCell><TipoRecursoBadge value={r.tipo_recurso} /></TableCell>
      <TableCell className="text-xs">{r.codccu}</TableCell>
      <TableCell><CodeWithDesc code={r.codcre} desc={r.descre} /></TableCell>
      <TableCell className="text-xs">{r.codori}</TableCell>
      <TableCell className="text-xs font-mono">{r.numorp ?? r.numop}</TableCell>
      <TableCell><CodeWithDesc code={r.codpro} desc={r.descricao_produto} /></TableCell>
      <TableCell><Badge variant="outline" className="text-xs">{r.sitorp ?? r.sitop}</Badge></TableCell>
      <TableCell className="text-xs">{fmtData(r.data_geracao_op)}</TableCell>
      <TableCell className="text-xs">{r.estagio}</TableCell>
      <TableCell className="text-xs text-right">{r.sequencia_roteiro}</TableCell>
      <TableCell><CodeWithDesc code={r.codopr} desc={r.descricao_operacao} /></TableCell>
      <TableCell className="text-right text-xs">{fmt(r.quantidade_prevista)}</TableCell>
      <TableCell className="text-right text-xs">{fmt(r.tempo_unitario_min)}</TableCell>
      <TableCell className="text-right text-xs">{fmt(r.tempo_fixo_min)}</TableCell>
      <TableCell className="text-right text-xs">{fmt(r.tempo_total_previsto_original)}</TableCell>
      <TableCell className="text-right text-xs">{fmt(r.tempo_previsto_min)}</TableCell>
      <TableCell className="text-right text-xs font-semibold">{fmt(r.tempo_previsto_horas)}</TableCell>
      <TableCell><OrigemMapeamentoBadge value={r.origem_mapeamento} /></TableCell>
    </TableRow>
  );


  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="text-xs text-muted-foreground">{total.toLocaleString('pt-BR')} registro(s) • Página {pagina} de {totalPaginas}</div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" disabled={pagina <= 1} onClick={() => setPagina((p) => Math.max(1, p - 1))}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <GroupByBar
        value={groupFields}
        onChange={(v) => { setGroupFields(v); setExpanded(new Set()); }}
        onExpandAll={() => setExpanded(new Set(collectAllGroupKeys(tree)))}
        onCollapseAll={() => setExpanded(new Set())}
      />
      {groupFields.length > 0 && (
        <div className="px-3 py-1.5 text-[10px] text-muted-foreground bg-muted/20 border-b">
          Agrupando apenas as {rows.length} linhas da página atual.
        </div>
      )}

      {isError && (
        <div className="p-6 flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" /> {(error as Error)?.message}
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Un.</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>CCusto</TableHead>
              <TableHead>Recurso</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>OP</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Descrição produto</TableHead>
              <TableHead>Sit.</TableHead>
              <TableHead>Geração</TableHead>
              <TableHead>Estágio</TableHead>
              <TableHead>Seq.</TableHead>
              <TableHead>Operação</TableHead>
              <TableHead>Descrição operação</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">T.Unit (min)</TableHead>
              <TableHead className="text-right">T.Fixo (min)</TableHead>
              <TableHead className="text-right">Total orig.</TableHead>
              <TableHead className="text-right">Prev. (min)</TableHead>
              <TableHead className="text-right">Prev. (h)</TableHead>
              <TableHead>Mapeamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={22}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
            ))}
            {!isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={22} className="text-center text-sm text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
            )}
            {!isLoading && rows.length > 0 && (
              groupFields.length === 0
                ? rows.map((r, i) => renderLeaf(r, i))
                : (
                  <GroupedRows
                    nodes={tree}
                    expanded={expanded}
                    onToggle={toggleGroup}
                    labelColspan={15}
                    renderTotals={(t) => (
                      <>
                        <TableCell className="text-right text-xs font-semibold">{fmt(t.quantidade_prevista)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">{fmt(t.tempo_unitario_min)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">{fmt(t.tempo_fixo_min)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">{fmt(t.tempo_total_previsto_original)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">{fmt(t.tempo_previsto_min)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">{fmt(t.tempo_previsto_horas)}</TableCell>
                      </>
                    )}
                    trailingCells={<TableCell />}
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
