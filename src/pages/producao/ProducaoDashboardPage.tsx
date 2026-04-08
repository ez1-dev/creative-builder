import { useState, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { KPICard } from '@/components/erp/KPICard';
import { ExportButton } from '@/components/erp/ExportButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

interface DashboardResumo {
  kg_engenharia: number;
  kg_produzido: number;
  kg_expedido: number;
  kg_patio: number;
  itens_nao_carregados: number;
  projetos_aguardando_producao: number;
  projetos_em_producao: number;
  projetos_parcialmente_expedidos: number;
  projetos_expedidos: number;
  leadtime_medio_engenharia_producao: number;
  leadtime_medio_producao_expedicao: number;
  leadtime_medio_total: number;
  quantidade_cargas: number;
}

interface TopProjetoPatio {
  numero_projeto: number;
  numero_desenho: number;
  revisao: string;
  kg_patio: number;
  kg_produzido: number;
  kg_expedido: number;
  kg_engenharia: number;
  status_patio: string;
  cliente: string;
}

interface CargaPorMes {
  periodo: string;
  quantidade_cargas: number;
}

interface DashboardData {
  resumo: DashboardResumo;
  top_projetos_patio: TopProjetoPatio[];
  cargas_por_mes: CargaPorMes[];
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success, 142 76% 36%))',
  'hsl(var(--warning, 38 92% 50%))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
];

export default function ProducaoDashboardPage() {
  const [filters, setFilters] = useState({
    numero_projeto: '', numero_desenho: '', revisao: '', cliente: '', cidade: '',
  });
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const erpReady = useErpReady();

  const search = useCallback(async () => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<DashboardData>('/api/producao/dashboard', filters);
      setData(result);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, erpReady]);

  useAiFilters('producao-dashboard', setFilters, () => search());
  const clearFilters = () => { setFilters({ numero_projeto: '', numero_desenho: '', revisao: '', cliente: '', cidade: '' }); setData(null); };

  const resumo = data?.resumo;

  const statusChartData = useMemo(() => {
    if (!resumo) return [];
    return [
      { name: 'Aguardando', value: resumo.projetos_aguardando_producao },
      { name: 'Em Produção', value: resumo.projetos_em_producao },
      { name: 'Parcial', value: resumo.projetos_parcialmente_expedidos },
      { name: 'Expedidos', value: resumo.projetos_expedidos },
    ].filter(d => d.value > 0);
  }, [resumo]);

  const topPatioData = useMemo(() => {
    if (!data?.top_projetos_patio) return [];
    return data.top_projetos_patio.slice(0, 10).map(p => ({
      name: `${p.numero_projeto}-${p.numero_desenho}`,
      kg_patio: Math.round(p.kg_patio || 0),
    }));
  }, [data]);

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Dashboard Produção"
        description="Visão gerencial de produção, expedição e pátio"
        actions={<ExportButton endpoint="/api/export/producao-patio" params={filters} />}
      />
      <FilterPanel onSearch={search} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.numero_projeto} onChange={(e) => setFilters(f => ({ ...f, numero_projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Desenho</Label><Input value={filters.numero_desenho} onChange={(e) => setFilters(f => ({ ...f, numero_desenho: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Revisão</Label><Input value={filters.revisao} onChange={(e) => setFilters(f => ({ ...f, revisao: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cliente</Label><Input value={filters.cliente} onChange={(e) => setFilters(f => ({ ...f, cliente: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cidade</Label><Input value={filters.cidade} onChange={(e) => setFilters(f => ({ ...f, cidade: e.target.value }))} className="h-8 text-xs" /></div>
      </FilterPanel>

      {loading && <div className="text-center text-muted-foreground py-8">Carregando...</div>}

      {resumo && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
            <KPICard title="Kg Previsto" value={formatNumber(resumo.kg_engenharia, 0)} variant="info" />
            <KPICard title="Kg Produzido" value={formatNumber(resumo.kg_produzido, 0)} variant="success" />
            <KPICard title="Kg Expedido" value={formatNumber(resumo.kg_expedido, 0)} variant="success" />
            <KPICard title="Kg Pátio" value={formatNumber(resumo.kg_patio, 0)} variant="warning" />
            <KPICard title="Qtd Cargas" value={resumo.quantidade_cargas} />
            <KPICard title="Itens Não Carreg." value={resumo.itens_nao_carregados} variant="destructive" />
            <KPICard title="Aguardando Prod." value={resumo.projetos_aguardando_producao} />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <KPICard title="Em Produção" value={resumo.projetos_em_producao} variant="info" />
            <KPICard title="Parcial Expedido" value={resumo.projetos_parcialmente_expedidos} variant="warning" />
            <KPICard title="Total Expedidos" value={resumo.projetos_expedidos} variant="success" />
            <KPICard title="LT Eng→Prod (dias)" value={resumo.leadtime_medio_engenharia_producao} />
            <KPICard title="LT Prod→Exp (dias)" value={resumo.leadtime_medio_producao_expedicao} />
            <KPICard title="LT Total (dias)" value={resumo.leadtime_medio_total} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {data?.cargas_por_mes && data.cargas_por_mes.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Cargas por Período</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.cargas_por_mes}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="periodo" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <Tooltip />
                      <Bar dataKey="quantidade_cargas" name="Cargas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {statusChartData.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Status dos Projetos</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={statusChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {statusChartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {topPatioData.length > 0 && (
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Top Projetos com Maior Saldo em Pátio (Kg)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topPatioData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <Tooltip />
                      <Bar dataKey="kg_patio" name="Kg Pátio" fill="hsl(var(--warning, 38 92% 50%))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
