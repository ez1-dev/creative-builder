import { useState, useCallback } from 'react';
import { api, PaginatedResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { KPICard } from '@/components/erp/KPICard';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNumber, formatPercent } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';

interface PatioResponse extends PaginatedResponse<any> {
  resumo: Record<string, any>;
}

const statusColor = (s: string) => {
  switch (s?.toUpperCase()) {
    case 'EXPEDIDO': return 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]';
    case 'PARCIAL': return 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]';
    case 'EM PÁTIO': return 'bg-primary text-primary-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

const columns: Column<any>[] = [
  { key: 'numero_projeto', header: 'Projeto' },
  { key: 'numero_desenho', header: 'Desenho' },
  { key: 'revisao', header: 'Rev.' },
  { key: 'kg_previsto', header: 'Kg Previsto', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_produzido', header: 'Kg Produzido', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_expedido', header: 'Kg Expedido', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_patio', header: 'Kg Pátio', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'perc_produzido_previsto', header: '% Prod/Prev', align: 'right', render: (v) => formatPercent(v) },
  { key: 'perc_expedido_previsto', header: '% Exp/Prev', align: 'right', render: (v) => formatPercent(v) },
  { key: 'perc_expedido_produzido', header: '% Exp/Prod', align: 'right', render: (v) => formatPercent(v) },
  {
    key: 'status', header: 'Status',
    render: (v) => <Badge className={`text-[10px] ${statusColor(v)}`}>{v || '-'}</Badge>,
  },
];

export default function SaldoPatioPage() {
  const [filters, setFilters] = useState({
    projeto: '', desenho: '', revisao: '', cliente: '', faixa_saldo: 'TODAS', somente_saldo_positivo: false,
  });
  const [data, setData] = useState<PatioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const erpReady = useErpReady();

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<PatioResponse>('/api/producao/patio', {
        ...filters,
        somente_saldo_positivo: filters.somente_saldo_positivo ? 'true' : '',
        pagina: page,
        tamanho_pagina: 100,
      });
      setData(result);
      setPagina(page);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, erpReady]);

  useAiFilters('producao-patio', setFilters, () => search(1));
  const clearFilters = () => {
    setFilters({ projeto: '', desenho: '', revisao: '', cliente: '', faixa_saldo: 'TODAS', somente_saldo_positivo: false });
    setData(null); setPagina(1);
  };

  const resumo = data?.resumo;

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader title="Saldo em Pátio" description="Itens produzidos aguardando expedição" actions={<ExportButton endpoint="/api/export/producao-patio" params={filters} />} />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.projeto} onChange={(e) => setFilters(f => ({ ...f, projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Desenho</Label><Input value={filters.desenho} onChange={(e) => setFilters(f => ({ ...f, desenho: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Revisão</Label><Input value={filters.revisao} onChange={(e) => setFilters(f => ({ ...f, revisao: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cliente</Label><Input value={filters.cliente} onChange={(e) => setFilters(f => ({ ...f, cliente: e.target.value }))} className="h-8 text-xs" /></div>
        <div>
          <Label className="text-xs">Faixa de Saldo</Label>
          <Select value={filters.faixa_saldo} onValueChange={(v) => setFilters(f => ({ ...f, faixa_saldo: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas</SelectItem>
              <SelectItem value="0-1000">0 – 1.000 kg</SelectItem>
              <SelectItem value="1000-5000">1.000 – 5.000 kg</SelectItem>
              <SelectItem value="5000-10000">5.000 – 10.000 kg</SelectItem>
              <SelectItem value="10000+">Acima de 10.000 kg</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox
            id="somente-saldo"
            checked={filters.somente_saldo_positivo}
            onCheckedChange={(checked) => setFilters(f => ({ ...f, somente_saldo_positivo: !!checked }))}
          />
          <Label htmlFor="somente-saldo" className="text-xs cursor-pointer">Somente saldo &gt; 0</Label>
        </div>
      </FilterPanel>

      {resumo && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <KPICard title="Total Itens" value={resumo.total_itens} />
          <KPICard title="Kg em Pátio" value={formatNumber(resumo.kg_total, 0)} variant="warning" />
          <KPICard title="Projetos" value={resumo.total_projetos} />
          <KPICard title="Maior Permanência" value={`${resumo.maior_dias || 0} dias`} variant="destructive" />
        </div>
      )}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
