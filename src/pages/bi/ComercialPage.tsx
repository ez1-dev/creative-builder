import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, RotateCcw, Sparkles, X, Pencil, Save, Plus, Eye, ChevronDown, ChevronUp, Filter, Palette, RotateCw, Users, Package, Building2 } from 'lucide-react';
import { formatEstadoLabel } from '@/lib/bi/ufLabels';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { api } from '@/lib/api';

import { PageHeader } from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  KpiCard, KpiSparklineCard, KpiTargetCard, KpiVariationCard,
  KpiTriStackCard, GaugeAchievementCard,
  DataTableBI, LoadingState, ErrorState, EmptyState,
  ComboChartCard, DonutChartCard, PieChartCard,
  BarChartCard, HorizontalBarChartCard, LineChartCard, AreaChartCard,
  RankingChartCard, RankingTable, TreemapChartCard, BrazilMapCard,
  BrazilStateMapWidget,
  FilterBar, SelectFilter,
  formatCurrency, formatNumber,
  type Column,
} from '@/components/bi';


import { ComercialDrillDrawer } from '@/components/bi/drill/ComercialDrillDrawer';
import { useComercialDrillStack } from '@/hooks/useComercialDrillStack';
import type { DrillType, DrillContexto } from '@/lib/bi/comercialDrillApi';
import { DashboardPage } from '@/components/bi/layout/DashboardLayout';
import { ComercialDashboardGrid } from '@/components/bi/runtime/ComercialDashboardGrid';
import { ConfigureBiWidgetDialog } from '@/components/bi/runtime/ConfigureBiWidgetDialog';
import { WidgetTitleStyle } from '@/components/bi/runtime/WidgetTitleStyle';
import { AddBiWidgetDialog } from '@/components/bi/runtime/AddBiWidgetDialog';
import { MultiSeriesChartCard } from '@/components/bi/charts/MultiSeriesChartCard';
import { SeriesChips } from '@/components/bi/runtime/SeriesChips';
import { NumberRoundingToggle } from '@/components/bi/runtime/NumberRoundingToggle';
import { useComercialLayout, type ComercialWidget, type WidgetLayout, type SaveLayoutItem } from '@/hooks/useComercialLayout';
import { useDrillPresets } from '@/hooks/useDrillPresets';
import { useCustomMetrics } from '@/hooks/useCustomMetrics';
import { COMERCIAL_WIDGETS } from '@/lib/bi/comercialWidgetCatalog';
import { resolveMetric, COMERCIAL_METRICS, type MetricRef } from '@/lib/bi/comercialMetrics';
import { getComponent } from '@/lib/bi/componentRegistry';
import { PageDataProvider } from '@/lib/bi/PageDataContext';
import { AiChartGenerator } from '@/components/bi/ai/AiChartGenerator';
import { WidgetErrorBoundary } from '@/components/bi/runtime/WidgetErrorBoundary';
import { ChartContextMenu } from '@/components/bi/runtime/ChartContextMenu';
import { normalizeWidget } from '@/lib/bi/normalize';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  fetchComercialKpis,
  fetchComercialMensal,
  fetchComercialMix,
  fetchComercialEstado,
  fetchComercialRevenda,
  fetchComercialObras,
  fetchComercialDetalhes,
  type ComercialDetalheEscopo,
  type ComercialDetalheRow,
  type ComercialMensalRow,
} from '@/lib/bi/comercialApi';
import { COMERCIAL_DIMENSOES, COMERCIAL_METRICAS } from '@/lib/bi/pageRegistry';
import {
  buildMensalSerie, buildAnualSerie, buildEstadoSerie, buildRevendaSerie,
  buildObrasSerie, buildMixSerie, buildSerieFromDrill, dimToDrillType, pickLabel,
} from '@/lib/bi/comercialSeriesBuilder';
import {
  pickComercialLabel, extractDrillCtx, KPI_DRILL_MAP, drillTypeFromSeriesKey,
  cleanDrillValue, compactDrillContext,
} from '@/lib/bi/comercialDrillContract';
import { pickDimensionLabel } from '@/lib/bi/dimensionLabels';
import { useComercialDrillSeries } from '@/hooks/useComercialDrillSeries';
import { fetchMetaCloudTotal, sincronizarMetasUpquery } from '@/lib/bi/metasFaturamentoApi';
import {
  useComercialFilters,
  drillFromMixCategoria,
  DRILL_LABELS,
  type BiComercialDrillKey,
  type UnidadeNegocio,
} from '@/lib/bi/comercialFilters';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getEffectiveTheme, getBgOverride, setBgOverride, clearBgOverride, SUGGESTED_BG_COLORS } from './comercialTheme';

const n = (v: any) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const UNIDADES: UnidadeNegocio[] = ['CONSOLIDADO', 'GENIUS', 'ESTRUTURAL ZORTEA'];
const UNIDADE_STYLE: Record<UnidadeNegocio, { bar: string; mapVar: string; chip: string }> = {
  CONSOLIDADO: { bar: 'hsl(var(--muted-foreground))', mapVar: '--muted-foreground', chip: 'bg-muted text-muted-foreground' },
  GENIUS: { bar: 'hsl(var(--warning))', mapVar: '--warning', chip: 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]' },
  'ESTRUTURAL ZORTEA': { bar: 'hsl(var(--primary))', mapVar: '--primary', chip: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' },
};

const ERR_MSG = 'Não foi possível carregar os dados do BI Comercial';
const ERR_DRILL = 'Não foi possível carregar os dados do drill';
const EMPTY_MSG = 'Sem dados para o período selecionado';
const PAGE_KEY = 'bi-comercial';

const ESCOPO_LABELS: Record<ComercialDetalheEscopo, string> = {
  todas: 'Todas as notas',
  impostos: 'Detalhamento de impostos',
  devolucao: 'Devoluções',
  vendas: 'Notas distintas',
  clientes: 'Por cliente',
  estados: 'Por estado',
};

function HexInput({ currentBg, onApply }: { currentBg: string | null; onApply: (c: string) => void }) {
  const [val, setVal] = useState(currentBg ?? '');
  const [err, setErr] = useState(false);
  useEffect(() => { setVal(currentBg ?? ''); setErr(false); }, [currentBg]);
  const valid = (v: string) => /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3}([0-9a-fA-F]{2})?)?$/.test(v.trim());
  const apply = () => {
    const v = val.trim();
    if (!valid(v)) { setErr(true); return; }
    setErr(false);
    onApply(v);
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          value={val}
          onChange={(e) => { setVal(e.target.value); if (err) setErr(false); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }}
          onBlur={apply}
          placeholder="#dd4444"
          className={cn('h-8 font-mono text-xs', err && 'border-destructive focus-visible:ring-destructive')}
          spellCheck={false}
        />
        <Button type="button" size="sm" variant="outline" className="h-8" onClick={apply}>Aplicar</Button>
      </div>
      {err && <p className="text-[10px] text-destructive">Hex inválido. Ex.: #dd4444</p>}
    </div>
  );
}

function BlocoErro({ err, onRetry, msg = ERR_MSG }: { err: unknown; onRetry: () => void; msg?: string }) {
  return <ErrorState title={msg} message={String((err as any)?.message ?? '')} onRetry={onRetry} />;
}

function Clickable({ children, onClick, className, title }: { children: ReactNode; onClick?: () => void; className?: string; title?: string }) {
  if (!onClick) return <>{children}</>;
  return (
    <div
      role="button" tabIndex={0} title={title ?? 'Clique para detalhar'} onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      className={cn('cursor-pointer outline-none rounded-md transition-shadow hover:ring-2 hover:ring-ring/50 h-full', className)}
    >
      {children}
    </div>
  );
}


export default function ComercialPage() {
  const [draft, setDraft] = useState<{ anomes_ini: string; anomes_fim: string; unidade_negocio: UnidadeNegocio }>({
    anomes_ini: '202601', anomes_fim: '202606', unidade_negocio: 'GENIUS',
  });

  const [filtrosOpen, setFiltrosOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const v = window.localStorage.getItem('bi-comercial:filtros-open');
    return v === null ? true : v === '1';
  });
  const [iaOpen, setIaOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('bi-comercial:ia-open') === '1';
  });
  const toggleFiltros = () => setFiltrosOpen((v) => {
    const n = !v; try { window.localStorage.setItem('bi-comercial:filtros-open', n ? '1' : '0'); } catch {} return n;
  });
  const toggleIa = () => setIaOpen((v) => {
    const n = !v; try { window.localStorage.setItem('bi-comercial:ia-open', n ? '1' : '0'); } catch {} return n;
  });


  const { filters, setBase, applyDrill, toggleDrill, removeDrill, clearDrill, chips } = useComercialFilters(draft);
  const style = UNIDADE_STYLE[filters.unidade_negocio];
  const unidade = filters.unidade_negocio;
  const [bgOverrideTick, setBgOverrideTick] = useState(0);
  const theme = useMemo(() => getEffectiveTheme(unidade), [unidade, bgOverrideTick]);
  const currentBg = getBgOverride(unidade);
  const handlePickBg = (color: string) => { setBgOverride(unidade, color); setBgOverrideTick((t) => t + 1); };
  const handleResetBg = () => { clearBgOverride(unidade); setBgOverrideTick((t) => t + 1); };

  const qKpis    = useQuery({ queryKey: ['bi-comercial','kpis',filters],    queryFn: () => fetchComercialKpis(filters),    refetchOnWindowFocus: false, retry: 1 });
  const qMensal  = useQuery({ queryKey: ['bi-comercial','mensal',filters],  queryFn: () => fetchComercialMensal(filters),  refetchOnWindowFocus: false, retry: 1 });
  const qMix     = useQuery({ queryKey: ['bi-comercial','mix',filters],     queryFn: () => fetchComercialMix(filters),     refetchOnWindowFocus: false, retry: 1 });
  const qEstado  = useQuery({ queryKey: ['bi-comercial','estado',filters],  queryFn: () => fetchComercialEstado(filters),  refetchOnWindowFocus: false, retry: 1 });
  const qRevenda = useQuery({ queryKey: ['bi-comercial','revenda',filters], queryFn: () => fetchComercialRevenda(filters), enabled: unidade==='GENIUS'||unidade==='CONSOLIDADO', refetchOnWindowFocus: false, retry: 1 });
  const qObras   = useQuery({ queryKey: ['bi-comercial','obras',filters],   queryFn: () => fetchComercialObras(filters),   enabled: unidade==='ESTRUTURAL ZORTEA'||unidade==='CONSOLIDADO', refetchOnWindowFocus: false, retry: 1 });

  const aplicarFiltrosBase = () => setBase({ ...draft });
  const atualizar = () => {
    qKpis.refetch(); qMensal.refetch(); qMix.refetch(); qEstado.refetch();
    if (qRevenda.isFetched || unidade !== 'ESTRUTURAL ZORTEA') qRevenda.refetch();
    if (qObras.isFetched || unidade !== 'GENIUS') qObras.refetch();
  };
  const carregando = qKpis.isFetching || qMensal.isFetching || qMix.isFetching || qEstado.isFetching || qRevenda.isFetching || qObras.isFetching;

  const { isAdmin } = useUserPermissions();
  const [syncingClientes, setSyncingClientes] = useState(false);
  const handleSyncClientes = async () => {
    if (syncingClientes) return;
    setSyncingClientes(true);
    const tId = toast.loading('Sincronizando clientes do ERP...');
    try {
      const r = await api.post<any>('/api/bi/comercial/clientes/sincronizar', {});
      const total = r?.total ?? 0;
      const ins = r?.inseridos ?? 0;
      const upd = r?.atualizados ?? 0;
      toast.success(`Clientes sincronizados: ${total} (novos ${ins}, atualizados ${upd})`, { id: tId });
    } catch (e: any) {
      toast.error(`Falha ao sincronizar clientes: ${e?.message ?? e}`, { id: tId });
    } finally {
      setSyncingClientes(false);
    }
  };

  const [syncingProdutos, setSyncingProdutos] = useState(false);
  const handleSyncProdutos = async () => {
    if (syncingProdutos) return;
    setSyncingProdutos(true);
    const tId = toast.loading('Sincronizando produtos do ERP...');
    try {
      const r = await api.post<any>('/api/bi/comercial/produtos/sincronizar', {});
      const total = r?.qtd_total ?? 0;
      const prods = r?.qtd_produtos ?? 0;
      const servs = r?.qtd_servicos ?? 0;
      toast.success(`Produtos sincronizados: ${total} (produtos ${prods}, serviços ${servs})`, { id: tId });
    } catch (e: any) {
      toast.error(`Falha ao sincronizar produtos: ${e?.message ?? e}`, { id: tId });
    } finally {
      setSyncingProdutos(false);
    }
  };

  const [syncingRevendas, setSyncingRevendas] = useState(false);
  const handleSyncRevendas = async () => {
    if (syncingRevendas) return;
    setSyncingRevendas(true);
    const tId = toast.loading('Sincronizando revendas do ERP...');
    try {
      const r = await api.post<any>('/api/bi/comercial/revendas/sincronizar', {});
      const total = r?.total ?? 0;
      const ins = r?.inseridos ?? 0;
      const upd = r?.atualizados ?? 0;
      toast.success(`Revendas sincronizadas: ${total} (novas ${ins}, atualizadas ${upd})`, { id: tId });
    } catch (e: any) {
      toast.error(`Falha ao sincronizar revendas: ${e?.message ?? e}`, { id: tId });
    } finally {
      setSyncingRevendas(false);
    }
  };

  const [syncingMetas, setSyncingMetas] = useState(false);
  const handleSyncMetas = async () => {
    if (syncingMetas) return;
    setSyncingMetas(true);
    const tId = toast.loading('Sincronizando metas (UpQuery)...');
    try {
      const r = await sincronizarMetasUpquery({
        anomes_ini: filters.anomes_ini,
        anomes_fim: filters.anomes_fim,
      });
      if (!r.ok) {
        toast.error(`Falha ao sincronizar metas: ${r.error ?? 'erro desconhecido'}`, { id: tId });
      } else {
        const linhas = r.data?.linhas_resumo ?? r.data?.linhas_detalhe ?? 0;
        toast.success(`Metas sincronizadas (${linhas} linhas).`, { id: tId });
        await qKpis.refetch();
      }
    } catch (e: any) {
      toast.error(`Falha ao sincronizar metas: ${e?.message ?? e}`, { id: tId });
    } finally {
      setSyncingMetas(false);
    }
  };






  const kpisRaw = qKpis.data ?? ({} as any);
  // Override Meta / Diferença / % Atingimento usando bi_meta_faturamento (Cloud)
  // quando houver metas cadastradas para o período/UN. Caso contrário, mantém os
  // valores vindos do ERP (via FastAPI).
  const kpis = useMemo(() => {
    const metaOverride = qMetaCloud.data;
    if (metaOverride == null) return kpisRaw;
    const fat = Number(kpisRaw.faturamento ?? 0);
    const meta = Number(metaOverride);
    return {
      ...kpisRaw,
      meta,
      diferenca: fat - meta,
      pct_atingimento: meta > 0 ? (fat / meta) * 100 : null,
    };
  }, [kpisRaw, qMetaCloud.data]);
  const mensal = qMensal.data ?? [];
  const mix = qMix.data ?? [];
  const estados = qEstado.data ?? [];
  const revendaRows = qRevenda.data ?? [];
  const obrasRows = qObras.data ?? [];


  const dadosCombo = useMemo(
    () => mensal.map((m) => ({ label: m.anomes_emissao, faturamento: n(m.faturamento), meta: n(m.meta) })),
    [mensal],
  );
  const sparkSerie = useMemo(() => mensal.map((m) => n(m.faturamento)), [mensal]);
  const sparkTrend = useMemo(() => {
    if (sparkSerie.length < 2) return undefined;
    const ant = sparkSerie[sparkSerie.length - 2];
    const atu = sparkSerie[sparkSerie.length - 1];
    if (!ant) return undefined;
    return ((atu - ant) / Math.abs(ant)) * 100;
  }, [sparkSerie]);

  const donutMix = useMemo(() => mix.map((m) => ({
    label: pickComercialLabel(m as any, ['categoria_label', 'serie_label', 'categoria']),
    categoria: (m as any)?.categoria ?? null,
    valor: n(m.faturamento),
  })), [mix]);
  const estadoSorted = useMemo(() => [...estados].sort((a, b) => n(b.faturamento) - n(a.faturamento)), [estados]);
  const estadosSerie = estadoSorted.map((d) => ({
    label: pickDimensionLabel(d as any, 'estado'),
    cd_estado: (d as any)?.cd_estado ?? (d as any)?.sg_uf ?? (d as any)?.uf ?? null,
    valor: n(d.faturamento),
  }));
  const mapaData = estadoSorted.map((d) => ({
    uf: pickLabel(d as any, ['sg_uf','uf','cd_estado','n']),
    cd_estado: (d as any)?.cd_estado ?? (d as any)?.sg_uf ?? (d as any)?.uf ?? null,
    valor: n(d.faturamento),
  }));
  const revendaRank = useMemo(() => revendaRows.map((r: any) => ({
    label: pickDimensionLabel(r, 'revenda'),
    cd_rev_pedido: r?.cd_rev_pedido ?? null,
    valor: n(r.faturamento),
  })), [revendaRows]);
  const obrasRank = useMemo(() => obrasRows.map((o: any) => ({
    label: pickDimensionLabel(o, 'obra'),
    valor: n(o.faturamento),
    cd_prj: o?.cd_prj ?? null,
  })), [obrasRows]);
  const obrasSerie = obrasRank.map((o) => ({ label: o.label, cd_prj: o.cd_prj, valor: o.valor }));

  // ===== Drill multinível (novo /api/bi/comercial/drill) =====
  const drillStack = useComercialDrillStack();

  // Mapeia os filtros atuais do dashboard para o contexto inicial de um drill.
  const buildCtxFromFilters = (): DrillContexto => {
    const f: any = filters;
    const ctx: DrillContexto = {};
    const keys: (keyof DrillContexto)[] = [
      'anomes_emissao','cd_cliente','cd_estado','cd_rev_pedido','cd_produto',
      'cd_derivacao','cd_nf','cd_origem','cd_tns','cd_tp_movimento','cd_prj','categoria_custom',
    ];
    keys.forEach((k) => {
      const v = cleanDrillValue(f?.[k]);
      if (v != null) (ctx as any)[k] = v;
    });
    return ctx;
  };

  const openDrill = (
    drill_type: DrillType,
    contexto: DrillContexto = {},
    opts: { resetDrillFilters?: boolean } = {},
  ) => {
    // Para drill de KPI/Card (resetDrillFilters=true) não reaproveita filtros
    // técnicos residuais — usa só os filtros globais (anomes/un já vão fora do contexto).
    const base = opts.resetDrillFilters ? {} : buildCtxFromFilters();
    // row.filtros_drill (contexto) vence sobre base; tudo passa por sanitização.
    const merged = compactDrillContext({ ...base, ...contexto });
    drillStack.openWith({ drill_type, contexto: merged, resetCtx: opts.resetDrillFilters });
  };

  // Compatibilidade com handlers antigos que mapeavam KPI -> escopo de notas
  const openDetalhes = (escopo: ComercialDetalheEscopo, _titleExtra?: string) => {
    const drillType: DrillType =
      escopo === 'impostos' ? 'DETALHES_IMPOSTOS' :
      escopo === 'estados' ? 'ESTADO' :
      escopo === 'clientes' ? 'CLIENTE' :
      escopo === 'vendas' ? 'NOTA_FISCAL' :
      'NOTA_FISCAL';
    openDrill(drillType, {}, { resetDrillFilters: true });
  };



  // ===== Cross-filter por clique esquerdo (filtra a página inteira) =====
  // Cada handler extrai a chave técnica do datum e chama toggleDrill:
  //   - mesmo valor: remove o filtro (toggle)
  //   - valor diferente: substitui
  // Para abrir o drawer de drill use clique direito → menu "Detalhar em…".
  const applyCtxAsCrossFilter = (ctx: DrillContexto) => {
    const keys = Object.keys(ctx) as (keyof DrillContexto)[];
    for (const k of keys) {
      const v = cleanDrillValue((ctx as any)[k]);
      if (v != null && (k as string) in DRILL_LABELS) {
        toggleDrill(k as BiComercialDrillKey, v);
        return;
      }
    }
  };
  const onClickMensal = (d: any) => {
    const ctx = extractDrillCtx(d, 'MENSAL');
    applyCtxAsCrossFilter(ctx);
  };
  const onClickMix = (d: any) => {
    const map = drillFromMixCategoria(d?.categoria ?? d?.label ?? d?.name ?? '');
    if (map) toggleDrill(map.key, map.value);
  };
  const onClickEstado = (d: any) => {
    const ctx = extractDrillCtx(d, 'ESTADO');
    applyCtxAsCrossFilter(ctx);
  };
  const onClickMapa = (d: { uf: string; cd_estado?: string | null; valor: number }) => {
    const cd = d?.cd_estado ?? d?.uf;
    if (cd && String(cd) !== '(sem nome)') toggleDrill('cd_estado', String(cd));
  };
  const onClickRevenda = (d: any) => {
    const ctx = extractDrillCtx(d, 'REVENDA');
    applyCtxAsCrossFilter(ctx);
  };
  const onClickObra = (d: any) => {
    const found = obrasRank.find((o) => o.label === d?.name || o.label === d?.label);
    const cod = found?.cd_prj ?? d?.cd_prj;
    if (cod && String(cod) !== '(sem nome)') toggleDrill('cd_prj', String(cod));
  };


  // ===== Tabela mensal =====
  const colsMensal: Column<ComercialMensalRow>[] = [
    { key:'anomes_emissao', header:'Ano/Mês', render:(_v,r)=> r.anomes_emissao },
    { key:'faturamento', header:'Faturamento', align:'right', render:(_v,r)=> formatCurrency(n(r.faturamento)) },
    { key:'fat_liquido', header:'Líquido', align:'right', render:(_v,r)=> formatCurrency(n(r.fat_liquido)) },
    { key:'impostos', header:'Impostos', align:'right', render:(_v,r)=> formatCurrency(n(r.impostos)) },
    { key:'devolucao', header:'Devolução', align:'right', render:(_v,r)=> formatCurrency(n(r.devolucao)) },
    { key:'numero_vendas', header:'Nº Vendas', align:'right', render:(_v,r)=> formatNumber(n(r.numero_vendas)) },
    { key:'numero_clientes', header:'Nº Clientes', align:'right', render:(_v,r)=> formatNumber(n(r.numero_clientes)) },
    { key:'quantidade', header:'Quantidade', align:'right', render:(_v,r)=> formatNumber(n(r.quantidade)) },
    { key:'ticket_medio', header:'Ticket Médio', align:'right', render:(_v,r)=> formatCurrency(n(r.ticket_medio)) },
    { key:'preco_medio', header:'Preço Médio', align:'right', render:(_v,r)=> formatCurrency(n(r.preco_medio)) },
  ];

  // ===== Layout / Builder =====
  const layout = useComercialLayout();
  const [editing, setEditing] = useState(false);
  const [configType, setConfigType] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const customMetrics = useCustomMetrics(PAGE_KEY);
  const [hiddenSeries, setHiddenSeries] = useState<Record<string, Set<number>>>({});

  // ===== Catálogo de séries dinâmicas (dim × métrica) =====
  // Coleta as chaves de série referenciadas pelos widgets visíveis para
  // disparar fetch lazy via drill API apenas quando necessário.
  const referencedSeriesKeys = useMemo(() => {
    const keys = new Set<string>();
    (layout.widgets ?? []).forEach((w) => {
      const s = (w as any)?.mapping?.series;
      if (typeof s === 'string' && s.length > 0) keys.add(s);
    });
    return Array.from(keys);
  }, [layout.widgets]);

  const drillSeries = useComercialDrillSeries({
    seriesKeys: referencedSeriesKeys,
    anomes_ini: filters.anomes_ini,
    anomes_fim: filters.anomes_fim,
    unidade_negocio: filters.unidade_negocio,
  });

  const pageSeries: Record<string, any> = useMemo(() => {
    const out: Record<string, any> = {
      // Aliases legados
      mensal: dadosCombo,
      mix: donutMix,
      estados: estadosSerie,
      revendas: revendaRank,
      obras: obrasSerie,
    };
    // mensal__/anual__/por_<estado|revenda|obra|mix>__ derivados client-side
    COMERCIAL_METRICAS.forEach((m) => {
      out[`mensal__${m.key}`] = buildMensalSerie(mensal as any, m.key as any);
      out[`anual__${m.key}`]  = buildAnualSerie(mensal as any, m.key as any);
      out[`por_estado__${m.key}`]  = buildEstadoSerie(estados as any, m.key as any);
      out[`por_revenda__${m.key}`] = buildRevendaSerie(revendaRows as any, m.key as any);
      out[`por_obra__${m.key}`]    = buildObrasSerie(obrasRows as any, m.key as any);
      out[`por_mix__${m.key}`]     = buildMixSerie(mix as any, m.key as any);
    });
    // Drill-backed (cliente/produto/nota_fiscal/detalhe_impostos)
    COMERCIAL_DIMENSOES.forEach((d) => {
      const drillType = dimToDrillType(d.key);
      if (!drillType) return;
      const resp = drillSeries.byDim[`por_${d.key}`];
      COMERCIAL_METRICAS.forEach((m) => {
        out[`por_${d.key}__${m.key}`] = buildSerieFromDrill(resp, drillType, m.key as any);
      });
    });
    return out;
  }, [dadosCombo, donutMix, estadosSerie, revendaRank, obrasSerie,
      mensal, estados, revendaRows, obrasRows, mix, drillSeries.byDim]);

  // ===== Renderer dos blocos =====
  function renderKpi(def: typeof COMERCIAL_WIDGETS[string], w: ComercialWidget): ReactNode {
    const kpiKey = def.kpiKey!;
    const value = n(kpis[kpiKey]);
    const title = w.customTitle || w.title || def.title;
    const variant = w.variant ?? 'number';
    const isCurrency = ['faturamento','fat_liquido','impostos','devolucao','meta','diferenca','ticket_medio','preco_medio'].includes(kpiKey);
    const format = isCurrency ? 'currency' : 'number';
    const drillType = KPI_DRILL_MAP[kpiKey] ?? 'NOTA_FISCAL';
    const tooltip = kpiKey === 'impostos' ? 'Clique para detalhar impostos' : 'Clique para detalhar';
    const ctxExtra: DrillContexto = kpiKey === 'devolucao' ? { categoria_custom: 'devolucao' } : {};

    let inner: ReactNode;
    if (variant === 'sparkline') {
      inner = <KpiSparklineCard title={title} value={value} format={format} series={sparkSerie} trend={sparkTrend} color={style.bar} />;
    } else if (variant === 'variation') {
      inner = <KpiVariationCard title={title} variation={value} subtitle={isCurrency ? formatCurrency(value) : formatNumber(value)} />;
    } else if (variant === 'target') {
      inner = <KpiTargetCard title={title} value={value} target={n(kpis.meta)} format={format} />;
    } else {
      inner = <KpiCard title={title} value={value} format={format} />;
    }
    return (
      <Clickable title={tooltip} onClick={() => openDrill(drillType, ctxExtra, { resetDrillFilters: true })}>
        {inner}
      </Clickable>
    );

  }

  function renderSerieMensal(w: ComercialWidget): ReactNode {
    if (qMensal.isLoading) return <LoadingState height={240} />;
    if (qMensal.isError) return <BlocoErro err={qMensal.error} onRetry={() => qMensal.refetch()} />;
    if (mensal.length === 0) return <EmptyState description={EMPTY_MSG} height={240} />;
    const title = w.customTitle || w.title;
    const v = w.variant ?? 'combo';

    // Multi-séries: usa MultiSeriesChartCard quando o widget tem séries configuradas
    if (w.series && w.series.length > 0) {
      const resolvedAll = w.series
        .map((ref, i) => resolveMetric(ref, i, customMetrics.metrics))
        .filter((s): s is NonNullable<typeof s> => !!s);
      const hidden = hiddenSeries[w.type] ?? new Set<number>();
      const visible = resolvedAll.filter((_, i) => !hidden.has(i));
      // Em variantes não-combo, força o tipo de gráfico igual para todas as séries
      const forceType = v === 'bar' || v === 'line' || v === 'area' ? v as 'bar'|'line'|'area' : undefined;
      const finalSeries = visible.map((s) => forceType ? { ...s, chartType: forceType } : s);
      const rowsForChart = mensal.map((m) => ({ ...m, label: m.anomes_emissao }));
      return (
        <div className="h-full flex flex-col">
          <SeriesChips
            series={resolvedAll}
            hidden={hidden}
            onToggle={(i) => setHiddenSeries((prev) => {
              const next = new Set(prev[w.type] ?? []);
              if (next.has(i)) next.delete(i); else next.add(i);
              return { ...prev, [w.type]: next };
            })}
          />
          <div className="flex-1 min-h-0">
            <MultiSeriesChartCard
              title={title}
              rows={rowsForChart}
              xKey="label"
              series={finalSeries}
              onItemClick={(r) => openDrill('MENSAL', { anomes_emissao: String(r.anomes_emissao) })}
              height={260}
            />
          </div>
        </div>
      );
    }

    if (v === 'table') return <Card><CardContent className="pt-4"><DataTableBI columns={colsMensal} data={mensal} onRowClick={(r) => openDrill('MENSAL', { anomes_emissao: String(r.anomes_emissao) })} /></CardContent></Card>;
    if (v === 'bar')   return <BarChartCard  title={title} data={dadosCombo.map(d=>({label:d.label,valor:d.faturamento}))} color={style.bar} onItemClick={onClickMensal} />;
    if (v === 'line')  return <LineChartCard title={title} data={dadosCombo.map(d=>({label:d.label,valor:d.faturamento}))} color={style.bar} />;
    if (v === 'area')  return <AreaChartCard title={title} data={dadosCombo.map(d=>({label:d.label,valor:d.faturamento}))} color={style.bar} />;
    return <ComboChartCard title={title} data={dadosCombo} barKey="faturamento" barLabel="Faturamento" lineKey="meta" lineLabel="Meta" barColor={style.bar} onItemClick={onClickMensal} />;
  }

  function renderSerieGeneric(
    w: ComercialWidget,
    data: { label: string; valor: number }[],
    onClick: (d: any) => void,
    loading: boolean, isError: boolean, error: unknown, refetch: () => void,
    extraTable?: () => ReactNode,
  ): ReactNode {
    if (loading) return <LoadingState height={240} />;
    if (isError) return <BlocoErro err={error} onRetry={refetch} />;
    if (data.length === 0) return <EmptyState description={EMPTY_MSG} height={240} />;
    const title = w.customTitle || w.title;
    const v = w.variant ?? 'donut';
    if (v === 'donut') return <DonutChartCard title={title} data={data} onItemClick={onClick} />;
    if (v === 'pie') return <PieChartCard title={title} data={data} onItemClick={onClick} />;
    if (v === 'bar') return <BarChartCard title={title} data={data} color={style.bar} onItemClick={onClick} />;
    if (v === 'horizontal-bar') return <HorizontalBarChartCard title={title} data={data} color={style.bar} yWidth={80} onItemClick={onClick} />;
    if (v === 'ranking') return <RankingChartCard title={title} data={data} topN={10} onItemClick={onClick} />;
    if (v === 'treemap') return <TreemapChartCard title={title} data={data.map(d => ({ name: d.label, value: d.valor }))} onItemClick={onClick} />;
    if (v === 'table') return extraTable ? extraTable() : <Card><CardContent className="pt-4"><RankingTable data={data} topN={50} onItemClick={onClick} /></CardContent></Card>;
    if (v === 'map') return null;
    return <DonutChartCard title={title} data={data} onItemClick={onClick} />;
  }

  function renderEstados(w: ComercialWidget): ReactNode {
    if (qEstado.isLoading) return <LoadingState height={240} />;
    if (qEstado.isError) return <BlocoErro err={qEstado.error} onRetry={() => qEstado.refetch()} />;
    if (mapaData.length === 0) return <EmptyState description={EMPTY_MSG} height={240} />;
    const title = w.customTitle || w.title;
    const variant = w.variant ?? 'map';
    if (variant === 'state-map') {
      return (
        <BrazilStateMapWidget
          title={title}
          filters={filters}
          onDrill={(p) => toggleDrill('cd_estado', p.valor)}
        />
      );
    }
    if (variant === 'map') {
      return <BrazilMapCard title={title} data={mapaData} colorVar={style.mapVar} onItemClick={onClickMapa} />;
    }
    return renderSerieGeneric(w, estadosSerie, onClickEstado, qEstado.isLoading, qEstado.isError, qEstado.error, () => qEstado.refetch());
  }

  function renderCustomLibrary(w: ComercialWidget): ReactNode {
    if (!w.componentId) return <EmptyState description="Componente não configurado" />;
    const def = getComponent(w.componentId);
    if (!def) return <ErrorState title={`Componente "${w.componentId}" não encontrado`} />;
    try {
      // Drill-type pode vir configurado em options.drillType; senão deduz pela seriesKey.
      const optsDrillType: DrillType | undefined = (w.options as any)?.drillType;
      const onItemClick = (seriesKey: string, datum: any) => {
        const dt = optsDrillType ?? drillTypeFromSeriesKey(seriesKey);
        const ctx = extractDrillCtx(datum, dt);
        if (Object.keys(ctx).length > 0) openDrill(dt, ctx);
      };
      return def.render({
        title: w.customTitle || w.title || def.label,
        mapping: w.mapping ?? {},
        ctx: { kpis: kpis ?? {}, series: pageSeries ?? {}, rows: Array.isArray(mensal) ? (mensal as any[]) : [], onItemClick },
        options: w.options ?? {},
      });
    } catch (e) {
      return <ErrorState title="Erro ao renderizar componente" message={String((e as Error).message)} />;
    }
  }

  function renderWidget(w: ComercialWidget): ReactNode {
    // Override por componente da Biblioteca BI tem precedência sobre variant built-in
    if (w.componentId) return renderCustomLibrary(w);

    // Blocos compostos / fixos (sem variantes)
    if (w.type === 'resumo-faturamento') {
      if (qKpis.isLoading) return <LoadingState height={200} />;
      if (qKpis.isError) return <BlocoErro err={qKpis.error} onRetry={() => qKpis.refetch()} />;
      const title = w.customTitle || w.title || 'Faturamento';
      return (
        <Clickable title="Clique para detalhar" onClick={() => openDrill('NOTA_FISCAL', {}, { resetDrillFilters: true })}>
          <KpiTriStackCard
            title={title}
            items={[
              { label: 'Realizado', value: n(kpis.faturamento), format: 'currency' },
              { label: 'Meta',      value: n(kpis.meta),        format: 'currency' },
              { label: 'Diferença', value: n(kpis.diferenca),   format: 'currency' },
            ]}
            headerAction={isAdmin ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Atualizar metas (UpQuery)"
                disabled={syncingMetas}
                onClick={(e) => { e.stopPropagation(); handleSyncMetas(); }}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', syncingMetas && 'animate-spin')} />
              </Button>
            ) : undefined}
          />
        </Clickable>
      );
    }
    if (w.type === 'gauge-atingimento') {
      if (qKpis.isLoading) return <LoadingState height={200} />;
      if (qKpis.isError) return <BlocoErro err={qKpis.error} onRetry={() => qKpis.refetch()} />;
      const title = w.customTitle || w.title || '% Atingimento';
      return (
        <Clickable title="Clique para detalhar" onClick={() => openDrill('NOTA_FISCAL', {}, { resetDrillFilters: true })}>
          <GaugeAchievementCard title={title} value={n(kpis.pct_atingimento)} />
        </Clickable>
      );
    }



    const def = COMERCIAL_WIDGETS[w.type];
    if (def) {
      if (def.kind === 'kpi') return renderKpi(def, w);
      if (def.kind === 'serie-mensal') return renderSerieMensal(w);
      if (def.type === 'mix') return renderSerieGeneric(w, donutMix, onClickMix, qMix.isLoading, qMix.isError, qMix.error, () => qMix.refetch());
      if (def.type === 'estados') return renderEstados(w);
      if (def.type === 'revendas') return renderSerieGeneric(w, revendaRank, onClickRevenda, qRevenda.isLoading, qRevenda.isError, qRevenda.error, () => qRevenda.refetch());
      if (def.type === 'obras') return renderSerieGeneric(w, obrasSerie, onClickObra, qObras.isLoading, qObras.isError, qObras.error, () => qObras.refetch());
      if (def.kind === 'table') {
        if (qMensal.isLoading) return <LoadingState height={240} variant="skeleton" />;
        if (qMensal.isError) return <BlocoErro err={qMensal.error} onRetry={() => qMensal.refetch()} />;
        if (mensal.length === 0) return <EmptyState description={EMPTY_MSG} />;
        return <Card><CardContent className="pt-4"><DataTableBI columns={colsMensal} data={mensal} onRowClick={(r) => openDrill('MENSAL', { anomes_emissao: String(r.anomes_emissao) })} /></CardContent></Card>;
      }
    }
    // Widget custom-* sem componentId — não deveria acontecer.
    return <EmptyState description="Bloco sem configuração" />;
  }

  // ===== Drafts de edição (botão Salvar habilita com qualquer mudança) =====
  // Em modo edição, drag/resize, configurar bloco, ocultar e excluir só atualizam
  // rascunhos locais. A persistência acontece apenas ao clicar em "Salvar Dashboard".
  const [layoutDraft, setLayoutDraft] = useState<{ type: string; layout: WidgetLayout }[] | null>(null);
  const [configDraft, setConfigDraft] = useState<Map<string, Partial<SaveLayoutItem>>>(() => new Map());
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(() => new Set());

  const dirty = !!(layoutDraft && layoutDraft.length > 0) || configDraft.size > 0 || pendingDeletes.size > 0;

  // Aplica overrides dos drafts em cima dos widgets vindos do banco.
  const effectiveWidgets = useMemo(() => {
    const layoutByType = new Map((layoutDraft ?? []).map((it) => [it.type, it.layout]));
    return (Array.isArray(layout.widgets) ? layout.widgets : [])
      .filter((w) => !pendingDeletes.has(w.type))
      .map((w) => {
        const norm = normalizeWidget(w) as unknown as ComercialWidget;
        const override = configDraft.get(norm.type);
        const draftLayout = layoutByType.get(norm.type);
        const merged: ComercialWidget = {
          ...norm,
          ...(override
            ? {
                hidden: override.hidden !== undefined ? Boolean(override.hidden) : norm.hidden,
                variant: 'variant' in override ? (override.variant ?? undefined) : norm.variant,
                componentId: 'componentId' in override ? (override.componentId ?? undefined) : norm.componentId,
                mapping: 'mapping' in override ? (override.mapping ?? undefined) : norm.mapping,
                options: 'options' in override ? (override.options ?? undefined) : norm.options,
                customTitle: 'customTitle' in override ? (override.customTitle ?? undefined) : norm.customTitle,
                series: 'series' in override ? (override.series ?? undefined) : norm.series,
                titleColor: 'titleColor' in override ? (override.titleColor ?? undefined) : norm.titleColor,
                titleBold: 'titleBold' in override ? (override.titleBold ?? undefined) : norm.titleBold,
                valueColor: 'valueColor' in override ? (override.valueColor ?? undefined) : norm.valueColor,

              }
            : {}),
          layout: draftLayout ?? norm.layout,
        };
        return merged;
      });
  }, [layout.widgets, layoutDraft, configDraft, pendingDeletes]);

  const visibleWidgets = effectiveWidgets.filter((w) => !w.hidden);

  // Chave estável: muda só quando o CONTEÚDO dos blocos muda (não a geometria).
  const widgetsContentKey = effectiveWidgets
    .map((w) => [
      w?.type ?? '', w?.hidden ? 1 : 0, w?.componentId ?? '', w?.variant ?? '',
      w?.customTitle ?? '', JSON.stringify(w?.mapping ?? null),
      JSON.stringify(w?.options ?? null), JSON.stringify(w?.series ?? null),
      w?.titleColor ?? '', w?.titleBold ? 1 : 0, w?.valueColor ?? '',
    ].join('|'))
    .join('~');

  const widgetDrillType = (w: ComercialWidget): DrillType | undefined => {
    const def = COMERCIAL_WIDGETS[w.type];
    if (def?.kind === 'kpi') return KPI_DRILL_MAP[def.kpiKey!] ?? 'NOTA_FISCAL';
    if (def?.kind === 'serie-mensal') return 'MENSAL';
    if (def?.type === 'estados') return 'ESTADO';
    if (def?.type === 'revendas') return 'REVENDA';
    if (def?.type === 'obras') return 'NOTA_FISCAL';
    if (def?.type === 'mix') return 'NOTA_FISCAL';
    if (def?.kind === 'table') return 'MENSAL';
    if (w.componentId) {
      const optsDrillType: DrillType | undefined = (w.options as any)?.drillType;
      if (optsDrillType) return optsDrillType;
      const s = (w as any)?.mapping?.series;
      if (typeof s === 'string') return drillTypeFromSeriesKey(s);
    }
    return 'NOTA_FISCAL';
  };

  const blocks = useMemo(() => {
    const out: Record<string, ReactNode> = {};
    visibleWidgets.forEach((w) => {
      const title = w.customTitle || w.title || w.type;
      const dt = widgetDrillType(w);
      out[w.type] = (
        <WidgetErrorBoundary widgetKey={w.type} title={title}>
          <WidgetTitleStyle color={w.titleColor} bold={w.titleBold} valueColor={(w as any).valueColor}>
            <ChartContextMenu
              drillType={dt}
              onOpenDrill={(next) => openDrill(next, {})}
              onClearAll={clearDrill}
              activeFiltersCount={chips.length}
            >
              {renderWidget(w)}
            </ChartContextMenu>
          </WidgetTitleStyle>
        </WidgetErrorBoundary>
      );
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetsContentKey, kpis, mensal, mix, estados, revendaRows, obrasRows, filters,
      qKpis.isLoading, qMensal.isLoading, qMix.isLoading, qEstado.isLoading, qRevenda.isLoading, qObras.isLoading,
      customMetrics.metrics, hiddenSeries, chips.length]);

  // ===== Builder handlers =====
  const handleLayoutChange = (next: { type: string; layout: WidgetLayout }[]) => {
    setLayoutDraft(next);
  };

  const clearDrafts = () => {
    setLayoutDraft(null);
    setConfigDraft(new Map());
    setPendingDeletes(new Set());
  };

  const handleSaveDashboard = async () => {
    // Monta payload combinado: layout (drag/resize) + overrides de config.
    const layoutByType = new Map((layoutDraft ?? []).map((it) => [it.type, it.layout]));
    const types = new Set<string>([...layoutByType.keys(), ...configDraft.keys()]);
    const items: SaveLayoutItem[] = [];
    types.forEach((type) => {
      const current = layout.widgets.find((x) => x.type === type);
      if (!current) return;
      const draftLayout = layoutByType.get(type) ?? current.layout;
      const override = configDraft.get(type) ?? {};
      items.push({ type, layout: draftLayout, ...override });
    });

    try {
      if (items.length > 0) await layout.saveLayout(items);
      for (const type of pendingDeletes) await layout.deleteWidget(type);
      if (dirty) toast.success('Dashboard salvo');
    } catch (e: any) {
      toast.error(`Erro ao salvar: ${e?.message ?? e}`);
      return;
    }
    clearDrafts();
    setEditing(false);
  };

  const handleCancelEdit = () => {
    clearDrafts();
    setEditing(false);
  };

  const handleEnterEdit = () => {
    clearDrafts();
    setEditing(true);
  };

  const mergeConfigDraft = (type: string, patch: Partial<SaveLayoutItem>) => {
    setConfigDraft((prev) => {
      const next = new Map(prev);
      const merged = { ...(next.get(type) ?? {}), ...patch };
      next.set(type, merged);
      return next;
    });
  };

  const handleHide = (type: string) => {
    mergeConfigDraft(type, { hidden: true });
  };

  const handleDelete = (type: string) => {
    if (!confirm('Excluir este bloco permanentemente? A exclusão só será gravada ao salvar o dashboard.')) return;
    setPendingDeletes((prev) => {
      const next = new Set(prev);
      next.add(type);
      return next;
    });
  };

  const handleConfigure = (type: string) => setConfigType(type);

  const handleConfigApply = (next: any) => {
    if (!configType) return;
    mergeConfigDraft(configType, {
      variant: next.variant ?? null,
      componentId: next.componentId ?? null,
      mapping: next.mapping ?? null,
      options: next.options ?? null,
      customTitle: next.customTitle ?? null,
      series: next.series === undefined ? undefined : (next.series ?? null),
      titleColor: next.titleColor ?? null,
      titleBold: next.titleBold ?? null,
      valueColor: next.valueColor ?? null,

    });
    setConfigType(null);
  };

  const handleConfigReset = () => {
    if (!configType) return;
    const def = COMERCIAL_WIDGETS[configType];
    mergeConfigDraft(configType, {
      variant: def?.variants[0]?.value ?? null,
      componentId: null, mapping: null, options: null, customTitle: null,
      titleColor: null, titleBold: null, valueColor: null,
    });
    setConfigType(null);
  };

  const handleAdd = async (v: { type: string; title: string; componentId?: string; mapping?: Record<string,string>; options?: Record<string,any>; variant?: string }) => {
    // Posição: empilha embaixo.
    const maxY = Math.max(0, ...layout.widgets.map((w) => w.layout.y + w.layout.h));
    await layout.saveLayout([{
      type: v.type, title: v.title,
      layout: { x: 0, y: maxY, w: 6, h: 6 },
      position: layout.widgets.length,
      componentId: v.componentId ?? null,
      mapping: v.mapping ?? null,
      options: v.options ?? null,
      variant: v.variant ?? null,
      hidden: false,
    }]);
  };

  const handleResetLayout = async () => {
    if (!confirm('Restaurar layout padrão? Suas customizações serão perdidas.')) return;
    try {
      await layout.resetLayout();
      toast.success('Layout restaurado');
    } catch (e: any) {
      toast.error(`Erro: ${e?.message ?? e}`);
    }
  };

  const presentTypes = layout.widgets.map((w) => w.type);
  const configuringWidget = configType ? effectiveWidgets.find((w) => w.type === configType) : null;
  const configuringDef = configType ? COMERCIAL_WIDGETS[configType] : undefined;

  return (
    <PageDataProvider pageKey={PAGE_KEY} kpis={kpis} series={pageSeries} rows={mensal as any[]} filtros={filters as any}>
      <div
        data-bi-comercial-theme
        className="min-h-full -m-4 p-4 md:-m-6 md:p-6 transition-colors duration-300"
        style={{
          background: theme.pageBackground,
          ['--bi-primary' as any]: theme.primary,
          ['--bi-accent' as any]: theme.accent,
          ['--bi-card-border' as any]: theme.cardBorder,
        }}
      >
        <style>{`
          [data-bi-comercial-theme] .bi-grid > * > .rounded-lg,
          [data-bi-comercial-theme] .bi-grid > * > [class*="rounded"],
          [data-bi-comercial-theme] [data-widget-frame] {
            background-color: rgba(255,255,255,0.88) !important;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border-color: var(--bi-card-border) !important;
          }
        `}</style>
      <DashboardPage>
        <PageHeader
          title="BI Comercial"
          description="Faturamento comercial validado (fonte_acao = VM_FATURAMENTO)."
          actions={
            <div className="flex items-center gap-2">
              <span
                className="rounded-full px-3 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: theme.chipBg, color: theme.chipText }}
              >{unidade}</span>
              {editing ? (
                <>
                  <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setAddOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> Adicionar bloco
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleResetLayout}>
                    <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={handleCancelEdit}>
                    Cancelar
                  </Button>
                  <Button size="sm" variant="default" className="h-8 gap-1" onClick={handleSaveDashboard} disabled={!dirty}>
                    <Save className="h-3.5 w-3.5" /> Salvar Dashboard
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" className="h-8 gap-1" onClick={handleEnterEdit}>
                  <Pencil className="h-3.5 w-3.5" /> Editar dashboard
                </Button>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" title="Cor de fundo da página">
                    <Palette className="h-3.5 w-3.5" />
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full border border-border"
                      style={{ background: currentBg ?? theme.pageBackground }}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground">
                    Fundo da unidade: <span className="text-foreground">{unidade}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {SUGGESTED_BG_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => handlePickBg(c.value)}
                        title={c.label}
                        className={cn(
                          'h-8 w-full rounded-md border transition',
                          currentBg === c.value ? 'ring-2 ring-primary border-primary' : 'border-border hover:scale-105'
                        )}
                        style={{ background: c.value }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground flex-1">Personalizada</label>
                    <input
                      type="color"
                      value={(currentBg && /^#[0-9a-fA-F]{6}$/.test(currentBg)) ? currentBg : '#ffffff'}
                      onChange={(e) => handlePickBg(e.target.value)}
                      className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent"
                    />
                  </div>
                  <HexInput currentBg={currentBg} onApply={handlePickBg} />

                  <Button size="sm" variant="ghost" className="w-full h-8 gap-1.5" onClick={handleResetBg}>
                    <RotateCw className="h-3.5 w-3.5" /> Restaurar padrão
                  </Button>
                </PopoverContent>
              </Popover>
              <NumberRoundingToggle pageKey={PAGE_KEY} className="hidden md:block" />
              <Button asChild size="sm" variant="outline" className="h-8 gap-1">
                <Link to="/biblioteca-bi"><Sparkles className="h-3.5 w-3.5" /> Biblioteca BI</Link>
              </Button>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  onClick={handleSyncClientes}
                  disabled={syncingClientes}
                  title="Atualiza nomes dos clientes a partir do ERP (E085CLI)"
                >
                  <Users className={cn('h-3.5 w-3.5', syncingClientes && 'animate-pulse')} />
                  Sincronizar clientes
                </Button>
              )}
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  onClick={handleSyncProdutos}
                  disabled={syncingProdutos}
                  title="Atualiza descrições dos produtos a partir do ERP (E075PRO/E080SER)"
                >
                  <Package className={cn('h-3.5 w-3.5', syncingProdutos && 'animate-pulse')} />
                  Sincronizar produtos
                </Button>
              )}
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1"
                  onClick={handleSyncRevendas}
                  disabled={syncingRevendas}
                  title="Atualiza nomes das revendas a partir do ERP"
                >
                  <Building2 className={cn('h-3.5 w-3.5', syncingRevendas && 'animate-pulse')} />
                  Sincronizar revendas
                </Button>
              )}




              <Button size="sm" variant="outline" onClick={atualizar} disabled={carregando}>
                <RefreshCw className={cn('mr-1 h-3.5 w-3.5', carregando && 'animate-spin')} /> Atualizar
              </Button>
            </div>
          }
        />

        <div className="rounded-md border bg-card overflow-hidden">
          <button
            type="button"
            onClick={toggleFiltros}
            className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent/30 transition-colors"
            aria-expanded={filtrosOpen}
          >
            <span className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Filtros
              {!filtrosOpen && (
                <span className="ml-2 normal-case tracking-normal text-foreground/80 font-normal">
                  • {filters.unidade_negocio} • {filters.anomes_ini}–{filters.anomes_fim}
                </span>
              )}
            </span>
            {filtrosOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {filtrosOpen && (
            <div className="border-t p-3">
              <FilterBar>
                <div className="min-w-[180px] flex-1">
                  <SelectFilter label="Unidade" value={draft.unidade_negocio}
                    onChange={(v) => setDraft({ ...draft, unidade_negocio: v as UnidadeNegocio })}
                    options={UNIDADES.map((u) => ({ value: u, label: u }))} />
                </div>
                <div className="min-w-[140px] flex-1">
                  <Label htmlFor="anomes_ini" className="text-xs">AnoMês Início</Label>
                  <Input id="anomes_ini" name="anomes_ini" className="h-8 text-xs" value={draft.anomes_ini} placeholder="202601"
                    onChange={(e) => setDraft({ ...draft, anomes_ini: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && aplicarFiltrosBase()} />
                </div>
                <div className="min-w-[140px] flex-1">
                  <Label htmlFor="anomes_fim" className="text-xs">AnoMês Fim</Label>
                  <Input id="anomes_fim" name="anomes_fim" className="h-8 text-xs" value={draft.anomes_fim} placeholder="202606"
                    onChange={(e) => setDraft({ ...draft, anomes_fim: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && aplicarFiltrosBase()} />
                </div>
                <Button size="sm" className="h-8" onClick={aplicarFiltrosBase}>Aplicar</Button>
              </FilterBar>
            </div>
          )}
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs">
            <span className="font-semibold text-muted-foreground">Filtros ativos:</span>
            <Badge variant="outline" className="font-medium">{filters.unidade_negocio}</Badge>
            {chips.map((c) => {
              let display = c.value;
              if (c.key === 'cd_estado') {
                display = formatEstadoLabel(c.value);
              } else if (c.key === 'cd_rev_pedido') {
                const row: any = (qRevenda.data ?? []).find((r: any) =>
                  String(r.cd_rev_pedido ?? '') === c.value);
                const nm = row?.nm_revenda ?? row?.nm_fantasia ?? row?.ds_revenda ?? row?.revenda;
                if (nm) display = `${c.value} - ${nm}`;
              } else if (c.key === 'cd_prj') {
                const row: any = (qObras.data ?? []).find((r: any) =>
                  String(r.cd_prj ?? '') === c.value);
                const nm = row?.ds_obra ?? row?.ds_abr_prj ?? row?.nm_projeto ?? row?.projeto;
                if (nm) display = `${c.value} - ${nm}`;
              }

              return (
                <Badge key={c.key} variant="secondary" className="gap-1 pr-1 font-medium">
                  <span className="text-muted-foreground">{c.label}:</span>
                  <span>{display}</span>
                  <button type="button" onClick={() => removeDrill(c.key as BiComercialDrillKey)}
                    aria-label={`Remover filtro ${DRILL_LABELS[c.key as BiComercialDrillKey]}`}
                    className="ml-0.5 rounded-sm p-0.5 hover:bg-background">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
            <Button size="sm" variant="ghost" className="ml-auto h-6 gap-1 px-2 text-xs" onClick={clearDrill}>
              <X className="h-3 w-3" /> Limpar filtros
            </Button>
          </div>
        )}


        <div className="rounded-md border bg-card overflow-hidden">
          <button
            type="button"
            onClick={toggleIa}
            className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent/30 transition-colors"
            aria-expanded={iaOpen}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Gerar gráfico com IA
            </span>
            {iaOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {iaOpen && (
            <div className="border-t p-3">
              <AiChartGenerator
                filtrosBase={filters}
                onDrill={(dim, label) => {
                  if (dim === 'unidade_negocio') {
                    if (label === 'GENIUS' || label === 'ESTRUTURAL ZORTEA' || label === 'CONSOLIDADO') {
                      setBase({ unidade_negocio: label as UnidadeNegocio });
                      setDraft((d) => ({ ...d, unidade_negocio: label as UnidadeNegocio }));
                    }
                    return;
                  }
                  // Abre o drill drawer com o contexto da dimensão clicada
                  if (dim === 'anomes_emissao') openDrill('MENSAL', { anomes_emissao: String(label) });
                  else if (dim === 'cd_estado') openDrill('ESTADO', { cd_estado: String(label) });
                  else if (dim === 'cd_cliente') openDrill('CLIENTE', { cd_cliente: String(label) });
                  else if (dim === 'cd_rev_pedido') openDrill('REVENDA', { cd_rev_pedido: String(label) });
                  else if (dim === 'categoria_custom') openDrill('ACUMULADO', { categoria_custom: String(label) });
                  else openDrill('ACUMULADO', { [dim]: String(label) } as DrillContexto);
                }}
              />
            </div>
          )}
        </div>





        {layout.loading ? (
          <LoadingState height={400} variant="skeleton" />
        ) : (
          <ComercialDashboardGrid
            widgets={visibleWidgets}
            blocks={blocks}
            editing={editing}
            configurableTypes={visibleWidgets.map((w) => w.type)}
            onLayoutChange={handleLayoutChange}
            onHide={handleHide}
            onConfigure={handleConfigure}
            onDelete={handleDelete}
          />
        )}
      </DashboardPage>
      </div>


      {/* Diálogos de edição */}
      {configuringWidget && (
        <ConfigureBiWidgetDialog
          open={!!configType}
          onOpenChange={(v) => !v && setConfigType(null)}
          def={configuringDef}
          initial={{
            variant: configuringWidget.variant,
            componentId: configuringWidget.componentId,
            mapping: configuringWidget.mapping,
            options: configuringWidget.options,
            customTitle: configuringWidget.customTitle,
            series: configuringWidget.series,
            titleColor: configuringWidget.titleColor,
            titleBold: configuringWidget.titleBold,
            valueColor: (configuringWidget as any).valueColor,

          }}
          blockType={configuringWidget.type}
          fallbackTitle={configuringWidget.title}
          onApply={handleConfigApply}
          onResetToDefault={configuringDef ? handleConfigReset : undefined}
          kpis={kpis} series={pageSeries} rows={mensal as any[]}
          customMetrics={customMetrics.metrics}
          onCreateCustomMetric={(m) => customMetrics.upsert(m).catch((e) => toast.error(`Erro ao salvar métrica: ${e?.message ?? e}`))}
        />
      )}
      <AddBiWidgetDialog
        open={addOpen} onOpenChange={setAddOpen}
        presentTypes={presentTypes}
        onAdd={handleAdd}
        kpis={kpis} series={pageSeries} rows={mensal as any[]}
      />

      {/* Drawer de drill multinível */}
      <ComercialDrillDrawer
        stack={drillStack}
        anomes_ini={filters.anomes_ini}
        anomes_fim={filters.anomes_fim}
        unidade_negocio={filters.unidade_negocio}
      />

    </PageDataProvider>
  );
}
