import { useState, useCallback, useRef } from 'react';
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

interface KpiTotals {
  totalRegistros: number;
  qtdExpedida: number;
  pesoExpedido: number;
  cargasDistintas: number;
}

function sumPage(dados: any[]) {
  return {
    qtdExpedida: dados.reduce((s, r) => s + (Number(r.quantidade_expedida) || 0), 0),
    pesoExpedido: dados.reduce((s, r) => s + (Number(r.peso_real) || 0), 0),
    cargas: new Set(dados.map((r) => r.numero_carga).filter(Boolean)),
  };
}

export default function ExpedidoObraPage() {
  const [filters, setFilters] = useState({
    numero_projeto: '', numero_desenho: '', revisao: '', codigo_produto: '',
    numero_carga: '', cliente: '', cidade: '', data_ini: '', data_fim: '',
  });
  const [data, setData] = useState<PaginatedResponse<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const erpReady = useErpReady();

  const [kpiTotals, setKpiTotals] = useState<KpiTotals | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);
  const consolidationIdRef = useRef(0);

  const consolidateKpis = useCallback(async (firstResult: PaginatedResponse<any>, currentFilters: typeof filters) => {
    const id = ++consolidationIdRef.current;

    const resultAny = firstResult as any;
    if (resultAny.resumo) {
      if (consolidationIdRef.current !== id) return;
      setKpiTotals({
        totalRegistros: resultAny.resumo.total_registros ?? firstResult.total_registros,
        qtdExpedida: resultAny.resumo.quantidade_expedida ?? resultAny.resumo.qtd_expedida ?? 0,
        pesoExpedido: resultAny.resumo.peso_real ?? resultAny.resumo.peso_expedido ?? 0,
        cargasDistintas: resultAny.resumo.cargas_distintas ?? 0,
      });
      setKpiLoading(false);
      return;
    }

    const totalPages = firstResult.total_paginas;
    const p1 = sumPage(firstResult.dados || []);
    if (totalPages <= 1) {
      if (consolidationIdRef.current !== id) return;
      setKpiTotals({ totalRegistros: firstResult.total_registros, qtdExpedida: p1.qtdExpedida, pesoExpedido: p1.pesoExpedido, cargasDistintas: p1.cargas.size });
      setKpiLoading(false);
      return;
    }

    setKpiLoading(true);
    try {
      let totals = { qtdExpedida: p1.qtdExpedida, pesoExpedido: p1.pesoExpedido };
      const allCargas = new Set(p1.cargas);
      const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      const BATCH_SIZE = 5;

      for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
        if (consolidationIdRef.current !== id) return;
        const batch = remainingPages.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(p => api.get<PaginatedResponse<any>>('/api/producao/expedido', { ...currentFilters, pagina: p, tamanho_pagina: 100 }))
        );
        for (const r of results) {
          const s = sumPage(r.dados || []);
          totals.qtdExpedida += s.qtdExpedida;
          totals.pesoExpedido += s.pesoExpedido;
          s.cargas.forEach(c => allCargas.add(c));
        }
      }

      if (consolidationIdRef.current !== id) return;
      setKpiTotals({ totalRegistros: firstResult.total_registros, ...totals, cargasDistintas: allCargas.size });
    } catch {
      if (consolidationIdRef.current !== id) return;
      setKpiTotals({ totalRegistros: firstResult.total_registros, qtdExpedida: p1.qtdExpedida, pesoExpedido: p1.pesoExpedido, cargasDistintas: p1.cargas.size });
      toast.warning('Não foi possível consolidar todos os KPIs. Valores parciais exibidos.');
    } finally {
      if (consolidationIdRef.current === id) setKpiLoading(false);
    }
  }, []);

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<PaginatedResponse<any>>('/api/producao/expedido', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
      if (page === 1) consolidateKpis(result, filters);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, erpReady, consolidateKpis]);

  useAiFilters('producao-expedido', setFilters, () => search(1));
  const clearFilters = () => {
    setFilters({ numero_projeto: '', numero_desenho: '', revisao: '', codigo_produto: '', numero_carga: '', cliente: '', cidade: '', data_ini: '', data_fim: '' });
    setData(null); setPagina(1);
    setKpiTotals(null); setKpiLoading(false);
    consolidationIdRef.current++;
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

      {(data || kpiLoading) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Total Registros" value={kpiTotals ? formatNumber(kpiTotals.totalRegistros, 0) : '...'} subtitle={data ? `${(data.dados || []).length} nesta página` : undefined} icon={<Package className="h-5 w-5" />} index={0} />
          <KPICard title="Qtd Expedida" value={kpiLoading ? 'Calculando...' : kpiTotals ? formatNumber(kpiTotals.qtdExpedida, 0) : '...'} subtitle={kpiLoading ? 'Consolidando páginas...' : 'Total geral do filtro'} icon={<Hash className="h-5 w-5" />} variant="info" index={1} />
          <KPICard title="Peso Expedido" value={kpiLoading ? 'Calculando...' : kpiTotals ? `${formatNumber(kpiTotals.pesoExpedido, 1)} Kg` : '...'} subtitle={kpiLoading ? 'Consolidando páginas...' : 'Total geral do filtro'} icon={<Weight className="h-5 w-5" />} variant="success" index={2} />
          <KPICard title="Cargas Distintas" value={kpiLoading ? 'Calculando...' : kpiTotals ? formatNumber(kpiTotals.cargasDistintas, 0) : '...'} subtitle={kpiLoading ? 'Consolidando páginas...' : 'Total geral do filtro'} icon={<Truck className="h-5 w-5" />} variant="warning" index={3} />
        </div>
      )}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
