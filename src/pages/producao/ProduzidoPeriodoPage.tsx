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

interface ProduzidoResponse extends PaginatedResponse<any> {
  resumo: Record<string, any>;
}

const columns: Column<any>[] = [
  { key: 'numero_projeto', header: 'Projeto' },
  { key: 'numero_desenho', header: 'Desenho' },
  { key: 'descricao', header: 'Descrição' },
  { key: 'numero_op', header: 'OP' },
  { key: 'data_producao', header: 'Data Produção', render: (v) => formatDate(v) },
  { key: 'quantidade', header: 'Qtd', align: 'right', render: (v) => formatNumber(v, 0) },
  { key: 'peso_kg', header: 'Peso (Kg)', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'origem', header: 'Origem' },
];

export default function ProduzidoPeriodoPage() {
  const [filters, setFilters] = useState({ projeto: '', desenho: '', data_ini: '', data_fim: '' });
  const [data, setData] = useState<ProduzidoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const erpReady = useErpReady();

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<ProduzidoResponse>('/api/producao/produzido', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, erpReady]);

  useAiFilters('producao-produzido', setFilters, () => search(1));
  const clearFilters = () => { setFilters({ projeto: '', desenho: '', data_ini: '', data_fim: '' }); setData(null); setPagina(1); };

  const resumo = data?.resumo;

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader title="Produzido no Período" description="Itens produzidos por período" actions={<ExportButton endpoint="/api/export/producao/produzido" params={filters} />} />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.projeto} onChange={(e) => setFilters(f => ({ ...f, projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Desenho</Label><Input value={filters.desenho} onChange={(e) => setFilters(f => ({ ...f, desenho: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Data início</Label><Input type="date" value={filters.data_ini} onChange={(e) => setFilters(f => ({ ...f, data_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Data fim</Label><Input type="date" value={filters.data_fim} onChange={(e) => setFilters(f => ({ ...f, data_fim: e.target.value }))} className="h-8 text-xs" /></div>
      </FilterPanel>

      {resumo && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <KPICard title="Total Itens" value={resumo.total_itens} />
          <KPICard title="Total OPs" value={resumo.total_ops} variant="info" />
          <KPICard title="Kg Total" value={formatNumber(resumo.kg_total, 0)} variant="success" />
          <KPICard title="Projetos" value={resumo.total_projetos} />
        </div>
      )}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
