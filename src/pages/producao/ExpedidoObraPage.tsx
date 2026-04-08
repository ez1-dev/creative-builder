import { useState, useCallback, useMemo } from 'react';
import { api, PaginatedResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatNumber, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';
import { KPICard } from '@/components/erp/KPICard';
import { Package, Weight, Hash, Truck } from 'lucide-react';

const columns: Column<any>[] = [
  { key: 'numero_projeto', header: 'Projeto' },
  { key: 'numero_desenho', header: 'Desenho' },
  { key: 'revisao', header: 'Rev.' },
  { key: 'codigo_produto', header: 'Produto' },
  { key: 'descricao_produto', header: 'Descrição' },
  { key: 'quantidade_expedida', header: 'Qtd Expedida', align: 'right', render: (v) => formatNumber(v, 0) },
  { key: 'peso_real', header: 'Peso Expedido', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'numero_carga', header: 'Nº Carga' },
  { key: 'data_carga', header: 'Data Carga', render: (v) => formatDate(v) },
  { key: 'motorista', header: 'Motorista' },
  { key: 'placa', header: 'Placa' },
  { key: 'cliente', header: 'Cliente' },
  { key: 'cidade', header: 'Cidade' },
];

export default function ExpedidoObraPage() {
  const [filters, setFilters] = useState({
    numero_projeto: '', numero_desenho: '', revisao: '', codigo_produto: '',
    numero_carga: '', cliente: '', cidade: '', data_ini: '', data_fim: '',
  });
  const [data, setData] = useState<PaginatedResponse<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const erpReady = useErpReady();

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<PaginatedResponse<any>>('/api/producao/expedido', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, erpReady]);

  useAiFilters('producao-expedido', setFilters, () => search(1));
  const clearFilters = () => {
    setFilters({ numero_projeto: '', numero_desenho: '', revisao: '', codigo_produto: '', numero_carga: '', cliente: '', cidade: '', data_ini: '', data_fim: '' });
    setData(null); setPagina(1);
  };

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader title="Expedido para Obra" description="Itens expedidos por carga e período" actions={<ExportButton endpoint="/api/export/producao-expedido" params={filters} />} />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.numero_projeto} onChange={(e) => setFilters(f => ({ ...f, numero_projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Desenho</Label><Input value={filters.numero_desenho} onChange={(e) => setFilters(f => ({ ...f, numero_desenho: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Revisão</Label><Input value={filters.revisao} onChange={(e) => setFilters(f => ({ ...f, revisao: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Produto</Label><Input value={filters.codigo_produto} onChange={(e) => setFilters(f => ({ ...f, codigo_produto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Nº Carga</Label><Input value={filters.numero_carga} onChange={(e) => setFilters(f => ({ ...f, numero_carga: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cliente</Label><Input value={filters.cliente} onChange={(e) => setFilters(f => ({ ...f, cliente: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cidade</Label><Input value={filters.cidade} onChange={(e) => setFilters(f => ({ ...f, cidade: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Data de</Label><Input type="date" value={filters.data_ini} onChange={(e) => setFilters(f => ({ ...f, data_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Data até</Label><Input type="date" value={filters.data_fim} onChange={(e) => setFilters(f => ({ ...f, data_fim: e.target.value }))} className="h-8 text-xs" /></div>
      </FilterPanel>

      {data && (() => {
        const dados = data.dados || [];
        const totalRegistros = dados.length;
        const qtdExpedida = dados.reduce((s: number, r: any) => s + (Number(r.quantidade_expedida) || 0), 0);
        const pesoExpedido = dados.reduce((s: number, r: any) => s + (Number(r.peso_real) || 0), 0);
        const cargasDistintas = new Set(dados.map((r: any) => r.numero_carga).filter(Boolean)).size;
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard title="Total Registros" value={formatNumber(totalRegistros, 0)} subtitle="na página atual" icon={<Package className="h-5 w-5" />} index={0} />
            <KPICard title="Qtd Expedida" value={formatNumber(qtdExpedida, 0)} subtitle="na página atual" icon={<Hash className="h-5 w-5" />} variant="info" index={1} />
            <KPICard title="Peso Expedido" value={`${formatNumber(pesoExpedido, 1)} Kg`} subtitle="na página atual" icon={<Weight className="h-5 w-5" />} variant="success" index={2} />
            <KPICard title="Cargas Distintas" value={formatNumber(cargasDistintas, 0)} subtitle="na página atual" icon={<Truck className="h-5 w-5" />} variant="warning" index={3} />
          </div>
        );
      })()}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
