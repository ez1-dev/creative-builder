import { useState, useCallback } from 'react';
import { api, EngenhariaResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { ComboboxFilter } from '@/components/erp/ComboboxFilter';
import { useErpOptions } from '@/hooks/useErpOptions';
import { KPICard } from '@/components/erp/KPICard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { formatNumber, formatDate, formatPercent } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';

const statusColor = (s: string) => {
  switch (s) {
    case 'ATENDEU': return 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]';
    case 'PARCIAL': return 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]';
    case 'SEM PRODUÇÃO': case 'SEM ENTRADA': return 'bg-destructive text-destructive-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

const columns: Column<any>[] = [
  { key: 'numero_projeto', header: 'Projeto' },
  { key: 'numero_desenho', header: 'Desenho' },
  { key: 'revisao', header: 'Rev.' },
  { key: 'descricao_desenho', header: 'Descrição' },
  { key: 'data_entrega_engenharia', header: 'Entrega Eng.', render: (v) => formatDate(v) },
  { key: 'kg_engenharia', header: 'Kg Eng.', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_produzido', header: 'Kg Prod.', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_entrada_estoque', header: 'Kg Estoque', align: 'right', render: (v) => formatNumber(v, 1) },
  {
    key: 'perc_atendimento_producao', header: '% Prod.', align: 'center',
    render: (v) => (
      <div className="flex items-center gap-2 min-w-[100px]">
        <Progress value={Math.min(v || 0, 100)} className="h-2 flex-1" />
        <span className="text-xs">{formatPercent(v)}</span>
      </div>
    ),
  },
  {
    key: 'status_producao', header: 'Status Prod.',
    render: (v) => <Badge className={`text-[10px] ${statusColor(v)}`}>{v}</Badge>,
  },
  {
    key: 'status_estoque', header: 'Status Est.',
    render: (v) => <Badge className={`text-[10px] ${statusColor(v)}`}>{v}</Badge>,
  },
  { key: 'ops', header: 'OPs' },
  { key: 'origens', header: 'Origens' },
];

export default function EngenhariaProducaoPage() {
  const [filters, setFilters] = useState({
    unidade_negocio: 'TODAS', numero_projeto: '', numero_desenho: '', revisao: '',
    numero_op: '', origem: '', familia: '', data_entrega_ini: '', data_entrega_fim: '',
    status_atendimento: 'TODOS', status_producao: 'TODOS', status_estoque: 'TODOS',
  });
  const [data, setData] = useState<EngenhariaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);

  const erpReady = useErpReady();
  const { familias, origens, loading: optionsLoading } = useErpOptions(erpReady, data?.dados);

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<EngenhariaResponse>('/api/engenharia-producao', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady]);

  useAiFilters('engenharia-producao', setFilters, () => search(1));
  const clearFilters = () => setFilters({
    unidade_negocio: 'TODAS', numero_projeto: '', numero_desenho: '', revisao: '',
    numero_op: '', origem: '', familia: '', data_entrega_ini: '', data_entrega_fim: '',
    status_atendimento: 'TODOS', status_producao: 'TODOS', status_estoque: 'TODOS',
  });

  const resumo = data?.resumo;

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Engenharia x Produção"
        description="Acompanhamento de projetos: engenharia, produção e estoque"
        actions={<ExportButton endpoint="/api/export/engenharia-producao" params={filters} />}
      />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div>
          <Label className="text-xs">Unidade</Label>
          <Select value={filters.unidade_negocio} onValueChange={(v) => setFilters(f => ({ ...f, unidade_negocio: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas</SelectItem>
              <SelectItem value="ESTRUTURAL">Estrutural</SelectItem>
              <SelectItem value="GENIUS">Genius</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.numero_projeto} onChange={(e) => setFilters(f => ({ ...f, numero_projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Desenho</Label><Input value={filters.numero_desenho} onChange={(e) => setFilters(f => ({ ...f, numero_desenho: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Revisão</Label><Input value={filters.revisao} onChange={(e) => setFilters(f => ({ ...f, revisao: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">OP</Label><Input value={filters.numero_op} onChange={(e) => setFilters(f => ({ ...f, numero_op: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Origem</Label><ComboboxFilter value={filters.origem} onChange={(v) => setFilters(f => ({ ...f, origem: v }))} options={origens} placeholder="Origem" loading={optionsLoading} /></div>
        <div><Label className="text-xs">Família</Label><ComboboxFilter value={filters.familia} onChange={(v) => setFilters(f => ({ ...f, familia: v }))} options={familias} placeholder="Família" loading={optionsLoading} /></div>
        <div><Label className="text-xs">Entrega de</Label><Input type="date" value={filters.data_entrega_ini} onChange={(e) => setFilters(f => ({ ...f, data_entrega_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Entrega até</Label><Input type="date" value={filters.data_entrega_fim} onChange={(e) => setFilters(f => ({ ...f, data_entrega_fim: e.target.value }))} className="h-8 text-xs" /></div>
        <div>
          <Label className="text-xs">Status Produção</Label>
          <Select value={filters.status_producao} onValueChange={(v) => setFilters(f => ({ ...f, status_producao: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="ATENDEU">Atendeu</SelectItem>
              <SelectItem value="PARCIAL">Parcial</SelectItem>
              <SelectItem value="SEM PRODUÇÃO">Sem Produção</SelectItem>
              <SelectItem value="SEM BASE">Sem Base</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FilterPanel>

      {resumo && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <KPICard title="Total Projetos" value={resumo.total_projetos} />
          <KPICard title="Kg Engenharia" value={formatNumber(resumo.kg_engenharia_total, 0)} variant="info" />
          <KPICard title="Kg Produzido" value={formatNumber(resumo.kg_produzido_total, 0)} variant="success" />
          <KPICard title="Kg Estoque" value={formatNumber(resumo.kg_entrada_estoque_total, 0)} variant="warning" />
          <KPICard title="% Atend. Produção" value={formatPercent(resumo.perc_atendimento_producao_total)} variant={resumo.perc_atendimento_producao_total >= 100 ? 'success' : 'warning'} />
        </div>
      )}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.resumo.total_paginas} totalRegistros={data.resumo.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
