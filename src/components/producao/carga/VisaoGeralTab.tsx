import { useCargaCentros } from '@/hooks/useCargaProducao';
import { CargaFiltros } from '@/lib/producao/cargaApi';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Activity, Boxes, ListChecks, Clock, Timer, AlertCircle } from 'lucide-react';

const fmt = (n: number | undefined) => (n ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

function Kpi({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: 'warn' | 'primary' }) {
  return (
    <Card className={`p-4 ${accent === 'warn' ? 'border-amber-500/40 bg-amber-500/5' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent === 'warn' ? 'text-amber-600' : 'text-primary'}`} />
      </div>
      <div className={`mt-2 text-2xl font-bold ${accent === 'warn' ? 'text-amber-700' : ''}`}>{value}</div>
    </Card>
  );
}

export function VisaoGeralTab({ filtros }: { filtros: CargaFiltros }) {
  const { data, isLoading, isError, error } = useCargaCentros(filtros);
  const resumo = data?.resumo;
  const semMapeamento = resumo?.linhas_sem_mapeamento ?? resumo?.linhas_sem_mapeamento_supabase ?? 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-6 flex items-start gap-3 text-destructive">
        <AlertCircle className="h-5 w-5 mt-0.5" />
        <div>
          <div className="font-semibold">Erro ao consultar carga</div>
          <div className="text-sm text-muted-foreground mt-1">{(error as Error)?.message}</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi icon={ListChecks} label="OPs" value={fmt(resumo?.qtd_ops)} />
        <Kpi icon={Boxes} label="Recursos" value={fmt(resumo?.qtd_recursos)} />
        <Kpi icon={Activity} label="Linhas / Operações" value={fmt(resumo?.qtd_linhas_operacao)} />
        <Kpi icon={Timer} label="Carga prevista (min)" value={fmt(resumo?.carga_prevista_min)} />
        <Kpi icon={Clock} label="Carga prevista (h)" value={fmt(resumo?.carga_prevista_horas)} />
        <Kpi
          icon={AlertTriangle}
          label="Sem mapeamento"
          value={fmt(semMapeamento)}
          accent={semMapeamento > 0 ? 'warn' : undefined}
        />
      </div>
      <p className="text-[11px] text-muted-foreground px-1">
        Origem do mapeamento por linha: <span className="font-medium">PADRAO_API</span> (padrão da API),{' '}
        <span className="font-medium">REGRA_API</span> (regra de classificação) ou{' '}
        <span className="font-medium">SUPABASE</span> (parametrização cadastrada).
      </p>
    </div>
  );
}
