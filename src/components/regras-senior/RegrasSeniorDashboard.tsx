import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, FileText, FilePen, FileSearch, CheckCircle2, Power, PowerOff, FlaskConical, History } from 'lucide-react';
import { seniorApi } from '@/lib/senior/api';
import type { DashboardResumo } from '@/lib/senior/types';
import { AvisoErpBanner } from './AvisoErpBanner';
import { PageHeader } from '@/components/erp/PageHeader';

const cards = (r: DashboardResumo | null) => [
  { label: 'Total de regras', value: r?.total_regras ?? 0, icon: FileText },
  { label: 'Em rascunho', value: r?.rascunho ?? 0, icon: FilePen },
  { label: 'Em revisão', value: r?.em_revisao ?? 0, icon: FileSearch },
  { label: 'Aprovadas', value: r?.aprovadas ?? 0, icon: CheckCircle2 },
  { label: 'Identif. ativos', value: r?.identificadores_ativos ?? 0, icon: Power },
  { label: 'Identif. inativos', value: r?.identificadores_inativos ?? 0, icon: PowerOff },
  { label: 'Identif. em teste', value: r?.identificadores_teste ?? 0, icon: FlaskConical },
];

export function RegrasSeniorDashboard() {
  const [data, setData] = useState<DashboardResumo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    seniorApi.resumo()
      .then((r) => { if (alive) setData(r as DashboardResumo | null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Regras Senior"
        description="Administração de regras LSP e identificadores E098REG do ERP Senior."
      />
      <AvisoErpBanner />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {cards(data).map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center gap-3 p-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <c.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{c.label}</div>
                {loading ? <Skeleton className="h-5 w-12" /> : <div className="text-lg font-bold">{c.value}</div>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4 text-primary" />
            Últimas alterações
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : !data?.ultimas_alteracoes?.length ? (
            <div className="text-xs text-muted-foreground">Nenhuma alteração registrada.</div>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {data.ultimas_alteracoes.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2">
                  <div className="min-w-0">
                    <div className="font-medium">{a.acao}{a.alvo ? ` — ${a.alvo}` : ''}</div>
                    <div className="text-xs text-muted-foreground">{a.usuario} · {new Date(a.data).toLocaleString('pt-BR')}</div>
                  </div>
                  {a.motivo && <div className="ml-3 max-w-[40%] truncate text-xs text-muted-foreground">{a.motivo}</div>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldAlert className="h-3.5 w-3.5" />
        Todas as alterações exigem motivo e confirmação explícita.
      </div>
    </div>
  );
}
