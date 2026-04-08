import { useState, useCallback, useMemo, useEffect } from 'react';
import { api, BomResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { ExportButton } from '@/components/erp/ExportButton';
import { KPICard } from '@/components/erp/KPICard';
import { ComboboxFilter, ComboboxOption } from '@/components/erp/ComboboxFilter';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { AlertTriangle, GitBranch, ChevronDown, ChevronRight, Expand, Shrink } from 'lucide-react';

const levelColors: Record<number, string> = {
  1: 'bg-green-100',
  2: 'bg-red-50',
  3: 'bg-yellow-50',
};
const defaultLevelColor = 'bg-blue-50';

function getBomRowClassName(row: any) {
  const nivel = row.nivel || 1;
  return levelColors[nivel] || defaultLevelColor;
}

export default function BomPage() {
  const [filters, setFilters] = useState({ codmod: '', codder: '', max_nivel: '10', situacao: 'A' });
  const [data, setData] = useState<BomResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsedRows, setCollapsedRows] = useState<Set<number>>(new Set());
  const [modeloOptions, setModeloOptions] = useState<ComboboxOption[]>([]);
  const [modeloLoading, setModeloLoading] = useState(false);

  const erpReady = useErpReady();

  useEffect(() => {
    if (!erpReady || filters.codmod.length < 2) {
      setModeloOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setModeloLoading(true);
      try {
        const result = await api.get<any>('/api/modelos', { search: filters.codmod });
        const items = Array.isArray(result) ? result : result?.dados || [];
        setModeloOptions(items.map((m: any) => ({
          value: m.codigo || m.codmod || String(m.value || ''),
          label: m.descricao || m.label || '',
        })));
      } catch {
        setModeloOptions([]);
      } finally {
        setModeloLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.codmod, erpReady]);

  const search = useCallback(async () => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    if (!filters.codmod.trim()) {
      toast.error('Informe o código do modelo');
      return;
    }
    setLoading(true);
    setCollapsedRows(new Set());
    try {
      const result = await api.get<BomResponse>('/api/bom', { codmod: filters.codmod, codder: filters.codder || undefined, max_nivel: parseInt(filters.max_nivel) || 10, situacao_cadastro: filters.situacao });
      setData(result);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady]);

  const toggleCollapse = useCallback((index: number) => {
    setCollapsedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    if (!data) return;
    const indices = new Set<number>();
    data.dados.forEach((row: any, i: number) => {
      if (row.possui_filhos) indices.add(i);
    });
    setCollapsedRows(indices);
  }, [data]);

  const expandAll = useCallback(() => {
    setCollapsedRows(new Set());
  }, []);

  const visibleRows = useMemo(() => {
    if (!data) return [];
    const result: any[] = [];
    let skipUntilLevel: number | null = null;

    for (let i = 0; i < data.dados.length; i++) {
      const row = data.dados[i];
      const nivel = row.nivel || 1;

      if (skipUntilLevel !== null && nivel > skipUntilLevel) {
        continue;
      }
      skipUntilLevel = null;
      // Attach original index for toggle
      result.push({ ...row, _originalIndex: i });

      if (collapsedRows.has(i)) {
        skipUntilLevel = nivel;
      }
    }
    return result;
  }, [data, collapsedRows]);

  const columns: Column<any>[] = useMemo(() => [
    { key: 'nivel', header: 'Nível', render: (v) => v },
    { key: 'codigo_componente', header: 'Código' },
    {
      key: 'descricao_componente', header: 'Descrição', render: (v, row) => {
        const nivel = row.nivel || 1;
        const indent = (nivel - 1) * 20;
        const prefix = nivel > 1 ? '- ' : '';
        const isCollapsed = collapsedRows.has(row._originalIndex);
        return (
          <span
            style={{ paddingLeft: `${indent}px` }}
            className={`flex items-center gap-1 ${row.possui_filhos ? 'font-bold' : ''}`}
          >
            {row.possui_filhos && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleCollapse(row._originalIndex); }}
                className="p-0.5 rounded hover:bg-muted shrink-0"
              >
                {isCollapsed
                  ? <ChevronRight className="h-3 w-3 text-primary" />
                  : <ChevronDown className="h-3 w-3 text-primary" />}
              </button>
            )}
            {!row.possui_filhos && <span className="w-4 shrink-0" />}
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
  ], [collapsedRows, toggleCollapse]);

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Estrutura (BOM)"
        description="Consulte a estrutura / lista de materiais de um modelo"
        actions={
          <div className="flex items-center gap-2">
            {data && (
              <>
                <Button variant="outline" size="sm" onClick={expandAll} className="h-7 text-xs gap-1">
                  <Expand className="h-3 w-3" /> Expandir
                </Button>
                <Button variant="outline" size="sm" onClick={collapseAll} className="h-7 text-xs gap-1">
                  <Shrink className="h-3 w-3" /> Colapsar
                </Button>
                <ExportButton endpoint="/api/export/bom" params={{ codmod: filters.codmod, codder: filters.codder, max_nivel: filters.max_nivel }} />
              </>
            )}
          </div>
        }
      />
      <FilterPanel onSearch={search} onClear={() => { setFilters({ codmod: '', codder: '', max_nivel: '10', situacao: 'A' }); setData(null); setCollapsedRows(new Set()); }}>
        <div><Label className="text-xs">Código Modelo *</Label><ComboboxFilter value={filters.codmod} onChange={(v) => setFilters(f => ({ ...f, codmod: v }))} options={modeloOptions} loading={modeloLoading} placeholder="Digite o código..." className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Derivação</Label><Input value={filters.codder} onChange={(e) => setFilters(f => ({ ...f, codder: e.target.value }))} placeholder="Derivação" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Max. Nível</Label><Input type="number" value={filters.max_nivel} onChange={(e) => setFilters(f => ({ ...f, max_nivel: e.target.value }))} placeholder="10" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Situação</Label><Select value={filters.situacao} onValueChange={(v) => setFilters(f => ({ ...f, situacao: v }))}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="A">Ativo</SelectItem><SelectItem value="I">Inativo</SelectItem><SelectItem value="all">Todos</SelectItem></SelectContent></Select></div>
      </FilterPanel>
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KPICard title="Modelo" value={data.cabecalho.codigo_modelo} subtitle={data.cabecalho.descricao_modelo} />
            <KPICard title="Total Itens" value={data.total_itens} variant="info" />
            <KPICard title="Níveis" value={data.total_niveis} variant="default" />
            <KPICard title="Modelos Filhos" value={data.total_modelos_filhos} variant="warning" />
          </div>
          <DataTable columns={columns} data={visibleRows} loading={loading} rowClassName={getBomRowClassName} />
        </>
      )}
    </div>
  );
}
