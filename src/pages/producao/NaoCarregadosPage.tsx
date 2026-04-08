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
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';

interface NaoCarregadosResponse extends PaginatedResponse<any> {
  resumo: Record<string, any>;
}

const statusColor = (s: string) => {
  switch (s?.toUpperCase()) {
    case 'AGUARDANDO': return 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]';
    case 'BLOQUEADO': return 'bg-destructive text-destructive-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

const columns: Column<any>[] = [
  { key: 'numero_projeto', header: 'Projeto' },
  { key: 'numero_desenho', header: 'Desenho' },
  { key: 'revisao', header: 'Rev.' },
  { key: 'qtd_itens_nao_carregados', header: 'Qtd Itens', align: 'right', render: (v) => formatNumber(v, 0) },
  { key: 'qtd_codigos_barras', header: 'Qtd Cód. Barras', align: 'right', render: (v) => formatNumber(v, 0) },
  { key: 'cliente', header: 'Cliente' },
  {
    key: 'status', header: 'Status',
    render: (v) => <Badge className={`text-[10px] ${statusColor(v)}`}>{v || '-'}</Badge>,
  },
];

export default function NaoCarregadosPage() {
  const [filters, setFilters] = useState({
    projeto: '', desenho: '', revisao: '', codigo_barras: '', cliente: '',
  });
  const [data, setData] = useState<NaoCarregadosResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const erpReady = useErpReady();

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<NaoCarregadosResponse>('/api/producao/nao-carregados', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, erpReady]);

  useAiFilters('producao-nao-carregados', setFilters, () => search(1));
  const clearFilters = () => {
    setFilters({ projeto: '', desenho: '', revisao: '', codigo_barras: '', cliente: '' });
    setData(null); setPagina(1);
  };

  const resumo = data?.resumo;

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader title="Itens Não Carregados" description="Itens prontos que ainda não foram expedidos" actions={<ExportButton endpoint="/api/export/producao-nao-carregados" params={filters} />} />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.projeto} onChange={(e) => setFilters(f => ({ ...f, projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Desenho</Label><Input value={filters.desenho} onChange={(e) => setFilters(f => ({ ...f, desenho: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Revisão</Label><Input value={filters.revisao} onChange={(e) => setFilters(f => ({ ...f, revisao: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Código de Barras</Label><Input value={filters.codigo_barras} onChange={(e) => setFilters(f => ({ ...f, codigo_barras: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cliente</Label><Input value={filters.cliente} onChange={(e) => setFilters(f => ({ ...f, cliente: e.target.value }))} className="h-8 text-xs" /></div>
      </FilterPanel>

      {resumo && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <KPICard title="Total Itens" value={resumo.total_itens} />
          <KPICard title="Kg Não Carregados" value={formatNumber(resumo.kg_total, 0)} variant="destructive" />
          <KPICard title="Projetos" value={resumo.total_projetos} />
          <KPICard title="Maior Espera" value={`${resumo.maior_dias || 0} dias`} variant="warning" />
        </div>
      )}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
