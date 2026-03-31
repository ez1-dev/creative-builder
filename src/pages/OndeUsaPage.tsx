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

const columns: Column<any>[] = [
  { key: 'codigo_componente', header: 'Cód. Componente' },
  { key: 'descricao_componente', header: 'Desc. Componente' },
  { key: 'unidade_componente', header: 'Unidade' },
  { key: 'derivacao_componente', header: 'Der. Componente' },
  { key: 'codigo_modelo', header: 'Cód. Modelo' },
  { key: 'descricao_modelo', header: 'Desc. Modelo' },
  { key: 'derivacao_modelo', header: 'Der. Modelo' },
  { key: 'estagio', header: 'Estágio' },
  { key: 'sequencia', header: 'Seq.' },
  { key: 'quantidade_utilizada', header: 'Qtd. Utilizada', align: 'right', render: (v) => formatNumber(v, 4) },
  { key: 'perda_percentual', header: '% Perda', align: 'right', render: (v) => formatNumber(v, 2) },
];

export default function OndeUsaPage() {
  const [filters, setFilters] = useState({ codcmp: '', dercmp: '', codmod: '' });
  const [data, setData] = useState<PaginatedResponse<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);

  const erpReady = useErpReady();

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<PaginatedResponse<any>>('/api/onde-usa', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Onde Usa"
        description="Consulte em quais modelos/estruturas um componente é utilizado"
        actions={<ExportButton endpoint="/api/export/onde-usa" params={filters} />}
      />
      <FilterPanel onSearch={() => search(1)} onClear={() => setFilters({ codcmp: '', dercmp: '', codmod: '' })}>
        <div><Label className="text-xs">Cód. Componente</Label><Input value={filters.codcmp} onChange={(e) => setFilters(f => ({ ...f, codcmp: e.target.value }))} placeholder="Código" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Der. Componente</Label><Input value={filters.dercmp} onChange={(e) => setFilters(f => ({ ...f, dercmp: e.target.value }))} placeholder="Derivação" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cód. Modelo</Label><Input value={filters.codmod} onChange={(e) => setFilters(f => ({ ...f, codmod: e.target.value }))} placeholder="Código modelo" className="h-8 text-xs" /></div>
      </FilterPanel>
      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
