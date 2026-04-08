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
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';

interface LeadTimeResponse extends PaginatedResponse<any> {
  resumo: Record<string, any>;
}

const statusColor = (s: string) => {
  switch (s?.toUpperCase()) {
    case 'CONCLUÍDO': case 'EXPEDIDO': return 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]';
    case 'EM PRODUÇÃO': return 'bg-primary text-primary-foreground';
    case 'AGUARDANDO': return 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]';
    default: return 'bg-muted text-muted-foreground';
  }
};

const columns: Column<any>[] = [
  { key: 'numero_projeto', header: 'Projeto' },
  { key: 'numero_desenho', header: 'Desenho' },
  { key: 'revisao', header: 'Rev.' },
  { key: 'data_engenharia', header: 'Dt Liberação Eng.', render: (v) => formatDate(v) },
  { key: 'data_producao', header: 'Dt 1ª Entrada Est.', render: (v) => formatDate(v) },
  { key: 'data_expedicao', header: 'Dt 1ª Expedição', render: (v) => formatDate(v) },
  { key: 'lead_eng_prod', header: 'Dias Eng→Prod', align: 'right' },
  { key: 'lead_prod_exp', header: 'Dias Prod→Exp', align: 'right' },
  { key: 'lead_total', header: 'Dias Total', align: 'right' },
  {
    key: 'status', header: 'Status',
    render: (v) => <Badge className={`text-[10px] ${statusColor(v)}`}>{v || '-'}</Badge>,
  },
];

export default function LeadTimeProducaoPage() {
  const [filters, setFilters] = useState({
    projeto: '', desenho: '', revisao: '', cliente: '',
    data_lib_ini: '', data_lib_fim: '',
    data_prod_ini: '', data_prod_fim: '',
    data_exp_ini: '', data_exp_fim: '',
  });
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
  const clearFilters = () => {
    setFilters({
      projeto: '', desenho: '', revisao: '', cliente: '',
      data_lib_ini: '', data_lib_fim: '',
      data_prod_ini: '', data_prod_fim: '',
      data_exp_ini: '', data_exp_fim: '',
    });
    setData(null); setPagina(1);
  };

  const resumo = data?.resumo;

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader title="Lead Time Produção" description="Tempos de processo entre engenharia, produção e expedição" actions={<ExportButton endpoint="/api/export/producao-leadtime" params={filters} />} />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.projeto} onChange={(e) => setFilters(f => ({ ...f, projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Desenho</Label><Input value={filters.desenho} onChange={(e) => setFilters(f => ({ ...f, desenho: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Revisão</Label><Input value={filters.revisao} onChange={(e) => setFilters(f => ({ ...f, revisao: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cliente</Label><Input value={filters.cliente} onChange={(e) => setFilters(f => ({ ...f, cliente: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Liberação de</Label><Input type="date" value={filters.data_lib_ini} onChange={(e) => setFilters(f => ({ ...f, data_lib_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Liberação até</Label><Input type="date" value={filters.data_lib_fim} onChange={(e) => setFilters(f => ({ ...f, data_lib_fim: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Produção de</Label><Input type="date" value={filters.data_prod_ini} onChange={(e) => setFilters(f => ({ ...f, data_prod_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Produção até</Label><Input type="date" value={filters.data_prod_fim} onChange={(e) => setFilters(f => ({ ...f, data_prod_fim: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Expedição de</Label><Input type="date" value={filters.data_exp_ini} onChange={(e) => setFilters(f => ({ ...f, data_exp_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Expedição até</Label><Input type="date" value={filters.data_exp_fim} onChange={(e) => setFilters(f => ({ ...f, data_exp_fim: e.target.value }))} className="h-8 text-xs" /></div>
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
