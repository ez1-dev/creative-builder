import { useState, useCallback, useMemo } from 'react';
import { api, PaginatedResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { KPICard } from '@/components/erp/KPICard';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

interface DashboardResponse extends PaginatedResponse<any> {
  resumo: Record<string, any>;
  graficos?: {
    produzido_expedido_periodo?: any[];
    saldo_por_projeto?: any[];
    status_projetos?: any[];
    top_patio?: any[];
  };
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const statusColor = (s: string) => {
  switch (s?.toUpperCase()) {
    case 'EXPEDIDO': case 'TOTAL EXPEDIDO': return 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]';
    case 'PARCIAL': case 'PARCIALMENTE EXPEDIDO': return 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]';
    case 'EM PRODUÇÃO': return 'bg-primary text-primary-foreground';
    case 'AGUARDANDO': return 'bg-muted text-muted-foreground';
    default: return 'bg-secondary text-secondary-foreground';
  }
};

const columns: Column<any>[] = [
  { key: 'projeto', header: 'Projeto' },
  { key: 'desenho', header: 'Desenho' },
  { key: 'revisao', header: 'Rev.' },
  { key: 'cliente', header: 'Cliente' },
  { key: 'data_liberacao', header: 'Dt Liberação', render: (v) => formatDate(v) },
  { key: 'kg_previsto', header: 'Kg Previsto', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_produzido', header: 'Kg Produzido', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_expedido', header: 'Kg Expedido', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_patio', header: 'Kg Pátio', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'itens_nao_carregados', header: 'Não Carreg.', align: 'right', render: (v) => formatNumber(v, 0) },
  {
    key: 'status', header: 'Status',
    render: (v) => <Badge className={`text-[10px] ${statusColor(v)}`}>{v || '-'}</Badge>,
  },
];

export default function ProducaoDashboardPage() {
  const [filters, setFilters] = useState({ projeto: '', data_ini: '', data_fim: '' });
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const erpReady = useErpReady();

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<DashboardResponse>('/api/producao/dashboard', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, erpReady]);

  useAiFilters('producao-dashboard', setFilters, () => search(1));
  const clearFilters = () => { setFilters({ projeto: '', data_ini: '', data_fim: '' }); setData(null); setPagina(1); };

  const resumo = data?.resumo;

  // Resilient chart data from API or computed from grid
  const chartData = useMemo(() => {
    const g = data?.graficos;
    const dados = data?.dados || [];

    const prodExpPeriodo = g?.produzido_expedido_periodo || [];
    const saldoProjeto = g?.saldo_por_projeto || dados
      .filter((d: any) => (d.kg_patio || 0) > 0)
      .slice(0, 10)
      .map((d: any) => ({ projeto: d.projeto || d.numero_projeto, kg_patio: d.kg_patio || 0 }));
    const statusProjetos = g?.status_projetos || (() => {
      const counts: Record<string, number> = {};
      dados.forEach((d: any) => { const s = d.status || 'Indefinido'; counts[s] = (counts[s] || 0) + 1; });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    })();
    const topPatio = g?.top_patio || [...dados]
      .sort((a: any, b: any) => (b.kg_patio || 0) - (a.kg_patio || 0))
      .slice(0, 10)
      .map((d: any) => ({ projeto: d.projeto || d.numero_projeto, kg_patio: d.kg_patio || 0 }));

    return { prodExpPeriodo, saldoProjeto, statusProjetos, topPatio };
  }, [data]);

  // Resilient KPIs
  const kpis = useMemo(() => {
    if (resumo) return resumo;
    const dados = data?.dados || [];
    const unique = new Set(dados.map((d: any) => d.projeto));
    return {
      total_projetos: unique.size,
      kg_engenharia: dados.reduce((s: number, d: any) => s + (d.kg_previsto || d.kg_engenharia || 0), 0),
      kg_produzido: dados.reduce((s: number, d: any) => s + (d.kg_produzido || 0), 0),
      kg_expedido: dados.reduce((s: number, d: any) => s + (d.kg_expedido || 0), 0),
      kg_patio: dados.reduce((s: number, d: any) => s + (d.kg_patio || 0), 0),
      qtd_cargas: 0,
      itens_nao_carregados: dados.reduce((s: number, d: any) => s + (d.itens_nao_carregados || 0), 0),
      projetos_aguardando: 0,
      projetos_em_producao: 0,
      projetos_parcial_expedido: 0,
      projetos_total_expedido: 0,
      lt_medio_eng_prod: 0,
      lt_medio_prod_exp: 0,
      lt_medio_total: 0,
    };
  }, [resumo, data?.dados]);

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Dashboard Produção"
        description="Visão consolidada do fluxo produtivo"
        actions={<ExportButton endpoint="/api/export/producao-dashboard" params={filters} />}
      />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.projeto} onChange={(e) => setFilters(f => ({ ...f, projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Data início</Label><Input type="date" value={filters.data_ini} onChange={(e) => setFilters(f => ({ ...f, data_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Data fim</Label><Input type="date" value={filters.data_fim} onChange={(e) => setFilters(f => ({ ...f, data_fim: e.target.value }))} className="h-8 text-xs" /></div>
      </FilterPanel>

      {/* KPIs - 13 cards */}
      {(resumo || data?.dados) && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          <KPICard title="Total Projetos" value={kpis.total_projetos} />
          <KPICard title="Kg Engenharia" value={formatNumber(kpis.kg_engenharia, 0)} variant="info" />
          <KPICard title="Kg Produzido" value={formatNumber(kpis.kg_produzido, 0)} variant="success" />
          <KPICard title="Kg Expedido" value={formatNumber(kpis.kg_expedido, 0)} variant="warning" />
          <KPICard title="Kg Pátio" value={formatNumber(kpis.kg_patio, 0)} />
          <KPICard title="Qtd Cargas" value={kpis.qtd_cargas} variant="info" />
          <KPICard title="Não Carregados" value={kpis.itens_nao_carregados} variant="destructive" />
          <KPICard title="Aguard. Produção" value={kpis.projetos_aguardando} />
          <KPICard title="Em Produção" value={kpis.projetos_em_producao} variant="info" />
          <KPICard title="Parcial Expedido" value={kpis.projetos_parcial_expedido} variant="warning" />
          <KPICard title="Total Expedido" value={kpis.projetos_total_expedido} variant="success" />
          <KPICard title="LT Eng→Prod" value={`${formatNumber(kpis.lt_medio_eng_prod, 1)} dias`} variant="info" />
          <KPICard title="LT Prod→Exp" value={`${formatNumber(kpis.lt_medio_prod_exp, 1)} dias`} variant="warning" />
        </div>
      )}

      {/* Charts */}
      {(resumo || data?.dados) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Produzido x Expedido por período */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Produzido x Expedido por Período</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.prodExpPeriodo}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <Tooltip contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="kg_produzido" name="Produzido" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="kg_expedido" name="Expedido" fill="hsl(var(--chart-3))" radius={[2, 2, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status dos projetos */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Status dos Projetos</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData.statusProjetos} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                    {chartData.statusProjetos.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top projetos com maior saldo em pátio */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Top Projetos – Saldo em Pátio</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.topPatio} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <YAxis dataKey="projeto" type="category" tick={{ fontSize: 10 }} width={80} className="fill-muted-foreground" />
                  <Tooltip contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="kg_patio" name="Kg Pátio" fill="hsl(var(--chart-4))" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Saldo em pátio por projeto */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Saldo em Pátio por Projeto</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.saldoProjeto}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="projeto" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <Tooltip contentStyle={{ fontSize: 11, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="kg_patio" name="Kg Pátio" fill="hsl(var(--chart-5))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
