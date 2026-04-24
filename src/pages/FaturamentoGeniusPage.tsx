import { useState } from 'react';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { KPICard } from '@/components/erp/KPICard';
import { KpiGroup } from '@/components/erp/KpiGroup';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { ErpConnectionAlert } from '@/components/erp/ErpConnectionAlert';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { api } from '@/lib/api';
import { formatNumber, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  DollarSign,
  TrendingDown,
  Receipt,
  Wallet,
  Percent,
  FileText,
  ShoppingBag,
  Users,
  Store,
  Package,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';

const fmtBRL = (v: number | null | undefined) => {
  if (v === null || v === undefined) return '-';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtNum = (v: number | null | undefined, dec = 0) => {
  if (v === null || v === undefined) return '-';
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
};

const fmtAnomes = (anomes: string | number | null | undefined) => {
  if (!anomes) return '-';
  const s = String(anomes);
  if (s.length !== 6) return s;
  return `${s.slice(4, 6)}/${s.slice(0, 4)}`;
};

const fmtPct = (v: number | null | undefined) => {
  if (v === null || v === undefined) return '-';
  return `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
};

function currentYYYYMM(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const ORIGEM_OPTIONS = ['Todas', 'MÁQUINAS', 'PEÇAS', 'SERVIÇOS', 'META', 'LANCTO MANUAL'];
const TIPO_MOV_OPTIONS = ['TODOS', 'PRODUTOS', 'SERVIÇOS', 'DEVOLUÇÃO', 'FATURAMENTO MAN'];

interface Filters {
  anomes_ini: string;
  anomes_fim: string;
  revenda: string;
  origem: string;
  tipo_movimento: string;
  cliente: string;
  representante: string;
  produto: string;
  pedido: string;
  nf: string;
  somente_com_revenda: boolean;
}

const initialFilters = (): Filters => ({
  anomes_ini: currentYYYYMM(),
  anomes_fim: currentYYYYMM(),
  revenda: '',
  origem: 'Todas',
  tipo_movimento: 'TODOS',
  cliente: '',
  representante: '',
  produto: '',
  pedido: '',
  nf: '',
  somente_com_revenda: false,
});

// Build params for API (omit "Todas"/"TODOS" sentinels, send booleans as expected)
function buildParams(f: Filters, extras?: Record<string, any>) {
  const params: Record<string, any> = {
    anomes_ini: f.anomes_ini,
    anomes_fim: f.anomes_fim,
    revenda: f.revenda,
    cliente: f.cliente,
    representante: f.representante,
    produto: f.produto,
    pedido: f.pedido,
    nf: f.nf,
  };
  if (f.origem && f.origem !== 'Todas') params.origem = f.origem;
  if (f.tipo_movimento && f.tipo_movimento !== 'TODOS') params.tipo_movimento = f.tipo_movimento;
  if (f.somente_com_revenda) params.somente_com_revenda = true;
  if (extras) Object.assign(params, extras);
  return params;
}

export default function FaturamentoGeniusPage() {
  const [filters, setFilters] = useState<Filters>(initialFilters());
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendIndisponivel, setBackendIndisponivel] = useState(false);

  const update = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  const MSG_404 = 'Backend de Faturamento Genius ainda não publicado. Verifique se os endpoints /api/faturamento-genius-dashboard e /api/faturamento-genius existem no FastAPI.';

  const consultar = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const baseParams = buildParams(filters);
      const [dash, det] = await Promise.all([
        api.get<any>('/api/faturamento-genius-dashboard', baseParams),
        api.get<any>('/api/faturamento-genius', { ...baseParams, pagina: page, tamanho_pagina: 100 }),
      ]);
      setDashboard(dash);
      setDetalhe(det);
      setBackendIndisponivel(false);
    } catch (err: any) {
      if (err?.statusCode === 404) {
        setBackendIndisponivel(true);
        setError(MSG_404);
        toast.error(MSG_404);
      } else {
        setError(err?.message || 'Erro ao consultar');
        if (err?.statusCode !== 401) {
          toast.error(err?.message || 'Erro ao consultar faturamento');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const recarregarDetalhe = async (page: number) => {
    try {
      const det = await api.get<any>('/api/faturamento-genius', {
        ...buildParams(filters),
        pagina: page,
        tamanho_pagina: 100,
      });
      setDetalhe(det);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao paginar');
    }
  };

  const limpar = () => {
    setFilters(initialFilters());
    setDashboard(null);
    setDetalhe(null);
    setError(null);
    setBackendIndisponivel(false);
  };

  const atualizarComercial = async () => {
    setUpdating(true);
    try {
      await api.post('/api/faturamento-genius/atualizar', {
        anomes_ini: filters.anomes_ini,
        anomes_fim: filters.anomes_fim,
      });
      setBackendIndisponivel(false);
      toast.success('Atualização comercial concluída');
      await consultar(1);
    } catch (err: any) {
      if (err?.statusCode === 404) {
        setBackendIndisponivel(true);
        toast.error(MSG_404);
      } else {
        toast.error(err?.message || 'Falha ao atualizar comercial');
      }
    } finally {
      setUpdating(false);
    }
  };

  const kpis = dashboard?.kpis || {};
  const margemPct = Number(kpis.margem_percentual ?? 0);

  // ===== Tables (summary) =====
  const colsRevenda: Column<any>[] = [
    {
      key: 'revenda',
      header: 'Revenda',
      render: (v) => {
        const txt = v ?? '-';
        if (txt === 'OUTROS' || txt === 'LANCTO MANUAL') {
          return <Badge variant="secondary" className="text-[10px]">{txt}</Badge>;
        }
        return <span className="font-medium">{txt}</span>;
      },
    },
    { key: 'quantidade_notas', header: 'Notas', align: 'right', render: (v) => fmtNum(v) },
    { key: 'quantidade_clientes', header: 'Clientes', align: 'right', render: (v) => fmtNum(v) },
    { key: 'quantidade_produtos', header: 'Produtos', align: 'right', render: (v) => fmtNum(v) },
    { key: 'valor_bruto', header: 'Bruto', align: 'right', render: (v) => fmtBRL(v) },
    { key: 'valor_total', header: 'Total', align: 'right', render: (v) => <span className="font-semibold tabular-nums">{fmtBRL(v)}</span> },
    { key: 'valor_devolucao', header: 'Devolução', align: 'right', render: (v) => fmtBRL(v) },
    { key: 'valor_custo', header: 'Custo', align: 'right', render: (v) => fmtBRL(v) },
    { key: 'valor_comissao', header: 'Comissão', align: 'right', render: (v) => fmtBRL(v) },
  ];

  const colsOrigem: Column<any>[] = [
    { key: 'origem', header: 'Origem', render: (v) => <span className="font-medium">{v ?? '-'}</span> },
    { key: 'quantidade_notas', header: 'Notas', align: 'right', render: (v) => fmtNum(v) },
    { key: 'valor_total', header: 'Total', align: 'right', render: (v) => <span className="font-semibold tabular-nums">{fmtBRL(v)}</span> },
    { key: 'valor_devolucao', header: 'Devolução', align: 'right', render: (v) => fmtBRL(v) },
    { key: 'valor_custo', header: 'Custo', align: 'right', render: (v) => fmtBRL(v) },
  ];

  const colsMes: Column<any>[] = [
    { key: 'anomes', header: 'Mês', render: (v) => <span className="font-medium tabular-nums">{fmtAnomes(v)}</span> },
    { key: 'quantidade_notas', header: 'Notas', align: 'right', render: (v) => fmtNum(v) },
    { key: 'valor_total', header: 'Total', align: 'right', render: (v) => <span className="font-semibold tabular-nums">{fmtBRL(v)}</span> },
    { key: 'valor_devolucao', header: 'Devolução', align: 'right', render: (v) => fmtBRL(v) },
    { key: 'valor_custo', header: 'Custo', align: 'right', render: (v) => fmtBRL(v) },
  ];

  // ===== Detail table =====
  const colsDetalhe: Column<any>[] = [
    { key: 'data_emissao', header: 'Emissão', render: (v) => formatDate(v) },
    { key: 'tipo_movimento', header: 'Tipo Mov.' },
    { key: 'origem', header: 'Origem' },
    {
      key: 'revenda',
      header: 'Revenda',
      render: (v) => (v === 'OUTROS' || v === 'LANCTO MANUAL') ? <Badge variant="secondary" className="text-[10px]">{v}</Badge> : (v ?? '-'),
    },
    { key: 'numero_nf', header: 'NF', align: 'right' },
    { key: 'serie_nf', header: 'Série' },
    { key: 'pedido', header: 'Pedido', align: 'right' },
    { key: 'cliente', header: 'Cliente' },
    { key: 'representante', header: 'Representante' },
    { key: 'produto', header: 'Produto' },
    { key: 'derivacao', header: 'Deriv.' },
    { key: 'quantidade', header: 'Qtd', align: 'right', render: (v) => fmtNum(v, 2) },
    { key: 'valor_bruto', header: 'Bruto', align: 'right', render: (v) => fmtBRL(v) },
    { key: 'valor_total', header: 'Total', align: 'right', render: (v) => <span className="font-semibold tabular-nums">{fmtBRL(v)}</span> },
    { key: 'valor_devolucao', header: 'Devolução', align: 'right', render: (v) => fmtBRL(v) },
    { key: 'valor_custo', header: 'Custo', align: 'right', render: (v) => fmtBRL(v) },
    { key: 'valor_comissao', header: 'Comissão', align: 'right', render: (v) => fmtBRL(v) },
    { key: 'valor_desconto', header: 'Desc.', align: 'right', render: (v) => fmtBRL(v) },
    { key: 'valor_icms', header: 'ICMS', align: 'right', render: (v) => fmtBRL(v) },
    { key: 'valor_ipi', header: 'IPI', align: 'right', render: (v) => fmtBRL(v) },
    { key: 'valor_pis', header: 'PIS', align: 'right', render: (v) => fmtBRL(v) },
    { key: 'valor_cofins', header: 'COFINS', align: 'right', render: (v) => fmtBRL(v) },
    { key: 'valor_frete', header: 'Frete', align: 'right', render: (v) => fmtBRL(v) },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Faturamento Genius"
        description="Análise de faturamento por revenda, origem, cliente, pedido e nota fiscal"
        actions={
          <>
            <Button size="sm" onClick={() => consultar(1)} disabled={loading}>
              {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Search className="mr-1 h-3 w-3" />}
              Consultar
            </Button>
            <ExportButton
              endpoint="/api/export/faturamento-genius"
              params={buildParams(filters)}
              label="Exportar Excel"
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={updating}>
                  {updating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-1 h-3 w-3" />}
                  Atualizar Comercial
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar atualização comercial</AlertDialogTitle>
                  <AlertDialogDescription>
                    Deseja atualizar VM_FATURAMENTO, VM_CONCILIACAO_IMPOSTOS e executar ATU_COMERCIAL para o período selecionado
                    ({fmtAnomes(filters.anomes_ini)} → {fmtAnomes(filters.anomes_fim)})?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={atualizarComercial}>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      />

      <ErpConnectionAlert />

      <FilterPanel onSearch={() => consultar(1)} onClear={limpar}>
        <div className="space-y-1">
          <Label className="text-xs">Ano/Mês inicial (YYYYMM)</Label>
          <Input value={filters.anomes_ini} onChange={(e) => update('anomes_ini', e.target.value)} placeholder="202501" maxLength={6} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ano/Mês final (YYYYMM)</Label>
          <Input value={filters.anomes_fim} onChange={(e) => update('anomes_fim', e.target.value)} placeholder="202512" maxLength={6} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Revenda</Label>
          <Input value={filters.revenda} onChange={(e) => update('revenda', e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Origem</Label>
          <Select value={filters.origem} onValueChange={(v) => update('origem', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ORIGEM_OPTIONS.map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tipo movimento</Label>
          <Select value={filters.tipo_movimento} onValueChange={(v) => update('tipo_movimento', v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPO_MOV_OPTIONS.map((o) => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Cliente</Label>
          <Input value={filters.cliente} onChange={(e) => update('cliente', e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Representante</Label>
          <Input value={filters.representante} onChange={(e) => update('representante', e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Produto</Label>
          <Input value={filters.produto} onChange={(e) => update('produto', e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Pedido</Label>
          <Input value={filters.pedido} onChange={(e) => update('pedido', e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">NF</Label>
          <Input value={filters.nf} onChange={(e) => update('nf', e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <Switch
            id="somente-com-revenda"
            checked={filters.somente_com_revenda}
            onCheckedChange={(c) => update('somente_com_revenda', c)}
          />
          <Label htmlFor="somente-com-revenda" className="text-xs cursor-pointer">Somente com revenda</Label>
        </div>
      </FilterPanel>

      {error && !loading && (
        <Card className="border-destructive/40">
          <CardContent className="p-3 text-xs text-destructive">{error}</CardContent>
        </Card>
      )}

      {dashboard && (
        <div className="space-y-4">
          <KpiGroup title="Valores" tone="volume" icon={<DollarSign className="h-3.5 w-3.5" />}>
            <KPICard title="Valor Total" value={fmtBRL(kpis.valor_total)} icon={<DollarSign className="h-4 w-4" />} variant="success" index={0} />
            <KPICard title="Valor Bruto" value={fmtBRL(kpis.valor_bruto)} icon={<Receipt className="h-4 w-4" />} index={1} />
            <KPICard title="Devolução" value={fmtBRL(kpis.valor_devolucao)} icon={<TrendingDown className="h-4 w-4" />} variant="warning" index={2} />
            <KPICard title="Custo" value={fmtBRL(kpis.valor_custo)} icon={<Wallet className="h-4 w-4" />} index={3} />
            <KPICard title="Comissão" value={fmtBRL(kpis.valor_comissao)} icon={<Wallet className="h-4 w-4" />} index={4} />
            <KPICard title="Margem Bruta" value={fmtBRL(kpis.margem_bruta)} icon={<DollarSign className="h-4 w-4" />} variant={Number(kpis.margem_bruta ?? 0) < 0 ? 'destructive' : 'success'} index={5} />
            <KPICard title="Margem %" value={fmtPct(kpis.margem_percentual)} icon={<Percent className="h-4 w-4" />} variant={margemPct < 0 ? 'destructive' : 'success'} index={6} />
          </KpiGroup>

          <KpiGroup title="Volume" tone="saude" icon={<FileText className="h-3.5 w-3.5" />}>
            <KPICard title="Notas" value={fmtNum(kpis.quantidade_notas)} icon={<FileText className="h-4 w-4" />} index={0} />
            <KPICard title="Pedidos" value={fmtNum(kpis.quantidade_pedidos)} icon={<ShoppingBag className="h-4 w-4" />} index={1} />
            <KPICard title="Clientes" value={fmtNum(kpis.quantidade_clientes)} icon={<Users className="h-4 w-4" />} index={2} />
            <KPICard title="Revendas" value={fmtNum(kpis.quantidade_revendas)} icon={<Store className="h-4 w-4" />} index={3} />
            <KPICard title="Produtos" value={fmtNum(kpis.quantidade_produtos)} icon={<Package className="h-4 w-4" />} index={4} />
          </KpiGroup>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">Faturamento por Revenda</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={colsRevenda} data={dashboard.por_revenda || []} emptyMessage="Sem dados por revenda." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">Faturamento por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={colsOrigem} data={dashboard.por_origem || []} emptyMessage="Sem dados por origem." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">Faturamento por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={colsMes} data={dashboard.por_mes || []} emptyMessage="Sem dados por mês." />
            </CardContent>
          </Card>
        </div>
      )}

      {detalhe && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold tracking-tight">Detalhe do Faturamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <DataTable
              columns={colsDetalhe}
              data={detalhe.dados || []}
              loading={loading}
              emptyMessage="Sem registros para os filtros aplicados."
            />
            {detalhe.total_paginas > 0 && (
              <PaginationControl
                pagina={detalhe.pagina}
                totalPaginas={detalhe.total_paginas}
                totalRegistros={detalhe.total_registros}
                onPageChange={recarregarDetalhe}
              />
            )}
          </CardContent>
        </Card>
      )}

      {!dashboard && !detalhe && !loading && !error && (
        <Card>
          <CardContent className="p-6 text-center text-xs text-muted-foreground">
            Defina os filtros e clique em <span className="font-medium">Pesquisar</span> para carregar o painel.
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        A revenda vem de VM_FATURAMENTO.CD_REV_PEDIDO. Para produtos, a origem é E120IPD.USU_REVPED;
        serviços/devoluções podem aparecer como OUTROS conforme a view atual.
      </p>
    </div>
  );
}
