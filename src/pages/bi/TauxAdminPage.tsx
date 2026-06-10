import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageHeader } from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { KpiCard, StatusBadge, BiStatus, DataTableBI, Column } from '@/components/bi';
import { Database, Eye, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { getTauxStatus, syncTaux, TAUX_LIST, TauxStatus } from '@/lib/bi/tauxApi';
import { TauxViewerDialog } from '@/components/bi/taux/TauxViewerDialog';

function statusToBi(s: string | null | undefined): BiStatus {
  const v = (s ?? '').toUpperCase();
  if (v === 'CONCLUIDO' || v === 'CONCLUÍDO' || v === 'OK') return 'positivo';
  if (v === 'ERRO' || v === 'ERROR') return 'negativo';
  if (v === 'INICIADO' || v === 'EXECUTANDO' || v === 'EM_EXECUCAO') return 'pendente';
  if (v === 'IGNORADA' || v === 'IGNORADO') return 'neutro';
  return 'neutro';
}

function statusLabel(s: string | null | undefined): string {
  const v = (s ?? '').toUpperCase();
  if (!v) return '—';
  if (v === 'CONCLUIDO' || v === 'CONCLUÍDO' || v === 'OK') return 'Concluído';
  if (v === 'ERRO') return 'Erro';
  if (v === 'INICIADO') return 'Iniciado';
  if (v === 'EXECUTANDO' || v === 'EM_EXECUCAO') return 'Executando';
  if (v === 'IGNORADA' || v === 'IGNORADO') return 'Ignorada';
  return v;
}

function formatDateTime(s: string | null | undefined): string {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString('pt-BR');
}

export default function TauxAdminPage() {
  const queryClient = useQueryClient();
  const [syncingSet, setSyncingSet] = useState<Set<string>>(new Set());
  const [viewer, setViewer] = useState<{ nome: string; tabela?: string } | null>(null);

  const statusQuery = useQuery({
    queryKey: ['taux-status'],
    queryFn: getTauxStatus,
    refetchInterval: (q) => {
      const list = (q.state.data as TauxStatus[] | undefined) ?? [];
      const running = list.some((r) => ['INICIADO', 'EXECUTANDO', 'EM_EXECUCAO'].includes((r.status ?? '').toUpperCase()));
      return running ? 5000 : false;
    },
  });

  const rows: TauxStatus[] = useMemo(() => {
    const got = statusQuery.data ?? [];
    if (got.length === 0 && !statusQuery.isLoading) {
      return TAUX_LIST.map((t) => ({
        taux: t, tabela: '', total_registros: null, ultima_sincronizacao: null, status: '',
      }));
    }
    return [...got].sort((a, b) => a.taux.localeCompare(b.taux));
  }, [statusQuery.data, statusQuery.isLoading]);

  const kpis = useMemo(() => {
    const total = rows.length;
    let ok = 0, erro = 0, totReg = 0, lastTs = 0;
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
      total, ok, erro, totReg,
      ultima: lastTs ? new Date(lastTs).toLocaleString('pt-BR') : '—',
    };
  }, [rows]);

  const syncMutation = useMutation({
    mutationFn: async (tabelas?: string[]) => {
      if (tabelas?.length) {
        setSyncingSet((prev) => { const n = new Set(prev); tabelas.forEach((t) => n.add(t)); return n; });
      }
      try {
        return await syncTaux(tabelas);
      } finally {
        if (tabelas?.length) {
          setSyncingSet((prev) => { const n = new Set(prev); tabelas.forEach((t) => n.delete(t)); return n; });
        }
      }
    },
    onSuccess: (_data, vars) => {
      toast.success(vars?.length ? `Sincronização iniciada (${vars.join(', ')})` : 'Sincronização de todas as TAUX iniciada');
      queryClient.invalidateQueries({ queryKey: ['taux-status'] });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Falha ao sincronizar');
    },
  });

  const columns: Column<TauxStatus>[] = [
    { key: 'taux', header: 'TAUX', render: (_v, r) => <span className="font-medium">{r.taux}</span> },
    { key: 'tabela', header: 'Tabela Cloud', render: (_v, r) => <code className="text-xs">{r.tabela || '—'}</code> },
    {
      key: 'total_registros', header: 'Registros', align: 'right',
      render: (_v, r) => r.total_registros != null ? r.total_registros.toLocaleString('pt-BR') : '—',
    },
    { key: 'ultima_sincronizacao', header: 'Última sincronização', render: (_v, r) => formatDateTime(r.ultima_sincronizacao) },
    {
      key: 'status', header: 'Status',
      render: (_v, r) => {
        const s = (r.status ?? '').toUpperCase();
        const badge = <StatusBadge status={statusToBi(s)} label={statusLabel(s)} />;
        const running = ['INICIADO', 'EXECUTANDO', 'EM_EXECUCAO'].includes(s);
        return (
          <div className="flex items-center gap-1.5">
            {badge}
            {running && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            {s === 'ERRO' && r.erro && (
              <TooltipProvider><Tooltip>
                <TooltipTrigger asChild><AlertTriangle className="h-3.5 w-3.5 text-destructive" /></TooltipTrigger>
                <TooltipContent><p className="max-w-xs text-xs">{r.erro}</p></TooltipContent>
              </Tooltip></TooltipProvider>
            )}
          </div>
        );
      },
    },
    {
      key: '__acoes', header: 'Ações', align: 'right',
      render: (_v, r) => {
        const isSyncing = syncingSet.has(r.taux);
        return (
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setViewer({ nome: r.taux, tabela: r.tabela })}>
              <Eye className="h-3.5 w-3.5 mr-1" /> Visualizar
            </Button>
            <Button size="sm" variant="outline" disabled={isSyncing} onClick={() => syncMutation.mutate([r.taux])}>
              {isSyncing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
              Sincronizar
            </Button>
          </div>
        );
      },
    },
  ];

  const syncingAll = syncMutation.isPending && syncMutation.variables == null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="BI — TAUX / Dimensões"
        description="Sincronize e consulte as tabelas auxiliares (TAUX) do BI mantidas pela camada analítica."
        actions={
          <Button onClick={() => syncMutation.mutate(undefined)} disabled={syncingAll}>
            {syncingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sincronizar todas as TAUX
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard title="Total de TAUX" value={kpis.total} icon={<Database className="h-4 w-4" />} />
        <KpiCard title="Concluídas" value={kpis.ok} variant="success" />
        <KpiCard title="Com erro" value={kpis.erro} variant={kpis.erro > 0 ? 'danger' : 'default'} />
        <KpiCard title="Total de registros" value={kpis.totReg} />
        <KpiCard title="Última sincronização" value={kpis.ultima} />
      </div>

      <Card>
        <CardContent className="pt-4">
          <DataTableBI
            columns={columns}
            data={rows}
            loading={statusQuery.isLoading}
            emptyMessage="Nenhuma TAUX encontrada."
          />
        </CardContent>
      </Card>

      <TauxViewerDialog
        open={!!viewer}
        onOpenChange={(v) => { if (!v) setViewer(null); }}
        nome={viewer?.nome ?? null}
        tabela={viewer?.tabela}
      />
    </div>
  );
}
