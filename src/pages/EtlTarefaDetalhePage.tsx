import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Play, RefreshCw, FileText } from 'lucide-react';
import { PageHeader } from '@/components/erp/PageHeader';
import { DataTable, type Column } from '@/components/erp/DataTable';
import { ExecutarModal } from '@/components/etl/ExecutarModal';
import { LogsModal } from '@/components/etl/LogsModal';
import {
  detalheTarefa,
  acoesTarefa,
  ultimasExecucoes,
  type EtlTarefa,
  type EtlAcao,
  type EtlExecucao,
} from '@/lib/etl/api';

const statusColor: Record<string, string> = {
  SUCESSO: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  CONCLUIDA: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
  EM_EXECUCAO: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  PENDENTE: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  ERRO: 'bg-destructive/20 text-destructive',
};

const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleString('pt-BR') : '—');

export default function EtlTarefaDetalhePage() {
  const { nome = '' } = useParams<{ nome: string }>();
  const [tarefa, setTarefa] = useState<EtlTarefa | null>(null);
  const [acoes, setAcoes] = useState<EtlAcao[]>([]);
  const [execucoes, setExecucoes] = useState<EtlExecucao[]>([]);
  const [loading, setLoading] = useState(true);
  const [execModal, setExecModal] = useState<{
    open: boolean;
    alvo: { tipo: 'tarefa'; nome: string } | { tipo: 'acao'; idAcao: string; nomeTarefa?: string } | null;
  }>({ open: false, alvo: null });
  const [logsModal, setLogsModal] = useState<{ open: boolean; execucaoId?: string }>({ open: false });

  const load = async () => {
    setLoading(true);
    try {
      const t = await detalheTarefa(nome);
      setTarefa(t);
      if (t) {
        const [a, e] = await Promise.all([acoesTarefa(t.id), ultimasExecucoes(nome, 20)]);
        setAcoes(a);
        setExecucoes(e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome]);

  const acoesColumns: Column<EtlAcao>[] = [
    { key: 'ordem', header: 'Ordem', width: '70px' },
    { key: 'id_acao', header: 'ID', render: (r) => <span className="font-mono">{r.id_acao}</span> },
    { key: 'nome_acao', header: 'Nome' },
    {
      key: 'endpoint_api',
      header: 'Endpoint',
      render: (r) => <span className="font-mono text-xs">{r.endpoint_api ?? '—'}</span>,
    },
    { key: 'tabela_destino', header: 'Tabela', render: (r) => <span className="font-mono text-xs">{r.tabela_destino ?? '—'}</span> },
    { key: 'estrategia_carga', header: 'Estratégia' },
    { key: 'caso_erro', header: 'Caso erro' },
    {
      key: 'ativa',
      header: 'Ativa',
      render: (r) => (r.ativa ? <Badge>Sim</Badge> : <Badge variant="outline">Não</Badge>),
    },
    {
      key: 'exec',
      header: '',
      render: (r) => (
        <Button
          size="sm"
          disabled={!r.ativa}
          onClick={() =>
            setExecModal({ open: true, alvo: { tipo: 'acao', idAcao: r.id_acao, nomeTarefa: nome } })
          }
        >
          <Play className="h-3.5 w-3.5 mr-1" /> Executar
        </Button>
      ),
    },
  ];

  const execColumns: Column<EtlExecucao>[] = [
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <Badge className={statusColor[r.status] ?? 'bg-muted text-muted-foreground'} variant="secondary">
          {r.status}
        </Badge>
      ),
    },
    { key: 'iniciado_em', header: 'Início', render: (r) => <span className="text-xs">{fmtDate(r.iniciado_em)}</span> },
    { key: 'finalizado_em', header: 'Fim', render: (r) => <span className="text-xs">{fmtDate(r.finalizado_em)}</span> },
    { key: 'total_linhas', header: 'Linhas', render: (r) => r.total_linhas.toLocaleString('pt-BR') },
    { key: 'mensagem', header: 'Mensagem', render: (r) => <span className="text-xs">{r.mensagem ?? '—'}</span> },
    {
      key: 'logs',
      header: '',
      render: (r) => (
        <Button size="sm" variant="outline" onClick={() => setLogsModal({ open: true, execucaoId: r.id })}>
          <FileText className="h-3.5 w-3.5 mr-1" /> Logs
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={tarefa?.nome_tarefa ?? nome}
        description={tarefa?.descricao ?? undefined}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/etl">
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
            </Button>
            <Button
              size="sm"
              disabled={!tarefa}
              onClick={() => tarefa && setExecModal({ open: true, alvo: { tipo: 'tarefa', nome: tarefa.nome_tarefa } })}
            >
              <Play className="h-4 w-4 mr-1" /> Executar tarefa
            </Button>
          </>
        }
      />

      {/* Cabeçalho */}
      {tarefa && (
        <Card>
          <CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-muted-foreground uppercase text-[10px]">Grupo</div>
              <div className="font-semibold">{tarefa.grupo}</div>
            </div>
            <div>
              <div className="text-muted-foreground uppercase text-[10px]">Status atual</div>
              <Badge className={statusColor[tarefa.status_atual] ?? 'bg-muted'} variant="secondary">
                {tarefa.status_atual}
              </Badge>
            </div>
            <div>
              <div className="text-muted-foreground uppercase text-[10px]">Última execução</div>
              <div>{fmtDate(tarefa.ultima_execucao_em)}</div>
            </div>
            <div>
              <div className="text-muted-foreground uppercase text-[10px]">Ativa</div>
              <div>{tarefa.ativa ? 'Sim' : 'Não'}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ações</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-32 w-full" /> : <DataTable columns={acoesColumns} data={acoes} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Últimas execuções</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <DataTable
              columns={execColumns}
              data={execucoes}
              emptyMessage="Nenhuma execução registrada"
            />
          )}
        </CardContent>
      </Card>

      <ExecutarModal
        open={execModal.open}
        onOpenChange={(open) => setExecModal({ open, alvo: execModal.alvo })}
        alvo={execModal.alvo}
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
