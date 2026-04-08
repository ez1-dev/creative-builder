import { useState, useCallback, useMemo } from 'react';
import { api, PaginatedResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { ComboboxFilter } from '@/components/erp/ComboboxFilter';
import { KPICard } from '@/components/erp/KPICard';
import { useErpOptions } from '@/hooks/useErpOptions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { Database, Layers, Package } from 'lucide-react';
import { useAiFilters } from '@/hooks/useAiFilters';

const columns: Column<any>[] = [
  { key: 'codigo', header: 'Código', sticky: true, stickyWidth: 100 },
  { key: 'descricao', header: 'Descrição', sticky: true, stickyWidth: 200 },
  { key: 'familia', header: 'Família', sticky: true, stickyWidth: 100 },
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
  const { familias, origens, loading: optionsLoading } = useErpOptions(erpReady, data?.dados);

  useAiFilters('estoque', setFilters, () => search(1));

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
  }, [filters, erpReady]);

  const kpis = useMemo(() => {
    if (!data) return null;
    const dados = data.dados || [];
    const saldoTotal = dados.reduce((sum, item) => sum + (item.saldo || 0), 0);
    return { totalRegistros: data.total_registros, itensPagina: dados.length, saldoTotal };
  }, [data]);

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Consulta de Estoque"
        description="Consulte saldos em estoque por produto, família, origem e depósito"
        actions={<ExportButton endpoint="/api/export/estoque" params={filters} />}
      />
      <FilterPanel onSearch={() => search(1)} onClear={() => { setFilters({ codpro: '', despro: '', codfam: '', codori: '', coddep: '', somente_com_estoque: true }); setData(null); setPagina(1); }}>
        <div><Label className="text-xs">Código</Label><Input value={filters.codpro} onChange={(e) => setFilters(f => ({ ...f, codpro: e.target.value }))} placeholder="Código do produto" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Descrição</Label><Input value={filters.despro} onChange={(e) => setFilters(f => ({ ...f, despro: e.target.value }))} placeholder="Descrição" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Família</Label><ComboboxFilter value={filters.codfam} onChange={(v) => setFilters(f => ({ ...f, codfam: v }))} options={familias} placeholder="Família" loading={optionsLoading} /></div>
        <div><Label className="text-xs">Origem</Label><ComboboxFilter value={filters.codori} onChange={(v) => setFilters(f => ({ ...f, codori: v }))} options={origens} placeholder="Origem" loading={optionsLoading} /></div>
        <div><Label className="text-xs">Depósito</Label><Input value={filters.coddep} onChange={(e) => setFilters(f => ({ ...f, coddep: e.target.value }))} placeholder="Depósito" className="h-8 text-xs" /></div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox id="somente_com_estoque" checked={filters.somente_com_estoque} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_com_estoque: !!v }))} />
          <Label htmlFor="somente_com_estoque" className="text-xs">Somente com estoque</Label>
        </div>
      </FilterPanel>
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KPICard title="Total Registros" value={formatNumber(kpis.totalRegistros, 0)} icon={<Database className="h-5 w-5" />} variant="default" index={0} tooltip="Total de registros encontrados na consulta" />
          <KPICard title="Itens na Página" value={formatNumber(kpis.itensPagina, 0)} icon={<Layers className="h-5 w-5" />} variant="info" index={1} tooltip="Quantidade de itens exibidos na página atual" />
          <KPICard title="Saldo Total" value={formatNumber(kpis.saldoTotal, 4)} icon={<Package className="h-5 w-5" />} variant="success" index={2} tooltip="Soma do saldo dos itens visíveis na página" />
        </div>
      )}
      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
