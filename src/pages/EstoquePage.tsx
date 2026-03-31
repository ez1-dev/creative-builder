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
import { Checkbox } from '@/components/ui/checkbox';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { Package } from 'lucide-react';

const columns: Column<any>[] = [
  { key: 'codigo', header: 'Código' },
  { key: 'descricao', header: 'Descrição' },
  { key: 'familia', header: 'Família' },
  { key: 'origem', header: 'Origem' },
  { key: 'tipo_descricao', header: 'Tipo' },
  { key: 'unidade_medida', header: 'Unidade' },
  { key: 'derivacao', header: 'Derivação' },
  { key: 'deposito', header: 'Depósito' },
  { key: 'saldo', header: 'Saldo', align: 'right', render: (v) => formatNumber(v, 4) },
];

export default function EstoquePage() {
  const [filters, setFilters] = useState({ codpro: '', despro: '', codfam: '', codori: '', coddep: '', somente_com_estoque: true });
  const [data, setData] = useState<PaginatedResponse<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);

  const erpReady = useErpReady();

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<PaginatedResponse<any>>('/api/estoque', { ...filters, pagina: page, tamanho_pagina: 100 });
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
        title="Consulta de Estoque"
        description="Consulte saldos em estoque por produto, família, origem e depósito"
        actions={<ExportButton endpoint="/api/export/estoque" params={filters} />}
      />
      <FilterPanel onSearch={() => search(1)} onClear={() => setFilters({ codpro: '', despro: '', codfam: '', codori: '', coddep: '', somente_com_estoque: true })}>
        <div><Label className="text-xs">Código</Label><Input value={filters.codpro} onChange={(e) => setFilters(f => ({ ...f, codpro: e.target.value }))} placeholder="Código do produto" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Descrição</Label><Input value={filters.despro} onChange={(e) => setFilters(f => ({ ...f, despro: e.target.value }))} placeholder="Descrição" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Família</Label><Input value={filters.codfam} onChange={(e) => setFilters(f => ({ ...f, codfam: e.target.value }))} placeholder="Família" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Origem</Label><Input value={filters.codori} onChange={(e) => setFilters(f => ({ ...f, codori: e.target.value }))} placeholder="Origem" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Depósito</Label><Input value={filters.coddep} onChange={(e) => setFilters(f => ({ ...f, coddep: e.target.value }))} placeholder="Depósito" className="h-8 text-xs" /></div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox id="somente_com_estoque" checked={filters.somente_com_estoque} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_com_estoque: !!v }))} />
          <Label htmlFor="somente_com_estoque" className="text-xs">Somente com estoque</Label>
        </div>
      </FilterPanel>
      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
