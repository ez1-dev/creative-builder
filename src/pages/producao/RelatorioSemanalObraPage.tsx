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
import { useAiPageContext } from '@/hooks/useAiPageContext';
import { KPICard } from '@/components/erp/KPICard';
import { Building2, FolderKanban, Truck, Package, Weight } from 'lucide-react';
import { RelatorioSemanalObraCharts, RelatorioRow } from './RelatorioSemanalObraCharts';
import { MetaEntregaSemanalChart } from './MetaEntregaSemanalChart';
import { ExportPdfButton } from '@/components/erp/ExportPdfButton';
import { gerarRelatorioSemanalObraPdf } from '@/lib/pdf/relatorioSemanalObraPdf';
import { useAuth } from '@/contexts/AuthContext';

interface KpiTotals {
  totalObras: number;
  totalProjetos: number;
  totalCargas: number;
  totalPecas: number;
  pesoTotal: number;
}

const columns: Column<RelatorioRow>[] = [
  { key: 'obra', header: 'Obra' },
  { key: 'cliente', header: 'Cliente' },
  { key: 'cidade', header: 'Cidade' },
  { key: 'numero_projeto', header: 'Projeto' },
  { key: 'data_inicial', header: 'Data inicial', render: (v) => formatDate(v) },
  { key: 'data_final', header: 'Data final', render: (v) => formatDate(v) },
  { key: 'quantidade_cargas', header: 'Qtd Cargas', align: 'right', render: (v) => formatNumber(v, 0) },
  { key: 'quantidade_pecas', header: 'Qtd Peças', align: 'right', render: (v) => formatNumber(v, 0) },
  { key: 'quantidade_expedida', header: 'Qtd Expedida', align: 'right', render: (v) => formatNumber(v, 0) },
  { key: 'peso_total', header: 'Peso Total (kg)', align: 'right', render: (v) => `${formatNumber(v, 2)} kg` },
];

const initialFilters = {
  obra: '',
  numero_projeto: '',
  data_ini: '',
  data_fim: '',
  peso_min: '',
  peso_max: '',
};

function aggregateRows(rows: RelatorioRow[]) {
  const obras = new Set<string>();
  const projetos = new Set<string>();
  let cargas = 0, pecas = 0, peso = 0;
  for (const r of rows) {
    if (r.obra) obras.add(String(r.obra));
    else if (r.cliente || r.cidade) obras.add(`${r.cliente || ''} - ${r.cidade || ''}`);
    if (r.numero_projeto != null && r.numero_projeto !== '') projetos.add(String(r.numero_projeto));
    cargas += Number(r.quantidade_cargas) || 0;
    pecas += Number(r.quantidade_pecas) || 0;
    peso += Number(r.peso_total) || 0;
  }
  return { obras, projetos, cargas, pecas, peso };
}

export default function RelatorioSemanalObraPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState<PaginatedResponse<RelatorioRow> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [kpiTotals, setKpiTotals] = useState<KpiTotals | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [consolidatedRows, setConsolidatedRows] = useState<RelatorioRow[]>([]);
  const consolidationIdRef = useRef(0);
  const chartsRef = useRef<HTMLDivElement>(null);
  const erpReady = useErpReady();
  const { user } = useAuth();

  const consolidateKpis = useCallback(async (firstResult: PaginatedResponse<RelatorioRow>, currentFilters: typeof initialFilters) => {
    const id = ++consolidationIdRef.current;
    const resumo = (firstResult as any).resumo;
    const page1 = firstResult.dados || [];
    const totalPages = firstResult.total_paginas || 1;

    // Sempre inicializa charts com a página 1
    setConsolidatedRows(page1);

    // Aceita resumo apenas se ele tiver pelo menos um valor > 0
    // (alguns endpoints retornam resumo zerado mesmo com dados na página)
    const resumoTotals = resumo ? {
      totalObras: Number(resumo.total_obras) || 0,
      totalProjetos: Number(resumo.total_projetos) || 0,
      totalCargas: Number(resumo.total_cargas) || 0,
      totalPecas: Number(resumo.total_pecas ?? resumo.total_pecas_etiquetas) || 0,
      pesoTotal: Number(resumo.peso_total) || 0,
    } : null;
    const resumoUtil = resumoTotals && (
      resumoTotals.totalObras > 0 ||
      resumoTotals.totalProjetos > 0 ||
      resumoTotals.totalCargas > 0 ||
      resumoTotals.totalPecas > 0 ||
      resumoTotals.pesoTotal > 0
    );

    if (resumoUtil && resumoTotals) {
      if (consolidationIdRef.current !== id) return;
      setKpiTotals(resumoTotals);
      setKpiLoading(false);
      if (totalPages > 1) {
        await fetchAllPagesForCharts(id, totalPages, currentFilters, page1);
      }
      return;
    }

    const agg = aggregateRows(page1);

    if (totalPages <= 1) {
      if (consolidationIdRef.current !== id) return;
      setKpiTotals({
        totalObras: agg.obras.size,
        totalProjetos: agg.projetos.size,
        totalCargas: agg.cargas,
        totalPecas: agg.pecas,
        pesoTotal: agg.peso,
      });
      setKpiLoading(false);
      return;
    }

    setKpiLoading(true);
    // Mostra totais parciais imediatamente (página 1) enquanto consolida demais páginas
    setKpiTotals({
      totalObras: agg.obras.size,
      totalProjetos: agg.projetos.size,
      totalCargas: agg.cargas,
      totalPecas: agg.pecas,
      pesoTotal: agg.peso,
    });
    const allRows: RelatorioRow[] = [...page1];
    try {
      const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      const BATCH = 5;
      for (let i = 0; i < remaining.length; i += BATCH) {
        if (consolidationIdRef.current !== id) return;
        const batch = remaining.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map((p) => api.get<PaginatedResponse<RelatorioRow>>(
            '/api/producao/relatorio-semanal-obra',
            { ...currentFilters, pagina: p, tamanho_pagina: 100 },
          )),
        );
        for (const r of results) {
          const dados = r.dados || [];
          allRows.push(...dados);
          const a = aggregateRows(dados);
          a.obras.forEach((o) => agg.obras.add(o));
          a.projetos.forEach((p) => agg.projetos.add(p));
          agg.cargas += a.cargas;
          agg.pecas += a.pecas;
          agg.peso += a.peso;
        }
      }
      if (consolidationIdRef.current !== id) return;
      setKpiTotals({
        totalObras: agg.obras.size,
        totalProjetos: agg.projetos.size,
        totalCargas: agg.cargas,
        totalPecas: agg.pecas,
        pesoTotal: agg.peso,
      });
      setConsolidatedRows(allRows);
    } catch {
      if (consolidationIdRef.current !== id) return;
      setKpiTotals({
        totalObras: agg.obras.size,
        totalProjetos: agg.projetos.size,
        totalCargas: agg.cargas,
        totalPecas: agg.pecas,
        pesoTotal: agg.peso,
      });
      setConsolidatedRows(allRows);
      toast.warning('Não foi possível consolidar todos os dados. Valores parciais exibidos.');
    } finally {
      if (consolidationIdRef.current === id) setKpiLoading(false);
    }
  }, []);

  // Helper: busca demais páginas apenas para alimentar os gráficos (quando backend já enviou resumo)
  const fetchAllPagesForCharts = useCallback(async (
    id: number,
    totalPages: number,
    currentFilters: typeof initialFilters,
    page1: RelatorioRow[],
  ) => {
    const allRows: RelatorioRow[] = [...page1];
    try {
      const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      const BATCH = 5;
      for (let i = 0; i < remaining.length; i += BATCH) {
        if (consolidationIdRef.current !== id) return;
        const batch = remaining.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map((p) => api.get<PaginatedResponse<RelatorioRow>>(
            '/api/producao/relatorio-semanal-obra',
            { ...currentFilters, pagina: p, tamanho_pagina: 100 },
          )),
        );
        for (const r of results) allRows.push(...(r.dados || []));
      }
      if (consolidationIdRef.current !== id) return;
      setConsolidatedRows(allRows);
    } catch {
      if (consolidationIdRef.current !== id) return;
      setConsolidatedRows(allRows);
    }
  }, []);

  const search = useCallback(async (page = 1) => {
    if (!erpReady) {
      toast.error('Conexão ERP não disponível.');
      return;
    }
    setLoading(true);
    try {
      const result = await api.get<PaginatedResponse<RelatorioRow>>(
        '/api/producao/relatorio-semanal-obra',
        { ...filters, pagina: page, tamanho_pagina: 100 },
      );
      setData(result);
      setPagina(page);
      if (page === 1) consolidateKpis(result, filters);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao consultar relatório semanal de obra.');
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady, consolidateKpis]);

  useAiFilters('producao-relatorio-semanal-obra', setFilters, () => search(1));

  useAiPageContext({
    title: 'Relatório Semanal Obra',
    filters,
    kpis: kpiTotals ? {
      'Total Obras': formatNumber(kpiTotals.totalObras, 0),
      'Total Projetos': formatNumber(kpiTotals.totalProjetos, 0),
      'Total Cargas': formatNumber(kpiTotals.totalCargas, 0),
      'Total Peças': formatNumber(kpiTotals.totalPecas, 0),
      'Peso Total (kg)': formatNumber(kpiTotals.pesoTotal, 2),
    } : undefined,
    summary: data
      ? `${data.total_registros} registros; página ${pagina}/${data.total_paginas}`
      : undefined,
  });

  const clearFilters = () => {
    setFilters(initialFilters);
    setData(null);
    setPagina(1);
    setKpiTotals(null);
    setKpiLoading(false);
    setConsolidatedRows([]);
    consolidationIdRef.current++;
  };

  const handleObraClick = useCallback((obra: string) => {
    setFilters((f) => {
      const next = { ...f, obra };
      // Dispara busca com filtros já atualizados
      (async () => {
        if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
        setLoading(true);
        try {
          const result = await api.get<PaginatedResponse<RelatorioRow>>(
            '/api/producao/relatorio-semanal-obra',
            { ...next, pagina: 1, tamanho_pagina: 100 },
          );
          setData(result);
          setPagina(1);
          consolidateKpis(result, next);
        } catch (e: any) {
          toast.error(e?.message || 'Erro ao consultar relatório semanal de obra.');
        } finally {
          setLoading(false);
        }
      })();
      return next;
    });
  }, [erpReady, consolidateKpis]);

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Relatório Semanal Obra"
        description="Visão gerencial semanal por obra e projeto"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              endpoint="/api/export/producao-relatorio-semanal-obra"
              params={filters}
            />
            <ExportPdfButton
              disabled={consolidatedRows.length === 0}
              disabledTooltip="Consulte primeiro para gerar o PDF."
              onExport={async () => {
                await gerarRelatorioSemanalObraPdf({
                  rows: consolidatedRows,
                  kpis: kpiTotals,
                  filters,
                  chartContainer: chartsRef.current,
                  userEmail: user?.email,
                  partial: kpiLoading,
                });
              }}
            />
          </div>
        }
      />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div>
          <Label className="text-xs">Obra</Label>
          <Input
            value={filters.obra}
            onChange={(e) => setFilters((f) => ({ ...f, obra: e.target.value }))}
            placeholder="Cliente, cidade ou cliente - cidade"
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Projeto</Label>
          <Input
            value={filters.numero_projeto}
            onChange={(e) => setFilters((f) => ({ ...f, numero_projeto: e.target.value }))}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Data inicial</Label>
          <Input
            type="date"
            value={filters.data_ini}
            onChange={(e) => setFilters((f) => ({ ...f, data_ini: e.target.value }))}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Data final</Label>
          <Input
            type="date"
            value={filters.data_fim}
            onChange={(e) => setFilters((f) => ({ ...f, data_fim: e.target.value }))}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Peso mínimo (kg)</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={filters.peso_min}
            onChange={(e) => setFilters((f) => ({ ...f, peso_min: e.target.value }))}
            className="h-8 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Peso máximo (kg)</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={filters.peso_max}
            onChange={(e) => setFilters((f) => ({ ...f, peso_max: e.target.value }))}
            className="h-8 text-xs"
          />
        </div>
      </FilterPanel>

      {(data || kpiLoading) && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KPICard
            title="Total de Obras"
            value={kpiTotals ? formatNumber(kpiTotals.totalObras, 0) : (kpiLoading ? 'Calculando...' : '...')}
            subtitle={kpiLoading ? 'Consolidando páginas...' : undefined}
            icon={<Building2 className="h-5 w-5" />}
            index={0}
          />
          <KPICard
            title="Total de Projetos"
            value={kpiTotals ? formatNumber(kpiTotals.totalProjetos, 0) : (kpiLoading ? 'Calculando...' : '...')}
            subtitle={kpiLoading ? 'Consolidando páginas...' : undefined}
            icon={<FolderKanban className="h-5 w-5" />}
            variant="info"
            index={1}
          />
          <KPICard
            title="Total de Cargas"
            value={kpiTotals ? formatNumber(kpiTotals.totalCargas, 0) : (kpiLoading ? 'Calculando...' : '...')}
            subtitle={kpiLoading ? 'Consolidando páginas...' : undefined}
            icon={<Truck className="h-5 w-5" />}
            variant="warning"
            index={2}
          />
          <KPICard
            title="Total de Peças"
            value={kpiTotals ? formatNumber(kpiTotals.totalPecas, 0) : (kpiLoading ? 'Calculando...' : '...')}
            subtitle={kpiLoading ? 'Consolidando páginas...' : undefined}
            icon={<Package className="h-5 w-5" />}
            index={3}
          />
          <KPICard
            title="Peso Total (kg)"
            value={kpiTotals ? `${formatNumber(kpiTotals.pesoTotal, 2)} kg` : (kpiLoading ? 'Calculando...' : '...')}
            subtitle={kpiLoading ? 'Consolidando páginas...' : undefined}
            icon={<Weight className="h-5 w-5" />}
            variant="success"
            index={4}
          />
        </div>
      )}

      {(data || kpiLoading) && (
        <MetaEntregaSemanalChart
          rows={consolidatedRows}
          loading={kpiLoading && consolidatedRows.length === 0}
        />
      )}

      {(data || kpiLoading) && (
        <RelatorioSemanalObraCharts
          rows={consolidatedRows}
          loading={kpiLoading && consolidatedRows.length === 0}
          onObraClick={handleObraClick}
        />
      )}

      <DataTable
        columns={columns}
        data={data?.dados || []}
        loading={loading}
        emptyMessage="Nenhum registro encontrado para os filtros informados."
      />
      {data && (
        <PaginationControl
          pagina={pagina}
          totalPaginas={data.total_paginas}
          totalRegistros={data.total_registros}
          onPageChange={(p) => search(p)}
        />
      )}
    </div>
  );
}
