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
import { useAiPageContext } from '@/hooks/useAiPageContext';
import { KPICard } from '@/components/erp/KPICard';
import { Building2, FolderKanban, Truck, Package, Weight } from 'lucide-react';

interface RelatorioRow {
  obra?: string;
  cliente?: string;
  cidade?: string;
  numero_projeto?: string | number;
  data_inicial?: string;
  data_final?: string;
  quantidade_cargas?: number;
  quantidade_pecas?: number;
  quantidade_expedida?: number;
  peso_total?: number;
}

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

export default function RelatorioSemanalObraPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState<PaginatedResponse<RelatorioRow> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const erpReady = useErpReady();

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
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao consultar relatório semanal de obra.');
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady]);

  useAiFilters('producao-relatorio-semanal-obra', setFilters, () => search(1));

  const kpiTotals: KpiTotals | null = useMemo(() => {
    if (!data) return null;
    const resumo = (data as any).resumo;
    if (resumo) {
      return {
        totalObras: resumo.total_obras ?? 0,
        totalProjetos: resumo.total_projetos ?? 0,
        totalCargas: resumo.total_cargas ?? 0,
        totalPecas: resumo.total_pecas ?? resumo.total_pecas_etiquetas ?? 0,
        pesoTotal: resumo.peso_total ?? 0,
      };
    }
    const dados = data.dados || [];
    const obras = new Set<string>();
    const projetos = new Set<string>();
    let cargas = 0, pecas = 0, peso = 0;
    for (const r of dados) {
      if (r.obra) obras.add(String(r.obra));
      else if (r.cliente || r.cidade) obras.add(`${r.cliente || ''} - ${r.cidade || ''}`);
      if (r.numero_projeto != null) projetos.add(String(r.numero_projeto));
      cargas += Number(r.quantidade_cargas) || 0;
      pecas += Number(r.quantidade_pecas) || 0;
      peso += Number(r.peso_total) || 0;
    }
    return {
      totalObras: obras.size,
      totalProjetos: projetos.size,
      totalCargas: cargas,
      totalPecas: pecas,
      pesoTotal: peso,
    };
  }, [data]);

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
  };

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Relatório Semanal Obra"
        description="Visão gerencial semanal por obra e projeto"
        actions={
          <ExportButton
            endpoint="/api/export/producao-relatorio-semanal-obra"
            params={filters}
          />
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

      {data && kpiTotals && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <KPICard
            title="Total de Obras"
            value={formatNumber(kpiTotals.totalObras, 0)}
            icon={<Building2 className="h-5 w-5" />}
            index={0}
          />
          <KPICard
            title="Total de Projetos"
            value={formatNumber(kpiTotals.totalProjetos, 0)}
            icon={<FolderKanban className="h-5 w-5" />}
            variant="info"
            index={1}
          />
          <KPICard
            title="Total de Cargas"
            value={formatNumber(kpiTotals.totalCargas, 0)}
            icon={<Truck className="h-5 w-5" />}
            variant="warning"
            index={2}
          />
          <KPICard
            title="Total de Peças"
            value={formatNumber(kpiTotals.totalPecas, 0)}
            icon={<Package className="h-5 w-5" />}
            index={3}
          />
          <KPICard
            title="Peso Total (kg)"
            value={`${formatNumber(kpiTotals.pesoTotal, 2)} kg`}
            icon={<Weight className="h-5 w-5" />}
            variant="success"
            index={4}
          />
        </div>
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
