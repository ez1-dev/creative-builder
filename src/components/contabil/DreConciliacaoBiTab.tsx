import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/components/bi/utils/formatters';
import {
  fetchConciliacaoBi,
  type ConciliacaoBiParams,
  type ConciliacaoStatus,
} from '@/lib/contabil/dreConciliacaoBiApi';
import { anomesToLabel } from '@/lib/contabil/anomes';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<ConciliacaoStatus, string> = {
  CONCILIADO: 'Conciliado',
  ARREDONDAMENTO: 'Diferença de arredondamento',
  DIVERGENTE: 'Divergente',
  SEM_CORRESPONDENCIA: 'Sem correspondência',
  MES_INCOMPLETO: 'Mês incompleto',
};

const STATUS_VARIANT: Record<ConciliacaoStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  CONCILIADO: 'default',
  ARREDONDAMENTO: 'secondary',
  DIVERGENTE: 'destructive',
  SEM_CORRESPONDENCIA: 'outline',
  MES_INCOMPLETO: 'secondary',
};

export interface DreConciliacaoBiTabProps extends ConciliacaoBiParams {
  enabled?: boolean;
}

export function DreConciliacaoBiTab(props: DreConciliacaoBiTabProps) {
  const { enabled = true, ...params } = props;
  const [filtroStatus, setFiltroStatus] = useState<ConciliacaoStatus | 'TODOS'>('TODOS');

  const query = useQuery({
    queryKey: ['dre-conciliacao-bi', params.ano, params.mes_ini, params.mes_fim, params.modelo_id, params.unidade],
    queryFn: () => fetchConciliacaoBi(params),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });

  const linhas = useMemo(() => {
    const arr = query.data?.linhas ?? [];
    return filtroStatus === 'TODOS' ? arr : arr.filter((l) => l.status === filtroStatus);
  }, [query.data, filtroStatus]);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm">Conciliação DRE × BI</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Tolerância: {formatCurrency(query.data?.tolerancia ?? 1)}
            {query.data?.gerado_em && <> · Gerado em {new Date(query.data.gerado_em).toLocaleString('pt-BR')}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['TODOS', 'DIVERGENTE', 'SEM_CORRESPONDENCIA', 'MES_INCOMPLETO', 'CONCILIADO'] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filtroStatus === s ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => setFiltroStatus(s)}
            >
              {s === 'TODOS' ? 'Todos' : STATUS_LABEL[s as ConciliacaoStatus]}
            </Button>
          ))}
          <Button size="sm" variant="ghost" className="h-7" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={cn('h-3.5 w-3.5', query.isFetching && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {query.isLoading && (
          <div className="p-6 text-center text-sm text-muted-foreground">Carregando conciliação...</div>
        )}
        {query.isError && (
          <div className="p-6 text-center text-sm text-destructive">
            Não foi possível carregar a conciliação: {(query.error as any)?.message ?? 'erro'}
          </div>
        )}
        {!query.isLoading && !query.isError && (
          <div className="overflow-auto max-h-[60vh]">
            <table className="text-xs w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-muted">
                  <th className="px-3 py-2 text-left font-semibold border-b">Linha DRE</th>
                  <th className="px-3 py-2 text-left font-semibold border-b">Mês</th>
                  <th className="px-3 py-2 text-right font-semibold border-b">Valor Aplicação</th>
                  <th className="px-3 py-2 text-right font-semibold border-b">Valor BI</th>
                  <th className="px-3 py-2 text-right font-semibold border-b">Diferença</th>
                  <th className="px-3 py-2 text-right font-semibold border-b">%</th>
                  <th className="px-3 py-2 text-center font-semibold border-b">Status</th>
                </tr>
              </thead>
              <tbody>
                {linhas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                      Nenhuma linha para os filtros selecionados.
                    </td>
                  </tr>
                )}
                {linhas.map((l, i) => (
                  <tr key={`${l.codigo_linha}-${l.anomes}-${i}`} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                    <td className="px-3 py-1.5 border-b">{l.linha}</td>
                    <td className="px-3 py-1.5 border-b">{anomesToLabel(l.anomes) || l.anomes}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums border-b">{l.valor_app != null ? formatCurrency(l.valor_app) : '—'}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums border-b">{l.valor_bi != null ? formatCurrency(l.valor_bi) : '—'}</td>
                    <td className={cn('px-3 py-1.5 text-right tabular-nums border-b', (l.diferenca ?? 0) !== 0 && 'font-semibold')}>
                      {l.diferenca != null ? formatCurrency(l.diferenca) : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums border-b">
                      {l.diferenca_pct != null ? formatPercent(l.diferenca_pct) : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-center border-b">
                      <Badge variant={STATUS_VARIANT[l.status]} className="text-[10px]">
                        {STATUS_LABEL[l.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
