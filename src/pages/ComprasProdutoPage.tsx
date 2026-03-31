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
import { formatNumber, formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';

const columns: Column<any>[] = [
  { key: 'codigo', header: 'Código' },
  { key: 'descricao', header: 'Descrição' },
  { key: 'familia', header: 'Família' },
  { key: 'origem', header: 'Origem' },
  { key: 'tipo_descricao', header: 'Tipo' },
  { key: 'derivacao', header: 'Derivação' },
  { key: 'saldo', header: 'Saldo', align: 'right', render: (v) => formatNumber(v, 2) },
  { key: 'preco_medio', header: 'Preço Médio', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'data_preco_medio', header: 'Data Preço Médio', render: (v) => formatDate(v) },
  { key: 'numero_nf_ultima_compra', header: 'Última NF' },
  { key: 'fornecedor_ultima_compra', header: 'Fornecedor' },
  { key: 'preco_nf_ultima_compra', header: 'Preço NF', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'data_entrada_nf_ultima_compra', header: 'Data Entrada', render: (v) => formatDate(v) },
  { key: 'possui_oc_aberta', header: 'OC Aberta?' },
  { key: 'qtde_ocs_abertas', header: 'Qtd. OCs', align: 'right' },
];

export default function ComprasProdutoPage() {
  const [filters, setFilters] = useState({ codpro: '', despro: '', codfam: '', codori: '', codder: '', somente_com_oc_aberta: false });
  const [data, setData] = useState<PaginatedResponse<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);

  const erpReady = useErpReady();

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<PaginatedResponse<any>>('/api/compras-produto', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady]);

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Compras / Custos do Produto"
        description="Consulte informações de compras, preços e OCs por produto"
        actions={<ExportButton endpoint="/api/export/compras-produto" params={filters} />}
      />
      <FilterPanel onSearch={() => search(1)} onClear={() => setFilters({ codpro: '', despro: '', codfam: '', codori: '', codder: '', somente_com_oc_aberta: false })}>
        <div><Label className="text-xs">Código</Label><Input value={filters.codpro} onChange={(e) => setFilters(f => ({ ...f, codpro: e.target.value }))} placeholder="Código" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Descrição</Label><Input value={filters.despro} onChange={(e) => setFilters(f => ({ ...f, despro: e.target.value }))} placeholder="Descrição" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Família</Label><Input value={filters.codfam} onChange={(e) => setFilters(f => ({ ...f, codfam: e.target.value }))} placeholder="Família" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Origem</Label><Input value={filters.codori} onChange={(e) => setFilters(f => ({ ...f, codori: e.target.value }))} placeholder="Origem" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Derivação</Label><Input value={filters.codder} onChange={(e) => setFilters(f => ({ ...f, codder: e.target.value }))} placeholder="Derivação" className="h-8 text-xs" /></div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox id="oc_aberta" checked={filters.somente_com_oc_aberta} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_com_oc_aberta: !!v }))} />
          <Label htmlFor="oc_aberta" className="text-xs">Somente com OC aberta</Label>
        </div>
      </FilterPanel>
      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
