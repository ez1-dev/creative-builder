import { useState, useCallback } from 'react';
import { api, PaginatedResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { KPICard } from '@/components/erp/KPICard';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';

interface DashboardResponse extends PaginatedResponse<any> {
  resumo: Record<string, any>;
}

const columns: Column<any>[] = [
  { key: 'projeto', header: 'Projeto' },
  { key: 'descricao', header: 'Descrição' },
  { key: 'kg_engenharia', header: 'Kg Eng.', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_produzido', header: 'Kg Prod.', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_expedido', header: 'Kg Exped.', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_patio', header: 'Kg Pátio', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'status', header: 'Status' },
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

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader title="Dashboard Produção" description="Visão consolidada do fluxo produtivo" />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.projeto} onChange={(e) => setFilters(f => ({ ...f, projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Data início</Label><Input type="date" value={filters.data_ini} onChange={(e) => setFilters(f => ({ ...f, data_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Data fim</Label><Input type="date" value={filters.data_fim} onChange={(e) => setFilters(f => ({ ...f, data_fim: e.target.value }))} className="h-8 text-xs" /></div>
      </FilterPanel>

      {resumo && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <KPICard title="Total Projetos" value={resumo.total_projetos} />
          <KPICard title="Kg Engenharia" value={formatNumber(resumo.kg_engenharia, 0)} variant="info" />
          <KPICard title="Kg Produzido" value={formatNumber(resumo.kg_produzido, 0)} variant="success" />
          <KPICard title="Kg Expedido" value={formatNumber(resumo.kg_expedido, 0)} variant="warning" />
          <KPICard title="Kg Pátio" value={formatNumber(resumo.kg_patio, 0)} />
        </div>
      )}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
