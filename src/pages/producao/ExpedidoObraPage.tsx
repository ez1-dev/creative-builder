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
import { formatNumber, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';
import { useAiPageContext } from '@/hooks/useAiPageContext';
import { KPICard } from '@/components/erp/KPICard';
import { Package, Weight, Hash, Truck } from 'lucide-react';
import { extrairResumo, ResumoGerencial } from '@/lib/drillResumo';
import { BiAutoSlots } from '@/components/bi';
import { biResponsive } from '@/components/bi/utils/responsive';
import { KpiDrillSheet, useKpiDrill } from '@/components/producao/drill/KpiDrillSheet';

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

  // KPIs globais — vêm do `resumo` do backend e NÃO mudam ao paginar.
  const [resumo, setResumo] = useState<ResumoGerencial | null>(null);
  const [resumoIndisponivel, setResumoIndisponivel] = useState(false);
  const drill = useKpiDrill<any>(columns);

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<PaginatedResponse<any>>('/api/producao/expedido', { ...filters, pagina: page, tamanho_pagina: 100 });
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

  useAiFilters('producao-expedido', setFilters, () => search(1));

  useAiPageContext({
    title: 'Expedido para Obra',
    filters,
    kpis: resumo ? {
      'Total Registros': formatNumber(resumo.total_registros, 0),
      'Qtd Expedida': formatNumber(resumo.quantidade_expedida, 0),
      'Peso Expedido (Kg)': formatNumber(resumo.kg_expedido || resumo.kg_produzido, 1),
      'Cargas Distintas': formatNumber(resumo.quantidade_cargas, 0),
    } : undefined,
    summary: data
      ? `${data.total_registros} expedições; página ${pagina}/${data.total_paginas}`
      : undefined,
  });

  const clearFilters = () => {
    setFilters({ numero_projeto: '', numero_desenho: '', revisao: '', codigo_produto: '', numero_carga: '', cliente: '', cidade: '', data_ini: '', data_fim: '' });
    setData(null); setPagina(1);
    setResumo(null); setResumoIndisponivel(false);
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

      {data && (
        <>
          <div className={biResponsive.kpiGrid4}>
            <KPICard title="Total Registros" value={formatNumber(resumo?.total_registros ?? data.total_registros, 0)} subtitle={`${(data.dados || []).length} nesta página · Ver detalhes`} icon={<Package className="h-5 w-5" />} index={0}
              onClick={() => drill.open({ title: 'Expedição — todos os itens', subtitle: `${data.total_registros} registros`, rows: data.dados || [] })} />
            <KPICard title="Qtd Expedida" value={resumo ? formatNumber(resumo.quantidade_expedida, 0) : '—'} subtitle="Top itens · clique" icon={<Hash className="h-5 w-5" />} variant="info" index={1}
              onClick={() => drill.open({ title: 'Top itens por Qtd Expedida', subtitle: 'Top 50', chips: [{ label: 'Métrica', value: 'quantidade_expedida' }], rows: [...(data.dados || [])].sort((a, b) => (Number(b.quantidade_expedida) || 0) - (Number(a.quantidade_expedida) || 0)).slice(0, 50) })} />
            <KPICard title="Peso Expedido" value={resumo ? `${formatNumber(resumo.kg_expedido || resumo.kg_produzido, 1)} Kg` : '—'} subtitle="Top itens · clique" icon={<Weight className="h-5 w-5" />} variant="success" index={2}
              onClick={() => drill.open({ title: 'Top itens por Peso Expedido', subtitle: 'Top 50', chips: [{ label: 'Métrica', value: 'peso_real' }], rows: [...(data.dados || [])].sort((a, b) => (Number(b.peso_real) || 0) - (Number(a.peso_real) || 0)).slice(0, 50) })} />
            <KPICard title="Cargas Distintas" value={resumo ? formatNumber(resumo.quantidade_cargas, 0) : '—'} subtitle="Por nº carga · clique" icon={<Truck className="h-5 w-5" />} variant="warning" index={3}
              onClick={() => {
                const rows = data.dados || [];
                const porCarga = new Map<string, any[]>();
                for (const r of rows) {
                  const k = String(r.numero_carga ?? '—');
                  porCarga.set(k, [...(porCarga.get(k) || []), r]);
                }
                const flat = Array.from(porCarga.entries()).flatMap(([_, list]) => list);
                drill.open({ title: 'Itens agrupados por nº carga', subtitle: `${porCarga.size} cargas distintas nesta página`, chips: [{ label: 'Agrupado por', value: 'numero_carga' }], rows: flat });
              }} />
          </div>
          {resumoIndisponivel && (
            <p className="text-xs text-muted-foreground italic">
              Resumo gerencial indisponível neste endpoint — atualize o backend para retornar <code>resumo</code> global (totais sem paginação).
            </p>
          )}
        </>
      )}

      <div className={biResponsive.tableWrap}>
        <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      </div>
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}      <BiAutoSlots pageKey="producao-expedido-obra" />
      <KpiDrillSheet open={drill.state.open} onOpenChange={drill.setOpen} title={drill.state.title} subtitle={drill.state.subtitle} chips={drill.state.chips} rows={drill.state.rows} columns={drill.state.columns} />
    </div>
  );
}
