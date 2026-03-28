import { useState, useCallback } from 'react';
import { api, BomResponse } from '@/lib/api';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { ExportButton } from '@/components/erp/ExportButton';
import { KPICard } from '@/components/erp/KPICard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { AlertTriangle, GitBranch } from 'lucide-react';

const levelColors: Record<number, string> = {
  1: 'bg-green-100',
  2: 'bg-red-50',
  3: 'bg-yellow-50',
};
const defaultLevelColor = 'bg-blue-50';

const columns: Column<any>[] = [
  {
    key: 'nivel', header: 'Nível', render: (v) => v,
  },
  { key: 'codigo_componente', header: 'Código' },
  {
    key: 'descricao_componente', header: 'Descrição', render: (v, row) => {
      const nivel = row.nivel || 1;
      const indent = (nivel - 1) * 20;
      const prefix = nivel > 1 ? '- ' : '';
      return (
        <span
          style={{ paddingLeft: `${indent}px` }}
          className={`flex items-center gap-1 ${row.possui_filhos ? 'font-bold' : ''}`}
        >
          {row.possui_filhos && <GitBranch className="h-3 w-3 text-primary shrink-0" />}
          {row.ciclo_detectado && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
          {prefix}{v}
        </span>
      );
    },
  },
  { key: 'derivacao_componente', header: 'Derivação' },
  { key: 'unidade_medida', header: 'Unidade' },
  { key: 'tipo_produto', header: 'Tipo' },
  { key: 'estagio', header: 'Estágio' },
  { key: 'quantidade_utilizada', header: 'Qtd.', align: 'right', render: (v) => formatNumber(v, 4) },
  { key: 'perda_percentual', header: '% Perda', align: 'right', render: (v) => formatNumber(v, 2) },
];

function getBomRowClassName(row: any) {
  const nivel = row.nivel || 1;
  return levelColors[nivel] || defaultLevelColor;
}

export default function BomPage() {
  const [filters, setFilters] = useState({ codmod: '', codder: '', max_nivel: '10' });
  const [data, setData] = useState<BomResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    if (!filters.codmod.trim()) {
      toast.error('Informe o código do modelo');
      return;
    }
    setLoading(true);
    try {
      const result = await api.get<BomResponse>('/api/bom', { codmod: filters.codmod, codder: filters.codder || undefined, max_nivel: parseInt(filters.max_nivel) || 10 });
      setData(result);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Estrutura (BOM)"
        description="Consulte a estrutura / lista de materiais de um modelo"
        actions={data ? <ExportButton endpoint="/api/export/bom" params={{ codmod: filters.codmod, codder: filters.codder, max_nivel: filters.max_nivel }} /> : undefined}
      />
      <FilterPanel onSearch={search} onClear={() => setFilters({ codmod: '', codder: '', max_nivel: '10' })}>
        <div><Label className="text-xs">Código Modelo *</Label><Input value={filters.codmod} onChange={(e) => setFilters(f => ({ ...f, codmod: e.target.value }))} placeholder="Código do modelo" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Derivação</Label><Input value={filters.codder} onChange={(e) => setFilters(f => ({ ...f, codder: e.target.value }))} placeholder="Derivação" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Max. Nível</Label><Input type="number" value={filters.max_nivel} onChange={(e) => setFilters(f => ({ ...f, max_nivel: e.target.value }))} placeholder="10" className="h-8 text-xs" /></div>
      </FilterPanel>
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KPICard title="Modelo" value={data.cabecalho.codigo_modelo} subtitle={data.cabecalho.descricao_modelo} />
            <KPICard title="Total Itens" value={data.total_itens} variant="info" />
            <KPICard title="Níveis" value={data.total_niveis} variant="default" />
            <KPICard title="Modelos Filhos" value={data.total_modelos_filhos} variant="warning" />
          </div>
          <DataTable columns={columns} data={data.dados} loading={loading} rowClassName={getBomRowClassName} />
        </>
      )}
    </div>
  );
}
