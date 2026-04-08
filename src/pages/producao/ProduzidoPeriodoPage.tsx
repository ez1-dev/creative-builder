import { useState, useCallback } from 'react';
import { api, PaginatedResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { KPICard } from '@/components/erp/KPICard';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { ComboboxFilter } from '@/components/erp/ComboboxFilter';
import { useErpOptions } from '@/hooks/useErpOptions';
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
  { key: 'revisao', header: 'Rev.' },
  { key: 'produto', header: 'Produto' },
  { key: 'descricao', header: 'Descrição' },
  { key: 'quantidade', header: 'Qtd Produzida', align: 'right', render: (v) => formatNumber(v, 0) },
  { key: 'peso_kg', header: 'Peso Produzido', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'qtd_etiquetas', header: 'Qtd Etiquetas', align: 'right', render: (v) => formatNumber(v, 0) },
  { key: 'data_primeira_entrada', header: 'Primeira Entrada', render: (v) => formatDate(v) },
  { key: 'data_ultima_entrada', header: 'Última Entrada', render: (v) => formatDate(v) },
  { key: 'cliente', header: 'Cliente' },
];

export default function ProduzidoPeriodoPage() {
  const [filters, setFilters] = useState({
    projeto: '', desenho: '', revisao: '', produto: '', cliente: '', cidade: '',
    origem: '', familia: '', data_ini: '', data_fim: '',
  });
  const [data, setData] = useState<ProduzidoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const erpReady = useErpReady();
  const { familias, origens, loading: optionsLoading } = useErpOptions(erpReady, data?.dados);

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
  const clearFilters = () => {
    setFilters({ projeto: '', desenho: '', revisao: '', produto: '', cliente: '', cidade: '', origem: '', familia: '', data_ini: '', data_fim: '' });
    setData(null); setPagina(1);
  };

  const resumo = data?.resumo;

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader title="Produzido no Período" description="Itens produzidos por período" actions={<ExportButton endpoint="/api/export/producao-produzido" params={filters} />} />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.projeto} onChange={(e) => setFilters(f => ({ ...f, projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Desenho</Label><Input value={filters.desenho} onChange={(e) => setFilters(f => ({ ...f, desenho: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Revisão</Label><Input value={filters.revisao} onChange={(e) => setFilters(f => ({ ...f, revisao: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Produto</Label><Input value={filters.produto} onChange={(e) => setFilters(f => ({ ...f, produto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cliente</Label><Input value={filters.cliente} onChange={(e) => setFilters(f => ({ ...f, cliente: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cidade</Label><Input value={filters.cidade} onChange={(e) => setFilters(f => ({ ...f, cidade: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Origem</Label><ComboboxFilter value={filters.origem} onChange={(v) => setFilters(f => ({ ...f, origem: v }))} options={origens} placeholder="Origem" loading={optionsLoading} /></div>
        <div><Label className="text-xs">Família</Label><ComboboxFilter value={filters.familia} onChange={(v) => setFilters(f => ({ ...f, familia: v }))} options={familias} placeholder="Família" loading={optionsLoading} /></div>
        <div><Label className="text-xs">Data produção de</Label><Input type="date" value={filters.data_ini} onChange={(e) => setFilters(f => ({ ...f, data_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Data produção até</Label><Input type="date" value={filters.data_fim} onChange={(e) => setFilters(f => ({ ...f, data_fim: e.target.value }))} className="h-8 text-xs" /></div>
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
