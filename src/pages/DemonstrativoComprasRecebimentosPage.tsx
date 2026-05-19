import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  getDemonstrativoComprasRecebimentos,
  type DemonstrativoFilters,
  type DemonstrativoNivel,
  type DemonstrativoOrigem,
  type DemonstrativoResposta,
  type DemonstrativoDrillRow,
  type DemonstrativoSerieItem,
} from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { ExportButton } from '@/components/erp/ExportButton';
import { AutocompleteAsync } from '@/components/erp/AutocompleteAsync';
import {
  fetchFornecedoresCadastro,
  fetchCentrosCusto,
  fetchDepositos,
  fetchTransacoesCompras,
} from '@/hooks/useCadastrosErp';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { formatNumber, formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import {
  ShoppingCart, Receipt, AlertTriangle, TrendingUp, FileText, Users,
  ChevronRight, Home, Hash, Undo2,
} from 'lucide-react';
import {
  KpiCard, KpiGrid,
  BarChartCard, LineChartCard, PieChartCard, HorizontalBarChartCard,
  StackedBarChartCard,
  LoadingState, ErrorState, NoDataState,
} from '@/components/bi';

const NIVEL_LABEL: Record<DemonstrativoNivel, string> = {
  projeto_macro: 'Projeto Macro',
  numero_projeto: 'Projeto',
  centro_custo: 'Centro de Custo',
  tipo_despesa: 'Tipo de Despesa',
  mes_competencia: 'Mês',
  fornecedor: 'Fornecedor',
  documento: 'Documento',
  item: 'Item',
  transacao: 'Transação',
  deposito: 'Depósito',
};

// Fluxo padrão de drill conforme requisito
const DRILL_FLOW: DemonstrativoNivel[] = [
  'projeto_macro', 'numero_projeto', 'centro_custo', 'tipo_despesa',
  'fornecedor', 'documento', 'item',
];

// Mapa nível → campo de filtro a ser preenchido ao clicar em uma linha
const NIVEL_TO_FILTRO: Record<DemonstrativoNivel, keyof DemonstrativoFilters> = {
  projeto_macro: 'projeto_macro',
  numero_projeto: 'numero_projeto',
  centro_custo: 'centro_custo',
  tipo_despesa: 'tipo_despesa',
  mes_competencia: 'mes_competencia',
  fornecedor: 'fornecedor',
  documento: 'documento',
  item: 'descricao_item',
  transacao: 'transacao',
  deposito: 'deposito',
};

interface CrumbStep {
  nivel: DemonstrativoNivel;
  chave: string;
  label: string;
  filtroAplicado: keyof DemonstrativoFilters;
}

const defaultFilters = (): DemonstrativoFilters => ({
  origem: 'TODOS',
  nivel: 'projeto_macro',
  data_ini: '',
  data_fim: '',
  projeto_macro: '',
  numero_projeto: '',
  centro_custo: '',
  tipo_despesa: '',
  mes_competencia: '',
  fornecedor: '',
  condicao_pagamento: '',
  transacao: '',
  descricao_item: '',
  deposito: '',
  familia: '',
  origem_material: '',
  numero_oc: '',
  numero_nf: '',
  documento: '',
  tipo_item: '',
});

function toSerie(items: DemonstrativoSerieItem[] | undefined, valueKey: 'valor_comprado' | 'valor_recebido' | 'valor_pendente' | 'valor' = 'valor_comprado'): { label: string; valor: number }[] {
  if (!Array.isArray(items)) return [];
  return items.map((it) => ({
    label: String(it.label ?? it.chave ?? it.mes ?? '—'),
    valor: Number((it as any)[valueKey] ?? it.valor ?? 0),
  }));
}

export default function DemonstrativoComprasRecebimentosPage() {
  const erpReady = useErpReady();
  const [filters, setFilters] = useState<DemonstrativoFilters>(defaultFilters());
  const [stack, setStack] = useState<CrumbStep[]>([]);
  const [verDetalhe, setVerDetalhe] = useState(false);
  const [data, setData] = useState<DemonstrativoResposta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentNivel: DemonstrativoNivel = filters.nivel || 'projeto_macro';

  const buildParams = useCallback((): DemonstrativoFilters => {
    const params: DemonstrativoFilters = { ...filters };
    if (verDetalhe) {
      params.incluir_detalhe = true;
      params.limite_detalhe = 500;
    }
    // remove vazios
    (Object.keys(params) as (keyof DemonstrativoFilters)[]).forEach((k) => {
      const v = params[k];
      if (v === '' || v === undefined || v === null) delete params[k];
    });
    return params;
  }, [filters, verDetalhe]);

  const fetchData = useCallback(async () => {
    if (!erpReady) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getDemonstrativoComprasRecebimentos(buildParams());
      setData(result);
    } catch (e: any) {
      if (e?.statusCode !== 401 && !e?.isNetworkError) {
        toast.error(e?.message || 'Falha ao carregar demonstrativo');
      }
      setError(e?.message || 'Erro ao carregar dados');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [erpReady, buildParams]);

  useEffect(() => {
    if (erpReady) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [erpReady, verDetalhe, filters.nivel, filters.origem]);

  const handleSearch = useCallback(() => {
    setStack([]);
    fetchData();
  }, [fetchData]);

  const handleClear = useCallback(() => {
    setStack([]);
    setFilters((f) => ({
      ...defaultFilters(),
      data_ini: f.data_ini,
      data_fim: f.data_fim,
      origem: 'TODOS',
      nivel: 'projeto_macro',
    }));
  }, []);

  const handleDrillClick = useCallback((row: DemonstrativoDrillRow) => {
    const idx = DRILL_FLOW.indexOf(currentNivel);
    if (idx < 0 || idx >= DRILL_FLOW.length - 1) return;
    const next = DRILL_FLOW[idx + 1];
    const filtroKey = NIVEL_TO_FILTRO[currentNivel];
    setStack((s) => [...s, { nivel: currentNivel, chave: row.chave, label: row.label, filtroAplicado: filtroKey }]);
    setFilters((f) => ({ ...f, [filtroKey]: row.chave, nivel: next }));
  }, [currentNivel]);

  const handleVoltarNivel = useCallback(() => {
    if (stack.length === 0) return;
    const last = stack[stack.length - 1];
    setStack((s) => s.slice(0, -1));
    setFilters((f) => ({ ...f, [last.filtroAplicado]: '', nivel: last.nivel }));
  }, [stack]);

  const handleBreadcrumb = useCallback((index: number) => {
    // index = -1 → root
    const newStack = index < 0 ? [] : stack.slice(0, index + 1);
    const removed = stack.slice(newStack.length);
    const updates: Partial<DemonstrativoFilters> = {};
    removed.forEach((s) => { (updates as any)[s.filtroAplicado] = ''; });
    const newNivel: DemonstrativoNivel = newStack.length === 0
      ? 'projeto_macro'
      : DRILL_FLOW[Math.min(DRILL_FLOW.indexOf(newStack[newStack.length - 1].nivel) + 1, DRILL_FLOW.length - 1)];
    setStack(newStack);
    setFilters((f) => ({ ...f, ...updates, nivel: newNivel }));
  }, [stack]);

  const exportParams = useMemo(() => buildParams() as Record<string, any>, [buildParams]);

  const kpis = data?.kpis;
  const graficos = data?.graficos || {};
  const drill = data?.drill || [];
  const detalhe = data?.detalhe || [];

  const drillColumns: Column<DemonstrativoDrillRow>[] = useMemo(() => [
    { key: 'chave', header: 'Chave' },
    { key: 'label', header: NIVEL_LABEL[currentNivel] },
    { key: 'valor_comprado', header: 'Comprado', align: 'right', render: (v) => formatCurrency(Number(v) || 0) },
    { key: 'valor_recebido', header: 'Recebido', align: 'right', render: (v) => formatCurrency(Number(v) || 0) },
    { key: 'valor_pendente', header: 'Pendente', align: 'right', render: (v) => formatCurrency(Number(v) || 0) },
    { key: 'diferenca_comprado_recebido', header: 'Diferença', align: 'right', render: (v) => formatCurrency(Number(v) || 0) },
    { key: 'qtd_linhas', header: 'Linhas', align: 'right', render: (v) => formatNumber(Number(v) || 0, 0) },
    { key: 'qtd_fornecedores', header: 'Forn.', align: 'right', render: (v) => formatNumber(Number(v) || 0, 0) },
    { key: 'qtd_documentos', header: 'Docs', align: 'right', render: (v) => formatNumber(Number(v) || 0, 0) },
  ], [currentNivel]);

  const detalheColumns: Column<any>[] = useMemo(() => [
    { key: 'origem_dado', header: 'Origem' },
    { key: 'projeto_macro', header: 'Proj. Macro' },
    { key: 'mes_competencia', header: 'Mês' },
    { key: 'numero_projeto', header: 'Projeto' },
    { key: 'nome_projeto', header: 'Nome projeto' },
    { key: 'codigo_centro_custo', header: 'Cód. CC' },
    { key: 'descricao_centro_custo', header: 'Centro de Custo' },
    { key: 'tipo_despesa', header: 'Tipo despesa' },
    { key: 'codigo_fornecedor', header: 'Cód. Forn.' },
    { key: 'nome_fornecedor', header: 'Fornecedor' },
    { key: 'documento', header: 'Documento' },
    { key: 'numero_oc', header: 'Nº OC' },
    { key: 'numero_nf', header: 'Nº NF' },
    { key: 'serie_nf', header: 'Série' },
    { key: 'tipo_item', header: 'Tipo item' },
    { key: 'sequencia_item', header: 'Seq.' },
    { key: 'codigo_item', header: 'Cód. Item' },
    { key: 'descricao_item', header: 'Descrição' },
    { key: 'derivacao', header: 'Derivação' },
    { key: 'unidade_medida', header: 'UM' },
    { key: 'codigo_familia', header: 'Família' },
    { key: 'origem_material', header: 'Origem mat.' },
    { key: 'transacao', header: 'Transação' },
    { key: 'deposito', header: 'Depósito' },
    { key: 'quantidade_pedida', header: 'Qtd ped.', align: 'right', render: (v) => formatNumber(Number(v) || 0, 2) },
    { key: 'quantidade_recebida', header: 'Qtd rec.', align: 'right', render: (v) => formatNumber(Number(v) || 0, 2) },
    { key: 'quantidade_pendente', header: 'Qtd pend.', align: 'right', render: (v) => formatNumber(Number(v) || 0, 2) },
    { key: 'valor_bruto', header: 'V. bruto', align: 'right', render: (v) => formatCurrency(Number(v) || 0) },
    { key: 'valor_comprado', header: 'V. comprado', align: 'right', render: (v) => formatCurrency(Number(v) || 0) },
    { key: 'valor_recebido', header: 'V. recebido', align: 'right', render: (v) => formatCurrency(Number(v) || 0) },
    { key: 'valor_pendente', header: 'V. pendente', align: 'right', render: (v) => formatCurrency(Number(v) || 0) },
    { key: 'diferenca_comprado_recebido', header: 'Diferença', align: 'right', render: (v) => formatCurrency(Number(v) || 0) },
  ], []);

  // Comparativo Comprado x Recebido x Pendente
  const comparativoData = useMemo(() => {
    if (Array.isArray(graficos.comprado_recebido_pendente) && graficos.comprado_recebido_pendente.length) {
      return graficos.comprado_recebido_pendente.map((it) => ({
        label: String(it.label ?? it.chave ?? '—'),
        valor: Number(it.valor ?? it.valor_comprado ?? 0),
      }));
    }
    if (!kpis) return [];
    return [
      { label: 'Comprado', valor: kpis.valor_comprado },
      { label: 'Recebido', valor: kpis.valor_recebido },
      { label: 'Pendente', valor: kpis.valor_pendente },
    ];
  }, [graficos.comprado_recebido_pendente, kpis]);

  const podeAvancar = DRILL_FLOW.indexOf(currentNivel) >= 0 && DRILL_FLOW.indexOf(currentNivel) < DRILL_FLOW.length - 1;

  return (
    <div className="space-y-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Demonstrativo de Compras e Recebimentos"
        description="Análise gerencial de compras, recebimentos e seu comparativo, com drill-down completo."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border px-2 py-1">
              <Switch id="ver-detalhe" checked={verDetalhe} onCheckedChange={setVerDetalhe} />
              <Label htmlFor="ver-detalhe" className="cursor-pointer text-xs">Ver detalhe</Label>
            </div>
            <ExportButton
              endpoint="/api/export/demonstrativo-compras-recebimentos"
              params={exportParams}
            />
          </div>
        }
      />

      <FilterPanel onSearch={handleSearch} onClear={handleClear}>
        <div>
          <Label className="text-xs">Período inicial</Label>
          <Input type="date" className="h-8 text-xs" value={filters.data_ini || ''}
            onChange={(e) => setFilters((f) => ({ ...f, data_ini: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Período final</Label>
          <Input type="date" className="h-8 text-xs" value={filters.data_fim || ''}
            onChange={(e) => setFilters((f) => ({ ...f, data_fim: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Origem</Label>
          <Select value={filters.origem || 'TODOS'}
            onValueChange={(v) => setFilters((f) => ({ ...f, origem: v as DemonstrativoOrigem }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="COMPRAS">Compras</SelectItem>
              <SelectItem value="RECEBIMENTOS">Recebimentos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Projeto macro</Label>
          <Input className="h-8 text-xs" value={filters.projeto_macro || ''}
            onChange={(e) => setFilters((f) => ({ ...f, projeto_macro: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Projeto</Label>
          <Input className="h-8 text-xs" value={filters.numero_projeto || ''}
            onChange={(e) => setFilters((f) => ({ ...f, numero_projeto: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Centro de custo</Label>
          <AutocompleteAsync
            value={filters.centro_custo || ''}
            onChange={(v) => setFilters((f) => ({ ...f, centro_custo: v }))}
            fetcher={fetchCentrosCusto}
            placeholder="Todos"
          />
        </div>
        <div>
          <Label className="text-xs">Tipo de despesa</Label>
          <Input className="h-8 text-xs" value={filters.tipo_despesa || ''}
            onChange={(e) => setFilters((f) => ({ ...f, tipo_despesa: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Fornecedor</Label>
          <AutocompleteAsync
            value={filters.fornecedor || ''}
            onChange={(v) => setFilters((f) => ({ ...f, fornecedor: v }))}
            fetcher={fetchFornecedoresCadastro}
            placeholder="Todos"
          />
        </div>
        <div>
          <Label className="text-xs">Transação</Label>
          <AutocompleteAsync
            value={filters.transacao || ''}
            onChange={(v) => setFilters((f) => ({ ...f, transacao: v }))}
            fetcher={fetchTransacoesCompras}
            placeholder="Todas"
          />
        </div>
        <div>
          <Label className="text-xs">Depósito</Label>
          <AutocompleteAsync
            value={filters.deposito || ''}
            onChange={(v) => setFilters((f) => ({ ...f, deposito: v }))}
            fetcher={fetchDepositos}
            placeholder="Todos"
          />
        </div>
        <div>
          <Label className="text-xs">Família</Label>
          <Input className="h-8 text-xs" value={filters.familia || ''}
            onChange={(e) => setFilters((f) => ({ ...f, familia: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Origem material</Label>
          <Input className="h-8 text-xs" value={filters.origem_material || ''}
            onChange={(e) => setFilters((f) => ({ ...f, origem_material: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Documento</Label>
          <Input className="h-8 text-xs" value={filters.documento || ''}
            onChange={(e) => setFilters((f) => ({ ...f, documento: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Nº OC</Label>
          <Input className="h-8 text-xs" value={filters.numero_oc || ''}
            onChange={(e) => setFilters((f) => ({ ...f, numero_oc: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Nº NF</Label>
          <Input className="h-8 text-xs" value={filters.numero_nf || ''}
            onChange={(e) => setFilters((f) => ({ ...f, numero_nf: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Descrição do item</Label>
          <Input className="h-8 text-xs" value={filters.descricao_item || ''}
            onChange={(e) => setFilters((f) => ({ ...f, descricao_item: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Tipo de item</Label>
          <Select value={filters.tipo_item || 'TODOS'}
            onValueChange={(v) => setFilters((f) => ({ ...f, tipo_item: v === 'TODOS' ? '' : v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="PRODUTO">Produto</SelectItem>
              <SelectItem value="SERVICO">Serviço</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Mês competência (YYYY-MM)</Label>
          <Input className="h-8 text-xs" placeholder="2026-05" value={filters.mes_competencia || ''}
            onChange={(e) => setFilters((f) => ({ ...f, mes_competencia: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Nível do drill</Label>
          <Select value={filters.nivel || 'projeto_macro'}
            onValueChange={(v) => setFilters((f) => ({ ...f, nivel: v as DemonstrativoNivel }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(NIVEL_LABEL) as DemonstrativoNivel[]).map((n) => (
                <SelectItem key={n} value={n}>{NIVEL_LABEL[n]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterPanel>

      {/* KPIs */}
      <KpiGrid cols={7}>
        <KpiCard title="Valor Comprado" value={kpis?.valor_comprado ?? 0} format="currency"
          icon={<ShoppingCart className="h-4 w-4" />} variant="info" loading={loading} />
        <KpiCard title="Valor Recebido" value={kpis?.valor_recebido ?? 0} format="currency"
          icon={<Receipt className="h-4 w-4" />} variant="success" loading={loading} />
        <KpiCard title="Valor Pendente" value={kpis?.valor_pendente ?? 0} format="currency"
          icon={<AlertTriangle className="h-4 w-4" />} variant="warning" loading={loading} />
        <KpiCard title="Diferença C x R" value={kpis?.diferenca_comprado_recebido ?? 0} format="currency"
          icon={<TrendingUp className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Qtd. Linhas" value={kpis?.qtd_linhas ?? 0} format="number"
          icon={<Hash className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Fornecedores" value={kpis?.qtd_fornecedores ?? 0} format="number"
          icon={<Users className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Documentos" value={kpis?.qtd_documentos ?? 0} format="number"
          icon={<FileText className="h-4 w-4" />} loading={loading} />
      </KpiGrid>

      {/* Estado de erro global */}
      {error && !loading && (
        <ErrorState message={error} onRetry={fetchData} />
      )}

      {/* Gráficos */}
      {!error && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <BarChartCard
            title="Comprado x Recebido x Pendente"
            data={comparativoData}
            loading={loading}
            height={260}
          />
          <StackedBarChartCard
            title="Por mês"
            data={(graficos.por_mes || []).map((it) => ({
              label: String(it.label ?? it.mes ?? ''),
              comprado: Number(it.valor_comprado ?? 0),
              recebido: Number(it.valor_recebido ?? 0),
              pendente: Number(it.valor_pendente ?? 0),
            }))}
            series={[
              { dataKey: 'comprado', label: 'Comprado' },
              { dataKey: 'recebido', label: 'Recebido' },
              { dataKey: 'pendente', label: 'Pendente' },
            ]}
            loading={loading}
            height={260}
          />
          <PieChartCard
            title="Por tipo de despesa"
            data={toSerie(graficos.por_tipo_despesa)}
            loading={loading}
            height={260}
          />
          <BarChartCard
            title="Por projeto macro"
            data={toSerie(graficos.por_projeto_macro)}
            loading={loading}
            height={260}
          />
          <HorizontalBarChartCard
            title="Top fornecedores"
            data={toSerie(graficos.por_fornecedor).slice(0, 10)}
            loading={loading}
            height={300}
          />
          <HorizontalBarChartCard
            title="Por centro de custo"
            data={toSerie(graficos.por_centro_custo).slice(0, 10)}
            loading={loading}
            height={300}
          />
        </div>
      )}

      {/* Drill-down */}
      <Card>
        <CardHeader className="space-y-2 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">Drill-down</CardTitle>
              <Badge variant="outline" className="text-xs">Nível: {NIVEL_LABEL[currentNivel]}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={stack.length === 0} onClick={handleVoltarNivel}>
                <Undo2 className="mr-1 h-3 w-3" /> Voltar nível
              </Button>
            </div>
          </div>
          <Breadcrumb stack={stack} currentNivel={currentNivel} onClick={handleBreadcrumb} />
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState height={220} variant="skeleton" />
          ) : drill.length === 0 ? (
            <NoDataState height={200} message="Nenhum registro encontrado para os filtros selecionados." />
          ) : (
            <DataTable
              columns={drillColumns}
              data={drill}
              onRowClick={podeAvancar ? (row) => handleDrillClick(row as DemonstrativoDrillRow) : undefined}
            />
          )}
          {podeAvancar && drill.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Clique em uma linha para detalhar por{' '}
              <strong>{NIVEL_LABEL[DRILL_FLOW[DRILL_FLOW.indexOf(currentNivel) + 1]]}</strong>.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Detalhe */}
      {verDetalhe && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">
              Detalhes {detalhe.length > 0 && <span className="ml-1 text-xs text-muted-foreground">({detalhe.length} linhas)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState height={220} variant="skeleton" />
            ) : detalhe.length === 0 ? (
              <NoDataState height={160} message="Nenhum detalhe disponível para os filtros atuais." />
            ) : (
              <div className="overflow-x-auto">
                <DataTable columns={detalheColumns} data={detalhe} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data?.observacao && (
        <p className="text-[11px] italic text-muted-foreground">{data.observacao}</p>
      )}
    </div>
  );
}

interface BreadcrumbProps {
  stack: CrumbStep[];
  currentNivel: DemonstrativoNivel;
  onClick: (index: number) => void;
}

function Breadcrumb({ stack, currentNivel, onClick }: BreadcrumbProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      <button onClick={() => onClick(-1)} className="inline-flex items-center gap-1 hover:text-foreground">
        <Home className="h-3 w-3" /> Início
      </button>
      {stack.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          <button onClick={() => onClick(i)} className="hover:text-foreground">
            <span className="text-muted-foreground">{NIVEL_LABEL[s.nivel]}:</span>&nbsp;{s.label}
          </button>
        </span>
      ))}
      {stack.length > 0 && (
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
          <ChevronRight className="h-3 w-3" />
          {NIVEL_LABEL[currentNivel]}
        </span>
      )}
    </div>
  );
}
