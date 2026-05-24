import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, Database, Inbox } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export function DiagnosticoSyncCard() {
  const lastRun = useQuery({
    queryKey: ['programacao', 'sync-last-run'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('etl_execucoes')
        .select('status, iniciado_em, terminado_em, linhas_lidas, linhas_inseridas, linhas_rejeitadas, erro_resumo, acionado_por, params_executados')
        .eq('tarefa_codigo', 'SYNC_FILA_OPS_ERP')
        .order('iniciado_em', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 15_000,
  });

  const filaCount = useQuery({
    queryKey: ['programacao', 'fila-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('bi_ops_fila')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 15_000,
  });

  const run = lastRun.data;
  const isError = run?.status === 'ERROR';

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Diagnóstico da sincronização ERP → Fila
        </div>
        {run ? (
          isError ? (
            <Badge variant="destructive" className="text-xs gap-1"><AlertCircle className="h-3 w-3" /> Erro</Badge>
          ) : (
            <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary"><CheckCircle2 className="h-3 w-3" /> OK</Badge>
          )
        ) : (
          <Badge variant="outline" className="text-xs">Nunca executado</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Última sincronização</div>
            <div className="text-xs font-medium">{fmtDate(run?.terminado_em ?? run?.iniciado_em)}</div>
            {run?.acionado_por && (
              <div className="text-[10px] text-muted-foreground">{run.acionado_por}</div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Inbox className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">OPs importadas (última)</div>
            <div className="text-xs font-medium">
              {run ? `${run.linhas_inseridas ?? 0} salvas · ${run.linhas_lidas ?? 0} lidas` : '—'}
            </div>
            {run?.linhas_rejeitadas != null && run.linhas_rejeitadas > 0 && (
              <div className="text-[10px] text-muted-foreground">{run.linhas_rejeitadas} removidas</div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Database className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <div className="text-[10px] text-muted-foreground uppercase">Linhas em bi_ops_fila</div>
            <div className="text-xs font-medium">
              {filaCount.isLoading ? '…' : (filaCount.data ?? 0).toLocaleString('pt-BR')}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 md:col-span-1 col-span-2">
          <AlertCircle className={`h-4 w-4 mt-0.5 ${isError ? 'text-destructive' : 'text-muted-foreground'}`} />
          <div className="min-w-0">
            <div className="text-[10px] text-muted-foreground uppercase">Último erro</div>
            <div className={`text-xs ${isError ? 'text-destructive font-medium' : 'text-muted-foreground'} break-words line-clamp-3`}>
              {isError ? run?.erro_resumo : '—'}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
