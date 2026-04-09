import { useState, useCallback, useRef, useMemo } from 'react';
import { api, PaginatedResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatPercent } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';
import { KPICard } from '@/components/erp/KPICard';
import { Package, ArrowUpFromLine, Warehouse, Truck } from 'lucide-react';

const statusColor = (s: string) => {
  switch (s) {
    case 'TOTALMENTE EXPEDIDO':
    case 'EXPEDIDO': return 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]';
    case 'EXPEDIÇÃO PARCIAL':
    case 'PARCIALMENTE EXPEDIDO': return 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]';
    case 'PRODUZIDO / EM PÁTIO':
    case 'EM PÁTIO': return 'bg-destructive text-destructive-foreground';
    case 'EM PRODUÇÃO / SEM ENTRADA ESTOQUE':
    case 'EM PRODUÇÃO': return 'bg-primary text-primary-foreground';
    case 'AGUARDANDO PRODUÇÃO': return 'bg-muted text-muted-foreground';
    case 'SEM MOVIMENTO': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

const columns: Column<any>[] = [
  { key: 'numero_projeto', header: 'Projeto' },
  { key: 'numero_desenho', header: 'Desenho' },
  { key: 'revisao', header: 'Rev.' },
  { key: 'cliente', header: 'Cliente' },
  { key: 'kg_engenharia', header: 'Kg Previsto', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_produzido', header: 'Kg Produzido', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_expedido', header: 'Kg Expedido', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_patio', header: 'Kg Pátio', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'perc_atendimento_producao', header: '% Prod.', align: 'right', render: (v) => formatPercent(v) },
  { key: 'perc_expedido', header: '% Expedido', align: 'right', render: (v) => formatPercent(v) },
  {
    key: 'status_patio', header: 'Status',
    render: (v) => <Badge className={`text-[10px] ${statusColor(v)}`}>{v}</Badge>,
  },
];

interface KpiTotals {
  totalRegistros: number;
  kgProduzido: number;
  kgExpedido: number;
  kgPatio: number;
}

function sumPage(dados: any[]) {
  return {
    kgProduzido: dados.reduce((s, r) => s + (Number(r.kg_produzido) || 0), 0),
    kgExpedido: dados.reduce((s, r) => s + (Number(r.kg_expedido) || 0), 0),
    kgPatio: dados.reduce((s, r) => s + (Number(r.kg_patio) || 0), 0),
  };
}

export default function SaldoPatioPage() {
  const [filters, setFilters] = useState({
    numero_projeto: '', numero_desenho: '', revisao: '', cliente: '', cidade: '',
  });
  const [data, setData] = useState<PaginatedResponse<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const erpReady = useErpReady();

  const [kpiTotals, setKpiTotals] = useState<KpiTotals | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);
  const consolidationIdRef = useRef(0);

  const consolidateKpis = useCallback(async (firstResult: PaginatedResponse<any>, currentFilters: typeof filters) => {
    const id = ++consolidationIdRef.current;

    const resultAny = firstResult as any;
    if (resultAny.resumo) {
      if (consolidationIdRef.current !== id) return;
      setKpiTotals({
        totalRegistros: resultAny.resumo.total_registros ?? firstResult.total_registros,
        kgProduzido: resultAny.resumo.kg_produzido ?? 0,
        kgExpedido: resultAny.resumo.kg_expedido ?? 0,
        kgPatio: resultAny.resumo.kg_patio ?? 0,
      });
      setKpiLoading(false);
      return;
    }

    const totalPages = firstResult.total_paginas;
    const p1 = sumPage(firstResult.dados || []);
    if (totalPages <= 1) {
      if (consolidationIdRef.current !== id) return;
      setKpiTotals({ totalRegistros: firstResult.total_registros, ...p1 });
      setKpiLoading(false);
      return;
    }

    setKpiLoading(true);
    try {
      let totals = { ...p1 };
      const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      const BATCH_SIZE = 5;

      for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
        if (consolidationIdRef.current !== id) return;
        const batch = remainingPages.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(p => api.get<PaginatedResponse<any>>('/api/producao/patio', { ...currentFilters, pagina: p, tamanho_pagina: 100 }))
        );
        for (const r of results) {
          const s = sumPage(r.dados || []);
          totals.kgProduzido += s.kgProduzido;
          totals.kgExpedido += s.kgExpedido;
          totals.kgPatio += s.kgPatio;
        }
      }

      if (consolidationIdRef.current !== id) return;
      setKpiTotals({ totalRegistros: firstResult.total_registros, ...totals });
    } catch {
      if (consolidationIdRef.current !== id) return;
      setKpiTotals({ totalRegistros: firstResult.total_registros, ...p1 });
      toast.warning('Não foi possível consolidar todos os KPIs. Valores parciais exibidos.');
    } finally {
      if (consolidationIdRef.current === id) setKpiLoading(false);
    }
  }, []);

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<PaginatedResponse<any>>('/api/producao/patio', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
      if (page === 1) consolidateKpis(result, filters);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, erpReady, consolidateKpis]);

  useAiFilters('producao-patio', setFilters, () => search(1));
  const clearFilters = () => {
    setFilters({ numero_projeto: '', numero_desenho: '', revisao: '', cliente: '', cidade: '' });
    setData(null); setPagina(1);
    setKpiTotals(null); setKpiLoading(false);
    consolidationIdRef.current++;
  };

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader title="Saldo em Pátio" description="Saldo entre produzido e expedido" actions={<ExportButton endpoint="/api/export/producao-patio" params={filters} />} />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.numero_projeto} onChange={(e) => setFilters(f => ({ ...f, numero_projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Desenho</Label><Input value={filters.numero_desenho} onChange={(e) => setFilters(f => ({ ...f, numero_desenho: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Revisão</Label><Input value={filters.revisao} onChange={(e) => setFilters(f => ({ ...f, revisao: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cliente</Label><Input value={filters.cliente} onChange={(e) => setFilters(f => ({ ...f, cliente: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cidade</Label><Input value={filters.cidade} onChange={(e) => setFilters(f => ({ ...f, cidade: e.target.value }))} className="h-8 text-xs" /></div>
      </FilterPanel>

      {(data || kpiLoading) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Total Registros" value={kpiTotals ? formatNumber(kpiTotals.totalRegistros, 0) : '...'} subtitle={data ? `${(data.dados || []).length} nesta página` : undefined} icon={<Package className="h-5 w-5" />} index={0} />
          <KPICard title="Kg Produzido" value={kpiLoading ? 'Calculando...' : kpiTotals ? `${formatNumber(kpiTotals.kgProduzido, 1)} Kg` : '...'} subtitle={kpiLoading ? 'Consolidando páginas...' : 'Total geral do filtro'} icon={<ArrowUpFromLine className="h-5 w-5" />} variant="info" index={1} />
          <KPICard title="Kg Expedido" value={kpiLoading ? 'Calculando...' : kpiTotals ? `${formatNumber(kpiTotals.kgExpedido, 1)} Kg` : '...'} subtitle={kpiLoading ? 'Consolidando páginas...' : 'Total geral do filtro'} icon={<Truck className="h-5 w-5" />} variant="success" index={2} />
          <KPICard title="Kg em Pátio" value={kpiLoading ? 'Calculando...' : kpiTotals ? `${formatNumber(kpiTotals.kgPatio, 1)} Kg` : '...'} subtitle={kpiLoading ? 'Consolidando páginas...' : 'Total geral do filtro'} icon={<Warehouse className="h-5 w-5" />} variant="warning" index={3} />
        </div>
      )}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
