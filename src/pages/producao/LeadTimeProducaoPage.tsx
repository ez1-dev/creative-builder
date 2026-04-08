import { useState, useCallback } from 'react';
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
import { formatNumber, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';

interface LeadTimeResponse extends PaginatedResponse<any> {
  resumo: Record<string, any>;
}

const columns: Column<any>[] = [
  { key: 'numero_projeto', header: 'Projeto' },
  { key: 'numero_desenho', header: 'Desenho' },
  { key: 'descricao', header: 'Descrição' },
  { key: 'data_engenharia', header: 'Dt Engenharia', render: (v) => formatDate(v) },
  { key: 'data_producao', header: 'Dt Produção', render: (v) => formatDate(v) },
  { key: 'data_expedicao', header: 'Dt Expedição', render: (v) => formatDate(v) },
  { key: 'lead_eng_prod', header: 'LT Eng→Prod (dias)', align: 'right' },
  { key: 'lead_prod_exp', header: 'LT Prod→Exp (dias)', align: 'right' },
  { key: 'lead_total', header: 'LT Total (dias)', align: 'right' },
];

export default function LeadTimeProducaoPage() {
  const [filters, setFilters] = useState({ projeto: '', data_ini: '', data_fim: '' });
  const [data, setData] = useState<LeadTimeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const erpReady = useErpReady();

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<LeadTimeResponse>('/api/producao/leadtime', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, erpReady]);

  useAiFilters('producao-leadtime', setFilters, () => search(1));
  const clearFilters = () => { setFilters({ projeto: '', data_ini: '', data_fim: '' }); setData(null); setPagina(1); };

  const resumo = data?.resumo;

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader title="Lead Time Produção" description="Tempos de processo entre engenharia, produção e expedição" actions={<ExportButton endpoint="/api/export/producao/leadtime" params={filters} />} />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.projeto} onChange={(e) => setFilters(f => ({ ...f, projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Data início</Label><Input type="date" value={filters.data_ini} onChange={(e) => setFilters(f => ({ ...f, data_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Data fim</Label><Input type="date" value={filters.data_fim} onChange={(e) => setFilters(f => ({ ...f, data_fim: e.target.value }))} className="h-8 text-xs" /></div>
      </FilterPanel>

      {resumo && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <KPICard title="Total Registros" value={resumo.total_registros} />
          <KPICard title="LT Médio Eng→Prod" value={`${formatNumber(resumo.lt_medio_eng_prod, 1)} dias`} variant="info" />
          <KPICard title="LT Médio Prod→Exp" value={`${formatNumber(resumo.lt_medio_prod_exp, 1)} dias`} variant="warning" />
          <KPICard title="LT Médio Total" value={`${formatNumber(resumo.lt_medio_total, 1)} dias`} variant="success" />
          <KPICard title="Maior LT" value={`${resumo.maior_lt || 0} dias`} variant="destructive" />
        </div>
      )}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
