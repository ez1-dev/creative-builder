import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, RefreshCw, Loader2, AlertTriangle, Database } from 'lucide-react';
import { DataTable, type Column } from '@/components/erp/DataTable';
import { getTauxStatus, syncTaux, TAUX_LIST, type TauxStatus } from '@/lib/bi/tauxApi';
import { TauxViewerDialog } from '@/components/bi/taux/TauxViewerDialog';

const STATUS_COLOR: Record<string, string> = {
  CONCLUIDO: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  OK: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  EXECUTANDO: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  INICIADO: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  EM_EXECUCAO: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  IGNORADA: 'bg-muted text-muted-foreground',
  ERRO: 'bg-destructive/20 text-destructive',
};

const statusLabel = (s: string) => {
  const v = (s ?? '').toUpperCase();
  if (!v) return '—';
  if (v === 'CONCLUIDO' || v === 'CONCLUÍDO' || v === 'OK') return 'Concluído';
  if (v === 'ERRO') return 'Erro';
  if (v === 'INICIADO') return 'Iniciado';
  if (v === 'EXECUTANDO' || v === 'EM_EXECUCAO') return 'Executando';
  if (v === 'IGNORADA' || v === 'IGNORADO') return 'Ignorada';
  return v;
};

const fmtDate = (s: string | null | undefined) => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString('pt-BR');
};

export function TauxPanel() {
  const queryClient = useQueryClient();
  const [syncingSet, setSyncingSet] = useState<Set<string>>(new Set());
  const [viewer, setViewer] = useState<{ nome: string; tabela?: string } | null>(null);

  const statusQuery = useQuery({
    queryKey: ['taux-status'],
    queryFn: getTauxStatus,
    refetchInterval: (q) => {
      const list = (q.state.data as TauxStatus[] | undefined) ?? [];
      const running = list.some((r) =>
        ['INICIADO', 'EXECUTANDO', 'EM_EXECUCAO'].includes((r.status ?? '').toUpperCase()),
      );
      return running ? 5000 : false;
    },
  });

  const rows: TauxStatus[] = useMemo(() => {
    const got = statusQuery.data ?? [];
    if (got.length === 0 && !statusQuery.isLoading) {
      return TAUX_LIST.map((t) => ({
        taux: t,
        tabela: '',
        total_registros: null,
        ultima_sincronizacao: null,
        status: '',
      }));
    }
    return [...got].sort((a, b) => a.taux.localeCompare(b.taux));
  }, [statusQuery.data, statusQuery.isLoading]);

  const kpis = useMemo(() => {
    let ok = 0,
      erro = 0,
      totReg = 0,
      lastTs = 0;
    for (const r of rows) {
      const s = (r.status ?? '').toUpperCase();
      if (s === 'CONCLUIDO' || s === 'CONCLUÍDO' || s === 'OK') ok++;
      if (s === 'ERRO') erro++;
      if (typeof r.total_registros === 'number') totReg += r.total_registros;
      if (r.ultima_sincronizacao) {
        const t = new Date(r.ultima_sincronizacao).getTime();
        if (!isNaN(t) && t > lastTs) lastTs = t;
      }
    }
    return {
      total: rows.length,
      ok,
      erro,
      totReg,
      ultima: lastTs ? new Date(lastTs).toLocaleString('pt-BR') : '—',
    };
  }, [rows]);

  const syncMutation = useMutation({
    mutationFn: async (tabelas?: string[]) => {
      if (tabelas?.length) {
        setSyncingSet((prev) => {
          const n = new Set(prev);
          tabelas.forEach((t) => n.add(t));
          return n;
        });
      }
      try {
        return await syncTaux(tabelas);
      } finally {
        if (tabelas?.length) {
          setSyncingSet((prev) => {
            const n = new Set(prev);
            tabelas.forEach((t) => n.delete(t));
            return n;
          });
        }
      }
    },
    onSuccess: (_data, vars) => {
      toast.success(
        vars?.length
          ? `Sincronização iniciada (${vars.join(', ')})`
          : 'Sincronização de todas as TAUX iniciada',
      );
      queryClient.invalidateQueries({ queryKey: ['taux-status'] });
    },
    onError: (err: any) => toast.error(err?.message ?? 'Falha ao sincronizar'),
  });

  const syncingAll = syncMutation.isPending && syncMutation.variables == null;

  const columns: Column<TauxStatus>[] = [
    { key: 'taux', header: 'TAUX', render: (_v, r) => <span className="font-medium">{r.taux}</span> },
    {
      key: 'tabela',
      header: 'Tabela Cloud',
      render: (_v, r) => <code className="text-xs">{r.tabela || '—'}</code>,
    },
    {
      key: 'total_registros',
      header: 'Registros',
      align: 'right',
      render: (_v, r) => (r.total_registros != null ? r.total_registros.toLocaleString('pt-BR') : '—'),
    },
    {
      key: 'ultima_sincronizacao',
      header: 'Última sincronização',
      render: (_v, r) => fmtDate(r.ultima_sincronizacao),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_v, r) => {
        const s = (r.status ?? '').toUpperCase();
        const running = ['INICIADO', 'EXECUTANDO', 'EM_EXECUCAO'].includes(s);
        return (
          <div className="flex items-center gap-1.5">
            <Badge className={STATUS_COLOR[s] ?? 'bg-muted text-muted-foreground'}>
              {statusLabel(s)}
            </Badge>
            {running && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {s === 'ERRO' && r.erro && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">{r.erro}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      },
    },
    {
      key: '__acoes',
      header: 'Ações',
      align: 'right',
      render: (_v, r) => {
        const isSyncing = syncingSet.has(r.taux);
        return (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setViewer({ nome: r.taux, tabela: r.tabela })}>
              <Eye className="h-3.5 w-3.5 mr-1" /> Visualizar
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isSyncing}
              onClick={() => syncMutation.mutate([r.taux])}
            >
              {isSyncing ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
              )}
              Sincronizar
            </Button>
          </div>
        );
      },
    },
  ];

  const MiniKpi = ({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) => (
    <div className="rounded border p-2.5">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${tone ?? ''}`}>{value}</div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4" /> TAUX / Dimensões
        </CardTitle>
        <Button size="sm" onClick={() => syncMutation.mutate(undefined)} disabled={syncingAll}>
          {syncingAll ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
          )}
          Sincronizar todas as TAUX
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <MiniKpi label="Total de TAUX" value={kpis.total} />
          <MiniKpi label="Concluídas" value={kpis.ok} tone="text-emerald-600 dark:text-emerald-300" />
          <MiniKpi
            label="Com erro"
            value={kpis.erro}
            tone={kpis.erro > 0 ? 'text-destructive' : ''}
          />
          <MiniKpi label="Total de registros" value={kpis.totReg.toLocaleString('pt-BR')} />
          <MiniKpi label="Última sincronização" value={<span className="text-sm">{kpis.ultima}</span>} />
        </div>

        <DataTable
          columns={columns}
          data={rows}
          loading={statusQuery.isLoading}
          emptyMessage="Nenhuma TAUX encontrada."
        />
      </CardContent>

      <TauxViewerDialog
        open={!!viewer}
        onOpenChange={(v) => {
          if (!v) setViewer(null);
        }}
        nome={viewer?.nome ?? null}
        tabela={viewer?.tabela}
      />
    </Card>
  );
}
