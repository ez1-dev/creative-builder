import { useState, useCallback, useMemo } from 'react';
import { api, EstoqueMinMaxResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { ComboboxFilter } from '@/components/erp/ComboboxFilter';
import { KPICard } from '@/components/erp/KPICard';
import { useErpOptions } from '@/hooks/useErpOptions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { AlertTriangle, ArrowUpCircle, HelpCircle, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';

type Status = 'SEM_POLITICA' | 'ABAIXO_MINIMO' | 'NO_MINIMO' | 'ACIMA_MAXIMO' | 'ENTRE_MIN_E_MAX';

function computeStatus(saldo: number, min: number, max: number): Status {
  if ((min ?? 0) === 0 && (max ?? 0) === 0) return 'SEM_POLITICA';
  if (saldo < min) return 'ABAIXO_MINIMO';
  if (saldo === min) return 'NO_MINIMO';
  if (saldo > max && max > 0) return 'ACIMA_MAXIMO';
  return 'ENTRE_MIN_E_MAX';
}

function enrich(row: any) {
  const saldo = Number(row.saldo_atual ?? row.saldo ?? 0);
  const min = Number(row.estoque_minimo ?? 0);
  const max = Number(row.estoque_maximo ?? 0);
  const status: Status = (row.status as Status) || computeStatus(saldo, min, max);
  const sugestao_minima = row.sugestao_minima ?? (saldo < min ? Math.max(1, min - saldo) : 0);
  const sugestao_maxima = row.sugestao_maxima ?? (saldo < max ? max - saldo : 0);
  return { ...row, saldo_atual: saldo, estoque_minimo: min, estoque_maximo: max, status, sugestao_minima, sugestao_maxima };
}

const statusVariants: Record<Status, { label: string; className: string }> = {
  SEM_POLITICA: { label: 'Sem Política', className: 'bg-muted text-muted-foreground' },
  ABAIXO_MINIMO: { label: 'Abaixo Mín', className: 'bg-destructive text-destructive-foreground' },
  NO_MINIMO: { label: 'No Mínimo', className: 'bg-amber-500 text-white' },
  ACIMA_MAXIMO: { label: 'Acima Máx', className: 'bg-blue-500 text-white' },
  ENTRE_MIN_E_MAX: { label: 'OK', className: 'bg-green-600 text-white' },
};

const columns: Column<any>[] = [
  { key: 'codigo', header: 'Código', sticky: true, stickyWidth: 100 },
  { key: 'descricao', header: 'Descrição', sticky: true, stickyWidth: 220 },
  { key: 'familia', header: 'Família', sticky: true, stickyWidth: 100 },
  { key: 'origem', header: 'Origem' },
  { key: 'derivacao', header: 'Derivação' },
  { key: 'deposito', header: 'Depósito' },
  { key: 'saldo_atual', header: 'Saldo Atual', align: 'right', render: (v) => formatNumber(v, 4) },
  { key: 'estoque_minimo', header: 'Estoque Mín', align: 'right', render: (v) => formatNumber(v, 4) },
  { key: 'estoque_maximo', header: 'Estoque Máx', align: 'right', render: (v) => formatNumber(v, 4) },
  { key: 'ponto_pedido', header: 'Ponto Pedido', align: 'right', render: (v) => formatNumber(v, 4) },
  { key: 'sugestao_minima', header: 'Sugestão Mín', align: 'right', render: (v) => formatNumber(v, 4) },
  { key: 'sugestao_maxima', header: 'Sugestão Máx', align: 'right', render: (v) => formatNumber(v, 4) },
  {
    key: 'status',
    header: 'Status',
    render: (v: Status) => {
      const cfg = statusVariants[v] || statusVariants.ENTRE_MIN_E_MAX;
      return <Badge className={cfg.className}>{cfg.label}</Badge>;
    },
  },
];

const initialFilters = {
  codpro: '',
  despro: '',
  codfam: '',
  codori: '',
  codder: '',
  coddep: '',
  situacao_cadastro: 'A',
  somente_abaixo_minimo: false,
  somente_sem_politica: false,
  somente_com_saldo: false,
};

export default function EstoqueMinMaxPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState<EstoqueMinMaxResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);

  const erpReady = useErpReady();
  const { familias, origens, loading: optionsLoading } = useErpOptions(erpReady, data?.dados);

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<EstoqueMinMaxResponse>('/api/estoque-min-max', {
        ...filters,
        pagina: page,
        tamanho_pagina: 100,
      });
      setData(result);
      setPagina(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady]);

  const enrichedData = useMemo(() => (data?.dados || []).map(enrich), [data]);

  const kpis = useMemo(() => {
    if (!data) return null;
    if (data.resumo) {
      return {
        abaixo_minimo: data.resumo.abaixo_minimo ?? 0,
        acima_maximo: data.resumo.acima_maximo ?? 0,
        sem_politica: data.resumo.sem_politica ?? 0,
        ok: data.resumo.ok ?? 0,
        sugestao_minimo_total: data.resumo.sugestao_minimo_total ?? 0,
        sugestao_maximo_total: data.resumo.sugestao_maximo_total ?? 0,
      };
    }
    const acc = { abaixo_minimo: 0, acima_maximo: 0, sem_politica: 0, ok: 0, sugestao_minimo_total: 0, sugestao_maximo_total: 0 };
    for (const r of enrichedData) {
      if (r.status === 'ABAIXO_MINIMO') acc.abaixo_minimo++;
      else if (r.status === 'ACIMA_MAXIMO') acc.acima_maximo++;
      else if (r.status === 'SEM_POLITICA') acc.sem_politica++;
      else acc.ok++;
      acc.sugestao_minimo_total += Number(r.sugestao_minima || 0);
      acc.sugestao_maximo_total += Number(r.sugestao_maxima || 0);
    }
    return acc;
  }, [data, enrichedData]);

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Estoque Min/Max"
        description="Análise de política de reposição: saldo, mínimo, máximo e sugestão de compra"
        actions={<ExportButton endpoint="/api/export/estoque-min-max" params={filters} />}
      />
      <FilterPanel
        onSearch={() => search(1)}
        onClear={() => { setFilters(initialFilters); setData(null); setPagina(1); }}
      >
        <div><Label className="text-xs">Código</Label><Input value={filters.codpro} onChange={(e) => setFilters(f => ({ ...f, codpro: e.target.value }))} placeholder="Código do produto" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Descrição</Label><Input value={filters.despro} onChange={(e) => setFilters(f => ({ ...f, despro: e.target.value }))} placeholder="Descrição" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Família</Label><ComboboxFilter value={filters.codfam} onChange={(v) => setFilters(f => ({ ...f, codfam: v }))} options={familias} placeholder="Família" loading={optionsLoading} /></div>
        <div><Label className="text-xs">Origem</Label><ComboboxFilter value={filters.codori} onChange={(v) => setFilters(f => ({ ...f, codori: v }))} options={origens} placeholder="Origem" loading={optionsLoading} /></div>
        <div><Label className="text-xs">Derivação</Label><Input value={filters.codder} onChange={(e) => setFilters(f => ({ ...f, codder: e.target.value }))} placeholder="Derivação" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Depósito</Label><Input value={filters.coddep} onChange={(e) => setFilters(f => ({ ...f, coddep: e.target.value }))} placeholder="Depósito" className="h-8 text-xs" /></div>
        <div>
          <Label className="text-xs">Situação</Label>
          <Select value={filters.situacao_cadastro} onValueChange={(v) => setFilters(f => ({ ...f, situacao_cadastro: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="A">Ativo</SelectItem>
              <SelectItem value="I">Inativo</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox id="abaixo_min" checked={filters.somente_abaixo_minimo} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_abaixo_minimo: !!v }))} />
          <Label htmlFor="abaixo_min" className="text-xs">Somente abaixo do mínimo</Label>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox id="sem_pol" checked={filters.somente_sem_politica} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_sem_politica: !!v }))} />
          <Label htmlFor="sem_pol" className="text-xs">Somente sem política</Label>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox id="com_saldo" checked={filters.somente_com_saldo} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_com_saldo: !!v }))} />
          <Label htmlFor="com_saldo" className="text-xs">Somente com saldo</Label>
        </div>
      </FilterPanel>

      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard title="Abaixo do Mínimo" value={formatNumber(kpis.abaixo_minimo, 0)} icon={<AlertTriangle className="h-5 w-5" />} variant="danger" index={0} tooltip="Itens com saldo abaixo do estoque mínimo" />
          <KPICard title="Acima do Máximo" value={formatNumber(kpis.acima_maximo, 0)} icon={<ArrowUpCircle className="h-5 w-5" />} variant="info" index={1} tooltip="Itens com saldo acima do estoque máximo" />
          <KPICard title="Sem Política" value={formatNumber(kpis.sem_politica, 0)} icon={<HelpCircle className="h-5 w-5" />} variant="default" index={2} tooltip="Itens sem mínimo/máximo definidos" />
          <KPICard title="Itens OK" value={formatNumber(kpis.ok, 0)} icon={<CheckCircle2 className="h-5 w-5" />} variant="success" index={3} tooltip="Itens dentro da política de estoque" />
          <KPICard title="Sugestão p/ Mínimo" value={formatNumber(kpis.sugestao_minimo_total, 2)} icon={<TrendingDown className="h-5 w-5" />} variant="warning" index={4} tooltip="Soma das sugestões de compra para repor o mínimo" />
          <KPICard title="Sugestão p/ Máximo" value={formatNumber(kpis.sugestao_maximo_total, 2)} icon={<TrendingUp className="h-5 w-5" />} variant="info" index={5} tooltip="Soma das sugestões de compra para atingir o máximo" />
        </div>
      )}

      <DataTable columns={columns} data={enrichedData} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
