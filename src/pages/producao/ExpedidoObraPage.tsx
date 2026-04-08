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

interface ExpedidoResponse extends PaginatedResponse<any> {
  resumo: Record<string, any>;
}

const columns: Column<any>[] = [
  { key: 'numero_projeto', header: 'Projeto' },
  { key: 'numero_desenho', header: 'Desenho' },
  { key: 'revisao', header: 'Rev.' },
  { key: 'produto', header: 'Produto' },
  { key: 'descricao', header: 'Descrição' },
  { key: 'quantidade', header: 'Qtd Expedida', align: 'right', render: (v) => formatNumber(v, 0) },
  { key: 'peso_kg', header: 'Peso Expedido', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'numero_carga', header: 'Nº Carga' },
  { key: 'qtd_cargas', header: 'Qtd Cargas', align: 'right', render: (v) => formatNumber(v, 0) },
  { key: 'data_primeira_expedicao', header: 'Primeira Exped.', render: (v) => formatDate(v) },
  { key: 'data_ultima_expedicao', header: 'Última Exped.', render: (v) => formatDate(v) },
  { key: 'cliente', header: 'Cliente' },
];

export default function ExpedidoObraPage() {
  const [filters, setFilters] = useState({
    projeto: '', desenho: '', revisao: '', carga: '', cliente: '', cidade: '', produto: '',
    data_ini: '', data_fim: '',
  });
  const [data, setData] = useState<ExpedidoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const erpReady = useErpReady();

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<ExpedidoResponse>('/api/producao/expedido', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, erpReady]);

  useAiFilters('producao-expedido', setFilters, () => search(1));
  const clearFilters = () => {
    setFilters({ projeto: '', desenho: '', revisao: '', carga: '', cliente: '', cidade: '', produto: '', data_ini: '', data_fim: '' });
    setData(null); setPagina(1);
  };

  const resumo = data?.resumo;

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader title="Expedido para Obra" description="Itens expedidos por obra/período" actions={<ExportButton endpoint="/api/export/producao-expedido" params={filters} />} />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.projeto} onChange={(e) => setFilters(f => ({ ...f, projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Desenho</Label><Input value={filters.desenho} onChange={(e) => setFilters(f => ({ ...f, desenho: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Revisão</Label><Input value={filters.revisao} onChange={(e) => setFilters(f => ({ ...f, revisao: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Carga</Label><Input value={filters.carga} onChange={(e) => setFilters(f => ({ ...f, carga: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cliente</Label><Input value={filters.cliente} onChange={(e) => setFilters(f => ({ ...f, cliente: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cidade</Label><Input value={filters.cidade} onChange={(e) => setFilters(f => ({ ...f, cidade: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Produto</Label><Input value={filters.produto} onChange={(e) => setFilters(f => ({ ...f, produto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Data expedição de</Label><Input type="date" value={filters.data_ini} onChange={(e) => setFilters(f => ({ ...f, data_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Data expedição até</Label><Input type="date" value={filters.data_fim} onChange={(e) => setFilters(f => ({ ...f, data_fim: e.target.value }))} className="h-8 text-xs" /></div>
      </FilterPanel>

      {resumo && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <KPICard title="Total Expedições" value={resumo.total_expedicoes} />
          <KPICard title="Kg Expedido" value={formatNumber(resumo.kg_total, 0)} variant="success" />
          <KPICard title="Notas Fiscais" value={resumo.total_nfs} variant="info" />
          <KPICard title="Obras" value={resumo.total_obras} />
        </div>
      )}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
