import { useState, useCallback, useMemo, useEffect } from 'react';
import { api } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { ExportButton } from '@/components/erp/ExportButton';
import { ComboboxFilter } from '@/components/erp/ComboboxFilter';
import { useFornecedores } from '@/hooks/useFornecedores';
import { KPICard } from '@/components/erp/KPICard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import {
  ShoppingCart, Receipt, GitCompare, DollarSign, AlertTriangle,
  TrendingUp, FileText, Users, ChevronRight, Home,
} from 'lucide-react';

const COLORS = [
  'hsl(215,70%,45%)', 'hsl(142,70%,40%)', 'hsl(38,92%,50%)', 'hsl(0,72%,51%)',
  'hsl(199,89%,48%)', 'hsl(280,60%,50%)', 'hsl(160,60%,40%)', 'hsl(30,80%,55%)',
];

type Origem = 'TODOS' | 'COMPRAS' | 'RECEBIMENTOS';
type Nivel =
  | 'projeto_macro'
  | 'numero_projeto'
  | 'centro_custo'
  | 'tipo_despesa'
  | 'mes_competencia'
  | 'fornecedor'
  | 'documento'
  | 'item';

const NIVEL_ORDER: Nivel[] = [
  'projeto_macro', 'numero_projeto', 'centro_custo', 'tipo_despesa',
  'mes_competencia', 'fornecedor', 'documento', 'item',
];

const NIVEL_LABEL: Record<Nivel, string> = {
  projeto_macro: 'Projeto Macro',
  numero_projeto: 'Projeto',
  centro_custo: 'Centro de Custo',
  tipo_despesa: 'Tipo de Despesa',
  mes_competencia: 'Mês',
  fornecedor: 'Fornecedor',
  documento: 'Documento',
  item: 'Item',
};

interface Filters {
  projeto_macro: string;
  numero_projeto: string;
  centro_custo: string;
  tipo_despesa: string;
  descricao_item: string;
  mes_competencia: string;
  fornecedor: string;
  condicao_pagamento: string;
  transacao: string;
  data_ini: string;
  data_fim: string;
}

const emptyFilters: Filters = {
  projeto_macro: 'TODOS', numero_projeto: '', centro_custo: '', tipo_despesa: 'TODOS',
  descricao_item: '', mes_competencia: '', fornecedor: '', condicao_pagamento: '',
  transacao: '', data_ini: '', data_fim: '',
};

interface DrillRow {
  chave: string;
  label: string;
  valor_comprado?: number;
  valor_recebido?: number;
  valor_pendente?: number;
  diferenca?: number;
  qtd_documentos?: number;
}

interface Kpis {
  valor_comprado: number;
  valor_recebido: number;
  valor_pendente: number;
  diferenca_comprado_recebido: number;
  qtd_linhas: number;
  qtd_documentos: number;
  qtd_fornecedores: number;
}

interface DemonstrativoResponse {
  nivel: Nivel;
  proximo_nivel: Nivel | null;
  kpis: Kpis;
  drill: DrillRow[];
  detalhe: any[];
  serie_mes?: { mes: string; valor_comprado?: number; valor_recebido?: number }[];
  por_tipo_despesa?: { tipo_despesa: string; valor: number }[];
  ranking_fornecedores?: { fornecedor: string; valor: number }[];
}

function nextNivel(n: Nivel): Nivel | null {
  const i = NIVEL_ORDER.indexOf(n);
  return i >= 0 && i < NIVEL_ORDER.length - 1 ? NIVEL_ORDER[i + 1] : null;
}

interface CrumbStep {
  nivel: Nivel;
  chave: string;
  label: string;
}

function mergeFiltersWithStack(filters: Filters, stack: CrumbStep[]): Filters {
  const f = { ...filters };
  for (const s of stack) {
    (f as any)[s.nivel] = s.chave;
  }
  return f;
}

interface TabState {
  loading: boolean;
  data: DemonstrativoResponse | null;
  stack: CrumbStep[];
  currentNivel: Nivel;
}

const initialTabState = (): TabState => ({
  loading: false,
  data: null,
  stack: [],
  currentNivel: 'projeto_macro',
});

export default function DemonstrativoComprasRecebimentosPage() {
  const erpReady = useErpReady();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [tab, setTab] = useState<Origem>('COMPRAS');
  const [states, setStates] = useState<Record<Origem, TabState>>({
    TODOS: initialTabState(),
    COMPRAS: initialTabState(),
    RECEBIMENTOS: initialTabState(),
  });
  const { fornecedores, loading: loadingForn } = useFornecedores(erpReady);

  const current = states[tab];

  const fetchData = useCallback(
    async (origem: Origem, stack: CrumbStep[], nivel: Nivel) => {
      if (!erpReady) return;
      setStates((s) => ({ ...s, [origem]: { ...s[origem], loading: true } }));
      try {
        const merged = mergeFiltersWithStack(filters, stack);
        const params: Record<string, any> = { origem, nivel };
        Object.entries(merged).forEach(([k, v]) => {
          if (v === undefined || v === null || v === '') return;
          if (v === 'TODOS') return;
          params[k] = v;
        });
        const result = await api.get<DemonstrativoResponse>(
          '/api/demonstrativo-compras-recebimentos',
          params,
        );
        setStates((s) => ({
          ...s,
          [origem]: { loading: false, data: result, stack, currentNivel: nivel },
        }));
      } catch (e: any) {
        setStates((s) => ({ ...s, [origem]: { ...s[origem], loading: false } }));
        if (e?.statusCode !== 401 && !e?.isNetworkError) {
          toast.error(e?.message || 'Falha ao carregar demonstrativo');
        }
      }
    },
    [erpReady, filters],
  );

  // Load current tab on mount/tab-change
  useEffect(() => {
    if (!erpReady) return;
    if (!states[tab].data && !states[tab].loading) {
      fetchData(tab, [], 'projeto_macro');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, erpReady]);

  const handleSearch = useCallback(() => {
    // refetch all tabs that have been opened
    (['TODOS', 'COMPRAS', 'RECEBIMENTOS'] as Origem[]).forEach((o) => {
      if (o === tab || states[o].data) {
        fetchData(o, [], 'projeto_macro');
      }
    });
  }, [tab, states, fetchData]);

  const handleClear = useCallback(() => {
    setFilters(emptyFilters);
    setStates({
      TODOS: initialTabState(),
      COMPRAS: initialTabState(),
      RECEBIMENTOS: initialTabState(),
    });
    setTimeout(() => fetchData(tab, [], 'projeto_macro'), 0);
  }, [tab, fetchData]);

  const handleDrillClick = useCallback(
    (row: DrillRow) => {
      const next = nextNivel(current.currentNivel);
      if (!next) return;
      const newStack: CrumbStep[] = [
        ...current.stack,
        { nivel: current.currentNivel, chave: row.chave, label: row.label },
      ];
      fetchData(tab, newStack, next);
    },
    [current, tab, fetchData],
  );

  const handleBreadcrumb = useCallback(
    (index: number) => {
      // index = -1 → root
      const newStack = index < 0 ? [] : current.stack.slice(0, index + 1);
      const newNivel: Nivel = newStack.length === 0
        ? 'projeto_macro'
        : nextNivel(newStack[newStack.length - 1].nivel) || 'projeto_macro';
      fetchData(tab, newStack, newNivel);
    },
    [current, tab, fetchData],
  );

  const exportParams = useMemo(() => {
    const merged = mergeFiltersWithStack(filters, current.stack);
    return { ...merged, origem: tab, nivel: current.currentNivel };
  }, [filters, current, tab]);

  return (
    <div className="space-y-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Demonstrativo de Compras e Recebimentos"
        description="Análise gerencial de compras, recebimentos e seu comparativo, com drill-down completo."
        actions={
          <ExportButton
            endpoint="/api/export/demonstrativo-compras-recebimentos"
            params={exportParams}
          />
        }
      />

      <FilterPanel onSearch={handleSearch} onClear={handleClear}>
        <div>
          <Label className="text-xs">Projeto macro</Label>
          <Select
            value={filters.projeto_macro}
            onValueChange={(v) => setFilters((f) => ({ ...f, projeto_macro: v }))}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="GENIUS">Genius</SelectItem>
              <SelectItem value="ESTRUTURAL">Estrutural</SelectItem>
              <SelectItem value="OUTROS">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Projeto</Label>
          <Input className="h-8 text-xs" value={filters.numero_projeto}
            onChange={(e) => setFilters((f) => ({ ...f, numero_projeto: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Centro de custo</Label>
          <Input className="h-8 text-xs" value={filters.centro_custo}
            onChange={(e) => setFilters((f) => ({ ...f, centro_custo: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Tipo de despesa</Label>
          <Select
            value={filters.tipo_despesa}
            onValueChange={(v) => setFilters((f) => ({ ...f, tipo_despesa: v }))}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="MATERIA_PRIMA">Matéria-prima</SelectItem>
              <SelectItem value="USO_CONSUMO">Uso e consumo</SelectItem>
              <SelectItem value="DESPESAS_GERAIS">Despesas gerais</SelectItem>
              <SelectItem value="SERVICOS">Serviços</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Descrição</Label>
          <Input className="h-8 text-xs" value={filters.descricao_item}
            onChange={(e) => setFilters((f) => ({ ...f, descricao_item: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Mês (YYYY-MM)</Label>
          <Input className="h-8 text-xs" placeholder="2026-05" value={filters.mes_competencia}
            onChange={(e) => setFilters((f) => ({ ...f, mes_competencia: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Fornecedor</Label>
          <ComboboxFilter
            value={filters.fornecedor}
            onChange={(v) => setFilters((f) => ({ ...f, fornecedor: v }))}
            options={fornecedores}
            loading={loadingForn}
            placeholder="Todos"
          />
        </div>
        <div>
          <Label className="text-xs">Condição pagto</Label>
          <Input className="h-8 text-xs" value={filters.condicao_pagamento}
            onChange={(e) => setFilters((f) => ({ ...f, condicao_pagamento: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Transação NF</Label>
          <Input className="h-8 text-xs" value={filters.transacao}
            onChange={(e) => setFilters((f) => ({ ...f, transacao: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Período inicial</Label>
          <Input type="date" className="h-8 text-xs" value={filters.data_ini}
            onChange={(e) => setFilters((f) => ({ ...f, data_ini: e.target.value }))} />
        </div>
        <div>
          <Label className="text-xs">Período final</Label>
          <Input type="date" className="h-8 text-xs" value={filters.data_fim}
            onChange={(e) => setFilters((f) => ({ ...f, data_fim: e.target.value }))} />
        </div>
      </FilterPanel>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Origem)}>
        <TabsList>
          <TabsTrigger value="COMPRAS"><ShoppingCart className="mr-1 h-3 w-3" />Compras</TabsTrigger>
          <TabsTrigger value="RECEBIMENTOS"><Receipt className="mr-1 h-3 w-3" />Recebimentos</TabsTrigger>
          <TabsTrigger value="TODOS"><GitCompare className="mr-1 h-3 w-3" />Comparativo</TabsTrigger>
        </TabsList>

        {(['COMPRAS', 'RECEBIMENTOS', 'TODOS'] as Origem[]).map((origem) => (
          <TabsContent key={origem} value={origem} className="space-y-4">
            <TabContent
              origem={origem}
              state={states[origem]}
              onDrillClick={handleDrillClick}
              onBreadcrumb={handleBreadcrumb}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

interface TabContentProps {
  origem: Origem;
  state: TabState;
  onDrillClick: (row: DrillRow) => void;
  onBreadcrumb: (index: number) => void;
}

function TabContent({ origem, state, onDrillClick, onBreadcrumb }: TabContentProps) {
  const { data, loading, stack, currentNivel } = state;
  const next = nextNivel(currentNivel);

  const kpis = data?.kpis;
  const drill = data?.drill || [];
  const detalhe = data?.detalhe || [];
  const serieMes = data?.serie_mes || [];
  const porTipo = data?.por_tipo_despesa || [];
  const ranking = data?.ranking_fornecedores || [];

  const drillColumns: Column<DrillRow>[] = useMemo(() => {
    const base: Column<DrillRow>[] = [
      { key: 'label', header: NIVEL_LABEL[currentNivel] },
    ];
    if (origem === 'COMPRAS' || origem === 'TODOS') {
      base.push({ key: 'valor_comprado', header: 'Comprado', align: 'right', render: (v) => formatCurrency(v) });
    }
    if (origem === 'RECEBIMENTOS' || origem === 'TODOS') {
      base.push({ key: 'valor_recebido', header: 'Recebido', align: 'right', render: (v) => formatCurrency(v) });
    }
    if (origem === 'COMPRAS') {
      base.push({ key: 'valor_pendente', header: 'Pendente', align: 'right', render: (v) => formatCurrency(v) });
    }
    if (origem === 'TODOS') {
      base.push({ key: 'diferenca', header: 'Diferença', align: 'right', render: (v) => formatCurrency(v) });
    }
    base.push({ key: 'qtd_documentos', header: 'Qtd. Docs', align: 'right', render: (v) => formatNumber(v ?? 0, 0) });
    return base;
  }, [currentNivel, origem]);

  const detailColumns = useMemo<Column<any>[]>(() => {
    if (origem === 'COMPRAS') {
      return [
        { key: 'numero_projeto', header: 'Projeto' },
        { key: 'centro_custo', header: 'CC' },
        { key: 'tipo_despesa', header: 'Tipo despesa' },
        { key: 'descricao_item', header: 'Descrição' },
        { key: 'mes_competencia', header: 'Mês' },
        { key: 'fornecedor', header: 'Fornecedor' },
        { key: 'condicao_pagamento', header: 'Cond. pagto' },
        { key: 'numero_oc', header: 'Nº OC' },
        { key: 'codigo_item', header: 'Item' },
        { key: 'quantidade', header: 'Qtd', align: 'right', render: (v) => formatNumber(v, 2) },
        { key: 'valor_comprado', header: 'Comprado', align: 'right', render: (v) => formatCurrency(v) },
        { key: 'valor_pendente', header: 'Pendente', align: 'right', render: (v) => formatCurrency(v) },
      ];
    }
    if (origem === 'RECEBIMENTOS') {
      return [
        { key: 'numero_projeto', header: 'Projeto' },
        { key: 'centro_custo', header: 'CC' },
        { key: 'tipo_despesa', header: 'Tipo despesa' },
        { key: 'descricao_item', header: 'Descrição' },
        { key: 'mes_competencia', header: 'Mês' },
        { key: 'fornecedor', header: 'Fornecedor' },
        { key: 'transacao', header: 'Transação' },
        { key: 'condicao_pagamento', header: 'Cond. pagto' },
        { key: 'numero_nf', header: 'Nº NF' },
        { key: 'serie_nf', header: 'Série' },
        { key: 'codigo_item', header: 'Item' },
        { key: 'quantidade', header: 'Qtd', align: 'right', render: (v) => formatNumber(v, 2) },
        { key: 'valor_recebido', header: 'Recebido', align: 'right', render: (v) => formatCurrency(v) },
        { key: 'oc_origem', header: 'OC origem', render: (v) => v || '-' },
      ];
    }
    return [
      { key: 'numero_projeto', header: 'Projeto' },
      { key: 'centro_custo', header: 'CC' },
      { key: 'tipo_despesa', header: 'Tipo despesa' },
      { key: 'mes_competencia', header: 'Mês' },
      { key: 'fornecedor', header: 'Fornecedor' },
      { key: 'valor_comprado', header: 'Comprado', align: 'right', render: (v) => formatCurrency(v) },
      { key: 'valor_recebido', header: 'Recebido', align: 'right', render: (v) => formatCurrency(v) },
      { key: 'diferenca', header: 'Diferença', align: 'right', render: (v) => formatCurrency(v) },
    ];
  }, [origem]);

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KPICard title="Total comprado" value={kpis ? formatCurrency(kpis.valor_comprado) : '--'} icon={<ShoppingCart className="h-4 w-4" />} variant="info" />
        <KPICard title="Total recebido" value={kpis ? formatCurrency(kpis.valor_recebido) : '--'} icon={<Receipt className="h-4 w-4" />} variant="success" />
        <KPICard title="Saldo pendente" value={kpis ? formatCurrency(kpis.valor_pendente) : '--'} icon={<AlertTriangle className="h-4 w-4" />} variant="warning" />
        <KPICard title="Diferença C x R" value={kpis ? formatCurrency(kpis.diferenca_comprado_recebido) : '--'} icon={<TrendingUp className="h-4 w-4" />} variant="default" />
        <KPICard title="Qtd. documentos" value={kpis ? formatNumber(kpis.qtd_documentos, 0) : '--'} icon={<FileText className="h-4 w-4" />} />
        <KPICard title="Qtd. fornecedores" value={kpis ? formatNumber(kpis.qtd_fornecedores, 0) : '--'} icon={<Users className="h-4 w-4" />} />
      </div>

      {/* Charts */}
      {(serieMes.length > 0 || porTipo.length > 0 || ranking.length > 0) && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {serieMes.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader className="py-3"><CardTitle className="text-sm">Evolução por mês</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serieMes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                    <RTooltip formatter={(v: any) => formatCurrency(Number(v))} />
                    <Legend />
                    {(origem === 'COMPRAS' || origem === 'TODOS') && (
                      <Bar dataKey="valor_comprado" name="Comprado" fill={COLORS[0]} />
                    )}
                    {(origem === 'RECEBIMENTOS' || origem === 'TODOS') && (
                      <Bar dataKey="valor_recebido" name="Recebido" fill={COLORS[1]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {porTipo.length > 0 && (
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm">Por tipo de despesa</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={porTipo} dataKey="valor" nameKey="tipo_despesa" innerRadius={40} outerRadius={80} label>
                      {porTipo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <RTooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {ranking.length > 0 && (
            <Card className="lg:col-span-3">
              <CardHeader className="py-3"><CardTitle className="text-sm">Ranking de fornecedores</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ranking.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={11} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="fornecedor" fontSize={11} width={150} />
                    <RTooltip formatter={(v: any) => formatCurrency(Number(v))} />
                    <Bar dataKey="valor" fill={COLORS[2]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Drill */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">Drill-down</CardTitle>
            <Badge variant="outline" className="text-xs">Nível: {NIVEL_LABEL[currentNivel]}</Badge>
          </div>
          <Breadcrumb stack={stack} currentNivel={currentNivel} onClick={onBreadcrumb} />
        </CardHeader>
        <CardContent>
          <DataTable
            columns={drillColumns}
            data={drill}
            loading={loading}
            emptyMessage="Sem dados para os filtros aplicados."
            onRowClick={next ? (row) => onDrillClick(row) : undefined}
          />
          {next && (
            <p className="mt-2 text-xs text-muted-foreground">
              Clique em uma linha para detalhar por <strong>{NIVEL_LABEL[next]}</strong>.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Detalhe */}
      {detalhe.length > 0 && (
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Detalhes</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={detailColumns} data={detalhe} loading={loading} />
          </CardContent>
        </Card>
      )}
    </>
  );
}

interface BreadcrumbProps {
  stack: CrumbStep[];
  currentNivel: Nivel;
  onClick: (index: number) => void;
}

function Breadcrumb({ stack, currentNivel, onClick }: BreadcrumbProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      <button
        onClick={() => onClick(-1)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        <Home className="h-3 w-3" />
        Início
      </button>
      {stack.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          <button onClick={() => onClick(i)} className="hover:text-foreground">
            {s.label}
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
