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

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (isError) {
    const msg = (error as Error)?.message || '';
    const isBackendUnconfigured = /Supabase n[ãa]o configurado|SUPABASE_SERVICE_ROLE_KEY/i.test(msg);
    return (
      <Card className={`p-6 flex items-start gap-3 ${isBackendUnconfigured ? 'border-amber-500/40 bg-amber-500/5' : 'text-destructive'}`}>
        <AlertCircle className={`h-5 w-5 mt-0.5 ${isBackendUnconfigured ? 'text-amber-600' : ''}`} />
        <div>
          <div className="font-semibold">
            {isBackendUnconfigured ? 'Backend de cálculo ainda não configurado' : 'Erro ao consultar carga'}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {isBackendUnconfigured
              ? 'O servidor de cálculo da carga (FastAPI) precisa ser configurado pelo time de TI para acessar a base de parâmetros. A aba "Parâmetros de Recursos" continua funcionando normalmente.'
              : msg}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Kpi icon={ListChecks} label="OPs" value={fmt(resumo?.qtd_ops)} />
      <Kpi icon={Boxes} label="Recursos" value={fmt(resumo?.qtd_recursos)} />
      <Kpi icon={Activity} label="Linhas / Operações" value={fmt(resumo?.qtd_linhas_operacao)} />
      <Kpi icon={Timer} label="Carga prevista (min)" value={fmt(resumo?.carga_prevista_min)} />
      <Kpi icon={Clock} label="Carga prevista (h)" value={fmt(resumo?.carga_prevista_horas)} />
      <Kpi
        icon={AlertTriangle}
        label="Sem mapeamento"
        value={fmt(resumo?.linhas_sem_mapeamento_supabase)}
        accent={(resumo?.linhas_sem_mapeamento_supabase ?? 0) > 0 ? 'warn' : undefined}
      />
    </div>
  );
}
