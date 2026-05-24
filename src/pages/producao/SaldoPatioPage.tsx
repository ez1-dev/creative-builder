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
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';
import { useAiPageContext } from '@/hooks/useAiPageContext';
import { KPICard } from '@/components/erp/KPICard';
import { Package, ArrowUpFromLine, Truck, Warehouse } from 'lucide-react';
import { extrairResumo, ResumoGerencial } from '@/lib/drillResumo';
import { BiAutoSlots } from '@/components/bi';
import { biResponsive } from '@/components/bi/utils/responsive';
import { KpiDrillSheet, useKpiDrill } from '@/components/producao/drill/KpiDrillSheet';

const statusColor = (s: string) => {
  switch (s) {
    case 'EXPEDIDO': return 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]';
    case 'PARCIALMENTE EXPEDIDO': return 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]';
    case 'EM PÁTIO': return 'bg-destructive text-destructive-foreground';
    case 'EM PRODUÇÃO': return 'bg-primary text-primary-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

const columns: Column<any>[] = [
  { key: 'numero_projeto', header: 'Projeto' },
  { key: 'numero_desenho', header: 'Desenho' },
  { key: 'revisao', header: 'Rev.' },
  { key: 'descricao_projeto', header: 'Descrição' },
  { key: 'cliente', header: 'Cliente' },
  { key: 'cidade', header: 'Cidade' },
  { key: 'kg_engenharia', header: 'Kg Previsto', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_produzido', header: 'Kg Produzido', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_expedido', header: 'Kg Expedido', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_patio', header: 'Kg Pátio', align: 'right', render: (v) => formatNumber(v, 1) },
  {
    key: 'status_patio', header: 'Status',
    render: (v) => <Badge className={`text-[10px] ${statusColor(v)}`}>{v}</Badge>,
  },
];

export default function SaldoPatioPage() {
  const [filters, setFilters] = useState({
    numero_projeto: '', numero_desenho: '', revisao: '', cliente: '', cidade: '',
  });
  const [data, setData] = useState<PaginatedResponse<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const erpReady = useErpReady();

  // KPIs globais (resumo do backend, NUNCA recalculados a partir da página atual)
  const [resumo, setResumo] = useState<ResumoGerencial | null>(null);
  const [resumoIndisponivel, setResumoIndisponivel] = useState(false);
  const drill = useKpiDrill<any>(columns);
  const openKpi = (payload: Parameters<typeof drill.open>[0]) => {
    const snap = filters;
    openKpi(payload, { restore: () => setFilters(snap) });
  };

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<PaginatedResponse<any>>('/api/producao/patio', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
      // KPIs só recalculam quando trocamos filtros (page === 1).
      // Trocar de página NÃO altera os KPIs.
      if (page === 1) {
        const r = extrairResumo(result);
        setResumo(r);
        setResumoIndisponivel(!r);
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, erpReady]);

  useAiFilters('producao-patio', setFilters, () => search(1));

  useAiPageContext({
    title: 'Saldo em Pátio',
    filters,
    kpis: resumo ? {
      'Total Registros': formatNumber(resumo.total_registros, 0),
      'Kg Produzido': formatNumber(resumo.kg_produzido, 1),
      'Kg Expedido': formatNumber(resumo.kg_expedido, 1),
      'Kg em Pátio': formatNumber(resumo.kg_patio, 1),
    } : undefined,
    summary: data
      ? `${data.total_registros} projetos no pátio; página ${pagina}/${data.total_paginas}`
      : undefined,
  });

  const clearFilters = () => {
    setFilters({ numero_projeto: '', numero_desenho: '', revisao: '', cliente: '', cidade: '' });
    setData(null); setPagina(1);
    setResumo(null); setResumoIndisponivel(false);
  };

  const totalRegistrosKpi = useMemo(
    () => resumo?.total_registros ?? data?.total_registros ?? 0,
    [resumo, data],
  );

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader title="Saldo em Pátio" description="Saldo entre produzido e expedido" actions={<ExportButton endpoint="/api/export/producao-patio" params={filters} />} />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.numero_projeto} onChange={(e) => setFilters(f => ({ ...f, numero_projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Desenho</Label><Input value={filters.numero_desenho} onChange={(e) => setFilters(f => ({ ...f, numero_desenho: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Revisão</Label><Input value={filters.revisao} onChange={(e) => setFilters(f => ({ ...f, revisao: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cliente</Label><Input value={filters.cliente} onChange={(e) => setFilters(f => ({ ...f, cliente: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cidade</Label><Input value={filters.cidade} onChange={(e) => setFilters(f => ({ ...f, cidade: e.target.value }))} className="h-8 text-xs" /></div>
      </FilterPanel>

      {data && (
        <>
          <div className={biResponsive.kpiGrid4}>
            <KPICard title="Total Registros" value={formatNumber(totalRegistrosKpi, 0)} subtitle={`${(data.dados || []).length} nesta página · Ver detalhes`} icon={<Package className="h-5 w-5" />} index={0}
              onClick={() => openKpi({ title: 'Saldo em pátio — todos os projetos', subtitle: `${data.total_registros} registros`, rows: data.dados || [] })} />
            <KPICard title="Kg Produzido" value={resumo ? `${formatNumber(resumo.kg_produzido, 1)} Kg` : '—'} subtitle="Top projetos · clique" icon={<ArrowUpFromLine className="h-5 w-5" />} variant="info" index={1}
              onClick={() => openKpi({ title: 'Top projetos por Kg Produzido', subtitle: 'Top 50', chips: [{ label: 'Métrica', value: 'kg_produzido' }], rows: [...(data.dados || [])].filter(r => (Number(r.kg_produzido) || 0) > 0).sort((a, b) => (Number(b.kg_produzido) || 0) - (Number(a.kg_produzido) || 0)).slice(0, 50) })} />
            <KPICard title="Kg Expedido" value={resumo ? `${formatNumber(resumo.kg_expedido, 1)} Kg` : '—'} subtitle="Top projetos · clique" icon={<Truck className="h-5 w-5" />} variant="success" index={2}
              onClick={() => openKpi({ title: 'Top projetos por Kg Expedido', subtitle: 'Top 50', chips: [{ label: 'Métrica', value: 'kg_expedido' }], rows: [...(data.dados || [])].filter(r => (Number(r.kg_expedido) || 0) > 0).sort((a, b) => (Number(b.kg_expedido) || 0) - (Number(a.kg_expedido) || 0)).slice(0, 50) })} />
            <KPICard title="Kg em Pátio" value={resumo ? `${formatNumber(resumo.kg_patio, 1)} Kg` : '—'} subtitle="Maiores saldos · clique" icon={<Warehouse className="h-5 w-5" />} variant="warning" index={3}
              onClick={() => openKpi({ title: 'Top projetos com saldo em pátio', subtitle: 'Top 50 saldos pendentes', chips: [{ label: 'Métrica', value: 'kg_patio' }], rows: [...(data.dados || [])].filter(r => (Number(r.kg_patio) || 0) > 0).sort((a, b) => (Number(b.kg_patio) || 0) - (Number(a.kg_patio) || 0)).slice(0, 50) })} />
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
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}      <BiAutoSlots pageKey="producao-saldo-patio" />
      <KpiDrillSheet {...drill.sheetProps} />
    </div>
  );
}
