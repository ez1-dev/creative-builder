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
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';
import { useAiPageContext } from '@/hooks/useAiPageContext';
import { KPICard } from '@/components/erp/KPICard';
import { Package, AlertTriangle } from 'lucide-react';
import { extrairResumo, ResumoGerencial } from '@/lib/drillResumo';

const columns: Column<any>[] = [
  { key: 'numero_projeto', header: 'Projeto' },
  { key: 'numero_desenho', header: 'Desenho' },
  { key: 'codigo_barras', header: 'Código Barras' },
  { key: 'codigo_peca', header: 'Código Peça' },
  { key: 'quantidade', header: 'Quantidade', align: 'right', render: (v) => formatNumber(v, 0) },
  { key: 'sequencia', header: 'Sequência', align: 'right' },
  { key: 'cliente', header: 'Cliente' },
  { key: 'cidade', header: 'Cidade' },
];

export default function NaoCarregadosPage() {
  const [filters, setFilters] = useState({
    numero_projeto: '', numero_desenho: '', cliente: '', cidade: '', codigo_barras: '',
  });
  const [data, setData] = useState<PaginatedResponse<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const erpReady = useErpReady();

  const [resumo, setResumo] = useState<ResumoGerencial | null>(null);
  const [resumoIndisponivel, setResumoIndisponivel] = useState(false);

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<PaginatedResponse<any>>('/api/producao/nao-carregados', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
      if (page === 1) {
        const r = extrairResumo(result);
        setResumo(r);
        setResumoIndisponivel(!r);
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, erpReady]);

  useAiFilters('producao-nao-carregados', setFilters, () => search(1));

  useAiPageContext({
    title: 'Itens Não Carregados',
    filters,
    kpis: resumo ? {
      'Total Registros': formatNumber(resumo.total_registros, 0),
      'Itens Não Carregados': formatNumber(resumo.itens_nao_carregados || resumo.total_registros, 0),
    } : undefined,
    summary: data
      ? `${data.total_registros} itens pendentes; página ${pagina}/${data.total_paginas}`
      : undefined,
  });

  const clearFilters = () => {
    setFilters({ numero_projeto: '', numero_desenho: '', cliente: '', cidade: '', codigo_barras: '' });
    setData(null); setPagina(1);
    setResumo(null); setResumoIndisponivel(false);
  };

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader title="Itens Não Carregados" description="Itens produzidos ainda não expedidos" actions={<ExportButton endpoint="/api/export/producao-nao-carregados" params={filters} />} />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.numero_projeto} onChange={(e) => setFilters(f => ({ ...f, numero_projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Desenho</Label><Input value={filters.numero_desenho} onChange={(e) => setFilters(f => ({ ...f, numero_desenho: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Código Barras</Label><Input value={filters.codigo_barras} onChange={(e) => setFilters(f => ({ ...f, codigo_barras: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cliente</Label><Input value={filters.cliente} onChange={(e) => setFilters(f => ({ ...f, cliente: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cidade</Label><Input value={filters.cidade} onChange={(e) => setFilters(f => ({ ...f, cidade: e.target.value }))} className="h-8 text-xs" /></div>
      </FilterPanel>

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard title="Total Registros" value={formatNumber(resumo?.total_registros ?? data.total_registros, 0)} subtitle={`${(data.dados || []).length} nesta página`} icon={<Package className="h-5 w-5" />} index={0} />
            <KPICard title="Itens Não Carregados" value={resumo ? formatNumber(resumo.itens_nao_carregados || resumo.total_registros, 0) : '—'} subtitle="Total geral do filtro" icon={<AlertTriangle className="h-5 w-5" />} variant="warning" index={1} />
          </div>
          {resumoIndisponivel && (
            <p className="text-xs text-muted-foreground italic">
              Resumo gerencial indisponível neste endpoint — atualize o backend para retornar <code>resumo</code> global (totais sem paginação).
            </p>
          )}
        </>
      )}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
