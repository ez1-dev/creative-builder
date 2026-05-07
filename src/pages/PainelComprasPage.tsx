import { useState, useCallback, useMemo, useRef } from 'react';
import { api, PainelComprasResponse, PainelComprasDashboardResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { FilterSection } from '@/components/erp/FilterSection';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { ComboboxFilter } from '@/components/erp/ComboboxFilter';
import { UserWidgetsSlot } from '@/components/bi';
import { PageDataProvider } from '@/lib/bi/PageDataContext';
import { useErpOptions } from '@/hooks/useErpOptions';
import { useFornecedores } from '@/hooks/useFornecedores';
import { KPICard } from '@/components/erp/KPICard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown } from 'lucide-react';
import { formatNumber, formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ShoppingCart, AlertTriangle, TrendingUp, Package, DollarSign, Clock, Percent, FileText, Layers, Receipt, RefreshCw, Filter as FilterIcon, Eraser, Link2, Unlink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChartCard } from '@/components/erp/ChartCard';
import { ActiveFilterChips, type ActiveChip } from '@/components/erp/ActiveFilterChips';
import { useAiFilters } from '@/hooks/useAiFilters';
import { useAiPageContext } from '@/hooks/useAiPageContext';
import { useSearchTracking } from '@/hooks/useSearchTracking';
import { VisualGate } from '@/components/VisualGate';
import { enrichRow } from '@/lib/comprasClassificacao';
import { PainelDrillView } from '@/components/compras/PainelDrillView';

const COLORS = ['hsl(215,70%,45%)', 'hsl(142,70%,40%)', 'hsl(38,92%,50%)', 'hsl(0,72%,51%)', 'hsl(199,89%,48%)', 'hsl(280,60%,50%)', 'hsl(160,60%,40%)', 'hsl(30,80%,55%)'];

const SITUACOES_OPCOES: { value: string; label: string }[] = [
  { value: '1', label: 'Aberto Total' },
  { value: '2', label: 'Aberto Parcial' },
  { value: '3', label: 'Suspenso' },
  { value: '4', label: 'Liquidado' },
  { value: '5', label: 'Cancelado' },
  { value: '6', label: 'Aguard. Integração WMS' },
  { value: '7', label: 'Em Transmissão' },
  { value: '8', label: 'Prep. Análise/NF' },
  { value: '9', label: 'Não Fechado' },
];

const situacaoLabel = (s: number | string) => {
  const found = SITUACOES_OPCOES.find((o) => o.value === String(s));
  return found ? found.label : `Sit. ${s}`;
};

const baseColumns: Column<any>[] = [
  { key: 'projeto_macro', header: 'Projeto Macro' },
  { key: 'numero_projeto', header: 'Projeto' },
  { key: 'centro_custo', header: 'Centro Custo' },
  { key: 'tipo_despesa_calc', header: 'Tipo de Despesa' },
  { key: 'mes_competencia_calc', header: 'Mês' },
  { key: 'numero_oc', header: 'Nº OC' },
  { key: 'codigo_item', header: 'Item' },
  { key: 'descricao_item', header: 'Descrição' },
  { key: 'tipo_item', header: 'Tipo' },
  { key: 'fantasia_fornecedor', header: 'Fornecedor' },
  { key: 'condicao_pagamento', header: 'Cond. Pagto', render: (v: any, row: any) => {
    const cod = v ?? '';
    const desc = row?.descricao_condicao_pagamento ?? '';
    if (!cod && !desc) return '-';
    return desc ? `${cod} - ${desc}` : String(cod);
  } },
  { key: 'transacao', header: 'Transação' },
  { key: 'data_emissao', header: 'Emissão', render: (v) => formatDate(v) },
  { key: 'data_entrega', header: 'Entrega', render: (v) => formatDate(v) },
  { key: 'quantidade_pedida', header: 'Qtd. Pedida', align: 'right', render: (v) => formatNumber(v, 2) },
  { key: 'saldo_pendente', header: 'Saldo Pend.', align: 'right', render: (v) => formatNumber(v, 2) },
  { key: 'preco_unitario', header: 'Preço Unit.', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'percentual_desconto', header: '% Desc.', align: 'right', render: (v) => v ? `${formatNumber(v, 2)}%` : '-' },
  { key: 'valor_desconto_total', header: 'Vlr. Desconto', align: 'right' as const, render: (v: any) => formatCurrency(v) },
  { key: 'valor_liquido', header: 'Vlr. Líquido', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'situacao_oc', header: 'Situação', render: (v) => {
    const s = String(v ?? '');
    const label = situacaoLabel(v);
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
    let extra = '';
    if (s === '4') { variant = 'default'; extra = 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]'; }
    else if (s === '1' || s === '2') { variant = 'default'; extra = 'bg-[hsl(var(--info))] text-[hsl(var(--info-foreground))] hover:bg-[hsl(var(--info))]'; }
    else if (s === '3') { variant = 'default'; extra = 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] hover:bg-[hsl(var(--warning))]'; }
    else if (s === '5') { variant = 'destructive'; }
    return <Badge variant={variant} className={extra}>{label}</Badge>;
  } },
  { key: 'numero_nf', header: 'NF', render: (v: any) => v
    ? <Badge variant="outline" className="gap-1 border-[hsl(var(--success))]/40 text-[hsl(var(--success))]"><Link2 className="h-3 w-3" />{v}</Badge>
    : <Badge variant="outline" className="gap-1 border-[hsl(var(--warning))]/40 text-[hsl(var(--warning))]"><Unlink className="h-3 w-3" />sem NF</Badge> },
  { key: 'dias_atraso', header: 'Dias Atraso', align: 'right', render: (v) => v > 0 ? <Badge variant="destructive">{v}</Badge> : '-' },
];

export default function PainelComprasPage() {
  const [filters, setFilters] = useState<{
    codigo_item: string; descricao_item: string; fornecedor: string; numero_oc: string;
    numero_projeto: string; centro_custo: string; transacao: string; codigo_produto: string;
    valor_min: string; valor_max: string; tipo_item: string; tipo_oc: string;
    data_emissao_ini: string; data_emissao_fim: string; data_entrega_ini: string; data_entrega_fim: string;
    origem_material: string; familia: string; coddep: string; somente_pendentes: boolean;
    agrupar_por_fornecedor: boolean; situacao_oc: string[]; codigo_motivo_oc: string; observacao_oc: string;
    mostrar_valor_total_oc: boolean;
    projeto_macro: string; tipo_despesa: string; mes_competencia: string; condicao_pagamento: string;
  }>({
    codigo_item: '', descricao_item: '', fornecedor: '', numero_oc: '',
    numero_projeto: '', centro_custo: '', transacao: '', codigo_produto: '',
    valor_min: '', valor_max: '', tipo_item: 'TODOS', tipo_oc: 'TODOS',
    data_emissao_ini: '', data_emissao_fim: '', data_entrega_ini: '', data_entrega_fim: '',
    origem_material: '', familia: '', coddep: '', somente_pendentes: true,
    agrupar_por_fornecedor: false, situacao_oc: [], codigo_motivo_oc: 'TODOS', observacao_oc: '',
    mostrar_valor_total_oc: false,
    projeto_macro: 'TODOS', tipo_despesa: 'TODOS', mes_competencia: '', condicao_pagamento: '',
  });
  const [data, setData] = useState<PainelComprasResponse | null>(null);
  const [dadosAgregados, setDadosAgregados] = useState<PainelComprasResponse | null>(null);
  const [dashboard, setDashboard] = useState<PainelComprasDashboardResponse | null>(null);
  const [usandoFallbackAgregado, setUsandoFallbackAgregado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAgregado, setLoadingAgregado] = useState(false);
  const TAMANHO_AGREGADO = 50000;
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState<'100' | '250' | '500' | '1000' | 'todos'>('100');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lista' | 'drill'>('dashboard');
  const [drillSeed, setDrillSeed] = useState<{ nivel: any; chave: string; label: string; nonce: number } | null>(null);
  const [clearDrillSignal, setClearDrillSignal] = useState(0);
  const drillRef = useRef<HTMLDivElement>(null);
  const openDrill = useCallback((nivel: string, chave: any, label?: string) => {
    if (chave == null || chave === '') return;
    const ch = String(chave);
    setDrillSeed({ nivel, chave: ch, label: label ?? ch, nonce: Date.now() });
    setActiveTab('drill');
    setTimeout(() => drillRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, []);
  const clearDrill = useCallback(() => {
    setDrillSeed(null);
    setClearDrillSignal((n) => n + 1);
  }, []);

  const erpReady = useErpReady();
  const { familias, origens, loading: optionsLoading } = useErpOptions(erpReady, data?.dados, { familiaKey: 'codigo_familia', origemKey: 'origem_material' });
  const { fornecedores: fornecedoresOptions, loading: fornecedoresLoading } = useFornecedores(erpReady, data?.dados);

  const trackSearch = useSearchTracking('painel-compras');

  const search = useCallback(async (page = 1, tamanhoOverride?: typeof tamanhoPagina) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    const buildParams = (p: number, size: number) => {
      const params: any = { ...filters, pagina: p, tamanho_pagina: size };
      if (params.valor_min) params.valor_min = parseFloat(params.valor_min);
      else delete params.valor_min;
      if (params.valor_max) params.valor_max = parseFloat(params.valor_max);
      else delete params.valor_max;
      const situacoesSel: string[] = Array.isArray(params.situacao_oc) ? params.situacao_oc : [];
      if (situacoesSel.length > 0) params.situacao_oc = situacoesSel.join(',');
      else delete params.situacao_oc;
      if (!params.coddep) delete params.coddep;
      if (!params.tipo_item || params.tipo_item === 'TODOS') delete params.tipo_item;
      if (!params.tipo_oc || params.tipo_oc === 'TODOS') delete params.tipo_oc;
      if (!params.codigo_motivo_oc || params.codigo_motivo_oc === 'TODOS') delete params.codigo_motivo_oc;
      if (!params.observacao_oc) delete params.observacao_oc;
      if (!params.projeto_macro || params.projeto_macro === 'TODOS') delete params.projeto_macro;
      if (!params.tipo_despesa || params.tipo_despesa === 'TODOS') delete params.tipo_despesa;
      if (!params.mes_competencia) delete params.mes_competencia;
      if (!params.condicao_pagamento) delete params.condicao_pagamento;
      return params;
    };
    try {
      const tamanhoEfetivo = tamanhoOverride ?? tamanhoPagina;
      const tamanhoNumerico = tamanhoEfetivo === 'todos' ? 100000 : Number(tamanhoEfetivo);
      const result = await api.get<PainelComprasResponse>('/api/painel-compras', buildParams(page, tamanhoNumerico));
      setData(result);
      setPagina(page);
      if (page === 1) trackSearch(filters, (result as any)?.total_registros);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }

    // Dataset agregado para KPIs/gráficos/drill — apenas na primeira página.
    // Tenta primeiro o endpoint dashboard real (sem paginação). Em caso de erro,
    // cai de volta para o endpoint paginado com tamanho_pagina=TAMANHO_AGREGADO.
    const tamanhoEfetivo = tamanhoOverride ?? tamanhoPagina;
    const tamanhoNumerico = tamanhoEfetivo === 'todos' ? 100000 : Number(tamanhoEfetivo);
    if (page === 1) {
      setLoadingAgregado(true);
      try {
        const dash = await api.get<PainelComprasDashboardResponse>(
          '/api/painel-compras-dashboard',
          buildParams(1, 0),
        );
        setDashboard(dash);
        setUsandoFallbackAgregado(false);
        // Mantém o agregado paginado como apoio para drill detalhado e listas auxiliares.
        if (tamanhoNumerico < TAMANHO_AGREGADO) {
          try {
            const aggregated = await api.get<PainelComprasResponse>('/api/painel-compras', buildParams(1, TAMANHO_AGREGADO));
            setDadosAgregados(aggregated);
          } catch {
            setDadosAgregados(null);
          }
        } else {
          setDadosAgregados(null);
        }
      } catch (e: any) {
        console.warn('Endpoint /api/painel-compras-dashboard indisponível, usando fallback paginado:', e?.message);
        setDashboard(null);
        setUsandoFallbackAgregado(true);
        if (tamanhoNumerico < TAMANHO_AGREGADO) {
          try {
            const aggregated = await api.get<PainelComprasResponse>('/api/painel-compras', buildParams(1, TAMANHO_AGREGADO));
            setDadosAgregados(aggregated);
          } catch (e2: any) {
            console.warn('Falha ao carregar dataset agregado do Painel de Compras:', e2?.message);
            setDadosAgregados(null);
          }
        } else {
          setDadosAgregados(null);
        }
      } finally {
        setLoadingAgregado(false);
      }
    }
  }, [filters, erpReady, trackSearch, tamanhoPagina]);

  useAiFilters('painel-compras', setFilters, () => search(1));

  useAiPageContext({
    title: 'Painel de Compras',
    module: 'painel-compras',
    filters,
    kpis: dashboard ? {
      'Total OCs': dashboard.kpis.quantidade_ocs ?? '-',
      'Valor Comprado': formatCurrency(dashboard.kpis.valor_comprado ?? 0),
      'Valor Pendente': formatCurrency(dashboard.kpis.valor_pendente ?? 0),
      'Itens Atrasados': dashboard.kpis.itens_atrasados ?? '-',
    } : (data && (data as any).resumo ? {
      'Total OCs': (data as any).resumo.total_ocs ?? '-',
      'Valor Líquido': formatCurrency((data as any).resumo.valor_liquido_total ?? 0),
      'Valor Pendente': formatCurrency((data as any).resumo.valor_pendente_total ?? 0),
      'Itens Atrasados': (data as any).resumo.itens_atrasados ?? 0,
    } : undefined),
    summary: data
      ? `${data.total_registros} linhas de OC; página ${pagina}/${data.total_paginas}`
      : undefined,
  });

  const clearFilters = () => { setFilters({
    codigo_item: '', descricao_item: '', fornecedor: '', numero_oc: '',
    numero_projeto: '', centro_custo: '', transacao: '', codigo_produto: '',
    valor_min: '', valor_max: '', tipo_item: 'TODOS', tipo_oc: 'TODOS',
    data_emissao_ini: '', data_emissao_fim: '', data_entrega_ini: '', data_entrega_fim: '',
    origem_material: '', familia: '', coddep: '', somente_pendentes: true,
    agrupar_por_fornecedor: false, situacao_oc: [], codigo_motivo_oc: 'TODOS', observacao_oc: '',
    mostrar_valor_total_oc: false,
    projeto_macro: 'TODOS', tipo_despesa: 'TODOS', mes_competencia: '', condicao_pagamento: '',
  }); };

  const columns = useMemo(() => {
    const cols = [...baseColumns];
    if (filters.mostrar_valor_total_oc) {
      // Insert "Valor Total OC" after "Vlr. Líquido" (index 13)
      const insertIdx = cols.findIndex(c => c.key === 'situacao_oc');
      const valorTotalCol: Column<any> = { key: 'valor_total_oc', header: 'Valor Total OC', align: 'right', render: (v) => formatCurrency(v) };
      if (insertIdx >= 0) cols.splice(insertIdx, 0, valorTotalCol);
      else cols.push(valorTotalCol);
    }
    return cols;
  }, [filters.mostrar_valor_total_oc]);

  const chartData = useMemo(() => {
    const gerencialActive =
      (filters.projeto_macro && filters.projeto_macro !== 'TODOS') ||
      (filters.tipo_despesa && filters.tipo_despesa !== 'TODOS') ||
      !!filters.mes_competencia ||
      !!filters.condicao_pagamento;
    if (data?.graficos && !gerencialActive) return data.graficos;
    if (!data?.dados?.length) return null;
    const dados = gerencialActive
      ? data.dados.map((d: any) => enrichRow(d)).filter((d: any) => {
          if (filters.projeto_macro !== 'TODOS' && d.projeto_macro !== filters.projeto_macro) return false;
          if (filters.tipo_despesa !== 'TODOS' && d.tipo_despesa_calc !== filters.tipo_despesa) return false;
          if (filters.mes_competencia && d.mes_competencia_calc !== filters.mes_competencia) return false;
          if (filters.condicao_pagamento) {
            const q = filters.condicao_pagamento.toLowerCase();
            const cp = String(d.condicao_pagamento ?? '').toLowerCase();
            const dcp = String(d.descricao_condicao_pagamento ?? '').toLowerCase();
            if (!cp.includes(q) && !dcp.includes(q)) return false;
          }
          return true;
        })
      : data.dados;

    // Top Fornecedores by valor_liquido
    const fornMap = new Map<string, number>();
    dados.forEach((d: any) => {
      const key = d.fantasia_fornecedor || 'Desconhecido';
      fornMap.set(key, (fornMap.get(key) || 0) + (d.valor_liquido || 0));
    });
    const top_fornecedores = [...fornMap.entries()]
      .map(([fantasia_fornecedor, valor_liquido_total]) => ({ fantasia_fornecedor, valor_liquido_total }))
      .sort((a, b) => b.valor_liquido_total - a.valor_liquido_total)
      .slice(0, 10);

    // Situação das OCs (qtd + valor líquido)
    const sitMap = new Map<number, { qtd: number; valor: number }>();
    dados.forEach((d: any) => {
      const s = d.situacao_oc ?? 0;
      const cur = sitMap.get(s) || { qtd: 0, valor: 0 };
      cur.qtd += 1;
      cur.valor += d.valor_liquido || 0;
      sitMap.set(s, cur);
    });
    const situacoes = [...sitMap.entries()].map(([situacao_oc, v]) => ({
      situacao_oc,
      quantidade_itens: v.qtd,
      valor_liquido_total: v.valor,
    }));

    // Produtos x Serviços (qtd + valor líquido)
    const tipoMap = new Map<string, { qtd: number; valor: number }>();
    dados.forEach((d: any) => {
      const t = d.tipo_item || 'Outros';
      const cur = tipoMap.get(t) || { qtd: 0, valor: 0 };
      cur.qtd += 1;
      cur.valor += d.valor_liquido || 0;
      tipoMap.set(t, cur);
    });
    const tipos = [...tipoMap.entries()].map(([tipo_item, v]) => ({
      tipo_item,
      quantidade_itens: v.qtd,
      valor_liquido_total: v.valor,
    }));

    // Top Famílias por valor líquido
    const famMap = new Map<string, number>();
    dados.forEach((d: any) => {
      const key = d.codigo_familia || 'Sem família';
      famMap.set(key, (famMap.get(key) || 0) + (d.valor_liquido || 0));
    });
    const familias = [...famMap.entries()]
      .map(([codigo_familia, valor_liquido_total]) => ({ codigo_familia, valor_liquido_total }))
      .sort((a, b) => b.valor_liquido_total - a.valor_liquido_total)
      .slice(0, 10);

    // Top Origens por valor líquido
    const origMap = new Map<string, number>();
    dados.forEach((d: any) => {
      const key = d.origem_material || 'Sem origem';
      origMap.set(key, (origMap.get(key) || 0) + (d.valor_liquido || 0));
    });
    const origens = [...origMap.entries()]
      .map(([origem, valor_liquido_total]) => ({ origem, valor_liquido_total }))
      .sort((a, b) => b.valor_liquido_total - a.valor_liquido_total)
      .slice(0, 10);

    // Entregas por mês
    const mesMap = new Map<string, { valor: number; itens: number }>();
    dados.forEach((d: any) => {
      if (!d.data_entrega) return;
      const periodo = String(d.data_entrega).substring(0, 7); // YYYY-MM
      const cur = mesMap.get(periodo) || { valor: 0, itens: 0 };
      cur.valor += d.valor_liquido || 0;
      cur.itens += 1;
      mesMap.set(periodo, cur);
    });
    const entregas_por_mes = [...mesMap.entries()]
      .map(([periodo_entrega, v]) => ({ periodo_entrega, valor_pendente_total: v.valor, quantidade_itens: v.itens }))
      .sort((a, b) => a.periodo_entrega.localeCompare(b.periodo_entrega));

    return { top_fornecedores, situacoes, tipos, familias, origens, entregas_por_mes };
  }, [data, filters.projeto_macro, filters.tipo_despesa, filters.mes_competencia, filters.condicao_pagamento]);

  const kpis = useMemo(() => {
    if (!data) return null;
    const gerencialActive =
      (filters.projeto_macro && filters.projeto_macro !== 'TODOS') ||
      (filters.tipo_despesa && filters.tipo_despesa !== 'TODOS') ||
      !!filters.mes_competencia ||
      !!filters.condicao_pagamento;
    // Quando há filtro gerencial, ignoramos `totais`/`resumo` do backend (não conhecem esses filtros).
    const totais = gerencialActive ? undefined : ((data as any)?.totais as Record<string, any> | undefined);
    const resumo = gerencialActive ? undefined : ((data as any)?.resumo as Record<string, any> | undefined);

    // Fallback client-side. Quando filtro gerencial está ativo, soma sobre dadosFiltrados.
    let fallback: Record<string, any> | null = null;
    const baseDados: any[] = gerencialActive
      ? (Array.isArray((globalThis as any).__nope) ? [] : [])
      : (Array.isArray(data.dados) ? data.dados : []);
    // Use dadosFiltrados via closure (definido depois? não — dadosFiltrados está fora deste useMemo).
    // Para evitar dependência circular, recomputamos rapidamente aqui:
    const dadosParaFallback = gerencialActive
      ? data.dados.map((d: any) => enrichRow(d)).filter((d: any) => {
          if (filters.projeto_macro !== 'TODOS' && d.projeto_macro !== filters.projeto_macro) return false;
          if (filters.tipo_despesa !== 'TODOS' && d.tipo_despesa_calc !== filters.tipo_despesa) return false;
          if (filters.mes_competencia && d.mes_competencia_calc !== filters.mes_competencia) return false;
          if (filters.condicao_pagamento) {
            const q = filters.condicao_pagamento.toLowerCase();
            const cp = String(d.condicao_pagamento ?? '').toLowerCase();
            const dcp = String(d.descricao_condicao_pagamento ?? '').toLowerCase();
            if (!cp.includes(q) && !dcp.includes(q)) return false;
          }
          return true;
        })
      : baseDados;
    if (dadosParaFallback.length > 0) {
      const dados = dadosParaFallback;
      const uniqueOcs = new Set(dados.map((d: any) => d.numero_oc));
      const uniqueFornecedores = new Set(dados.map((d: any) => d.fantasia_fornecedor).filter(Boolean));
      const valorBruto = dados.reduce((s: number, d: any) => s + (d.valor_bruto || d.quantidade_pedida * d.preco_unitario || 0), 0);
      const valorLiquido = dados.reduce((s: number, d: any) => s + (d.valor_liquido || 0), 0);
      const valorDesconto = dados.reduce((s: number, d: any) => s + (d.valor_desconto_total || 0), 0);
      const valorPendente = dados.reduce((s: number, d: any) => s + ((d.saldo_pendente || 0) * (d.preco_unitario || 0)), 0);
      const itensPendentes = dados.filter((d: any) => (d.saldo_pendente || 0) > 0).length;
      const itensAtrasados = dados.filter((d: any) => (d.dias_atraso || 0) > 0).length;
      const ocsAtrasadas = new Set(dados.filter((d: any) => (d.dias_atraso || 0) > 0).map((d: any) => d.numero_oc)).size;
      const maiorAtraso = Math.max(0, ...dados.map((d: any) => d.dias_atraso || 0));
      const itensProduto = dados.filter((d: any) => d.tipo_item === 'PRODUTO' || d.tipo_item === 'P').length;
      const itensServico = dados.filter((d: any) => d.tipo_item === 'SERVICO' || d.tipo_item === 'S').length;
      const totalLinhas = dados.length;
      fallback = {
        total_ocs: uniqueOcs.size,
        valor_bruto_total: valorBruto,
        valor_liquido_total: valorLiquido,
        valor_desconto_total: valorDesconto,
        total_fornecedores: uniqueFornecedores.size,
        valor_pendente_total: valorPendente,
        itens_pendentes: itensPendentes,
        itens_atrasados: itensAtrasados,
        ocs_atrasadas: ocsAtrasadas,
        maior_atraso_dias: maiorAtraso,
        ticket_medio_item: totalLinhas > 0 ? valorLiquido / totalLinhas : 0,
        impostos_totais: dados.reduce((s: number, d: any) => s + (d.impostos || 0), 0),
        total_linhas: totalLinhas,
        itens_produto: itensProduto,
        itens_servico: itensServico,
      };
    }

    if (!totais && !resumo && !fallback) return null;

    // Normaliza aliases do backend para o schema esperado pelos cards.
    const totaisNorm: Record<string, any> = { ...(totais ?? {}) };
    if (totais?.qtd_registros != null && totaisNorm.total_linhas == null) {
      totaisNorm.total_linhas = totais.qtd_registros;
    }
    if (totais?.qtd_ocs != null && totaisNorm.total_ocs == null) {
      totaisNorm.total_ocs = totais.qtd_ocs;
    }
    if (totais?.valor_total != null && totaisNorm.valor_liquido_total == null) {
      totaisNorm.valor_liquido_total = totais.valor_total;
    }

    // Merge por prioridade: totais > resumo > fallback.
    // Só preenche se ainda não houver valor — campos ausentes em `totais`
    // caem para `resumo`/fallback em vez de ficarem vazios nos cards.
    const merge = (...sources: (Record<string, any> | null | undefined)[]) => {
      const out: Record<string, any> = {};
      for (const src of sources) {
        if (!src) continue;
        for (const [k, v] of Object.entries(src)) {
          if (out[k] == null && v != null) out[k] = v;
        }
      }
      return out;
    };

    return merge(totaisNorm, resumo, fallback);
  }, [data, filters.projeto_macro, filters.tipo_despesa, filters.mes_competencia, filters.condicao_pagamento]);

  // Base paginada (Lista Detalhada)
  const dadosEnriquecidosLista = useMemo(() => {
    if (!data?.dados?.length) return [] as any[];
    return data.dados.map((d: any) => enrichRow(d));
  }, [data]);

  // Base agregada (KPIs/gráficos/drill). Cai para a paginada se ainda não chegou.
  const baseAgregadaBruta = dadosAgregados?.dados?.length ? dadosAgregados.dados : (data?.dados ?? []);
  const dadosEnriquecidos = useMemo(
    () => baseAgregadaBruta.map((d: any) => enrichRow(d)),
    [baseAgregadaBruta],
  );

  const filtroCliente = (d: any) => {
    if (filters.projeto_macro && filters.projeto_macro !== 'TODOS' && d.projeto_macro !== filters.projeto_macro) return false;
    if (filters.tipo_despesa && filters.tipo_despesa !== 'TODOS' && d.tipo_despesa_calc !== filters.tipo_despesa) return false;
    if (filters.mes_competencia && d.mes_competencia_calc !== filters.mes_competencia) return false;
    if (filters.condicao_pagamento) {
      const cp = String(d.condicao_pagamento ?? '').toLowerCase();
      const dcp = String(d.descricao_condicao_pagamento ?? '').toLowerCase();
      const q = filters.condicao_pagamento.toLowerCase();
      if (!cp.includes(q) && !dcp.includes(q)) return false;
    }
    return true;
  };

  const dadosFiltrados = useMemo(
    () => dadosEnriquecidos.filter(filtroCliente),
    [dadosEnriquecidos, filters.projeto_macro, filters.tipo_despesa, filters.mes_competencia, filters.condicao_pagamento],
  );

  const dadosListaFiltrados = useMemo(
    () => dadosEnriquecidosLista.filter(filtroCliente),
    [dadosEnriquecidosLista, filters.projeto_macro, filters.tipo_despesa, filters.mes_competencia, filters.condicao_pagamento],
  );

  const totalAgregadoCompras = dadosAgregados?.total_registros ?? 0;
  const amostragemAtivaCompras = usandoFallbackAgregado && totalAgregadoCompras > TAMANHO_AGREGADO;

  const kpisGerencial = useMemo(() => {
    // Quando o endpoint /api/painel-compras-dashboard responde, usamos exclusivamente
    // seus KPIs (base completa filtrada, sem paginação). Sem somar `dadosFiltrados`.
    if (dashboard) {
      const k = dashboard.kpis;
      const topBackend = k.maior_fornecedor
        ? { nome: k.maior_fornecedor.nome || k.maior_fornecedor.codigo || '—', valor: k.maior_fornecedor.valor || 0 }
        : null;
      const topForn = topBackend ?? (() => {
        const t = [...(dashboard.graficos?.por_fornecedor ?? [])]
          .sort((a, b) => (b.valor || 0) - (a.valor || 0))[0];
        return t ? { nome: t.fornecedor || '—', valor: t.valor || 0 } : null;
      })();
      return {
        comprado: k.valor_comprado || 0,
        pendente: k.valor_pendente || 0,
        recebido: k.valor_recebido ?? null,
        qtdOcs: k.quantidade_ocs || 0,
        qtdItens: k.quantidade_itens || 0,
        qtdFornecedores: k.quantidade_fornecedores || 0,
        ticketMedio: k.ticket_medio_oc || 0,
        itensPendentes: k.itens_pendentes ?? null,
        itensAtrasados: k.itens_atrasados ?? null,
        maiorAtrasoDias: k.maior_atraso_dias ?? null,
        valorBruto: k.valor_bruto_total ?? null,
        valorLiquido: k.valor_liquido_total ?? null,
        maiorFornecedor: topForn,
      };
    }
    if (!dadosFiltrados.length) return null;
    const ocs = new Set<any>();
    const fornecedores = new Set<any>();
    let comprado = 0;
    let pendente = 0;
    const fornMap = new Map<string, number>();
    dadosFiltrados.forEach((d: any) => {
      ocs.add(d.numero_oc);
      if (d.fantasia_fornecedor) fornecedores.add(d.fantasia_fornecedor);
      const v = d.valor_liquido || 0;
      comprado += v;
      pendente += (d.saldo_pendente || 0) * (d.preco_unitario || 0);
      const k = d.fantasia_fornecedor || '—';
      fornMap.set(k, (fornMap.get(k) || 0) + v);
    });
    const recebido = (data as any)?.totais?.valor_recebido_total
      ?? (data as any)?.resumo?.valor_recebido_total
      ?? null;
    const top = [...fornMap.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      comprado, pendente, recebido,
      qtdOcs: ocs.size, qtdItens: dadosFiltrados.length, qtdFornecedores: fornecedores.size,
      ticketMedio: ocs.size > 0 ? comprado / ocs.size : 0,
      itensPendentes: null, itensAtrasados: null, maiorAtrasoDias: null,
      valorBruto: null, valorLiquido: null,
      maiorFornecedor: top ? { nome: top[0], valor: top[1] } : null,
    };
  }, [dadosFiltrados, data, dashboard]);

  const gerencialCharts = useMemo(() => {
    if (dashboard) {
      const g = dashboard.graficos;
      const map = (rows: any[] | undefined, labelKey: string) =>
        (rows || []).map((r) => ({ label: String(r[labelKey] ?? '—'), valor: Number(r.valor || 0) }));
      const porMes = map(g.por_mes, 'mes').sort((a, b) => a.label.localeCompare(b.label));
      const porTipoDespesa = map(g.por_tipo_despesa, 'tipo').sort((a, b) => b.valor - a.valor);
      const porCentroCusto = map(g.por_centro_custo, 'centro_custo').sort((a, b) => b.valor - a.valor).slice(0, 10);
      const porProjeto = (g.por_projeto || [])
        .map((r) => ({ label: String(r.projeto ?? r.numero_projeto ?? '—'), valor: Number(r.valor || 0) }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10);
      if (!porMes.length && !porTipoDespesa.length && !porCentroCusto.length && !porProjeto.length) return null;
      return { porMes, porTipoDespesa, porCentroCusto, porProjeto };
    }
    if (!dadosFiltrados.length) return null;
    const agg = (key: string) => {
      const m = new Map<string, number>();
      dadosFiltrados.forEach((d: any) => {
        const k = String(d[key] ?? '—');
        m.set(k, (m.get(k) || 0) + (d.valor_liquido || 0));
      });
      return [...m.entries()].map(([label, valor]) => ({ label, valor })).sort((a, b) => b.valor - a.valor);
    };
    return {
      porMes: agg('mes_competencia_calc').sort((a, b) => a.label.localeCompare(b.label)),
      porTipoDespesa: agg('tipo_despesa_calc'),
      porCentroCusto: agg('centro_custo').slice(0, 10),
      porProjeto: agg('numero_projeto').slice(0, 10),
    };
  }, [dadosFiltrados, dashboard]);

  const drillDetails = useMemo(() => {
    if (!data?.dados?.length) return {} as Record<string, { label: string; value: string }[] | undefined>;
    const dados = data.dados;

    const topFornByField = (field: string, top = 10) => {
      const map = new Map<string, number>();
      dados.forEach((d: any) => {
        const key = d.fantasia_fornecedor || 'Desconhecido';
        map.set(key, (map.get(key) || 0) + (d[field] || 0));
      });
      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, top)
        .map(([label, val]) => ({ label: label.substring(0, 30), value: formatCurrency(val) }));
    };

    const topFornByCount = (filterFn: (d: any) => boolean, top = 10) => {
      const map = new Map<string, number>();
      dados.filter(filterFn).forEach((d: any) => {
        const key = d.fantasia_fornecedor || 'Desconhecido';
        map.set(key, (map.get(key) || 0) + 1);
      });
      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, top)
        .map(([label, val]) => ({ label: label.substring(0, 30), value: `${val} itens` }));
    };

    const valorBruto = topFornByField('valor_bruto');
    const desconto = topFornByField('valor_desconto_total');
    const impostos = topFornByField('impostos');
    const fornecedores = topFornByField('valor_liquido');
    const valorPendente = (() => {
      const map = new Map<string, number>();
      dados.forEach((d: any) => {
        const key = d.fantasia_fornecedor || 'Desconhecido';
        map.set(key, (map.get(key) || 0) + ((d.saldo_pendente || 0) * (d.preco_unitario || 0)));
      });
      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, val]) => ({ label: label.substring(0, 30), value: formatCurrency(val) }));
    })();
    const itensPendentes = topFornByCount((d: any) => (d.saldo_pendente || 0) > 0);
    const itensAtrasados = dados
      .filter((d: any) => (d.dias_atraso || 0) > 0)
      .sort((a: any, b: any) => (b.dias_atraso || 0) - (a.dias_atraso || 0))
      .slice(0, 10)
      .map((d: any) => ({ label: `OC ${d.numero_oc} - ${(d.descricao_item || '').substring(0, 20)}`, value: `${d.dias_atraso} dias` }));
    const ocsAtrasadas = (() => {
      const map = new Map<number, number>();
      dados.filter((d: any) => (d.dias_atraso || 0) > 0).forEach((d: any) => {
        const oc = d.numero_oc;
        map.set(oc, Math.max(map.get(oc) || 0, d.dias_atraso));
      });
      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([oc, dias]) => ({ label: `OC ${oc}`, value: `${dias} dias` }));
    })();
    const maiorAtraso = dados
      .filter((d: any) => (d.dias_atraso || 0) > 0)
      .sort((a: any, b: any) => (b.dias_atraso || 0) - (a.dias_atraso || 0))
      .slice(0, 5)
      .map((d: any) => ({ label: `OC ${d.numero_oc} - ${(d.descricao_item || '').substring(0, 20)}`, value: `${d.dias_atraso} dias` }));
    const totalLinhas = (() => {
      const sitMap = new Map<string, number>();
      dados.forEach((d: any) => {
        const key = situacaoLabel(d.situacao_oc);
        sitMap.set(key, (sitMap.get(key) || 0) + 1);
      });
      const produto = dados.filter((d: any) => d.tipo_item === 'PRODUTO' || d.tipo_item === 'P').length;
      const servico = dados.filter((d: any) => d.tipo_item === 'SERVICO' || d.tipo_item === 'S').length;
      const result: { label: string; value: string }[] = [
        { label: 'Produtos', value: String(produto) },
        { label: 'Serviços', value: String(servico) },
      ];
      [...sitMap.entries()].sort((a, b) => b[1] - a[1]).forEach(([label, val]) => {
        result.push({ label, value: String(val) });
      });
      return result;
    })();
    const total = dados.length;
    const prod = dados.filter((d: any) => d.tipo_item === 'PRODUTO' || d.tipo_item === 'P').length;
    const serv = dados.filter((d: any) => d.tipo_item === 'SERVICO' || d.tipo_item === 'S').length;
    const itensServico = total > 0 ? [
      { label: 'Serviços', value: `${serv} (${(serv / total * 100).toFixed(1)}%)` },
      { label: 'Produtos', value: `${prod} (${(prod / total * 100).toFixed(1)}%)` },
    ] : undefined;

    return { valorBruto, desconto, impostos, fornecedores, valorPendente, itensPendentes, itensAtrasados, ocsAtrasadas, maiorAtraso, totalLinhas, itensServico };
  }, [data]);

  const exportParams = useMemo(() => {
    const p: any = { ...filters };
    if (p.valor_min) p.valor_min = parseFloat(p.valor_min);
    else delete p.valor_min;
    if (p.valor_max) p.valor_max = parseFloat(p.valor_max);
    else delete p.valor_max;
    const sitsSel: string[] = Array.isArray(p.situacao_oc) ? p.situacao_oc : [];
    if (sitsSel.length > 0) p.situacao_oc = sitsSel.join(',');
    else delete p.situacao_oc;
    if (!p.coddep) delete p.coddep;
    if (!p.tipo_item || p.tipo_item === 'TODOS') delete p.tipo_item;
    if (!p.tipo_oc || p.tipo_oc === 'TODOS') delete p.tipo_oc;
    if (!p.codigo_motivo_oc || p.codigo_motivo_oc === 'TODOS') delete p.codigo_motivo_oc;
    if (!p.observacao_oc) delete p.observacao_oc;
    if (!p.projeto_macro || p.projeto_macro === 'TODOS') delete p.projeto_macro;
    if (!p.tipo_despesa || p.tipo_despesa === 'TODOS') delete p.tipo_despesa;
    if (!p.mes_competencia) delete p.mes_competencia;
    if (!p.condicao_pagamento) delete p.condicao_pagamento;
    return p;
  }, [filters]);

  // Tooltip enriquecida para Pies (qtd + % + valor líquido)
  const PieRichTooltip = ({ active, payload, totals }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    const item = p.payload || {};
    const name = item.name ?? item.tipo_item ?? p.name;
    const qtd = item.quantidade_itens ?? p.value ?? 0;
    const valor = item.valor_liquido_total ?? 0;
    const pctQtd = totals.qtd > 0 ? (qtd / totals.qtd) * 100 : 0;
    const pctVal = totals.valor > 0 ? (valor / totals.valor) * 100 : 0;
    return (
      <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
        <div className="mb-1 font-semibold">{name}</div>
        <div className="text-muted-foreground">
          Itens: <span className="font-medium text-foreground">{qtd}</span> ({pctQtd.toFixed(1)}%)
        </div>
        <div className="text-muted-foreground">
          Valor líquido: <span className="font-medium text-foreground">{formatCurrency(valor)}</span> ({pctVal.toFixed(1)}%)
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">Clique para filtrar</div>
      </div>
    );
  };

  const tiposTotals = useMemo(() => {
    const list = chartData?.tipos ?? [];
    return {
      qtd: list.reduce((s: number, t: any) => s + (t.quantidade_itens || 0), 0),
      valor: list.reduce((s: number, t: any) => s + (t.valor_liquido_total || 0), 0),
    };
  }, [chartData]);

  const situacoesTotals = useMemo(() => {
    const list = chartData?.situacoes ?? [];
    return {
      qtd: list.reduce((s: number, t: any) => s + (t.quantidade_itens || 0), 0),
      valor: list.reduce((s: number, t: any) => s + (t.valor_liquido_total || 0), 0),
    };
  }, [chartData]);

  const handleDrillTipo = (slice: any) => {
    const raw = String(slice?.tipo_item ?? '').toUpperCase();
    let valor: 'PRODUTO' | 'SERVICO' | 'TODOS' = 'TODOS';
    if (raw === 'PRODUTO' || raw === 'P') valor = 'PRODUTO';
    else if (raw === 'SERVICO' || raw === 'S') valor = 'SERVICO';
    if (valor === 'TODOS') {
      toast.info('Sem código de tipo definido para drill-down nesta categoria.');
      return;
    }
    setFilters((f) => ({ ...f, tipo_item: valor }));
    setActiveTab('lista');
    setTimeout(() => search(1), 0);
  };

  const handleDrillSituacao = (slice: any) => {
    const sit = slice?.situacao_oc;
    if (sit === undefined || sit === null) return;
    setFilters((f) => ({ ...f, situacao_oc: [String(sit)] }));
    setActiveTab('lista');
    setTimeout(() => search(1), 0);
  };


  const activeChips: ActiveChip[] = useMemo(() => {
    const c: ActiveChip[] = [];
    const set = (k: keyof typeof filters, v: any) => setFilters((f) => ({ ...f, [k]: v }));
    if (filters.projeto_macro && filters.projeto_macro !== 'TODOS') c.push({ key: 'pm', label: 'Projeto Macro', value: filters.projeto_macro, onRemove: () => set('projeto_macro', 'TODOS') });
    if (filters.tipo_despesa && filters.tipo_despesa !== 'TODOS') c.push({ key: 'td', label: 'Tipo Despesa', value: filters.tipo_despesa, onRemove: () => set('tipo_despesa', 'TODOS') });
    if (filters.mes_competencia) c.push({ key: 'mes', label: 'Mês', value: filters.mes_competencia, onRemove: () => set('mes_competencia', '') });
    if (filters.condicao_pagamento) c.push({ key: 'cp', label: 'Cond. Pagto', value: filters.condicao_pagamento, onRemove: () => set('condicao_pagamento', '') });
    if (filters.fornecedor) c.push({ key: 'forn', label: 'Fornecedor', value: filters.fornecedor, onRemove: () => set('fornecedor', '') });
    if (filters.numero_projeto) c.push({ key: 'np', label: 'Projeto', value: filters.numero_projeto, onRemove: () => set('numero_projeto', '') });
    if (filters.centro_custo) c.push({ key: 'cc', label: 'CC', value: filters.centro_custo, onRemove: () => set('centro_custo', '') });
    if (filters.transacao) c.push({ key: 'tr', label: 'Transação', value: filters.transacao, onRemove: () => set('transacao', '') });
    if (filters.numero_oc) c.push({ key: 'oc', label: 'Nº OC', value: filters.numero_oc, onRemove: () => set('numero_oc', '') });
    if (filters.codigo_item) c.push({ key: 'ci', label: 'Item', value: filters.codigo_item, onRemove: () => set('codigo_item', '') });
    if (filters.descricao_item) c.push({ key: 'di', label: 'Descrição', value: filters.descricao_item, onRemove: () => set('descricao_item', '') });
    if (filters.familia) c.push({ key: 'fa', label: 'Família', value: filters.familia, onRemove: () => set('familia', '') });
    if (filters.origem_material) c.push({ key: 'om', label: 'Origem', value: filters.origem_material, onRemove: () => set('origem_material', '') });
    if (filters.tipo_item && filters.tipo_item !== 'TODOS') c.push({ key: 'ti', label: 'Tipo Item', value: filters.tipo_item, onRemove: () => set('tipo_item', 'TODOS') });
    if (filters.tipo_oc && filters.tipo_oc !== 'TODOS') c.push({ key: 'to', label: 'Tipo OC', value: filters.tipo_oc, onRemove: () => set('tipo_oc', 'TODOS') });
    if (filters.situacao_oc?.length) c.push({ key: 'sit', label: 'Situação', value: filters.situacao_oc.map(situacaoLabel).join(', '), onRemove: () => set('situacao_oc', []) });
    if (filters.data_emissao_ini) c.push({ key: 'dei', label: 'Emissão de', value: filters.data_emissao_ini, onRemove: () => set('data_emissao_ini', '') });
    if (filters.data_emissao_fim) c.push({ key: 'def', label: 'Emissão até', value: filters.data_emissao_fim, onRemove: () => set('data_emissao_fim', '') });
    if (filters.data_entrega_ini) c.push({ key: 'dti', label: 'Entrega de', value: filters.data_entrega_ini, onRemove: () => set('data_entrega_ini', '') });
    if (filters.data_entrega_fim) c.push({ key: 'dtf', label: 'Entrega até', value: filters.data_entrega_fim, onRemove: () => set('data_entrega_fim', '') });
    if (filters.somente_pendentes) c.push({ key: 'sp', label: 'Somente', value: 'pendentes', onRemove: () => set('somente_pendentes', false) });
    return c;
  }, [filters]);

  return (
    <PageDataProvider
      pageKey="painel-compras"
      kpis={dashboard ? {
        total_compras: dashboard.kpis?.valor_comprado ?? 0,
        total_recebido: dashboard.kpis?.valor_recebido ?? 0,
        ticket_medio: dashboard.kpis?.ticket_medio_oc ?? 0,
        qtde_notas: dashboard.kpis?.quantidade_ocs ?? 0,
      } : null}
      series={dashboard ? {
        compras_por_mes:  (dashboard.graficos?.por_mes ?? []).map((p: any) => ({ label: p.mes ?? p.label, valor: p.valor ?? 0 })),
        top_fornecedores: (dashboard.graficos?.por_fornecedor ?? []).map((p: any) => ({ label: p.fornecedor ?? p.label, valor: p.valor ?? 0 })),
        tipos_despesa:    (dashboard.graficos?.por_tipo_despesa ?? []).map((p: any) => ({ label: p.tipo_despesa ?? p.label, valor: p.valor ?? 0 })),
      } : null}
      rows={dadosFiltrados}
      filtros={filters}
    >
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Painel de Compras"
        description="Compras por projeto, centro de custo, tipo de despesa, fornecedor e recebimento"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Label className="whitespace-nowrap text-xs text-muted-foreground">Registros:</Label>
              <Select
                value={tamanhoPagina}
                onValueChange={(v) => {
                  const novo = v as typeof tamanhoPagina;
                  setTamanhoPagina(novo);
                  if (novo === 'todos') {
                    toast.info('Carregando todos os registros do filtro — pode levar alguns segundos para muitos resultados.');
                  }
                  if (data) search(1, novo);
                }}
              >
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1000</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="outline" onClick={() => search(pagina)} disabled={loading}>
              <RefreshCw className={`mr-1 h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <Button size="sm" variant="outline" onClick={clearFilters}>
              <FilterIcon className="mr-1 h-3 w-3" /> Limpar filtros
            </Button>
            <Button size="sm" variant="outline" onClick={clearDrill} disabled={!drillSeed && clearDrillSignal === 0}>
              <Eraser className="mr-1 h-3 w-3" /> Limpar drill
            </Button>
            <ExportButton endpoint="/api/export/painel-compras" params={exportParams} />
          </div>
        }
      />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters} defaultOpen={!data}>
        {/* 1) Visão Gerencial */}
        <FilterSection title="Visão Gerencial" icon={<TrendingUp className="h-3.5 w-3.5" />} cols={5}>
          <div>
            <Label className="text-xs">Projeto Macro</Label>
            <Select value={filters.projeto_macro} onValueChange={(v) => setFilters(f => ({ ...f, projeto_macro: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="GENIUS">Genius</SelectItem>
                <SelectItem value="ESTRUTURAL ZORTEA">Estrutural Zortea</SelectItem>
                <SelectItem value="OUTROS">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipo de Despesa</Label>
            <Select value={filters.tipo_despesa} onValueChange={(v) => setFilters(f => ({ ...f, tipo_despesa: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="Matéria-prima">Matéria-prima</SelectItem>
                <SelectItem value="Uso e consumo">Uso e consumo</SelectItem>
                <SelectItem value="Despesas gerais">Despesas gerais</SelectItem>
                <SelectItem value="Serviços">Serviços</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Mês (YYYY-MM)</Label>
            <Input value={filters.mes_competencia} onChange={(e) => setFilters(f => ({ ...f, mes_competencia: e.target.value }))} placeholder="2026-05" className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Cond. Pagamento</Label>
            <Input value={filters.condicao_pagamento} onChange={(e) => setFilters(f => ({ ...f, condicao_pagamento: e.target.value }))} placeholder="Código ou descrição" className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Situação da OC</Label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  title={filters.situacao_oc.map((v) => situacaoLabel(v)).join(', ') || 'Todas'}
                >
                  <span className="truncate">
                    {filters.situacao_oc.length === 0
                      ? 'Todas'
                      : filters.situacao_oc.length === 1
                        ? situacaoLabel(filters.situacao_oc[0])
                        : `${filters.situacao_oc.length} selecionadas`}
                  </span>
                  <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <button
                    type="button"
                    className="hover:text-foreground"
                    onClick={() => setFilters((f) => ({ ...f, situacao_oc: SITUACOES_OPCOES.map((o) => o.value) }))}
                  >
                    Selecionar todas
                  </button>
                  <button
                    type="button"
                    className="hover:text-foreground"
                    onClick={() => setFilters((f) => ({ ...f, situacao_oc: [] }))}
                  >
                    Limpar
                  </button>
                </div>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {SITUACOES_OPCOES.map((opt) => {
                    const checked = filters.situacao_oc.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-accent"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const isChecked = !!v;
                            setFilters((f) => {
                              const cur = new Set(f.situacao_oc);
                              if (isChecked) cur.add(opt.value);
                              else cur.delete(opt.value);
                              const next = SITUACOES_OPCOES
                                .map((o) => o.value)
                                .filter((v) => cur.has(v));
                              const includesLiquidado = next.includes('4');
                              return {
                                ...f,
                                situacao_oc: next,
                                somente_pendentes: includesLiquidado ? false : f.somente_pendentes,
                              };
                            });
                          }}
                        />
                        <span className="truncate">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </FilterSection>

        {/* 2) Período */}
        <FilterSection title="Período" icon={<Clock className="h-3.5 w-3.5" />} cols={4}>
          <div><Label className="text-xs">Emissão de</Label><Input type="date" value={filters.data_emissao_ini} onChange={(e) => setFilters(f => ({ ...f, data_emissao_ini: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Emissão até</Label><Input type="date" value={filters.data_emissao_fim} onChange={(e) => setFilters(f => ({ ...f, data_emissao_fim: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Entrega de</Label><Input type="date" value={filters.data_entrega_ini} onChange={(e) => setFilters(f => ({ ...f, data_entrega_ini: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Entrega até</Label><Input type="date" value={filters.data_entrega_fim} onChange={(e) => setFilters(f => ({ ...f, data_entrega_fim: e.target.value }))} className="h-8 text-xs" /></div>
        </FilterSection>

        {/* 3) Identificação */}
        <FilterSection title="Identificação" icon={<FileText className="h-3.5 w-3.5" />} cols={5}>
          <div><Label className="text-xs">Nº OC</Label><Input value={filters.numero_oc} onChange={(e) => setFilters(f => ({ ...f, numero_oc: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Item</Label><Input value={filters.codigo_item} onChange={(e) => setFilters(f => ({ ...f, codigo_item: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Código Produto</Label><Input value={filters.codigo_produto} onChange={(e) => setFilters(f => ({ ...f, codigo_produto: e.target.value }))} className="h-8 text-xs" placeholder="Ex: 001.001" /></div>
          <div><Label className="text-xs">Descrição Item</Label><Input value={filters.descricao_item} onChange={(e) => setFilters(f => ({ ...f, descricao_item: e.target.value }))} className="h-8 text-xs" /></div>
          <div>
            <Label className="text-xs">Tipo OC</Label>
            <Select value={filters.tipo_oc} onValueChange={(v) => setFilters(f => ({ ...f, tipo_oc: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="MISTA">Mista</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FilterSection>

        {/* 4) Entidades & Local */}
        <FilterSection title="Entidades & Local" icon={<Layers className="h-3.5 w-3.5" />} cols={6}>
          <div><Label className="text-xs">Fornecedor</Label><ComboboxFilter value={filters.fornecedor} onChange={(v) => setFilters(f => ({ ...f, fornecedor: v }))} options={fornecedoresOptions} placeholder="Buscar fornecedor..." loading={fornecedoresLoading} /></div>
          <div><Label className="text-xs">Projeto</Label><Input value={filters.numero_projeto} onChange={(e) => setFilters(f => ({ ...f, numero_projeto: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Centro Custo</Label><Input value={filters.centro_custo} onChange={(e) => setFilters(f => ({ ...f, centro_custo: e.target.value }))} className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Família</Label><ComboboxFilter value={filters.familia} onChange={(v) => setFilters(f => ({ ...f, familia: v }))} options={familias} placeholder="Família" loading={optionsLoading} /></div>
          <div><Label className="text-xs">Origem</Label><ComboboxFilter value={filters.origem_material} onChange={(v) => setFilters(f => ({ ...f, origem_material: v }))} options={origens} placeholder="Origem" loading={optionsLoading} /></div>
          <div><Label className="text-xs">Depósito</Label><Input value={filters.coddep} onChange={(e) => setFilters(f => ({ ...f, coddep: e.target.value }))} placeholder="Depósito" className="h-8 text-xs" /></div>
        </FilterSection>

        {/* 5) Classificação & Desconto */}
        <FilterSection title="Classificação & Desconto" icon={<Percent className="h-3.5 w-3.5" />} cols={4}>
          <div>
            <Label className="text-xs">Tipo Item</Label>
            <Select value={filters.tipo_item} onValueChange={(v) => setFilters(f => ({ ...f, tipo_item: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="PRODUTO">Produto</SelectItem>
                <SelectItem value="SERVICO">Serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Transação</Label><Input value={filters.transacao} onChange={(e) => setFilters(f => ({ ...f, transacao: e.target.value }))} className="h-8 text-xs" /></div>
          <div>
            <Label className="text-xs">Desconto</Label>
            <Select value={filters.codigo_motivo_oc} onValueChange={(v) => setFilters(f => ({ ...f, codigo_motivo_oc: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                <SelectItem value="19">Com desconto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Obs./Valor Desconto</Label><Input value={filters.observacao_oc} onChange={(e) => setFilters(f => ({ ...f, observacao_oc: e.target.value }))} placeholder="Pesquisar desconto..." className="h-8 text-xs" /></div>
        </FilterSection>

        {/* 6) Opções */}
        <FilterSection title="Opções" cols={4}>
          <label className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs cursor-pointer hover:bg-accent/50">
            <Checkbox checked={filters.somente_pendentes} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_pendentes: !!v }))} />
            <span>Somente pendentes</span>
          </label>
          <label className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs cursor-pointer hover:bg-accent/50">
            <Checkbox checked={filters.mostrar_valor_total_oc} onCheckedChange={(v) => setFilters(f => ({ ...f, mostrar_valor_total_oc: !!v }))} />
            <span>Mostrar valor total da OC</span>
          </label>
        </FilterSection>
      </FilterPanel>

      <ActiveFilterChips chips={activeChips} onClearAll={clearFilters} />

      {amostragemAtivaCompras && (
        <div className="rounded-md border border-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10 px-3 py-2 text-xs text-[hsl(var(--warning))]">
          Amostra de {TAMANHO_AGREGADO.toLocaleString('pt-BR')} de {totalAgregadoCompras.toLocaleString('pt-BR')} registros aplicados aos KPIs, gráficos e drill-down. Refine os filtros para totais exatos.
        </div>
      )}
      {loadingAgregado && data && (
        <div className="px-1 text-xs text-muted-foreground">Carregando agregação completa para KPIs e drill-down…</div>
      )}

      {data && kpis && (
        <>
          {!(data as any).totais && !data.resumo && tamanhoPagina !== 'todos' && data.total_paginas > 1 && (
            <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
              Atenção: o backend não retornou totais agregados. Os cards estão somando apenas a página atual ({data.dados.length} de {data.total_registros.toLocaleString('pt-BR')} registros). Selecione "Todos" no canto superior direito para ver os valores completos.
            </div>
          )}

          {kpisGerencial && (() => {
            const totalBase = kpisGerencial.comprado || 1;
            const recebidoVal = kpisGerencial.recebido ?? 0;
            const pendenteVal = kpisGerencial.pendente ?? 0;
            const pctRecebido = kpisGerencial.recebido != null ? Math.min(100, (recebidoVal / totalBase) * 100) : null;
            const pctPendente = Math.min(100, (pendenteVal / totalBase) * 100);
            return (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {/* Hero: Total Comprado */}
                <Card className="border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-transparent lg:col-span-1">
                  <CardContent className="flex h-full flex-col justify-between p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Comprado</p>
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <p className="mt-3 text-3xl font-bold tabular-nums">{formatCurrency(kpisGerencial.comprado)}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                      <span>Ticket médio/OC: <span className="font-medium text-foreground tabular-nums">{formatCurrency(kpisGerencial.ticketMedio)}</span></span>
                      <span>OCs: <span className="font-medium text-foreground">{kpisGerencial.qtdOcs}</span></span>
                    </div>
                  </CardContent>
                </Card>

                {/* Recebido vs Pendente */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      Recebimento vs Pendência
                      <span className="ml-auto text-xs font-normal text-muted-foreground">base: total comprado</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pctRecebido != null && (
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2"><Link2 className="h-3 w-3 text-[hsl(var(--success))]" /> Recebido</span>
                          <span className="tabular-nums"><span className="font-semibold text-foreground">{formatCurrency(recebidoVal)}</span><span className="text-muted-foreground"> ({pctRecebido.toFixed(1)}%)</span></span>
                        </div>
                        <Progress value={pctRecebido} className="h-2 [&>div]:bg-[hsl(var(--success))]" />
                      </div>
                    )}
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2"><Clock className="h-3 w-3 text-[hsl(var(--warning))]" /> Pendente</span>
                        <span className="tabular-nums"><span className="font-semibold text-foreground">{formatCurrency(pendenteVal)}</span><span className="text-muted-foreground"> ({pctPendente.toFixed(1)}%)</span></span>
                      </div>
                      <Progress value={pctPendente} className="h-2 [&>div]:bg-[hsl(var(--warning))]" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {kpisGerencial && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
              <KPICard index={0} title="Qtd OCs" value={kpisGerencial.qtdOcs} icon={<ShoppingCart className="h-5 w-5" />} onClick={() => setActiveTab('lista')} />
              <KPICard index={1} title="Qtd Itens" value={kpisGerencial.qtdItens} icon={<Package className="h-5 w-5" />} onClick={() => setActiveTab('lista')} />
              <KPICard index={2} title="Qtd Fornecedores" value={kpisGerencial.qtdFornecedores} icon={<Layers className="h-5 w-5" />} onClick={() => { setDrillSeed(null); setActiveTab('drill'); }} />
              <KPICard
                index={3}
                title="Maior Fornecedor"
                value={kpisGerencial.maiorFornecedor ? formatCurrency(kpisGerencial.maiorFornecedor.valor) : '--'}
                subtitle={kpisGerencial.maiorFornecedor?.nome}
                variant="info"
                icon={<Layers className="h-5 w-5" />}
                onClick={kpisGerencial.maiorFornecedor ? () => openDrill('fantasia_fornecedor', kpisGerencial.maiorFornecedor!.nome, kpisGerencial.maiorFornecedor!.nome) : undefined}
              />
            </div>
          )}

          <details className="group rounded-md border bg-card">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent/30">
              <span>Indicadores Operacionais Detalhados</span>
              <span className="text-xs font-normal">clique para expandir</span>
            </summary>
            <div className="space-y-4 border-t p-3">
              <div>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Financeiros</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                  <KPICard index={0} title="Total OCs" value={kpis.total_ocs} icon={<ShoppingCart className="h-5 w-5" />} tooltip="Quantidade total de Ordens de Compra" details={chartData?.situacoes?.map((s: any) => ({ label: situacaoLabel(s.situacao_oc), value: String(s.quantidade_itens) }))} />
                  <KPICard index={1} title="Valor Bruto" value={formatCurrency(kpis.valor_bruto_total)} variant="default" icon={<DollarSign className="h-5 w-5" />} tooltip="Soma dos valores brutos antes de descontos" details={drillDetails.valorBruto} />
                  <KPICard index={2} title="Desconto Total" value={formatCurrency(kpis.valor_desconto_total)} variant="warning" icon={<Percent className="h-5 w-5" />} tooltip="Soma de todos os descontos aplicados" details={drillDetails.desconto} />
                  <KPICard index={3} title="Valor Líquido" value={formatCurrency(kpis.valor_liquido_total)} variant="info" icon={<TrendingUp className="h-5 w-5" />} tooltip="Valor bruto menos descontos" details={[{ label: 'Valor Bruto', value: formatCurrency(kpis.valor_bruto_total) }, { label: 'Descontos', value: formatCurrency(kpis.valor_desconto_total) }, { label: 'Valor Líquido', value: formatCurrency(kpis.valor_liquido_total) }]} />
                  <KPICard index={4} title="Impostos Totais" value={formatCurrency(kpis.impostos_totais)} variant="default" icon={<Receipt className="h-5 w-5" />} tooltip="Soma de IPI, ICMS, ISS e outros impostos" details={drillDetails.impostos} />
                  <KPICard index={5} title="Fornecedores" value={kpis.total_fornecedores} variant="default" icon={<Layers className="h-5 w-5" />} tooltip="Quantidade de fornecedores distintos" details={drillDetails.fornecedores} />
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pendência</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                  <KPICard index={6} title="Valor Pendente" value={formatCurrency(kpis.valor_pendente_total)} variant="warning" icon={<Clock className="h-5 w-5" />} tooltip="Valor total de itens ainda não recebidos" details={drillDetails.valorPendente} />
                  <KPICard index={7} title="Itens Pendentes" value={kpis.itens_pendentes} variant="warning" icon={<Package className="h-5 w-5" />} tooltip="Quantidade de itens com saldo pendente de recebimento" details={drillDetails.itensPendentes} />
                  <KPICard index={8} title="Itens Atrasados" value={kpis.itens_atrasados} variant="destructive" icon={<AlertTriangle className="h-5 w-5" />} tooltip="Itens cuja data de entrega já passou e ainda possuem saldo" details={drillDetails.itensAtrasados} />
                  <KPICard index={9} title="OCs Atrasadas" value={kpis.ocs_atrasadas ?? '-'} variant="destructive" icon={<AlertTriangle className="h-5 w-5" />} tooltip="Quantidade de OCs com pelo menos um item atrasado" details={drillDetails.ocsAtrasadas} />
                  <KPICard index={10} title="Maior Atraso" value={`${kpis.maior_atraso_dias} dias`} variant="destructive" icon={<Clock className="h-5 w-5" />} tooltip="Maior número de dias de atraso entre todos os itens pendentes" details={drillDetails.maiorAtraso} />
                  <KPICard index={11} title="Ticket Médio/Item" value={formatCurrency(kpis.ticket_medio_item)} variant="info" icon={<TrendingUp className="h-5 w-5" />} tooltip="Valor líquido total dividido pelo número de itens" />
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contagem de Itens</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                  <KPICard index={12} title="Total Linhas" value={kpis.total_linhas ?? '-'} icon={<FileText className="h-5 w-5" />} tooltip="Total de linhas de itens nas ordens de compra" details={drillDetails.totalLinhas} />
                  <KPICard index={13} title="Itens Produto" value={kpis.itens_produto ?? '-'} variant="info" icon={<Package className="h-5 w-5" />} tooltip="Quantidade de itens classificados como Produto" details={kpis.total_linhas ? [{ label: 'Produtos', value: `${kpis.itens_produto ?? 0} (${((kpis.itens_produto ?? 0) / kpis.total_linhas * 100).toFixed(1)}%)` }, { label: 'Serviços', value: `${kpis.itens_servico ?? 0} (${((kpis.itens_servico ?? 0) / kpis.total_linhas * 100).toFixed(1)}%)` }] : undefined} />
                  <KPICard index={14} title="Itens Serviço" value={kpis.itens_servico ?? '-'} variant="success" icon={<Layers className="h-5 w-5" />} tooltip="Quantidade de itens classificados como Serviço" details={drillDetails.itensServico} />
                </div>
              </div>
            </div>
          </details>
        </>
      )}

      {data && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'dashboard' | 'lista' | 'drill')} className="w-full">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="drill">Drill-down Gerencial</TabsTrigger>
            <TabsTrigger value="lista">Lista Detalhada</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {chartData && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Análises Gráficas</h3>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {chartData.top_fornecedores?.length > 0 && (
                    <VisualGate visualKey="compras.top-fornecedores">
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Top Fornecedores (Valor Líquido)</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData.top_fornecedores} layout="vertical">
                          <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <YAxis type="category" dataKey="fantasia_fornecedor" width={120} className="text-xs" tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor_liquido_total" fill="hsl(215,70%,45%)" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d: any) => openDrill('fantasia_fornecedor', d?.fantasia_fornecedor, d?.fantasia_fornecedor)} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    </VisualGate>
                  )}

                  {chartData.situacoes?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-1 text-sm font-semibold">Situação das OCs</h3>
                      <p className="mb-2 text-[11px] text-muted-foreground">Clique em uma fatia para filtrar a Lista Detalhada</p>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={chartData.situacoes.map((s: any) => ({ ...s, name: situacaoLabel(s.situacao_oc) }))}
                            dataKey="quantidade_itens"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                            cursor="pointer"
                            onClick={(slice: any) => handleDrillSituacao(slice?.payload ?? slice)}
                          >
                            {chartData.situacoes.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<PieRichTooltip totals={situacoesTotals} />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {chartData.tipos?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-1 text-sm font-semibold">Produtos x Serviços</h3>
                      <p className="mb-2 text-[11px] text-muted-foreground">Clique em uma fatia para filtrar a Lista Detalhada</p>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={chartData.tipos}
                            dataKey="quantidade_itens"
                            nameKey="tipo_item"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                            cursor="pointer"
                            onClick={(slice: any) => handleDrillTipo(slice?.payload ?? slice)}
                          >
                            {chartData.tipos.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<PieRichTooltip totals={tiposTotals} />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {chartData.entregas_por_mes?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Entregas por Mês (Itens por mês de entrega)</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData.entregas_por_mes}>
                          <XAxis dataKey="periodo_entrega" className="text-xs" tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor_pendente_total" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d: any) => openDrill('mes_competencia_calc', d?.periodo_entrega, d?.periodo_entrega)} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {chartData.familias?.length > 0 && (
                    <VisualGate visualKey="compras.top-familias">
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Top Famílias por Valor Líquido</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData.familias} layout="vertical">
                          <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <YAxis type="category" dataKey="codigo_familia" width={100} className="text-xs" tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor_liquido_total" fill="hsl(142,70%,40%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    </VisualGate>
                  )}

                  {chartData.origens?.length > 0 && (
                    <VisualGate visualKey="compras.top-origens">
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Top Origens por Valor Líquido</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData.origens} layout="vertical">
                          <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <YAxis type="category" dataKey="origem" width={100} className="text-xs" tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor_liquido_total" fill="hsl(280,60%,50%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    </VisualGate>
                  )}
                </div>
              </div>
            )}

            {gerencialCharts && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Análise Gerencial</h3>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {gerencialCharts.porMes.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Compras por Mês</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={gerencialCharts.porMes}>
                          <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor" fill="hsl(215,70%,45%)" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d: any) => openDrill('mes_competencia_calc', d?.label, d?.label)} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {gerencialCharts.porTipoDespesa.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Compras por Tipo de Despesa</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={gerencialCharts.porTipoDespesa} dataKey="valor" nameKey="label" cx="50%" cy="50%" outerRadius={80} label cursor="pointer" onClick={(d: any) => openDrill('tipo_despesa_calc', d?.label, d?.label)}>
                            {gerencialCharts.porTipoDespesa.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {gerencialCharts.porCentroCusto.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Top 10 Centros de Custo</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={gerencialCharts.porCentroCusto} layout="vertical">
                          <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <YAxis type="category" dataKey="label" width={100} className="text-xs" tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor" fill="hsl(142,70%,40%)" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d: any) => openDrill('centro_custo', d?.label, d?.label)} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {gerencialCharts.porProjeto.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Top 10 Projetos</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={gerencialCharts.porProjeto} layout="vertical">
                          <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <YAxis type="category" dataKey="label" width={100} className="text-xs" tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor" fill="hsl(280,60%,50%)" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d: any) => openDrill('numero_projeto', d?.label, d?.label)} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="drill" className="space-y-2">
            <div ref={drillRef}>
              <PainelDrillView dados={dadosFiltrados} seed={drillSeed} clearSignal={clearDrillSignal} />
            </div>
          </TabsContent>

          <TabsContent value="lista" className="space-y-2">
            {tamanhoPagina === 'todos' && data.total_registros > 0 && (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Exibindo todos os {data.total_registros.toLocaleString('pt-BR')} registros do filtro — paginação desativada.
              </div>
            )}
            <DataTable columns={columns} data={dadosListaFiltrados} loading={loading} />
            {tamanhoPagina !== 'todos' && (
              <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Widgets personalizados via Biblioteca BI */}
      <UserWidgetsSlot section="kpis" cols={4} emptyHint={false} />
      <UserWidgetsSlot section="charts" cols={3} emptyHint={false} />
      <UserWidgetsSlot section="tables" cols={2} emptyHint={false} />
    </div>
    </PageDataProvider>
  );
}
