import { useState, useCallback, useMemo } from 'react';
import { api, ContasPagarResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { KPICard } from '@/components/erp/KPICard';
import { FinanceiroTreeTable } from '@/components/erp/FinanceiroTreeTable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatCurrency, formatDate } from '@/lib/format';
import {
  LinhaArvoreFinanceira,
  calcularKpisArvore,
  toggleNoArvore,
} from '@/lib/treeFinanceiro';
import { toast } from 'sonner';
import {
  DollarSign, Users, FileText, AlertTriangle, Clock,
  TrendingUp, Calendar, Receipt, CreditCard, Landmark,
} from 'lucide-react';
import { useAiPageContext } from '@/hooks/useAiPageContext';

/* ─── Status helpers ─── */
const statusLabel: Record<string, string> = {
  PAGO: 'Pago',
  PARCIAL: 'Parcial',
  VENCIDO: 'Vencido',
  A_VENCER: 'A Vencer',
  EM_ABERTO: 'Em Aberto',
};

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PAGO: 'default',
  PARCIAL: 'secondary',
  VENCIDO: 'destructive',
  A_VENCER: 'outline',
  EM_ABERTO: 'secondary',
};

/* ─── Columns: detalhada ─── */
const columnsDetalhada: Column<any>[] = [
  { key: 'filial', header: 'Filial' },
  { key: 'tipo_titulo', header: 'Tipo Tít.' },
  { key: 'numero_titulo', header: 'Nº Título' },
  { key: 'codigo_fornecedor', header: 'Cód. Forn.' },
  { key: 'nome_fornecedor', header: 'Fornecedor' },
  { key: 'fantasia_fornecedor', header: 'Fantasia' },
  { key: 'codigo_centro_custo', header: 'C. Custo', render: (v, row) => v ? `${v}${row.descricao_centro_custo ? ' - ' + row.descricao_centro_custo : ''}` : (row.centro_custo || '-') },
  { key: 'numero_projeto', header: 'Projeto', render: (v, row) => (v && v !== 0) ? String(v) : (row.projeto || '-') },
  { key: 'data_emissao', header: 'Emissão', render: (v) => formatDate(v) },
  { key: 'data_vencimento', header: 'Vencimento', render: (v) => formatDate(v) },
  { key: 'data_ultimo_movimento', header: 'Últ. Mov.', render: (v) => formatDate(v) },
  { key: 'valor_original', header: 'Vlr. Original', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'valor_aberto', header: 'Vlr. Aberto', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'valor_movimentado', header: 'Vlr. Movim.', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'valor_pago', header: 'Vlr. Pago', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'quantidade_movimentos', header: 'Qtd. Mov.', align: 'right', render: (v) => formatNumber(v, 0) },
  {
    key: 'status_titulo',
    header: 'Status',
    render: (v) => {
      const s = String(v);
      return (
        <Badge variant={statusVariant[s] || 'secondary'}>
          {statusLabel[s] || s || '-'}
        </Badge>
      );
    },
  },
  {
    key: 'dias_atraso',
    header: 'Dias Atraso',
    align: 'right',
    render: (v) => v > 0 ? <span className="text-destructive font-semibold">{v}</span> : '-',
  },
];

/* ─── Columns: agrupada por fornecedor ─── */
const columnsAgrupada: Column<any>[] = [
  { key: 'codigo_fornecedor', header: 'Cód. Forn.' },
  { key: 'nome_fornecedor', header: 'Fornecedor' },
  { key: 'fantasia_fornecedor', header: 'Fantasia' },
  { key: 'quantidade_titulos', header: 'Qtd. Títulos', align: 'right', render: (v) => formatNumber(v, 0) },
  { key: 'titulos_aberto', header: 'Tít. Aberto', align: 'right', render: (v) => formatNumber(v, 0) },
  { key: 'titulos_vencidos', header: 'Tít. Vencidos', align: 'right', render: (v) => v > 0 ? <span className="text-destructive font-semibold">{formatNumber(v, 0)}</span> : '-' },
  { key: 'valor_original_total', header: 'Vlr. Original', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'valor_aberto_total', header: 'Vlr. Aberto', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'valor_pago_total', header: 'Vlr. Pago', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'maior_atraso', header: 'Maior Atraso', align: 'right', render: (v) => v > 0 ? <span className="text-destructive font-semibold">{v} dias</span> : '-' },
  { key: 'primeiro_vencimento', header: '1º Vencimento', render: (v) => formatDate(v) },
  { key: 'ultimo_vencimento', header: 'Últ. Vencimento', render: (v) => formatDate(v) },
];

/* ─── Initial filters ─── */
const initialFilters = {
  fornecedor: '',
  numero_titulo: '',
  tipo_titulo: '',
  filial: '',
  centro_custo: '',
  projeto: '',
  numero_projeto: '',
  status_titulo: '',
  somente_vencidos: false,
  somente_saldo_aberto: false,
  somente_cheques: false,
  data_emissao_ini: '',
  data_emissao_fim: '',
  data_vencimento_ini: '',
  data_vencimento_fim: '',
  data_pagamento_ini: '',
  data_pagamento_fim: '',
  valor_min: '',
  valor_max: '',
  agrupar_por_fornecedor: false,
  modo_arvore: false,
};

export default function ContasPagarPage() {
  const [filters, setFilters] = useState({ ...initialFilters });
  const [data, setData] = useState<ContasPagarResponse | null>(null);
  const [arvoreData, setArvoreData] = useState<LinhaArvoreFinanceira[] | null>(null);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);

  const erpReady = useErpReady();

  const modoArvoreAtivo = filters.modo_arvore && !filters.agrupar_por_fornecedor;

  const search = useCallback(
    async (page = 1) => {
      if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
      setLoading(true);
      try {
        const params: any = { ...filters, pagina: page, tamanho_pagina: 100 };
        if (params.valor_min) params.valor_min = parseFloat(params.valor_min);
        else delete params.valor_min;
        if (params.valor_max) params.valor_max = parseFloat(params.valor_max);
        else delete params.valor_max;
        if (!params.status_titulo) delete params.status_titulo;
        if (!params.tipo_titulo) delete params.tipo_titulo;
        if (!params.filial) delete params.filial;
        if (!params.centro_custo) delete params.centro_custo;
        if (!params.projeto) delete params.projeto;
        if (!params.numero_projeto) delete params.numero_projeto;
        if (!params.fornecedor) delete params.fornecedor;
        if (!params.numero_titulo) delete params.numero_titulo;
        if (!params.somente_vencidos) delete params.somente_vencidos;
        if (!params.somente_saldo_aberto) delete params.somente_saldo_aberto;
        if (!params.somente_cheques) delete params.somente_cheques;
        if (!params.agrupar_por_fornecedor) delete params.agrupar_por_fornecedor;
        delete params.modo_arvore;
        Object.keys(params).forEach((k) => {
          if (params[k] === '' || params[k] === null || params[k] === undefined) delete params[k];
        });

        if (modoArvoreAtivo) {
          const result: any = await api.get('/api/contas-pagar-arvore', params);
          const dados: LinhaArvoreFinanceira[] = result.dados || [];
          setArvoreData(dados);
          (window as any).dadosContasPagarPagina = dados;
          setData({
            dados: [],
            pagina: result.pagina ?? page,
            tamanho_pagina: result.tamanho_pagina ?? dados.length,
            total_registros: result.total_registros ?? dados.length,
            total_paginas: result.total_paginas ?? 1,
            resumo: result.resumo,
          } as any);
          setExpandidos(new Set());
        } else {
          const result = await api.get<ContasPagarResponse>('/api/contas-pagar', params);
          setData(result);
          setArvoreData(null);
          (window as any).dadosContasPagarPagina = result.dados;
        }
        setPagina(page);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    },
    [filters, erpReady, modoArvoreAtivo],
  );

  const clearFilters = () => {
    setFilters({ ...initialFilters });
    setData(null);
    setArvoreData(null);
    setExpandidos(new Set());
    setPagina(1);
  };

  const set = (key: string, value: any) => setFilters((f) => {
    const next = { ...f, [key]: value };
    if (key === 'modo_arvore' && value) next.agrupar_por_fornecedor = false;
    if (key === 'agrupar_por_fornecedor' && value) next.modo_arvore = false;
    return next;
  });

  const handleToggleArvore = (id: string) => {
    setExpandidos((prev) => toggleNoArvore(prev, id));
  };

  const kpis = useMemo(() => {
    if (modoArvoreAtivo && arvoreData) {
      const k = calcularKpisArvore(arvoreData);
      return {
        total_titulos: k.total_titulos,
        total_fornecedores: 0,
        valor_original_total: k.valor_original_total,
        valor_aberto_total: k.valor_aberto_total,
        valor_pago_total: 0,
        titulos_vencidos: k.titulos_vencidos,
        valor_vencido_total: k.valor_vencido_total,
        valor_a_vencer_7d: 0,
        valor_a_vencer_30d: 0,
        ticket_medio: k.total_titulos ? k.valor_original_total / k.total_titulos : 0,
        maior_atraso_dias: 0,
      };
    }
    if (data?.resumo) return data.resumo;
    if (!data?.dados?.length) return null;
    const d = data.dados;
    const fornSet = new Set(d.map((r: any) => r.codigo_fornecedor));
    const valorOriginal = d.reduce((s: number, r: any) => s + (r.valor_original || 0), 0);
    const valorAberto = d.reduce((s: number, r: any) => s + (r.valor_aberto || 0), 0);
    const valorPago = d.reduce((s: number, r: any) => s + (r.valor_pago || 0), 0);
    const vencidos = d.filter((r: any) => r.status_titulo === 'VENCIDO');
    const maiorAtraso = Math.max(0, ...d.map((r: any) => r.dias_atraso || 0));
    return {
      total_titulos: d.length,
      total_fornecedores: fornSet.size,
      valor_original_total: valorOriginal,
      valor_aberto_total: valorAberto,
      valor_pago_total: valorPago,
      titulos_vencidos: vencidos.length,
      valor_vencido_total: vencidos.reduce((s: number, r: any) => s + (r.valor_aberto || 0), 0),
      valor_a_vencer_7d: (() => {
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const em7d = new Date(hoje); em7d.setDate(hoje.getDate() + 7);
        return d.filter((r: any) => {
          if (!r.data_vencimento || r.status_titulo === 'PAGO') return false;
          const venc = new Date(r.data_vencimento);
          return venc >= hoje && venc <= em7d;
        }).reduce((s: number, r: any) => s + (r.valor_aberto || 0), 0);
      })(),
      valor_a_vencer_30d: (() => {
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        const em30d = new Date(hoje); em30d.setDate(hoje.getDate() + 30);
        return d.filter((r: any) => {
          if (!r.data_vencimento || r.status_titulo === 'PAGO') return false;
          const venc = new Date(r.data_vencimento);
          return venc >= hoje && venc <= em30d;
        }).reduce((s: number, r: any) => s + (r.valor_aberto || 0), 0);
      })(),
      ticket_medio: d.length > 0 ? valorOriginal / d.length : 0,
      maior_atraso_dias: maiorAtraso,
    };
  }, [data, modoArvoreAtivo, arvoreData]);

  useAiPageContext({
    title: 'Contas a Pagar',
    filters,
    kpis: kpis ? {
      'Total Títulos': kpis.total_titulos,
      'Valor Original': formatCurrency(kpis.valor_original_total),
      'Valor Aberto': formatCurrency(kpis.valor_aberto_total),
      'Vencidos': kpis.titulos_vencidos,
      'Valor Vencido': formatCurrency(kpis.valor_vencido_total),
      'A Vencer 7d': formatCurrency(kpis.valor_a_vencer_7d ?? 0),
      'A Vencer 30d': formatCurrency(kpis.valor_a_vencer_30d ?? 0),
      'Maior Atraso (dias)': kpis.maior_atraso_dias ?? 0,
    } : undefined,
    summary: data
      ? `${data.total_registros} títulos; página ${pagina}/${data.total_paginas}`
      : undefined,
  });


  const columns = filters.agrupar_por_fornecedor ? columnsAgrupada : columnsDetalhada;
  const exportParams = { ...filters };

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Contas a Pagar"
        description="Consulta analítica de títulos financeiros a pagar"
        actions={<ExportButton endpoint="/api/export/contas-pagar" params={exportParams} />}
      />

      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        {/* Linha 1 */}
        <div>
          <Label className="text-xs">Fornecedor</Label>
          <Input value={filters.fornecedor} onChange={(e) => set('fornecedor', e.target.value)} placeholder="Nome ou código" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Nº Título</Label>
          <Input value={filters.numero_titulo} onChange={(e) => set('numero_titulo', e.target.value)} placeholder="Ex: 000123" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Tipo Título</Label>
          <Input value={filters.tipo_titulo} onChange={(e) => set('tipo_titulo', e.target.value)} placeholder="Ex: NF, DP, CH" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Filial</Label>
          <Input value={filters.filial} onChange={(e) => set('filial', e.target.value)} placeholder="Cód. filial" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs" htmlFor="centroCustoContasPag">Centro de Custo</Label>
          <Input id="centroCustoContasPag" value={filters.centro_custo} onChange={(e) => set('centro_custo', e.target.value)} placeholder="Código ou nome" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs" htmlFor="numeroProjetoContasPag">Projeto</Label>
          <Input id="numeroProjetoContasPag" value={filters.numero_projeto || filters.projeto} onChange={(e) => { set('numero_projeto', e.target.value); set('projeto', e.target.value); }} placeholder="Código ou nome" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={filters.status_titulo || 'TODOS'} onValueChange={(v) => set('status_titulo', v === 'TODOS' ? '' : v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="PAGO">Pago</SelectItem>
              <SelectItem value="PARCIAL">Parcial</SelectItem>
              <SelectItem value="VENCIDO">Vencido</SelectItem>
              <SelectItem value="A_VENCER">A Vencer</SelectItem>
              <SelectItem value="EM_ABERTO">Em Aberto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Linha 2 — Datas */}
        <div>
          <Label className="text-xs">Emissão de</Label>
          <Input type="date" value={filters.data_emissao_ini} onChange={(e) => set('data_emissao_ini', e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Emissão até</Label>
          <Input type="date" value={filters.data_emissao_fim} onChange={(e) => set('data_emissao_fim', e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Vencimento de</Label>
          <Input type="date" value={filters.data_vencimento_ini} onChange={(e) => set('data_vencimento_ini', e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Vencimento até</Label>
          <Input type="date" value={filters.data_vencimento_fim} onChange={(e) => set('data_vencimento_fim', e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Pagamento de</Label>
          <Input type="date" value={filters.data_pagamento_ini} onChange={(e) => set('data_pagamento_ini', e.target.value)} className="h-8 text-xs" />
        </div>

        {/* Linha 3 */}
        <div>
          <Label className="text-xs">Pagamento até</Label>
          <Input type="date" value={filters.data_pagamento_fim} onChange={(e) => set('data_pagamento_fim', e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Valor Mín.</Label>
          <Input type="number" value={filters.valor_min} onChange={(e) => set('valor_min', e.target.value)} placeholder="0,00" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Valor Máx.</Label>
          <Input type="number" value={filters.valor_max} onChange={(e) => set('valor_max', e.target.value)} placeholder="0,00" className="h-8 text-xs" />
        </div>

        {/* Checkboxes */}
        <div className="flex items-end gap-2 pb-1">
          <Checkbox id="somente_vencidos" checked={filters.somente_vencidos} onCheckedChange={(v) => set('somente_vencidos', !!v)} />
          <Label htmlFor="somente_vencidos" className="text-xs">Somente vencidos</Label>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox id="somente_saldo_aberto" checked={filters.somente_saldo_aberto} onCheckedChange={(v) => set('somente_saldo_aberto', !!v)} />
          <Label htmlFor="somente_saldo_aberto" className="text-xs">Somente saldo aberto</Label>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox id="somente_cheques" checked={filters.somente_cheques} onCheckedChange={(v) => set('somente_cheques', !!v)} />
          <Label htmlFor="somente_cheques" className="text-xs">Somente cheques</Label>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox id="agrupar_por_fornecedor" checked={filters.agrupar_por_fornecedor} disabled={filters.modo_arvore} onCheckedChange={(v) => set('agrupar_por_fornecedor', !!v)} />
          <Label htmlFor="agrupar_por_fornecedor" className="text-xs">Agrupar por fornecedor</Label>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox id="modoArvoreContasPag" checked={filters.modo_arvore} disabled={filters.agrupar_por_fornecedor} onCheckedChange={(v) => set('modo_arvore', !!v)} />
          <Label htmlFor="modoArvoreContasPag" className="text-xs">Modo árvore de rateio</Label>
        </div>
      </FilterPanel>

      {data && kpis && (
        <>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Indicadores Gerais</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
              <KPICard index={0} title="Total Títulos" value={formatNumber(kpis.total_titulos, 0)} icon={<FileText className="h-5 w-5" />} tooltip="Quantidade total de títulos a pagar" />
              <KPICard index={1} title="Fornecedores" value={formatNumber(kpis.total_fornecedores, 0)} icon={<Users className="h-5 w-5" />} tooltip="Fornecedores distintos" />
              <KPICard index={2} title="Valor Original" value={formatCurrency(kpis.valor_original_total)} variant="info" icon={<DollarSign className="h-5 w-5" />} tooltip="Soma dos valores originais" />
              <KPICard index={3} title="Valor Aberto" value={formatCurrency(kpis.valor_aberto_total)} variant="warning" icon={<Landmark className="h-5 w-5" />} tooltip="Saldo em aberto total" />
              <KPICard index={4} title="Valor Pago" value={formatCurrency(kpis.valor_pago_total)} variant="success" icon={<CreditCard className="h-5 w-5" />} tooltip="Total já pago" />
              <KPICard index={5} title="Ticket Médio" value={formatCurrency(kpis.ticket_medio)} variant="info" icon={<TrendingUp className="h-5 w-5" />} tooltip="Valor original médio por título" />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Indicadores de Vencimento</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              <KPICard index={6} title="Títulos Vencidos" value={formatNumber(kpis.titulos_vencidos, 0)} variant="destructive" icon={<AlertTriangle className="h-5 w-5" />} tooltip="Títulos com saldo aberto e vencidos" />
              <KPICard index={7} title="Valor Vencido" value={formatCurrency(kpis.valor_vencido_total)} variant="destructive" icon={<Receipt className="h-5 w-5" />} tooltip="Soma do saldo aberto dos títulos vencidos" />
              <KPICard index={8} title="A Vencer 7 dias" value={formatCurrency(kpis.valor_a_vencer_7d)} variant="warning" icon={<Calendar className="h-5 w-5" />} tooltip="Valor a vencer nos próximos 7 dias" />
              <KPICard index={9} title="A Vencer 30 dias" value={formatCurrency(kpis.valor_a_vencer_30d)} variant="warning" icon={<Calendar className="h-5 w-5" />} tooltip="Valor a vencer nos próximos 30 dias" />
              <KPICard index={10} title="Maior Atraso" value={`${kpis.maior_atraso_dias} dias`} variant="destructive" icon={<Clock className="h-5 w-5" />} tooltip="Maior número de dias de atraso" />
            </div>
          </div>
        </>
      )}

      {data && (
        <>
          {modoArvoreAtivo && arvoreData ? (
            <FinanceiroTreeTable
              dados={arvoreData}
              expandidos={expandidos}
              onToggle={handleToggleArvore}
              loading={loading}
              emptyMessage="Nenhum título encontrado."
            />
          ) : (
            <DataTable
              columns={columns}
              data={data.dados || []}
              loading={loading}
              emptyMessage="Nenhum título encontrado."
            />
          )}

          {!modoArvoreAtivo && data.total_paginas > 1 && (
            <PaginationControl
              pagina={pagina}
              totalPaginas={data.total_paginas}
              totalRegistros={data.total_registros}
              onPageChange={(p) => search(p)}
            />
          )}
        </>
      )}
    </div>
  );
}
