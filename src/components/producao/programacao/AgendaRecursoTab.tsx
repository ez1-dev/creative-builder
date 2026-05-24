import { useMemo, useState } from 'react';
import { useAgenda } from '@/hooks/useProgramacao';
import type { ProgramacaoFiltros, AgendaRow } from '@/lib/producao/programacaoApi';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';
import { CodeWithDesc } from '@/components/producao/carga-dashboard/CodeWithDesc';
import { GroupByBar } from '@/components/producao/carga-dashboard/GroupByBar';
import { GroupedRows } from '@/components/producao/carga-dashboard/GroupedRows';
import { collectAllGroupKeys, useTableGrouping, type GroupField } from '@/components/producao/carga-dashboard/useTableGrouping';

const fmt = (n: number) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const fmtData = (d: string) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

const statusVariant: Record<string, string> = {
  PROGRAMADO: 'bg-primary/10 text-primary border-primary/30',
  EXECUTANDO: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  CONCLUIDO: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  CANCELADO: 'bg-destructive/10 text-destructive border-destructive/30',
};

const NUMERIC_KEYS = ['tempo_alocado_min'];

export function AgendaRecursoTab({ filtros }: { filtros: ProgramacaoFiltros }) {
  const { data, isLoading, isError, error } = useAgenda(filtros);
  const [groupFields, setGroupFields] = useState<GroupField[]>(['codcre']);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const rows = data?.dados ?? [];
  const tree = useTableGrouping(rows, groupFields, NUMERIC_KEYS);

  const toggleGroup = (k: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  // Para calendário: agrupar por recurso + dia
  const calendarData = useMemo(() => {
    const dias = new Set<string>();
    const recursos = new Map<string, { codcre: string; descre: string }>();
    const cellMap = new Map<string, AgendaRow[]>(); // key: codcre|data
    for (const r of rows) {
      dias.add(r.data_programada);
      if (!recursos.has(r.codcre)) recursos.set(r.codcre, { codcre: r.codcre, descre: r.descre });
      const k = `${r.codcre}|${r.data_programada}`;
      const arr = cellMap.get(k);
      if (arr) arr.push(r);
      else cellMap.set(k, [r]);
    }
    return {
      dias: Array.from(dias).sort(),
      recursos: Array.from(recursos.values()).sort((a, b) => a.codcre.localeCompare(b.codcre)),
      cellMap,
    };
  }, [rows]);

  const renderLeaf = (r: AgendaRow, i: number) => (
    <TableRow key={`${r.codcre}-${r.numorp}-${r.data_programada}-${i}`}>
      <TableCell className="text-xs">{fmtData(r.data_programada)}</TableCell>
      <TableCell className="text-xs">{r.dia_semana}</TableCell>
      <TableCell className="text-xs font-mono">{r.hora_inicio}</TableCell>
      <TableCell className="text-xs font-mono">{r.hora_fim}</TableCell>
      <TableCell><CodeWithDesc code={r.codcre} desc={r.descre} /></TableCell>
      <TableCell className="text-xs font-mono">{r.numorp}</TableCell>
      <TableCell className="text-xs font-mono">{r.codpro}</TableCell>
      <TableCell><CodeWithDesc code={r.codopr} desc={r.descricao_operacao} /></TableCell>
      <TableCell className="text-right text-xs">{fmt(r.tempo_alocado_min)}</TableCell>
      <TableCell className="text-center text-xs">{r.segmento}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`text-[10px] ${statusVariant[String(r.status_programacao)] ?? ''}`}>
          {r.status_programacao}
        </Badge>
      </TableCell>
    </TableRow>
  );

  return (
    <Card className="overflow-hidden">
      <Tabs defaultValue="tabela" className="w-full">
        <div className="flex items-center justify-between p-3 border-b">
          <TabsList>
            <TabsTrigger value="tabela" className="text-xs">Tabela</TabsTrigger>
            <TabsTrigger value="calendario" className="text-xs">Calendário</TabsTrigger>
          </TabsList>
          <div className="text-xs text-muted-foreground">{rows.length} linhas</div>
        </div>

        <TabsContent value="tabela" className="m-0">
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
                  <TableHead>Data</TableHead>
                  <TableHead>Dia</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Centro recurso</TableHead>
                  <TableHead>OP</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead className="text-right">Tempo (min)</TableHead>
                  <TableHead className="text-center">Seg.</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={11}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
                ))}
                {!isLoading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center text-sm text-muted-foreground py-8">Sem agenda programada</TableCell></TableRow>
                )}
                {!isLoading && rows.length > 0 && (
                  groupFields.length === 0
                    ? rows.map((r, i) => renderLeaf(r, i))
                    : (
                      <GroupedRows
                        nodes={tree}
                        expanded={expanded}
                        onToggle={toggleGroup}
                        labelColspan={8}
                        renderTotals={(t) => (
                          <>
                            <TableCell className="text-right text-xs font-semibold">{fmt(t.tempo_alocado_min)}</TableCell>
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
        </TabsContent>

        <TabsContent value="calendario" className="m-0 p-3">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : rows.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">Sem agenda programada</div>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="grid gap-1 text-[11px]"
                style={{ gridTemplateColumns: `220px repeat(${calendarData.dias.length}, minmax(120px, 1fr))` }}
              >
                <div className="font-semibold p-2 sticky left-0 bg-background">Recurso</div>
                {calendarData.dias.map((d) => (
                  <div key={d} className="font-semibold p-2 text-center border-b">
                    {fmtData(d)}
                  </div>
                ))}
                {calendarData.recursos.map((rec) => (
                  <>
                    <div key={`${rec.codcre}-label`} className="p-2 border-t sticky left-0 bg-background">
                      <CodeWithDesc code={rec.codcre} desc={rec.descre} />
                    </div>
                    {calendarData.dias.map((d) => {
                      const cellRows = calendarData.cellMap.get(`${rec.codcre}|${d}`) ?? [];
                      const totalMin = cellRows.reduce((a, b) => a + (b.tempo_alocado_min ?? 0), 0);
                      return (
                        <div key={`${rec.codcre}-${d}`} className="p-1.5 border-t border-l text-[10px] space-y-1 min-h-[60px]">
                          {cellRows.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <>
                              <div className="text-muted-foreground">{fmt(totalMin)} min</div>
                              {cellRows.slice(0, 3).map((c, i) => (
                                <div key={i} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary truncate">
                                  OP {c.numorp} · {c.hora_inicio}
                                </div>
                              ))}
                              {cellRows.length > 3 && <div className="text-muted-foreground">+{cellRows.length - 3} mais</div>}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
