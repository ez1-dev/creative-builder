import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Play, RefreshCw, Calendar, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTable, type Column } from '@/components/erp/DataTable';
import { AgendamentoFormDialog } from './AgendamentoFormDialog';
import {
  useEtlAgendamentos,
  useEtlAgendamentosMutations,
} from '@/hooks/useEtlAgendamentos';
import {
  descreverFrequencia,
  descreverJanela,
  type EtlAgendamento,
} from '@/lib/etl/agendamentosApi';
import type { EtlTarefa } from '@/lib/etl/api';

const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleString('pt-BR') : '—');

function relativo(s: string | null | undefined): string {
  if (!s) return '';
  const diff = new Date(s).getTime() - Date.now();
  if (diff <= 0) return 'vencida';
  const min = Math.round(diff / 60000);
  if (min < 60) return `em ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `em ${h} h`;
  return `em ${Math.round(h / 24)} d`;
}

interface Props { tarefas: EtlTarefa[]; }

export function AgendamentosTab({ tarefas }: Props) {
  const { data, isLoading, refetch, isFetching } = useEtlAgendamentos();
  const { atualizar, excluir, tick } = useEtlAgendamentosMutations();
  const [dialog, setDialog] = useState<{ open: boolean; agendamento?: EtlAgendamento | null }>({ open: false });

  const columns: Column<EtlAgendamento>[] = useMemo(() => [
    { key: 'nome_tarefa', header: 'Tarefa', render: (_v, r) => <span className="font-mono text-xs font-semibold">{r.nome_tarefa}</span> },
    { key: 'frequencia', header: 'Frequência', render: (_v, r) => <span className="text-xs">{descreverFrequencia(r)}</span> },
    { key: 'janela_tipo', header: 'Período', render: (_v, r) => <span className="text-xs">{descreverJanela(r.janela_tipo, r.janela_n_meses)}</span> },
    { key: 'proxima_execucao_em', header: 'Próxima execução', render: (_v, r) => (
      <div className="flex flex-col">
        <span className="text-xs">{fmtDate(r.proxima_execucao_em)}</span>
        {r.ativo && r.proxima_execucao_em && (
          <span className="text-[10px] text-muted-foreground">{relativo(r.proxima_execucao_em)}</span>
        )}
      </div>
    ) },
    {
      key: 'ultimo_status', header: 'Último status', render: (_v, r) => {
        if (!r.ultimo_status) return <span className="text-xs text-muted-foreground">—</span>;
        const cls = r.ultimo_status === 'SUCESSO'
          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
          : 'bg-destructive/20 text-destructive';
        return (
          <div className="flex flex-col">
            <Badge variant="secondary" className={cls + ' w-fit'}>{r.ultimo_status}</Badge>
            <span className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(r.ultima_execucao_em)}</span>
            {r.ultima_mensagem && <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={r.ultima_mensagem}>{r.ultima_mensagem}</span>}
          </div>
        );
      },
    },
    {
      key: 'ativo', header: 'Ativo',
      render: (_v, r) => (
        <Switch
          checked={r.ativo}
          onCheckedChange={async (checked) => {
            try {
              await atualizar.mutateAsync({ id: r.id, patch: { ativo: checked } });
              toast.success(checked ? 'Agendamento ativado' : 'Agendamento desativado');
            } catch (e: any) { toast.error(e?.message ?? 'Falha'); }
          }}
        />
      ),
    },
    {
      key: 'acoes', header: 'Ações',
      render: (_v, r) => (
        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="default"
                  disabled={tick.isPending || atualizar.isPending}
                  onClick={async () => {
                    try {
                      if (!r.ativo) {
                        await atualizar.mutateAsync({ id: r.id, patch: { ativo: true } });
                      }
                      await atualizar.mutateAsync({ id: r.id, patch: { proxima_execucao_em: new Date().toISOString() } as any });
                      const res = await tick.mutateAsync();
                      toast.success(`Execução disparada — ${res?.processados ?? 0} processado(s)`);
                    } catch (e: any) { toast.error(e?.message ?? 'Falha ao executar'); }
                  }}
                >
                  <Zap className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Executar agora</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button size="sm" variant="outline" onClick={() => setDialog({ open: true, agendamento: r })}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (!confirm(`Excluir agendamento de ${r.nome_tarefa}?`)) return;
              try {
                await excluir.mutateAsync(r.id);
                toast.success('Agendamento excluído');
              } catch (e: any) { toast.error(e?.message ?? 'Falha'); }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ], [atualizar, excluir, tick]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Agendamentos automáticos
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
          <Button
            size="sm" variant="outline"
            onClick={async () => {
              try {
                const res = await tick.mutateAsync();
                toast.success(`Tick disparado — ${res?.processados ?? 0} agendamento(s) processado(s)`);
              } catch (e: any) { toast.error(e?.message ?? 'Falha no tick'); }
            }}
            disabled={tick.isPending}
          >
            <Play className="h-4 w-4 mr-1" /> Rodar pendentes agora
          </Button>
          <Button size="sm" onClick={() => setDialog({ open: true, agendamento: null })}>
            <Plus className="h-4 w-4 mr-1" /> Novo agendamento
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <DataTable columns={columns} data={data ?? []} emptyMessage="Nenhum agendamento cadastrado" />
        )}
      </CardContent>

      <AgendamentoFormDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((s) => ({ ...s, open }))}
        tarefas={tarefas}
        agendamento={dialog.agendamento ?? null}
      />
    </Card>
  );
}
