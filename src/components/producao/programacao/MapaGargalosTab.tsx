import { useMemo, useState } from 'react';
import { useGargalos } from '@/hooks/useProgramacao';
import type { ProgramacaoFiltros, GargaloDiaRow, StatusGargalo } from '@/lib/producao/programacaoApi';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertCircle, AlertTriangle, CheckCircle2, MinusCircle } from 'lucide-react';
import { CodeWithDesc } from '@/components/producao/carga-dashboard/CodeWithDesc';
import { UnidadeNegocioBadge } from '@/components/producao/carga/badges';
import { cn } from '@/lib/utils';

const fmt = (n: number) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const fmtData = (d: string) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');

const statusStyle: Record<string, { cell: string; badge: string; label: string }> = {
  OK: { cell: 'bg-emerald-500/30 text-emerald-900 dark:text-emerald-100', badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30', label: 'OK' },
  ATENCAO: { cell: 'bg-amber-500/40 text-amber-900 dark:text-amber-50', badge: 'bg-amber-500/10 text-amber-700 border-amber-500/30', label: 'Atenção' },
  GARGALO: { cell: 'bg-destructive/80 text-destructive-foreground', badge: 'bg-destructive/10 text-destructive border-destructive/30', label: 'Gargalo' },
  SEM_PARAMETRO: { cell: 'bg-muted text-muted-foreground', badge: 'bg-muted text-muted-foreground border-muted', label: 'Sem parâmetro' },
};

export function MapaGargalosTab({ filtros }: { filtros: ProgramacaoFiltros }) {
  const { data, isLoading, isError, error } = useGargalos(filtros);
  const [soCriticos, setSoCriticos] = useState(false);

  const rows = data?.dados ?? [];

  const filtered = useMemo(
    () => (soCriticos ? rows.filter((r) => r.status === 'GARGALO' || r.status === 'ATENCAO') : rows),
    [rows, soCriticos],
  );

  const kpis = useMemo(() => {
    const acc = { OK: 0, ATENCAO: 0, GARGALO: 0, SEM_PARAMETRO: 0 };
    for (const r of rows) acc[r.status as keyof typeof acc] = (acc[r.status as keyof typeof acc] ?? 0) + 1;
    return acc;
  }, [rows]);

  // Heatmap: recurso x dia
  const heat = useMemo(() => {
    const dias = new Set<string>();
    const recursos = new Map<string, { codcre: string; descre: string; unidade: string }>();
    const cellMap = new Map<string, GargaloDiaRow>();
    for (const r of rows) {
      dias.add(r.data);
      if (!recursos.has(r.codcre)) recursos.set(r.codcre, { codcre: r.codcre, descre: r.descre, unidade: r.unidade_negocio });
      cellMap.set(`${r.codcre}|${r.data}`, r);
    }
    return {
      dias: Array.from(dias).sort(),
      recursos: Array.from(recursos.values()).sort((a, b) => a.codcre.localeCompare(b.codcre)),
      cellMap,
    };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiMini label="OK" value={kpis.OK} icon={<CheckCircle2 className="h-4 w-4" />} color="text-emerald-600" />
        <KpiMini label="Atenção" value={kpis.ATENCAO} icon={<AlertTriangle className="h-4 w-4" />} color="text-amber-600" />
        <KpiMini label="Gargalo" value={kpis.GARGALO} icon={<AlertCircle className="h-4 w-4" />} color="text-destructive" />
        <KpiMini label="Sem parâmetro" value={kpis.SEM_PARAMETRO} icon={<MinusCircle className="h-4 w-4" />} color="text-muted-foreground" />
      </div>

      <Card className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">Heatmap · Recurso × Dia</div>
          <div className="text-[11px] text-muted-foreground">
            <span className="inline-block w-3 h-3 align-middle rounded-sm bg-emerald-500/30 mr-1" /> OK
            <span className="inline-block w-3 h-3 align-middle rounded-sm bg-amber-500/40 ml-3 mr-1" /> Atenção
            <span className="inline-block w-3 h-3 align-middle rounded-sm bg-destructive/80 ml-3 mr-1" /> Gargalo
            <span className="inline-block w-3 h-3 align-middle rounded-sm bg-muted ml-3 mr-1" /> Sem parâmetro
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : rows.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">Sem dados de gargalos</div>
        ) : (
          <div className="overflow-x-auto">
            <TooltipProvider delayDuration={150}>
              <div
                className="grid gap-1 text-[11px]"
                style={{ gridTemplateColumns: `220px repeat(${heat.dias.length}, minmax(70px, 1fr))` }}
              >
                <div className="font-semibold p-1.5 sticky left-0 bg-background">Recurso</div>
                {heat.dias.map((d) => (
                  <div key={d} className="font-semibold p-1.5 text-center border-b text-[10px]">{fmtData(d)}</div>
                ))}
                {heat.recursos.map((rec) => (
                  <>
                    <div key={`${rec.codcre}-label`} className="p-1.5 border-t sticky left-0 bg-background">
                      <CodeWithDesc code={rec.codcre} desc={rec.descre} />
                    </div>
                    {heat.dias.map((d) => {
                      const cell = heat.cellMap.get(`${rec.codcre}|${d}`);
                      const style = cell ? statusStyle[cell.status] : statusStyle.SEM_PARAMETRO;
                      return (
                        <Tooltip key={`${rec.codcre}-${d}`}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'p-1.5 border-t border-l text-center font-mono rounded-sm min-h-[28px] flex items-center justify-center',
                                style.cell,
                              )}
                            >
                              {cell ? `${fmt(cell.ocupacao_perc)}%` : '—'}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {cell ? (
                              <div className="text-[11px] space-y-0.5">
                                <div className="font-semibold">{fmtData(cell.data)} · {cell.dia_semana}</div>
                                <div>Carga programada: <strong>{fmt(cell.carga_programada_horas)} h</strong></div>
                                <div>Capacidade: <strong>{fmt(cell.capacidade_disponivel_horas)} h</strong></div>
                                <div>Ocupação: <strong>{fmt(cell.ocupacao_perc)}%</strong></div>
                                <div>Status: <strong>{statusStyle[cell.status]?.label ?? cell.status}</strong></div>
                              </div>
                            ) : (
                              <div className="text-[11px]">Sem dados</div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </>
                ))}
              </div>
            </TooltipProvider>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="text-sm font-semibold">Detalhe · {filtered.length} linha(s)</div>
          <div className="flex items-center gap-2">
            <Switch id="so-criticos" checked={soCriticos} onCheckedChange={setSoCriticos} />
            <Label htmlFor="so-criticos" className="text-xs">Só gargalo/atenção</Label>
          </div>
        </div>

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
                <TableHead>Unidade</TableHead>
                <TableHead>Centro recurso</TableHead>
                <TableHead className="text-right">Carga prog. (h)</TableHead>
                <TableHead className="text-right">Capacidade (h)</TableHead>
                <TableHead className="text-right">Ocupação %</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-6 w-full" /></TableCell></TableRow>
              ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">Sem registros</TableCell></TableRow>
              )}
              {!isLoading && filtered.map((r, i) => {
                const st = statusStyle[r.status as StatusGargalo] ?? statusStyle.SEM_PARAMETRO;
                return (
                  <TableRow key={`${r.codcre}-${r.data}-${i}`}>
                    <TableCell className="text-xs">{fmtData(r.data)}</TableCell>
                    <TableCell className="text-xs">{r.dia_semana}</TableCell>
                    <TableCell><UnidadeNegocioBadge value={r.unidade_negocio} /></TableCell>
                    <TableCell><CodeWithDesc code={r.codcre} desc={r.descre} /></TableCell>
                    <TableCell className="text-right text-xs">{fmt(r.carga_programada_horas)}</TableCell>
                    <TableCell className="text-right text-xs">{fmt(r.capacidade_disponivel_horas)}</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{fmt(r.ocupacao_perc)}%</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${st.badge}`}>{st.label}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function KpiMini({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card className="p-3 flex items-center gap-3">
      <div className={cn('h-8 w-8 rounded-md flex items-center justify-center bg-muted', color)}>{icon}</div>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={cn('text-xl font-semibold leading-tight', color)}>{value.toLocaleString('pt-BR')}</div>
      </div>
    </Card>
  );
}
