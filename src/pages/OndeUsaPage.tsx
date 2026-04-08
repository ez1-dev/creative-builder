import { useState, useCallback, useMemo } from 'react';
import { api, PaginatedResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { KPICard } from '@/components/erp/KPICard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { Database, Box, Hash } from 'lucide-react';
import { useAiFilters } from '@/hooks/useAiFilters';

const columns: Column<any>[] = [
  { key: 'codigo_componente', header: 'Cód. Componente' },
  { key: 'descricao_componente', header: 'Desc. Componente' },
  { key: 'unidade_componente', header: 'Unidade' },
  { key: 'derivacao_componente', header: 'Der. Componente' },
  { key: 'codigo_modelo', header: 'Cód. Modelo' },
  { key: 'descricao_modelo', header: 'Desc. Modelo' },
  { key: 'derivacao_modelo', header: 'Der. Modelo' },
  { key: 'estagio', header: 'Estágio' },
  { key: 'sequencia', header: 'Seq.' },
  { key: 'quantidade_utilizada', header: 'Qtd. Utilizada', align: 'right', render: (v) => formatNumber(v, 4) },
  { key: 'perda_percentual', header: '% Perda', align: 'right', render: (v) => formatNumber(v, 2) },
];

export default function OndeUsaPage() {
  const [filters, setFilters] = useState({ codcmp: '', dercmp: '', codmod: '', situacao: 'A' });
  const [data, setData] = useState<PaginatedResponse<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);

  const erpReady = useErpReady();

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const { situacao, ...rest } = filters;
      const result = await api.get<PaginatedResponse<any>>('/api/onde-usa', { ...rest, situacao_cadastro: situacao, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady]);

  useAiFilters('onde-usa', setFilters, () => search(1));
  const kpis = useMemo(() => {
    if (!data) return null;
    const dados = data.dados || [];
    const modelosDistintos = new Set(dados.map((d) => d.codigo_modelo)).size;
    const qtdTotal = dados.reduce((sum, item) => sum + (item.quantidade_utilizada || 0), 0);
    return { totalRegistros: data.total_registros, modelosDistintos, qtdTotal };
  }, [data]);

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Onde Usa"
        description="Consulte em quais modelos/estruturas um componente é utilizado"
        actions={<ExportButton endpoint="/api/export/onde-usa" params={filters} />}
      />
      <FilterPanel onSearch={() => search(1)} onClear={() => { setFilters({ codcmp: '', dercmp: '', codmod: '', situacao: 'A' }); setData(null); setPagina(1); }}>
        <div><Label className="text-xs">Cód. Componente</Label><Input value={filters.codcmp} onChange={(e) => setFilters(f => ({ ...f, codcmp: e.target.value }))} placeholder="Código" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Der. Componente</Label><Input value={filters.dercmp} onChange={(e) => setFilters(f => ({ ...f, dercmp: e.target.value }))} placeholder="Derivação" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cód. Modelo</Label><Input value={filters.codmod} onChange={(e) => setFilters(f => ({ ...f, codmod: e.target.value }))} placeholder="Código modelo" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Situação</Label><Select value={filters.situacao} onValueChange={(v) => setFilters(f => ({ ...f, situacao: v }))}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="A">Ativo</SelectItem><SelectItem value="I">Inativo</SelectItem><SelectItem value="all">Todos</SelectItem></SelectContent></Select></div>
      </FilterPanel>
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KPICard title="Total Registros" value={formatNumber(kpis.totalRegistros, 0)} icon={<Database className="h-5 w-5" />} variant="default" index={0} tooltip="Total de registros encontrados" />
          <KPICard title="Modelos Distintos" value={formatNumber(kpis.modelosDistintos, 0)} icon={<Box className="h-5 w-5" />} variant="info" index={1} tooltip="Quantidade de modelos únicos na página" />
          <KPICard title="Qtd. Utilizada Total" value={formatNumber(kpis.qtdTotal, 4)} icon={<Hash className="h-5 w-5" />} variant="success" index={2} tooltip="Soma da quantidade utilizada dos itens visíveis" />
        </div>
      )}
      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
