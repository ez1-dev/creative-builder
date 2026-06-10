import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, RefreshCw, ListChecks, FileText, Activity, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { PageHeader } from '@/components/erp/PageHeader';
import { DataTable, type Column } from '@/components/erp/DataTable';
import { ExecutarModal } from '@/components/etl/ExecutarModal';
import { LogsModal } from '@/components/etl/LogsModal';
import { TauxPanel } from '@/components/etl/TauxPanel';
import { listarTarefas, ultimasExecucoes, type EtlTarefa } from '@/lib/etl/api';
import { supabase } from '@/integrations/supabase/client';

const statusColor: Record<string, string> = {
  SUCESSO: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  CONCLUIDA: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  EM_EXECUCAO: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  PENDENTE: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  ERRO: 'bg-destructive/20 text-destructive',
};

const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleString('pt-BR') : '—');

export default function EtlAdminPage() {
  const [tarefas, setTarefas] = useState<EtlTarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [ultimaExecucaoGlobal, setUltimaExecucaoGlobal] = useState<string | null>(null);
  const [execModal, setExecModal] = useState<{ open: boolean; nome?: string }>({ open: false });
  const [logsModal, setLogsModal] = useState<{ open: boolean; execucaoId?: string }>({ open: false });

  const load = async () => {
    setLoading(true);
    try {
      const rows = await listarTarefas();
      setTarefas(rows);
      const { data: ult } = await supabase
        .from('etl_execucoes')
        .select('iniciado_em, criado_em')
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();
      setUltimaExecucaoGlobal((ult as any)?.iniciado_em ?? (ult as any)?.criado_em ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const kpis = useMemo(() => {
    const total = tarefas.length;
    const ativas = tarefas.filter((t) => t.ativa).length;
    const comErro = tarefas.filter((t) => t.status_atual === 'ERRO').length;
    return { total, ativas, comErro };
  }, [tarefas]);

  const abrirLogsUltimaExecucao = async (nome: string) => {
    try {
      const execs = await ultimasExecucoes(nome, 1);
      if (execs[0]) setLogsModal({ open: true, execucaoId: execs[0].id });
    } catch {
      /* ignore */
    }
  };

  const columns: Column<EtlTarefa>[] = [
    { key: 'grupo', header: 'Grupo' },
    {
      key: 'nome_tarefa',
      header: 'Tarefa',
      render: (_v, row) => (
        <Link to={`/etl/tarefas/${row.nome_tarefa}`} className="font-mono font-semibold text-primary hover:underline">
          {row.nome_tarefa}
        </Link>
      ),
    },
    { key: 'descricao', header: 'Descrição' },
    {
      key: 'ativa',
      header: 'Ativa',
      render: (_v, row) => (row.ativa ? <Badge>Sim</Badge> : <Badge variant="outline">Não</Badge>),
    },
    {
      key: 'status_atual',
      header: 'Status',
      render: (_v, row) => (
        <Badge className={statusColor[row.status_atual] ?? 'bg-muted text-muted-foreground'} variant="secondary">
          {row.status_atual}
        </Badge>
      ),
    },
    {
      key: 'ultima_execucao_em',
      header: 'Última execução',
      render: (_v, row) => <span className="text-xs">{fmtDate(row.ultima_execucao_em)}</span>,
    },
    {
      key: 'acoes',
      header: 'Ações',
      render: (_v, row) => (
        <div className="flex gap-1">
          <Button asChild size="sm" variant="outline">
            <Link to={`/etl/tarefas/${row.nome_tarefa}`}>
              <ListChecks className="h-3.5 w-3.5 mr-1" /> Ver
            </Link>
          </Button>
          <Button size="sm" onClick={() => setExecModal({ open: true, nome: row.nome_tarefa })}>
            <Play className="h-3.5 w-3.5 mr-1" /> Executar
          </Button>
          <Button size="sm" variant="outline" onClick={() => abrirLogsUltimaExecucao(row.nome_tarefa)}>
            <FileText className="h-3.5 w-3.5 mr-1" /> Logs
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Central de Integrações / ETL"
        description="Orquestração de cargas do ERP Senior para o BI"
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total de tarefas" value={kpis.total} icon={<Activity className="h-4 w-4" />} />
        <KpiCard label="Tarefas ativas" value={kpis.ativas} icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
        <KpiCard label="Com erro" value={kpis.comErro} icon={<AlertTriangle className="h-4 w-4 text-destructive" />} />
        <KpiCard label="Última execução" value={fmtDate(ultimaExecucaoGlobal)} icon={<Clock className="h-4 w-4" />} small />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tarefas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <DataTable columns={columns} data={tarefas} emptyMessage="Nenhuma tarefa cadastrada" />
          )}
        </CardContent>
      </Card>

      <ExecutarModal
        open={execModal.open}
        onOpenChange={(open) => setExecModal({ open })}
        alvo={execModal.nome ? { tipo: 'tarefa', nome: execModal.nome } : null}
        onExecutado={() => load()}
      />
      <LogsModal
        open={logsModal.open}
        onOpenChange={(open) => setLogsModal({ open })}
        execucaoId={logsModal.execucaoId ?? null}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  small,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  small?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          {icon}
        </div>
        <div className={small ? 'text-sm font-semibold mt-1' : 'text-2xl font-bold mt-1'}>{value}</div>
      </CardContent>
    </Card>
  );
}
