import { useState, useCallback, useRef, useMemo } from 'react';
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
import { useAiPageContext } from '@/hooks/useAiPageContext';
import { KPICard } from '@/components/erp/KPICard';
import { Package, Weight, Hash, Tags } from 'lucide-react';

const columns: Column<any>[] = [
  { key: 'numero_projeto', header: 'Projeto' },
  { key: 'numero_desenho', header: 'Desenho' },
  { key: 'revisao', header: 'Rev.' },
  { key: 'codigo_produto', header: 'Produto' },
  { key: 'descricao_produto', header: 'Descrição' },
  { key: 'quantidade_produzida', header: 'Qtd Produzida', align: 'right', render: (v) => formatNumber(v, 0) },
  { key: 'peso_real', header: 'Peso Produzido', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'quantidade_etiquetas', header: 'Qtd Etiquetas', align: 'right', render: (v) => formatNumber(v, 0) },
  { key: 'data_entrada_estoque', header: 'Data Entrada Estoque', render: (v) => formatDate(v) },
  { key: 'cliente', header: 'Cliente' },
  { key: 'cidade', header: 'Cidade' },
];

interface KpiTotals {
  totalRegistros: number;
  qtdProduzida: number;
  pesoProduzido: number;
  qtdEtiquetas: number;
}

function sumPage(dados: any[]): Omit<KpiTotals, 'totalRegistros'> {
  return {
    qtdProduzida: dados.reduce((s, r) => s + (Number(r.quantidade_produzida) || 0), 0),
    pesoProduzido: dados.reduce((s, r) => s + (Number(r.peso_real) || 0), 0),
    qtdEtiquetas: dados.reduce((s, r) => s + (Number(r.quantidade_etiquetas) || 0), 0),
  };
}

export default function ProduzidoPeriodoPage() {
  const [filters, setFilters] = useState({
    numero_projeto: '', numero_desenho: '', revisao: '', codigo_produto: '',
    cliente: '', cidade: '', data_ini: '', data_fim: '',
  });
  const [data, setData] = useState<PaginatedResponse<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const erpReady = useErpReady();

  // KPI consolidation state
  const [kpiTotals, setKpiTotals] = useState<KpiTotals | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [allDados, setAllDados] = useState<any[]>([]);
  const consolidationIdRef = useRef(0);

  const consolidateKpis = useCallback(async (firstResult: PaginatedResponse<any>, currentFilters: typeof filters) => {
    const id = ++consolidationIdRef.current;

    const page1Dados = firstResult.dados || [];
    const resultAny = firstResult as any;
    if (resultAny.resumo) {
      if (consolidationIdRef.current !== id) return;
      setKpiTotals({
        totalRegistros: resultAny.resumo.total_registros ?? firstResult.total_registros,
        qtdProduzida: resultAny.resumo.quantidade_produzida ?? resultAny.resumo.qtd_produzida ?? 0,
        pesoProduzido: resultAny.resumo.peso_real ?? resultAny.resumo.peso_produzido ?? 0,
        qtdEtiquetas: resultAny.resumo.quantidade_etiquetas ?? resultAny.resumo.qtd_etiquetas ?? 0,
      });
      setAllDados(page1Dados);
      setKpiLoading(false);
      return;
    }

    const totalPages = firstResult.total_paginas;
    if (totalPages <= 1) {
      if (consolidationIdRef.current !== id) return;
      const sums = sumPage(page1Dados);
      setKpiTotals({ totalRegistros: firstResult.total_registros, ...sums });
      setAllDados(page1Dados);
      setKpiLoading(false);
      return;
    }

    setKpiLoading(true);
    setAllDados(page1Dados);
    try {
      let totals = sumPage(page1Dados);
      let accumulated = [...page1Dados];
      const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      const BATCH_SIZE = 5;

      for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
        if (consolidationIdRef.current !== id) return;
        const batch = remainingPages.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(p =>
            api.get<PaginatedResponse<any>>('/api/producao/produzido', {
              ...currentFilters, pagina: p, tamanho_pagina: 100,
            })
          )
        );
        for (const r of results) {
          const pageDados = r.dados || [];
          const s = sumPage(pageDados);
          totals.qtdProduzida += s.qtdProduzida;
          totals.pesoProduzido += s.pesoProduzido;
          totals.qtdEtiquetas += s.qtdEtiquetas;
          accumulated = accumulated.concat(pageDados);
        }
      }

      if (consolidationIdRef.current !== id) return;
      setKpiTotals({ totalRegistros: firstResult.total_registros, ...totals });
      setAllDados(accumulated);
    } catch {
      if (consolidationIdRef.current !== id) return;
      const sums = sumPage(page1Dados);
      setKpiTotals({ totalRegistros: firstResult.total_registros, ...sums });
      toast.warning('Não foi possível consolidar todos os KPIs. Valores parciais exibidos.');
    } finally {
      if (consolidationIdRef.current === id) setKpiLoading(false);
    }
  }, []);

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<PaginatedResponse<any>>('/api/producao/produzido', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);

      // Only consolidate KPIs when searching from page 1 (new filter)
      if (page === 1) {
        consolidateKpis(result, filters);
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, erpReady, consolidateKpis]);

  useAiFilters('producao-produzido', setFilters, () => search(1));

  useAiPageContext({
    title: 'Produzido no Período',
    filters,
    kpis: kpiTotals ? {
      'Total Registros': formatNumber(kpiTotals.totalRegistros, 0),
      'Qtd Produzida': formatNumber(kpiTotals.qtdProduzida, 0),
      'Peso Produzido (Kg)': formatNumber(kpiTotals.pesoProduzido, 1),
      'Qtd Etiquetas': formatNumber(kpiTotals.qtdEtiquetas, 0),
    } : undefined,
    summary: data
      ? `${data.total_registros} produções; página ${pagina}/${data.total_paginas}`
      : undefined,
  });

  const clearFilters = () => {
    setFilters({ numero_projeto: '', numero_desenho: '', revisao: '', codigo_produto: '', cliente: '', cidade: '', data_ini: '', data_fim: '' });
    setData(null); setPagina(1);
    setKpiTotals(null); setKpiLoading(false);
    setAllDados([]);
    consolidationIdRef.current++;
  };

  const drillDetails = useMemo(() => {
    const dados = allDados.length > 0 ? allDados : (data?.dados || []);
    if (!dados.length) return { clientes: [], projQtd: [], projPeso: [], projEtiq: [] };

    const topByField = (field: string, format: (v: number) => string, top = 10) => {
      const map: Record<string, number> = {};
      for (const r of dados) {
        const key = `Proj ${r.numero_projeto} / Des ${r.numero_desenho}`;
        map[key] = (map[key] || 0) + (Number(r[field]) || 0);
      }
      return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, top).map(([label, v]) => ({ label, value: format(v) }));
    };

    const clienteMap: Record<string, number> = {};
    for (const r of dados) {
      const c = r.cliente || 'N/A';
      clienteMap[c] = (clienteMap[c] || 0) + 1;
    }
    const clientes = Object.entries(clienteMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, v]) => ({ label, value: `${v} reg.` }));

    return {
      clientes,
      projQtd: topByField('quantidade_produzida', v => formatNumber(v, 0)),
      projPeso: topByField('peso_real', v => `${formatNumber(v, 1)} Kg`),
      projEtiq: topByField('quantidade_etiquetas', v => formatNumber(v, 0)),
    };
  }, [data, allDados]);
  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader title="Produzido no Período" description="Itens produzidos por período" actions={<ExportButton endpoint="/api/export/producao-produzido" params={filters} />} />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.numero_projeto} onChange={(e) => setFilters(f => ({ ...f, numero_projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Desenho</Label><Input value={filters.numero_desenho} onChange={(e) => setFilters(f => ({ ...f, numero_desenho: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Revisão</Label><Input value={filters.revisao} onChange={(e) => setFilters(f => ({ ...f, revisao: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Produto</Label><Input value={filters.codigo_produto} onChange={(e) => setFilters(f => ({ ...f, codigo_produto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cliente</Label><Input value={filters.cliente} onChange={(e) => setFilters(f => ({ ...f, cliente: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cidade</Label><Input value={filters.cidade} onChange={(e) => setFilters(f => ({ ...f, cidade: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Data de</Label><Input type="date" value={filters.data_ini} onChange={(e) => setFilters(f => ({ ...f, data_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Data até</Label><Input type="date" value={filters.data_fim} onChange={(e) => setFilters(f => ({ ...f, data_fim: e.target.value }))} className="h-8 text-xs" /></div>
      </FilterPanel>

      {(data || kpiLoading) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Total Registros" value={kpiTotals ? formatNumber(kpiTotals.totalRegistros, 0) : '...'} subtitle={data ? `${(data.dados || []).length} nesta página` : undefined} icon={<Package className="h-5 w-5" />} index={0} tooltip="Quantidade total de registros no filtro" details={drillDetails.clientes.length ? drillDetails.clientes : undefined} />
          <KPICard title="Qtd Produzida" value={kpiLoading ? 'Calculando...' : kpiTotals ? formatNumber(kpiTotals.qtdProduzida, 0) : '...'} subtitle={kpiLoading ? 'Consolidando páginas...' : 'Total geral do filtro'} icon={<Hash className="h-5 w-5" />} variant="info" index={1} tooltip="Top projetos por quantidade produzida" details={drillDetails.projQtd.length ? drillDetails.projQtd : undefined} />
          <KPICard title="Peso Produzido" value={kpiLoading ? 'Calculando...' : kpiTotals ? `${formatNumber(kpiTotals.pesoProduzido, 1)} Kg` : '...'} subtitle={kpiLoading ? 'Consolidando páginas...' : 'Total geral do filtro'} icon={<Weight className="h-5 w-5" />} variant="success" index={2} tooltip="Top projetos por peso produzido" details={drillDetails.projPeso.length ? drillDetails.projPeso : undefined} />
          <KPICard title="Qtd Etiquetas" value={kpiLoading ? 'Calculando...' : kpiTotals ? formatNumber(kpiTotals.qtdEtiquetas, 0) : '...'} subtitle={kpiLoading ? 'Consolidando páginas...' : 'Total geral do filtro'} icon={<Tags className="h-5 w-5" />} variant="warning" index={3} tooltip="Top projetos por quantidade de etiquetas" details={drillDetails.projEtiq.length ? drillDetails.projEtiq : undefined} />
        </div>
      )}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
