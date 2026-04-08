import { useState, useCallback } from 'react';
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
import { formatNumber, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';
import { useProducaoFilters } from '@/contexts/ProducaoFiltersContext';

const statusColor = (s: string) => {
  switch (s) {
    case 'TOTALMENTE EXPEDIDO':
    case 'EXPEDIDO': return 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]';
    case 'EXPEDIÇÃO PARCIAL':
    case 'PARCIALMENTE EXPEDIDO': return 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]';
    case 'EM PRODUÇÃO / SEM ENTRADA ESTOQUE':
    case 'EM PRODUÇÃO': return 'bg-primary text-primary-foreground';
    case 'PRODUZIDO / EM PÁTIO':
    case 'EM PÁTIO': return 'bg-destructive text-destructive-foreground';
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
  { key: 'data_liberacao_engenharia', header: 'Liberação Eng.', render: (v) => formatDate(v) },
  { key: 'data_primeira_entrada_estoque', header: '1ª Produção', render: (v) => formatDate(v) },
  { key: 'data_primeira_expedicao', header: '1ª Expedição', render: (v) => formatDate(v) },
  { key: 'dias_liberacao_ate_producao', header: 'Dias Eng→Prod', align: 'right', render: (v) => v != null ? formatNumber(v, 0) : '—' },
  { key: 'dias_producao_ate_expedicao', header: 'Dias Prod→Exp', align: 'right', render: (v) => v != null ? formatNumber(v, 0) : '—' },
  { key: 'dias_total_liberacao_ate_expedicao', header: 'Dias Total', align: 'right', render: (v) => v != null ? formatNumber(v, 0) : '—' },
  {
    key: 'status_fluxo', header: 'Status',
    render: (v) => <Badge className={`text-[10px] ${statusColor(v)}`}>{v}</Badge>,
  },
];

export default function LeadTimeProducaoPage() {
  const { sharedFilters, setSharedFilters, clearSharedFilters } = useProducaoFilters();
  const filters = sharedFilters;
  const [data, setData] = useState<PaginatedResponse<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const erpReady = useErpReady();

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<PaginatedResponse<any>>('/api/producao/leadtime', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, erpReady]);

  useAiFilters('producao-leadtime', (updater) => {
    if (typeof updater === 'function') {
      const result = updater(filters);
      setSharedFilters(result as any);
    }
  }, () => search(1));
  const clearFilters = () => {
    clearSharedFilters();
    setData(null); setPagina(1);
  };
  const clearResults = () => {
    setData(null); setPagina(1);
  };

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader title="Lead Time Produção" description="Análise de lead time do fluxo produtivo" actions={<ExportButton endpoint="/api/export/producao-leadtime" params={filters} />} />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters} onClearResults={clearResults}>
         <div><Label className="text-xs">Projeto</Label><Input value={sharedFilters.numero_projeto} onChange={(e) => setSharedFilters({ numero_projeto: e.target.value })} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Desenho</Label><Input value={sharedFilters.numero_desenho} onChange={(e) => setSharedFilters({ numero_desenho: e.target.value })} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Revisão</Label><Input value={sharedFilters.revisao} onChange={(e) => setSharedFilters({ revisao: e.target.value })} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cliente</Label><Input value={sharedFilters.cliente} onChange={(e) => setSharedFilters({ cliente: e.target.value })} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cidade</Label><Input value={sharedFilters.cidade} onChange={(e) => setSharedFilters({ cidade: e.target.value })} className="h-8 text-xs" /></div>
      </FilterPanel>

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
