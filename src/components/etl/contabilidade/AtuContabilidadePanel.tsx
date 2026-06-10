import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, RefreshCw, Eye, Loader2, FileText, Database, Activity, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { DataTable, type Column } from '@/components/erp/DataTable';
import {
  ATU_CONTABILIDADE_ACOES,
  getContabilidadeStatus,
  syncContabilidade,
  type ContabStatusItem,
} from '@/lib/bi/contabilidadeApi';
import { ContabilidadeViewerDialog } from './ContabilidadeViewerDialog';
import { ContabilidadeLogDialog } from './ContabilidadeLogDialog';
import { STATUS_COLOR, statusLabel, isRunning, viewerBaseFor } from './statusUi';

const currentYYYYMM = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const isValidAnomes = (s: string) => /^\d{6}$/.test(s);

const fmtDate = (s: string | null | undefined) => {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString('pt-BR');
};
const fmtInt = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : n.toLocaleString('pt-BR');

interface Row {
  ordem: number;
  nome_acao: string;
  tabela_supabase: string;
  total_registros: number | null;
  status: string;
  ultima_execucao: string | null;
  erro?: string | null;
}

export function AtuContabilidadePanel() {
  const queryClient = useQueryClient();
  const [anomesIni, setAnomesIni] = useState(currentYYYYMM());
  const [anomesFim, setAnomesFim] = useState(currentYYYYMM());
  const [appliedIni, setAppliedIni] = useState(anomesIni);
  const [appliedFim, setAppliedFim] = useState(anomesFim);
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [viewer, setViewer] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  const statusQuery = useQuery({
    queryKey: ['contab-status', appliedIni, appliedFim],
    queryFn: () => getContabilidadeStatus(appliedIni, appliedFim),
    refetchInterval: (q) => {
      const list = (q.state.data as ContabStatusItem[] | undefined) ?? [];
      return list.some((r) => isRunning(r.status)) ? 5000 : false;
    },
  });

  // Merge: backend retorna apenas algumas linhas; garantimos as 4 fixas.
  const rows: Row[] = useMemo(() => {
    const byName = new Map<string, ContabStatusItem>();
    (statusQuery.data ?? []).forEach((r) => byName.set(r.nome_acao.toUpperCase(), r));
    return ATU_CONTABILIDADE_ACOES.map((a) => {
      const got = byName.get(a.nome.toUpperCase());
      return {
        ordem: a.ordem,
        nome_acao: a.nome,
        tabela_supabase: a.tabela,
        total_registros: got?.total_registros ?? null,
        status: got?.status ?? '',
        ultima_execucao: got?.ultima_execucao ?? null,
        erro: got?.erro ?? null,
      };
    });
  }, [statusQuery.data]);

  const kpis = useMemo(() => {
    const find = (n: string) => rows.find((r) => r.nome_acao === n)?.total_registros ?? null;
    const lastIso = rows
      .map((r) => r.ultima_execucao)
      .filter((s): s is string => !!s)
      .sort()
      .pop() ?? null;
    const statuses = rows.filter((r) => r.nome_acao !== 'ATU_CONTABILIDADE').map((r) => r.status.toUpperCase());
    let geral = '—';
    if (statuses.some((s) => s === 'ERRO')) geral = 'ERRO';
    else if (statuses.some(isRunning)) geral = 'EXECUTANDO';
    else if (statuses.every((s) => s === 'CONCLUIDO' || s === 'CONCLUÍDO' || s === 'OK') && statuses.length > 0) geral = 'CONCLUIDO';
    return {
      orc_dre: find('VM_ORC_DRE'),
      lanc: find('VM_LANC_CONTABIL'),
      balanco: find('ETL_V_BALANCO_PATRIMONIAL'),
      geral,
      ultima: lastIso,
    };
  }, [rows]);

  const runMutation = useMutation({
    mutationFn: async (vars: { acoes?: string[]; label: string }) => {
      return syncContabilidade(appliedIni, appliedFim, vars.acoes);
    },
    onMutate: (vars) => {
      const key = vars.acoes?.[0] ?? '__ALL__';
      setSyncing((prev) => new Set(prev).add(key));
    },
    onSuccess: (_d, vars) => {
      toast.success(`Executado: ${vars.label}`);
      queryClient.invalidateQueries({ queryKey: ['contab-status'] });
      queryClient.invalidateQueries({ queryKey: ['contab-log'] });
    },
    onError: (err: any, vars) => {
      toast.error(`Falha em ${vars.label}: ${err?.message ?? 'erro'}`);
    },
    onSettled: (_d, _e, vars) => {
      const key = vars.acoes?.[0] ?? '__ALL__';
      setSyncing((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
    },
  });

  const applyFilters = () => {
    if (!isValidAnomes(anomesIni) || !isValidAnomes(anomesFim)) {
      toast.error('Informe ANOMES no formato YYYYMM (ex.: 202606)');
      return;
    }
    setAppliedIni(anomesIni);
    setAppliedFim(anomesFim);
    queryClient.invalidateQueries({ queryKey: ['contab-status', anomesIni, anomesFim] });
  };

  const runAll = () => {
    if (!isValidAnomes(appliedIni) || !isValidAnomes(appliedFim)) {
      toast.error('Informe ANOMES no formato YYYYMM (ex.: 202606)');
      return;
    }
    runMutation.mutate({ label: 'Rotina completa' });
  };

  const runOne = (row: Row) => {
    if (row.ordem === 99) { runAll(); return; }
    runMutation.mutate({ acoes: [row.nome_acao], label: row.nome_acao });
  };

  const cols: Column<Row>[] = [
    { key: 'ordem', header: 'Ordem', render: (_v, r) => <span className="font-mono">{r.ordem}</span> },
    { key: 'nome_acao', header: 'Ação', render: (_v, r) => <span className="font-mono font-semibold">{r.nome_acao}</span> },
    { key: 'tabela_supabase', header: 'Tabela', render: (_v, r) => <span className="font-mono text-xs">{r.tabela_supabase}</span> },
    {
      key: 'total_registros',
      header: 'Total',
      render: (_v, r) => <span className="tabular-nums">{fmtInt(r.total_registros)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (_v, r) => {
        const k = (r.status || 'SEM_DADOS').toUpperCase();
        return (
          <Badge className={STATUS_COLOR[k] ?? STATUS_COLOR.SEM_DADOS} variant="secondary">
            {statusLabel(r.status || 'SEM_DADOS')}
          </Badge>
        );
      },
    },
    {
      key: 'ultima_execucao',
      header: 'Última execução',
      render: (_v, r) => <span className="text-xs">{fmtDate(r.ultima_execucao)}</span>,
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (_v, r) => {
        const key = r.ordem === 99 ? '__ALL__' : r.nome_acao;
        const running = syncing.has(key);
        const base = viewerBaseFor(r.nome_acao);
        return (
          <div className="flex gap-1">
            <Button size="sm" onClick={() => runOne(r)} disabled={running}>
              {running ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />}
              Executar
            </Button>
            <Button size="sm" variant="outline" disabled={!base} onClick={() => base && setViewer(base)}>
              <Eye className="h-3.5 w-3.5 mr-1" /> Dados
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4" /> BI – Contabilidade / ATU_CONTABILIDADE
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">ANOMES_INI</Label>
            <Input className="w-32 font-mono" value={anomesIni} onChange={(e) => setAnomesIni(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="202606" />
          </div>
          <div>
            <Label className="text-xs">ANOMES_FIM</Label>
            <Input className="w-32 font-mono" value={anomesFim} onChange={(e) => setAnomesFim(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="202606" />
          </div>
          <Button variant="outline" size="sm" onClick={applyFilters} disabled={statusQuery.isFetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${statusQuery.isFetching ? 'animate-spin' : ''}`} />
            Atualizar status
          </Button>
          <Button size="sm" onClick={runAll} disabled={syncing.has('__ALL__')}>
            {syncing.has('__ALL__') ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            Executar rotina completa
          </Button>
          <Button size="sm" variant="outline" onClick={() => setLogOpen(true)}>
            <FileText className="h-4 w-4 mr-1" /> Ver log
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi label="VM_ORC_DRE" value={fmtInt(kpis.orc_dre)} icon={<Database className="h-4 w-4" />} />
          <Kpi label="VM_LANC_CONTABIL" value={fmtInt(kpis.lanc)} icon={<Database className="h-4 w-4" />} />
          <Kpi label="ETL_V_BALANCO_PATRIMONIAL" value={fmtInt(kpis.balanco)} icon={<Database className="h-4 w-4" />} />
          <Kpi
            label="Status geral"
            value={statusLabel(kpis.geral)}
            icon={
              kpis.geral === 'ERRO' ? <AlertTriangle className="h-4 w-4 text-destructive" /> :
              kpis.geral === 'EXECUTANDO' ? <Loader2 className="h-4 w-4 animate-spin text-amber-500" /> :
              kpis.geral === 'CONCLUIDO' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
              <Activity className="h-4 w-4" />
            }
            small
          />
          <Kpi label="Última execução" value={fmtDate(kpis.ultima)} icon={<Clock className="h-4 w-4" />} small />
        </div>

        {/* Tabela de ações */}
        {statusQuery.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <DataTable columns={cols} data={rows} emptyMessage="Nenhuma ação configurada" />
        )}
      </CardContent>

      <ContabilidadeViewerDialog
        open={!!viewer}
        onOpenChange={(v) => { if (!v) setViewer(null); }}
        nomeBase={viewer}
        anomesIni={appliedIni}
        anomesFim={appliedFim}
      />
      <ContabilidadeLogDialog open={logOpen} onOpenChange={setLogOpen} />
    </Card>
  );
}

function Kpi({ label, value, icon, small }: { label: string; value: string; icon: React.ReactNode; small?: boolean }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{label}</span>
          {icon}
        </div>
        <div className={small ? 'text-sm font-semibold mt-1 truncate' : 'text-2xl font-bold mt-1 tabular-nums'}>{value}</div>
      </CardContent>
    </Card>
  );
}
