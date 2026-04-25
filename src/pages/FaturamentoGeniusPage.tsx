import React, { useMemo, useState } from 'react';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
import { formatDate } from '@/lib/format';
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
  ChevronLeft,
  ChevronRight,
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
  somente_genius: boolean;
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
  somente_genius: true,
});

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
  if (f.somente_genius) params.somente_genius = true;
  if (extras) Object.assign(params, extras);
  return params;
}

// ===== Drill-down types & helpers =====
type DrillDim = 'revenda' | 'anomes' | 'cliente' | 'produto' | 'detalhe';

interface DrillKpiDef {
  key: string;
  title: string;
  metric: 'valor_total' | 'valor_bruto' | 'valor_devolucao' | 'valor_custo' | 'valor_comissao' | 'margem_bruta' | 'margem_percentual' | 'count_notas' | 'count_pedidos' | 'count_clientes' | 'count_revendas' | 'count_produtos';
  dims: DrillDim[]; // ordem dos níveis até o detalhe
  format: 'brl' | 'num' | 'pct';
}

const DRILL_DEFS: Record<string, DrillKpiDef> = {
  valor_total: { key: 'valor_total', title: 'Valor Total', metric: 'valor_total', dims: ['revenda', 'anomes', 'cliente', 'detalhe'], format: 'brl' },
  valor_bruto: { key: 'valor_bruto', title: 'Valor Bruto', metric: 'valor_bruto', dims: ['revenda', 'anomes', 'cliente', 'detalhe'], format: 'brl' },
  valor_devolucao: { key: 'valor_devolucao', title: 'Devolução', metric: 'valor_devolucao', dims: ['revenda', 'anomes', 'cliente', 'detalhe'], format: 'brl' },
  valor_custo: { key: 'valor_custo', title: 'Custo', metric: 'valor_custo', dims: ['revenda', 'anomes', 'cliente', 'detalhe'], format: 'brl' },
  valor_comissao: { key: 'valor_comissao', title: 'Comissão', metric: 'valor_comissao', dims: ['revenda', 'anomes', 'cliente', 'detalhe'], format: 'brl' },
  margem_bruta: { key: 'margem_bruta', title: 'Margem Bruta', metric: 'margem_bruta', dims: ['revenda', 'anomes', 'cliente', 'detalhe'], format: 'brl' },
  margem_percentual: { key: 'margem_percentual', title: 'Margem %', metric: 'margem_percentual', dims: ['revenda', 'anomes', 'cliente', 'detalhe'], format: 'pct' },
  quantidade_notas: { key: 'quantidade_notas', title: 'Notas', metric: 'count_notas', dims: ['revenda', 'anomes', 'cliente', 'detalhe'], format: 'num' },
  quantidade_pedidos: { key: 'quantidade_pedidos', title: 'Pedidos', metric: 'count_pedidos', dims: ['revenda', 'anomes', 'cliente', 'detalhe'], format: 'num' },
  quantidade_clientes: { key: 'quantidade_clientes', title: 'Clientes', metric: 'count_clientes', dims: ['revenda', 'anomes', 'cliente', 'detalhe'], format: 'num' },
  quantidade_revendas: { key: 'quantidade_revendas', title: 'Revendas', metric: 'count_revendas', dims: ['revenda', 'anomes', 'cliente', 'detalhe'], format: 'num' },
  quantidade_produtos: { key: 'quantidade_produtos', title: 'Produtos', metric: 'count_produtos', dims: ['revenda', 'produto', 'cliente', 'detalhe'], format: 'num' },
};

const DIM_LABEL: Record<DrillDim, string> = {
  revenda: 'Revenda',
  anomes: 'Mês',
  cliente: 'Cliente',
  produto: 'Produto',
  detalhe: 'Detalhe',
};

const getDimValue = (row: any, dim: DrillDim): string => {
  switch (dim) {
    case 'revenda': return row.revenda ?? '(sem revenda)';
    case 'anomes': {
      // tenta anomes ou data_emissao
      if (row.anomes) return String(row.anomes);
      if (row.data_emissao) {
        const d = new Date(row.data_emissao);
        if (!isNaN(d.getTime())) return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      return '(sem mês)';
    }
    case 'cliente': return row.cliente ?? '(sem cliente)';
    case 'produto': return row.produto ?? '(sem produto)';
    default: return '-';
  }
};

const formatDimValue = (dim: DrillDim, value: string): string => {
  if (dim === 'anomes') return fmtAnomes(value);
  return value;
};

interface AggregatedRow {
  key: string;
  label: string;
  valor_total: number;
  valor_bruto: number;
  valor_devolucao: number;
  valor_custo: number;
  valor_comissao: number;
  margem_bruta: number;
  margem_percentual: number;
  notas: Set<string>;
  pedidos: Set<string>;
  clientes: Set<string>;
  revendas: Set<string>;
  produtos: Set<string>;
  linhas: number;
}

function aggregateBy(rows: any[], dim: DrillDim): AggregatedRow[] {
  const map = new Map<string, AggregatedRow>();
  for (const r of rows) {
    const value = getDimValue(r, dim);
    let agg = map.get(value);
    if (!agg) {
      agg = {
        key: value,
        label: formatDimValue(dim, value),
        valor_total: 0, valor_bruto: 0, valor_devolucao: 0, valor_custo: 0, valor_comissao: 0,
        margem_bruta: 0, margem_percentual: 0,
        notas: new Set(), pedidos: new Set(), clientes: new Set(), revendas: new Set(), produtos: new Set(),
        linhas: 0,
      };
      map.set(value, agg);
    }
    agg.valor_total += Number(r.valor_total ?? 0);
    agg.valor_bruto += Number(r.valor_bruto ?? 0);
    agg.valor_devolucao += Number(r.valor_devolucao ?? 0);
    agg.valor_custo += Number(r.valor_custo ?? 0);
    agg.valor_comissao += Number(r.valor_comissao ?? 0);
    if (r.numero_nf != null) agg.notas.add(`${r.serie_nf ?? ''}-${r.numero_nf}`);
    if (r.pedido != null && r.pedido !== '') agg.pedidos.add(String(r.pedido));
    if (r.cliente) agg.clientes.add(String(r.cliente));
    if (r.revenda) agg.revendas.add(String(r.revenda));
    if (r.produto) agg.produtos.add(String(r.produto));
    agg.linhas += 1;
  }
  for (const a of map.values()) {
    a.margem_bruta = a.valor_total - a.valor_custo;
    a.margem_percentual = a.valor_total > 0 ? (a.margem_bruta / a.valor_total) * 100 : 0;
  }
  return Array.from(map.values()).sort((a, b) => b.valor_total - a.valor_total);
}

function computeKpis(rows: any[]) {
  let valor_total = 0, valor_bruto = 0, valor_devolucao = 0, valor_custo = 0, valor_comissao = 0;
  let valor_impostos = 0, valor_desconto = 0;
  const notas = new Set<string>();
  const pedidos = new Set<string>();
  const clientes = new Set<string>();
  const revendas = new Set<string>();
  const produtos = new Set<string>();
  for (const r of rows) {
    valor_total += Number(r.valor_total ?? 0);
    valor_bruto += Number(r.valor_bruto ?? 0);
    valor_devolucao += Number(r.valor_devolucao ?? 0);
    valor_custo += Number(r.valor_custo ?? 0);
    valor_comissao += Number(r.valor_comissao ?? 0);
    valor_impostos += Number(r.valor_icms ?? 0) + Number(r.valor_ipi ?? 0)
                    + Number(r.valor_pis ?? 0)  + Number(r.valor_cofins ?? 0);
    valor_desconto += Number(r.valor_desconto ?? 0);
    if (r.numero_nf != null) notas.add(`${r.serie_nf ?? ''}-${r.numero_nf}`);
    if (r.pedido != null && r.pedido !== '') pedidos.add(String(r.pedido));
    if (r.cliente) clientes.add(String(r.cliente));
    if (r.revenda) revendas.add(String(r.revenda));
    if (r.produto) produtos.add(String(r.produto));
  }
  // Visão Genius: Faturamento Líquido = Faturamento − Devolução − Impostos − Desconto
  const fat_liquido = valor_total - valor_devolucao - Math.abs(valor_impostos) - valor_desconto;
  const margem_bruta = fat_liquido - valor_custo;
  const margem_percentual = fat_liquido > 0 ? (margem_bruta / fat_liquido) * 100 : 0;
  return {
    valor_total, valor_bruto, valor_devolucao, valor_custo, valor_comissao,
    valor_impostos, valor_desconto, fat_liquido,
    margem_bruta, margem_percentual,
    quantidade_notas: notas.size,
    quantidade_pedidos: pedidos.size,
    quantidade_clientes: clientes.size,
    quantidade_revendas: revendas.size,
    quantidade_produtos: produtos.size,
  };
}

/**
 * Remove a contribuição da revenda "OUTROS" de um objeto de KPIs já agregado pelo backend.
 * Usado quando o usuário desliga o flag "Incluir OUTROS" — em vez de recalcular tudo a partir
 * da página atual do detalhe (que cobre apenas tamanho_pagina linhas), subtraímos os totais
 * exatos vindos de dashboard.por_revenda. Recalcula fat_liquido, margem_bruta e margem_percentual
 * usando a mesma fórmula de computeKpis.
 */
/**
 * Soma os campos numéricos de uma lista `por_revenda` (já filtrada) e devolve um
 * objeto KPI com a mesma forma de `dashboard.kpis`. Usado quando o usuário aplica
 * um filtro de revenda (ex.: "GENIUS"): em vez de confiar em `dashboard.kpis`
 * (que é global e pode ignorar o filtro), recompomos a partir das linhas que
 * realmente sobraram na tabela "Por Revenda".
 */
export function kpisFromPorRevenda(porRevenda: any[]) {
  const num = (v: any) => Number(v ?? 0);
  let valor_total = 0, valor_bruto = 0, valor_devolucao = 0, valor_custo = 0, valor_comissao = 0;
  let valor_impostos = 0;
  let quantidade_notas = 0, quantidade_pedidos = 0, quantidade_clientes = 0, quantidade_produtos = 0;
  for (const r of porRevenda || []) {
    valor_total += num(r.valor_total);
    valor_bruto += num(r.valor_bruto);
    valor_devolucao += num(r.valor_devolucao);
    valor_custo += num(r.valor_custo);
    valor_comissao += num(r.valor_comissao);
    valor_impostos += num(r.valor_impostos);
    quantidade_notas += num(r.quantidade_notas);
    quantidade_pedidos += num(r.quantidade_pedidos);
    quantidade_clientes += num(r.quantidade_clientes);
    quantidade_produtos += num(r.quantidade_produtos);
  }
  const fat_liquido = valor_total - valor_devolucao - Math.abs(valor_impostos);
  const margem_bruta = fat_liquido - valor_custo;
  const margem_percentual = fat_liquido > 0 ? (margem_bruta / fat_liquido) * 100 : 0;
  return {
    valor_total, valor_bruto, valor_devolucao, valor_custo, valor_comissao,
    valor_impostos, fat_liquido, margem_bruta, margem_percentual,
    quantidade_notas, quantidade_pedidos, quantidade_clientes, quantidade_produtos,
    quantidade_revendas: (porRevenda || []).length,
  };
}

export function subtractOutros(kpis: any, porRevenda: any[]) {
  if (!kpis) return kpis;
  const outros = (porRevenda || []).find((r) => String(r?.revenda ?? '').toUpperCase() === 'OUTROS');
  if (!outros) return kpis;

  const num = (v: any) => Number(v ?? 0);
  const valor_total = num(kpis.valor_total) - num(outros.valor_total);
  const valor_bruto = num(kpis.valor_bruto) - num(outros.valor_bruto);
  const valor_devolucao = num(kpis.valor_devolucao) - num(outros.valor_devolucao);
  const valor_custo = num(kpis.valor_custo) - num(outros.valor_custo);
  const valor_comissao = num(kpis.valor_comissao) - num(outros.valor_comissao);
  const valor_impostos = num(kpis.valor_impostos) - num(outros.valor_impostos);
  const fat_liquido = valor_total - valor_devolucao - Math.abs(valor_impostos);
  const margem_bruta = fat_liquido - valor_custo;
  const margem_percentual = fat_liquido > 0 ? (margem_bruta / fat_liquido) * 100 : 0;

  return {
    ...kpis,
    valor_total,
    valor_bruto,
    valor_devolucao,
    valor_custo,
    valor_comissao,
    valor_impostos,
    fat_liquido,
    margem_bruta,
    margem_percentual,
    quantidade_notas: Math.max(0, num(kpis.quantidade_notas) - num(outros.quantidade_notas)),
    quantidade_pedidos: Math.max(0, num(kpis.quantidade_pedidos) - num(outros.quantidade_pedidos)),
    quantidade_clientes: Math.max(0, num(kpis.quantidade_clientes) - num(outros.quantidade_clientes)),
    quantidade_produtos: Math.max(0, num(kpis.quantidade_produtos) - num(outros.quantidade_produtos)),
    quantidade_revendas: Math.max(0, num(kpis.quantidade_revendas) - 1),
  };
}

interface DrillStep { dim: DrillDim; key: string; label: string; }
interface DrillState {
  open: boolean;
  kpiKey: string;
  path: DrillStep[];
}

export default function FaturamentoGeniusPage() {
  const [filters, setFilters] = useState<Filters>(initialFilters());
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [detalhe, setDetalhe] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendIndisponivel, setBackendIndisponivel] = useState(false);
  const [fonteIndisponivel, setFonteIndisponivel] = useState(false);
  const [avisoAtualizacao, setAvisoAtualizacao] = useState<string | null>(null);
  const [incluirOutros, setIncluirOutros] = useState(false);
  const [drill, setDrill] = useState<DrillState | null>(null);

  const update = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  const MSG_404 = 'Backend de Faturamento Genius ainda não publicado. Verifique se os endpoints /api/faturamento-genius-dashboard e /api/faturamento-genius existem no FastAPI.';
  const MSG_FONTE = 'Fonte de faturamento não localizada no banco. Verifique no backend se o objeto configurado existe, por exemplo dbo.USU_VMBRUTANFE.';
  const MSG_CUSMED = 'Coluna inválida no SQL do Faturamento Genius (provável uso de DER.CUSMED). O backend precisa trocar CUSMED por PREMED em E075DER. Veja docs/backend-faturamento-genius-cusmed.md.';

  const errHaystack = (err: any): string => {
    const parts: string[] = [];
    if (err?.message) parts.push(String(err.message));
    if (err?.details) {
      try { parts.push(typeof err.details === 'string' ? err.details : JSON.stringify(err.details)); } catch { /* ignore */ }
    }
    return parts.join(' ').toLowerCase();
  };

  const isSqlObjectError = (err: any): boolean => {
    const haystack = errHaystack(err);
    if (!haystack) return false;
    if (haystack.includes('42s02')) return true;
    if (haystack.includes('nome de objeto')) return true;
    if (haystack.includes('invalid object name')) return true;
    if (haystack.includes('objeto') && haystack.includes('inválido')) return true;
    if (haystack.includes('objeto') && haystack.includes('invalido')) return true;
    return false;
  };

  const isInvalidColumnError = (err: any): boolean => {
    const haystack = errHaystack(err);
    if (!haystack) return false;
    if (haystack.includes('cusmed')) return true;
    if (haystack.includes('invalid column name')) return true;
    if (haystack.includes('nome de coluna') && (haystack.includes('inválido') || haystack.includes('invalido'))) return true;
    return false;
  };

  const isNotApplicableMessage = (msg: any): boolean => {
    if (!msg) return false;
    const s = String(msg).toLowerCase();
    return (
      s.includes('não se aplica') ||
      s.includes('nao se aplica') ||
      s.includes('not applicable') ||
      s.includes('indisponível neste ambiente') ||
      s.includes('indisponivel neste ambiente')
    );
  };

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
      setFonteIndisponivel(false);
      setAvisoAtualizacao(null);
    } catch (err: any) {
      if (err?.statusCode === 404) {
        setBackendIndisponivel(true);
        setError(MSG_404);
        toast.error(MSG_404);
      } else if (isSqlObjectError(err)) {
        setFonteIndisponivel(true);
        setError(MSG_FONTE);
        toast.error(MSG_FONTE);
      } else if (isInvalidColumnError(err)) {
        setError(MSG_CUSMED);
        toast.error(MSG_CUSMED, { duration: 8000 });
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
    setFonteIndisponivel(false);
    setAvisoAtualizacao(null);
  };

  const atualizarComercial = async () => {
    setUpdating(true);
    try {
      const resp = await api.post<any>('/api/faturamento-genius/atualizar', {
        anomes_ini: filters.anomes_ini,
        anomes_fim: filters.anomes_fim,
      });
      setBackendIndisponivel(false);
      setFonteIndisponivel(false);
      const respMsg = resp?.message ?? resp?.detail;
      if (resp?.aplicavel === false || isNotApplicableMessage(respMsg)) {
        const msg = (respMsg && String(respMsg)) || 'Atualização comercial não se aplica neste ambiente.';
        setAvisoAtualizacao(msg);
        toast.info(msg);
      } else {
        setAvisoAtualizacao(null);
        toast.success('Atualização comercial concluída');
        await consultar(1);
      }
    } catch (err: any) {
      if (err?.statusCode === 404) {
        setBackendIndisponivel(true);
        toast.error(MSG_404);
      } else if (isSqlObjectError(err)) {
        setFonteIndisponivel(true);
        setError(MSG_FONTE);
        toast.error(MSG_FONTE);
      } else {
        toast.error(err?.message || 'Falha ao atualizar comercial');
      }
    } finally {
      setUpdating(false);
    }
  };

  // ===== Aplicação do filtro OUTROS sobre os dados detalhados =====
  const rawRows: any[] = detalhe?.dados || [];
  const filteredRows = useMemo(
    () => (incluirOutros ? rawRows : rawRows.filter((r) => r.revenda !== 'OUTROS')),
    [rawRows, incluirOutros],
  );
  const hiddenOutrosCount = rawRows.length - filteredRows.length;

  // Tabelas resumo: filtrar/recompor sem OUTROS quando aplicável,
  // e também aplicar o filtro de texto de revenda (caso preenchido) para que
  // os KPIs derivados desta lista batam com o que o usuário vê.
  const porRevenda = useMemo(() => {
    const base: any[] = dashboard?.por_revenda || [];
    let out = incluirOutros ? base : base.filter((r: any) => r.revenda !== 'OUTROS');
    const needle = (filters.revenda || '').trim().toUpperCase();
    if (needle) {
      out = out.filter((r: any) => String(r.revenda ?? '').toUpperCase().includes(needle));
    }
    return out;
  }, [dashboard, incluirOutros, filters.revenda]);

  // KPIs: prioridade
  // 1) Se há filtro ativo de revenda (porRevenda < total) → soma a partir de porRevenda filtrada.
  //    Garante que Impostos/Fat.Líq/etc batam com o que o usuário vê na tabela.
  // 2) Se incluirOutros → dashboard.kpis cru (cobre todo o período).
  // 3) Senão → subtrai linha OUTROS de dashboard.kpis.
  // 4) Fallback: recálculo local a partir do detalhe paginado.
  const kpis = useMemo(() => {
    const base = dashboard?.kpis;
    const totalRevendas = (dashboard?.por_revenda || []).length;
    const filtroAtivo = porRevenda.length > 0 && porRevenda.length < totalRevendas;
    if (filtroAtivo) return kpisFromPorRevenda(porRevenda);
    if (!base) return computeKpis(filteredRows);
    if (incluirOutros) return base;
    return subtractOutros(base, dashboard?.por_revenda || []);
  }, [dashboard, incluirOutros, filteredRows, porRevenda]);
  const margemPct = Number(kpis.margem_percentual ?? 0);

  const porOrigem = useMemo(() => {
    if (incluirOutros) return dashboard?.por_origem || [];
    // recompor por origem a partir do detalhe filtrado
    const map = new Map<string, any>();
    for (const r of filteredRows) {
      const k = r.origem ?? '-';
      const cur = map.get(k) || { origem: k, quantidade_notas: new Set(), valor_total: 0, valor_devolucao: 0, valor_custo: 0 };
      if (r.numero_nf != null) cur.quantidade_notas.add(`${r.serie_nf ?? ''}-${r.numero_nf}`);
      cur.valor_total += Number(r.valor_total ?? 0);
      cur.valor_devolucao += Number(r.valor_devolucao ?? 0);
      cur.valor_custo += Number(r.valor_custo ?? 0);
      map.set(k, cur);
    }
    return Array.from(map.values()).map((x) => ({ ...x, quantidade_notas: x.quantidade_notas.size }));
  }, [dashboard, filteredRows, incluirOutros]);

  const porMes = useMemo(() => {
    if (incluirOutros) return dashboard?.por_mes || [];
    const map = new Map<string, any>();
    for (const r of filteredRows) {
      const k = getDimValue(r, 'anomes');
      const cur = map.get(k) || { anomes: k, quantidade_notas: new Set(), valor_total: 0, valor_devolucao: 0, valor_custo: 0 };
      if (r.numero_nf != null) cur.quantidade_notas.add(`${r.serie_nf ?? ''}-${r.numero_nf}`);
      cur.valor_total += Number(r.valor_total ?? 0);
      cur.valor_devolucao += Number(r.valor_devolucao ?? 0);
      cur.valor_custo += Number(r.valor_custo ?? 0);
      map.set(k, cur);
    }
    return Array.from(map.values())
      .map((x) => ({ ...x, quantidade_notas: x.quantidade_notas.size }))
      .sort((a, b) => String(a.anomes).localeCompare(String(b.anomes)));
  }, [dashboard, filteredRows, incluirOutros]);

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

  // ===== Drill helpers =====
  const openDrill = (kpiKey: string) => {
    if (!DRILL_DEFS[kpiKey]) return;
    setDrill({ open: true, kpiKey, path: [] });
  };
  const closeDrill = () => setDrill(null);
  const popDrill = () => setDrill((d) => (d ? { ...d, path: d.path.slice(0, -1) } : d));
  const pushDrill = (step: DrillStep) =>
    setDrill((d) => (d ? { ...d, path: [...d.path, step] } : d));

  // Renderiza KPI clicável
  const KpiClickable = ({ kpiKey, children }: { kpiKey: string; children: React.ReactNode }) => (
    <div
      role="button"
      tabIndex={0}
      onClick={() => openDrill(kpiKey)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrill(kpiKey); } }}
      className="cursor-pointer outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring rounded-md"
      title="Clique para detalhar"
    >
      {children}
    </div>
  );

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
        <div className="flex items-center gap-2 pt-5">
          <Switch
            id="somente-genius"
            checked={filters.somente_genius}
            onCheckedChange={(c) => update('somente_genius', c)}
          />
          <Label htmlFor="somente-genius" className="text-xs cursor-pointer">Somente revendas Genius</Label>
        </div>
      </FilterPanel>

      {backendIndisponivel && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Backend indisponível</AlertTitle>
          <AlertDescription>{MSG_404}</AlertDescription>
        </Alert>
      )}

      {fonteIndisponivel && !backendIndisponivel && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Fonte de faturamento indisponível</AlertTitle>
          <AlertDescription>{MSG_FONTE}</AlertDescription>
        </Alert>
      )}

      {avisoAtualizacao && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atualização comercial não aplicável</AlertTitle>
          <AlertDescription>{avisoAtualizacao}</AlertDescription>
        </Alert>
      )}

      {error && !loading && !backendIndisponivel && !fonteIndisponivel && (
        <Card className="border-destructive/40">
          <CardContent className="p-3 text-xs text-destructive">{error}</CardContent>
        </Card>
      )}

      {dashboard && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
            <div className="text-xs text-muted-foreground">
              {incluirOutros
                ? <>Exibindo <span className="font-medium text-foreground">todas</span> as linhas (inclusive OUTROS).</>
                : <>Linhas com revenda <span className="font-medium text-foreground">OUTROS</span> estão ocultas. {hiddenOutrosCount > 0 && <Badge variant="secondary" className="ml-2 text-[10px]">{fmtNum(hiddenOutrosCount)} ocultas nesta página</Badge>}</>
              }
            </div>
            <div className="flex items-center gap-2">
              <Switch id="incluir-outros" checked={incluirOutros} onCheckedChange={setIncluirOutros} />
              <Label htmlFor="incluir-outros" className="text-xs cursor-pointer">Incluir OUTROS</Label>
            </div>
          </div>

          <KpiGroup title="Valores" tone="volume" icon={<DollarSign className="h-3.5 w-3.5" />}>
            <KpiClickable kpiKey="valor_total"><KPICard title="Faturamento" value={fmtBRL(kpis.valor_total)} icon={<DollarSign className="h-4 w-4" />} variant="success" tooltip="Soma de Valor Total das notas (faturamento bruto antes de devoluções e impostos)." index={0} /></KpiClickable>
            <KpiClickable kpiKey="valor_devolucao"><KPICard title="Devolução" value={fmtBRL(kpis.valor_devolucao)} icon={<TrendingDown className="h-4 w-4" />} variant="warning" tooltip="Soma de Valor Devolução." index={1} /></KpiClickable>
            <KPICard title="Impostos" value={fmtBRL(kpis.valor_impostos)} icon={<Receipt className="h-4 w-4" />} variant="warning" tooltip="ICMS + IPI + PIS + COFINS." index={2} />
            <KPICard title="Fat. Líquido" value={fmtBRL(kpis.fat_liquido)} icon={<DollarSign className="h-4 w-4" />} variant="success" tooltip="Faturamento − Devolução − Impostos." index={3} />
            <KpiClickable kpiKey="valor_custo"><KPICard title="Custo" value={fmtBRL(kpis.valor_custo)} icon={<Wallet className="h-4 w-4" />} tooltip="Soma de Valor Custo." index={4} /></KpiClickable>
            <KpiClickable kpiKey="valor_comissao"><KPICard title="Comissão" value={fmtBRL(kpis.valor_comissao)} icon={<Wallet className="h-4 w-4" />} tooltip="Soma de Valor Comissão." index={5} /></KpiClickable>
            <KpiClickable kpiKey="margem_bruta"><KPICard title="Margem Bruta" value={fmtBRL(kpis.margem_bruta)} icon={<DollarSign className="h-4 w-4" />} variant={Number(kpis.margem_bruta ?? 0) < 0 ? 'destructive' : 'success'} tooltip="Fat. Líquido − Custo." index={6} /></KpiClickable>
            <KpiClickable kpiKey="margem_percentual"><KPICard title="Margem %" value={fmtPct(kpis.margem_percentual)} icon={<Percent className="h-4 w-4" />} variant={margemPct < 0 ? 'destructive' : 'success'} tooltip="Margem Bruta / Fat. Líquido." index={7} /></KpiClickable>
          </KpiGroup>

          <KpiGroup title="Volume" tone="saude" icon={<FileText className="h-3.5 w-3.5" />}>
            <KpiClickable kpiKey="quantidade_notas"><KPICard title="Notas" value={fmtNum(kpis.quantidade_notas)} icon={<FileText className="h-4 w-4" />} index={0} /></KpiClickable>
            <KpiClickable kpiKey="quantidade_pedidos"><KPICard title="Pedidos" value={fmtNum(kpis.quantidade_pedidos)} icon={<ShoppingBag className="h-4 w-4" />} index={1} /></KpiClickable>
            <KpiClickable kpiKey="quantidade_clientes"><KPICard title="Clientes" value={fmtNum(kpis.quantidade_clientes)} icon={<Users className="h-4 w-4" />} index={2} /></KpiClickable>
            <KpiClickable kpiKey="quantidade_revendas"><KPICard title="Revendas" value={fmtNum(kpis.quantidade_revendas)} icon={<Store className="h-4 w-4" />} index={3} /></KpiClickable>
            <KpiClickable kpiKey="quantidade_produtos"><KPICard title="Produtos" value={fmtNum(kpis.quantidade_produtos)} icon={<Package className="h-4 w-4" />} index={4} /></KpiClickable>
          </KpiGroup>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">Faturamento por Revenda</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={colsRevenda} data={porRevenda} emptyMessage="Sem dados por revenda." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">Faturamento por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={colsOrigem} data={porOrigem} emptyMessage="Sem dados por origem." />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold tracking-tight">Faturamento por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable columns={colsMes} data={porMes} emptyMessage="Sem dados por mês." />
            </CardContent>
          </Card>

          <ValidacaoGeniusPanel
            dashboard={dashboard}
            detalhe={detalhe}
            filtroRevendaAtivo={(filters.revenda || '').toUpperCase().includes('GENIUS')}
            onAplicarFiltroGenius={() => {
              update('revenda', 'GENIUS');
              setTimeout(() => consultar(1), 0);
            }}
          />
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
              data={filteredRows}
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
        A revenda vem do campo CD_REV_PEDIDO retornado pelo backend (origem em E120IPD.USU_REVPED). Linhas
        classificadas como <span className="font-medium">OUTROS</span> (sem revenda no pedido — geralmente serviços,
        devoluções ou faturamentos manuais) ficam <span className="font-medium">ocultas por padrão</span> e podem ser
        exibidas pelo Switch acima. Clique em qualquer KPI para detalhar até o último nível.
      </p>

      <DrillSheet
        state={drill}
        rows={filteredRows}
        onClose={closeDrill}
        onBack={popDrill}
        onPush={pushDrill}
        totalPaginas={detalhe?.total_paginas ?? 0}
        colsDetalhe={colsDetalhe}
      />
    </div>
  );
}

// =====================================================================
// Drill Sheet Component
// =====================================================================
interface DrillSheetProps {
  state: DrillState | null;
  rows: any[];
  onClose: () => void;
  onBack: () => void;
  onPush: (step: DrillStep) => void;
  totalPaginas: number;
  colsDetalhe: Column<any>[];
}

function DrillSheet({ state, rows, onClose, onBack, onPush, totalPaginas, colsDetalhe }: DrillSheetProps) {
  const def = state ? DRILL_DEFS[state.kpiKey] : null;

  const filteredRows = useMemo(() => {
    if (!state || !def) return [];
    let r = rows;
    for (let i = 0; i < state.path.length; i++) {
      const step = state.path[i];
      r = r.filter((row) => getDimValue(row, step.dim) === step.key);
    }
    return r;
  }, [rows, state, def]);

  if (!state || !def) return null;

  const currentLevel = state.path.length; // 0 = nível 1
  const currentDim: DrillDim | null = currentLevel < def.dims.length ? def.dims[currentLevel] : null;
  const isDetalhe = currentDim === 'detalhe' || currentDim === null;

  const subKpis = computeKpis(filteredRows);

  const formatMetric = (v: number) => {
    if (def.format === 'brl') return fmtBRL(v);
    if (def.format === 'pct') return fmtPct(v);
    return fmtNum(v);
  };

  const getMetricValue = (k: any): number => {
    switch (def.metric) {
      case 'valor_total': return k.valor_total;
      case 'valor_bruto': return k.valor_bruto;
      case 'valor_devolucao': return k.valor_devolucao;
      case 'valor_custo': return k.valor_custo;
      case 'valor_comissao': return k.valor_comissao;
      case 'margem_bruta': return k.margem_bruta;
      case 'margem_percentual': return k.margem_percentual;
      case 'count_notas': return k.notas?.size ?? k.quantidade_notas ?? 0;
      case 'count_pedidos': return k.pedidos?.size ?? k.quantidade_pedidos ?? 0;
      case 'count_clientes': return k.clientes?.size ?? k.quantidade_clientes ?? 0;
      case 'count_revendas': return k.revendas?.size ?? k.quantidade_revendas ?? 0;
      case 'count_produtos': return k.produtos?.size ?? k.quantidade_produtos ?? 0;
      default: return 0;
    }
  };

  // métrica do recorte atual (para destacar no topo)
  const currentMetricValue = (() => {
    const k = subKpis;
    switch (def.metric) {
      case 'count_notas': return k.quantidade_notas;
      case 'count_pedidos': return k.quantidade_pedidos;
      case 'count_clientes': return k.quantidade_clientes;
      case 'count_revendas': return k.quantidade_revendas;
      case 'count_produtos': return k.quantidade_produtos;
      default: return getMetricValue(k);
    }
  })();

  return (
    <Sheet open={state.open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">Detalhamento — {def.title}</SheetTitle>
        </SheetHeader>

        {/* Breadcrumb */}
        <div className="mt-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{def.title}</span>
          {state.path.map((s, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              <span>
                <span className="text-muted-foreground">{DIM_LABEL[s.dim]}:</span>{' '}
                <span className="font-medium text-foreground">{s.label}</span>
              </span>
            </span>
          ))}
        </div>

        {/* Sub-KPIs */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-md border bg-card p-2">
            <p className="text-[10px] uppercase text-muted-foreground">{def.title}</p>
            <p className="text-sm font-bold">{formatMetric(currentMetricValue)}</p>
          </div>
          <div className="rounded-md border bg-card p-2">
            <p className="text-[10px] uppercase text-muted-foreground">Notas</p>
            <p className="text-sm font-bold">{fmtNum(subKpis.quantidade_notas)}</p>
          </div>
          <div className="rounded-md border bg-card p-2">
            <p className="text-[10px] uppercase text-muted-foreground">Clientes</p>
            <p className="text-sm font-bold">{fmtNum(subKpis.quantidade_clientes)}</p>
          </div>
          <div className="rounded-md border bg-card p-2">
            <p className="text-[10px] uppercase text-muted-foreground">Linhas</p>
            <p className="text-sm font-bold">{fmtNum(filteredRows.length)}</p>
          </div>
        </div>

        {/* Ações */}
        <div className="mt-4 flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={onBack} disabled={state.path.length === 0}>
            <ChevronLeft className="mr-1 h-3 w-3" /> Voltar
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Fechar</Button>
          {currentDim && !isDetalhe && (
            <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
              Próximo nível: {DIM_LABEL[currentDim]}
            </span>
          )}
        </div>

        {totalPaginas > 1 && (
          <Alert className="mt-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Drill-down opera sobre os <span className="font-medium">100 registros da página atual</span> do detalhe
              (total de {totalPaginas} páginas). Para uma visão completa do período, use <span className="font-medium">Exportar Excel</span>.
            </AlertDescription>
          </Alert>
        )}

        {/* Conteúdo */}
        <div className="mt-4">
          {isDetalhe ? (
            <DataTable
              columns={colsDetalhe}
              data={filteredRows}
              emptyMessage="Sem registros neste recorte."
            />
          ) : (
            <DrillLevelTable
              dim={currentDim!}
              rows={filteredRows}
              metric={def.metric}
              metricLabel={def.title}
              format={def.format}
              getMetric={getMetricValue}
              onSelect={(step) => onPush(step)}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface DrillLevelTableProps {
  dim: DrillDim;
  rows: any[];
  metric: DrillKpiDef['metric'];
  metricLabel: string;
  format: DrillKpiDef['format'];
  getMetric: (agg: AggregatedRow) => number;
  onSelect: (step: DrillStep) => void;
}

function DrillLevelTable({ dim, rows, metricLabel, format, getMetric, onSelect }: DrillLevelTableProps) {
  const data = useMemo(() => aggregateBy(rows, dim), [rows, dim]);
  const total = useMemo(() => data.reduce((s, r) => s + getMetric(r), 0), [data, getMetric]);

  const formatMetric = (v: number) => {
    if (format === 'brl') return fmtBRL(v);
    if (format === 'pct') return fmtPct(v);
    return fmtNum(v);
  };

  const cols: Column<AggregatedRow>[] = [
    {
      key: 'label',
      header: DIM_LABEL[dim],
      render: (v, row) => (
        <button
          type="button"
          className="text-left font-medium text-primary hover:underline"
          onClick={() => onSelect({ dim, key: row.key, label: row.label })}
          title="Clique para detalhar"
        >
          {v ?? '-'}
        </button>
      ),
    },
    { key: 'metric', header: metricLabel, align: 'right', render: (_v, row) => <span className="font-semibold tabular-nums">{formatMetric(getMetric(row))}</span> },
    { key: 'pct', header: '% do total', align: 'right', render: (_v, row) => total > 0 ? fmtPct((getMetric(row) / total) * 100) : '-' },
    { key: 'notas', header: 'Notas', align: 'right', render: (_v, row) => fmtNum(row.notas.size) },
    { key: 'clientes', header: 'Clientes', align: 'right', render: (_v, row) => fmtNum(row.clientes.size) },
    { key: 'linhas', header: 'Linhas', align: 'right', render: (_v, row) => fmtNum(row.linhas) },
  ];

  return <DataTable columns={cols as any} data={data as any} emptyMessage="Sem dados neste recorte." />;
}

// ============================================================
// Painel de Validação Genius
// Compara KPIs por mês retornados pelo backend com targets oficiais
// ============================================================

interface GeniusTarget {
  fat: number;
  pct_rep: number;
  dev: number;
  pct_dev: number;
  impostos: number; // negativo
  fat_liq: number;
  qtd: number;
  preco_medio: number;
  n_vendas: number;
  n_clientes: number;
  ticket_medio: number;
}

const GENIUS_TARGETS: Record<string, GeniusTarget> = {
  '202601': { fat: 378245, pct_rep: 47.63, dev: 4119, pct_dev: 1.09, impostos: -49165, fat_liq: 325613, qtd: 3998, preco_medio: 95, n_vendas: 23, n_clientes: 16, ticket_medio: 16445 },
  '202602': { fat: 125245, pct_rep: 15.77, dev: 1826, pct_dev: 1.46, impostos: -24627, fat_liq: 91276,  qtd: 2451, preco_medio: 51, n_vendas: 25, n_clientes: 16, ticket_medio: 5010 },
  '202603': { fat: 191603, pct_rep: 24.13, dev: 821,  pct_dev: 0.43, impostos: -27370, fat_liq: 161674, qtd: 2768, preco_medio: 69, n_vendas: 25, n_clientes: 14, ticket_medio: 7664 },
  '202604': { fat: 98959,  pct_rep: 12.46, dev: 2114, pct_dev: 2.14, impostos: -19436, fat_liq: 75299,  qtd: 2213, preco_medio: 45, n_vendas: 25, n_clientes: 10, ticket_medio: 3958 },
  'TOTAL':  { fat: 794052, pct_rep: 100,   dev: 8879, pct_dev: 1.12, impostos: -120598, fat_liq: 653862, qtd: 11430, preco_medio: 69, n_vendas: 98, n_clientes: 34, ticket_medio: 8103 },
};

interface ValidacaoGeniusPanelProps {
  dashboard: any;
  detalhe: any;
  filtroRevendaAtivo: boolean;
  onAplicarFiltroGenius: () => void;
}

function ValidacaoGeniusPanel({ dashboard, detalhe, filtroRevendaAtivo, onAplicarFiltroGenius }: ValidacaoGeniusPanelProps) {
  const [enabled, setEnabled] = useState(false);

  const linhasComparacao = useMemo(() => {
    if (!enabled) return { porAnomes: [] as Array<{ anomes: string; target: GeniusTarget; computed: any }>, total: null as null | { target: GeniusTarget; computed: any } };
    // Filtra linhas detalhe apenas da revenda GENIUS
    const linhasGenius: any[] = (detalhe?.dados || []).filter((r: any) =>
      String(r.revenda || '').toUpperCase().trim() === 'GENIUS'
    );

    // Agrupa por anomes_emissao
    const porMes = new Map<string, any>();
    // Agregados de período inteiro (com contagens distintas globais)
    const nfsPeriodo = new Set<string>();
    const clientesPeriodo = new Set<string>();
    let fatTot = 0, devTot = 0, impTot = 0, qtdTot = 0;

    linhasGenius.forEach((r) => {
      const am = String(r.anomes_emissao || '').slice(0, 6);
      if (!porMes.has(am) && am) {
        porMes.set(am, {
          anomes: am,
          fat: 0,
          dev: 0,
          impostos: 0,
          qtd: 0,
          nfs: new Set<string>(),
          clientes: new Set<string>(),
        });
      }
      const fat = Number(r.valor_total) || 0;
      const dev = Number(r.valor_devolucao) || 0;
      const imp = -((Number(r.valor_icms) || 0) + (Number(r.valor_ipi) || 0) + (Number(r.valor_pis) || 0) + (Number(r.valor_cofins) || 0));
      const qtd = Number(r.quantidade) || 0;
      const nfKey = `${r.empresa}-${r.filial}-${r.numero_nf}-${r.serie_nf}`;
      const cliKey = String(r.cliente || '');

      if (am) {
        const acc = porMes.get(am)!;
        acc.fat += fat;
        acc.dev += dev;
        acc.impostos += imp;
        acc.qtd += qtd;
        acc.nfs.add(nfKey);
        acc.clientes.add(cliKey);
      }

      fatTot += fat;
      devTot += dev;
      impTot += imp;
      qtdTot += qtd;
      nfsPeriodo.add(nfKey);
      clientesPeriodo.add(cliKey);
    });

    const totalFat = Array.from(porMes.values()).reduce((s, m) => s + m.fat, 0);

    // Linhas mensais: target × computado
    const porAnomes = Object.entries(GENIUS_TARGETS)
      .filter(([k]) => k !== 'TOTAL')
      .map(([anomes, target]) => {
        const m = porMes.get(anomes);
        const computed = m ? {
          fat: m.fat,
          pct_rep: totalFat > 0 ? (m.fat / totalFat) * 100 : 0,
          dev: m.dev,
          pct_dev: m.fat > 0 ? (m.dev / m.fat) * 100 : 0,
          impostos: m.impostos,
          fat_liq: m.fat - m.dev - Math.abs(m.impostos),
          qtd: m.qtd,
          preco_medio: m.qtd > 0 ? m.fat / m.qtd : 0,
          n_vendas: m.nfs.size,
          n_clientes: m.clientes.size,
          ticket_medio: m.nfs.size > 0 ? m.fat / m.nfs.size : 0,
        } : null;
        return { anomes, target, computed };
      });

    const totalComputed = {
      fat: fatTot,
      pct_rep: 100,
      dev: devTot,
      pct_dev: fatTot > 0 ? (devTot / fatTot) * 100 : 0,
      impostos: impTot,
      fat_liq: fatTot - devTot - Math.abs(impTot),
      qtd: qtdTot,
      preco_medio: qtdTot > 0 ? fatTot / qtdTot : 0,
      n_vendas: nfsPeriodo.size,
      n_clientes: clientesPeriodo.size,
      ticket_medio: nfsPeriodo.size > 0 ? fatTot / nfsPeriodo.size : 0,
    };

    return { porAnomes, total: { target: GENIUS_TARGETS.TOTAL, computed: totalComputed } };
  }, [enabled, detalhe]);

  const statusCor = (esp: number, real: number | null | undefined): string => {
    if (real === null || real === undefined) return 'text-muted-foreground';
    const diff = Math.abs(real - esp);
    const pct = esp !== 0 ? diff / Math.abs(esp) : (real === 0 ? 0 : 1);
    if (diff <= 1) return 'text-success';
    if (pct <= 0.01) return 'text-success';
    if (pct <= 0.05) return 'text-warning';
    return 'text-destructive';
  };

  const fmtCmp = (v: number | null | undefined, dec = 0) =>
    v === null || v === undefined ? '-' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });

  const campos: Array<{ key: keyof GeniusTarget; label: string; dec: number; suf?: string }> = [
    { key: 'fat', label: 'Fat. (R$)', dec: 0 },
    { key: 'pct_rep', label: '% Rep', dec: 2, suf: '%' },
    { key: 'dev', label: 'Dev. (R$)', dec: 0 },
    { key: 'pct_dev', label: '% Dev.', dec: 2, suf: '%' },
    { key: 'impostos', label: 'Impostos', dec: 0 },
    { key: 'fat_liq', label: 'Fat. Líq.', dec: 0 },
    { key: 'qtd', label: 'Qtd', dec: 0 },
    { key: 'preco_medio', label: 'Preço Médio', dec: 0 },
    { key: 'n_vendas', label: 'Nº Vendas', dec: 0 },
    { key: 'n_clientes', label: 'Nº Clientes', dec: 0 },
    { key: 'ticket_medio', label: 'Ticket Médio', dec: 0 },
  ];

  const mesNome = (am: string) => {
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const m = parseInt(am.slice(4, 6), 10);
    return meses[m - 1] || am;
  };

  return (
    <Card className="border-amber-300/40 bg-amber-50/30 dark:bg-amber-950/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-sm font-semibold tracking-tight">Validação Genius (QA)</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Compara os valores retornados pela API com os valores oficiais do relatório Genius (Jan–Abr/2026, revenda GENIUS).
            </p>
          </div>
          <div className="flex items-center gap-3">
            {enabled && !filtroRevendaAtivo && (
              <Button size="sm" variant="outline" onClick={onAplicarFiltroGenius}>
                Aplicar filtro revenda=GENIUS
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Switch id="modo-validacao" checked={enabled} onCheckedChange={setEnabled} />
              <Label htmlFor="modo-validacao" className="text-xs cursor-pointer">Modo validação</Label>
            </div>
          </div>
        </div>
      </CardHeader>
      {enabled && (
        <CardContent className="space-y-3">
          {!filtroRevendaAtivo && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-xs">Filtro recomendado</AlertTitle>
              <AlertDescription className="text-xs">
                Para comparação válida, defina o filtro <span className="font-mono">revenda = GENIUS</span> e o período <span className="font-mono">202601 → 202604</span>.
              </AlertDescription>
            </Alert>
          )}
          {detalhe?.total_paginas > 1 && (
            <div className="text-[11px] text-amber-700 dark:text-amber-400">
              ⚠ Detalhe paginado ({detalhe.total_paginas} páginas). Os valores computados refletem só a página atual — para validação completa, ajuste o período para um único mês.
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 font-semibold">Mês</th>
                  <th className="text-left p-2 font-semibold">Origem</th>
                  {campos.map((c) => (
                    <th key={c.key} className="text-right p-2 font-semibold whitespace-nowrap">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhasComparacao.porAnomes.map(({ anomes, target, computed }) => (
                  <React.Fragment key={anomes}>
                    <tr className="border-b">
                      <td rowSpan={2} className="p-2 font-medium align-top">{mesNome(anomes)}<div className="text-[10px] text-muted-foreground">{anomes}</div></td>
                      <td className="p-2 text-muted-foreground">Esperado</td>
                      {campos.map((c) => (
                        <td key={c.key} className="p-2 text-right tabular-nums">{fmtCmp(target[c.key], c.dec)}{c.suf || ''}</td>
                      ))}
                    </tr>
                    <tr className="border-b bg-muted/20">
                      <td className="p-2 text-muted-foreground">API</td>
                      {campos.map((c) => (
                        <td key={c.key} className={`p-2 text-right tabular-nums font-medium ${statusCor(target[c.key], computed?.[c.key] ?? null)}`}>
                          {fmtCmp(computed?.[c.key] ?? null, c.dec)}{computed && c.suf ? c.suf : ''}
                        </td>
                      ))}
                    </tr>
                  </React.Fragment>
                ))}
                {linhasComparacao.total && (
                  <>
                    <tr className="border-t-2 border-amber-400 bg-amber-100/40 dark:bg-amber-900/20">
                      <td rowSpan={2} className="p-2 font-bold align-top">TOTAL<div className="text-[10px] text-muted-foreground">Período</div></td>
                      <td className="p-2 text-muted-foreground font-semibold">Esperado</td>
                      {campos.map((c) => (
                        <td key={c.key} className="p-2 text-right tabular-nums font-semibold">{fmtCmp(linhasComparacao.total!.target[c.key], c.dec)}{c.suf || ''}</td>
                      ))}
                    </tr>
                    <tr className="border-b bg-amber-100/20 dark:bg-amber-900/10">
                      <td className="p-2 text-muted-foreground font-semibold">API</td>
                      {campos.map((c) => (
                        <td key={c.key} className={`p-2 text-right tabular-nums font-semibold ${statusCor(linhasComparacao.total!.target[c.key], linhasComparacao.total!.computed[c.key])}`}>
                          {fmtCmp(linhasComparacao.total!.computed[c.key], c.dec)}{c.suf || ''}
                        </td>
                      ))}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <div>Cores: <span className="text-success">verde</span> = diferença ≤ 1 ou ≤ 1%, <span className="text-warning">amarelo</span> = ≤ 5%, <span className="text-destructive">vermelho</span> = &gt; 5%.</div>
            <div>Os valores "API" são calculados a partir de <span className="font-mono">detalhe.dados</span> filtrado por <span className="font-mono">revenda='GENIUS'</span>, agrupados por <span className="font-mono">anomes_emissao</span>.</div>
            <div>TOTAL: Nº Clientes e Nº Vendas usam contagem distinta no período (um cliente/NF que aparece em vários meses conta 1 vez). Preço Médio = Fat./Qtd; Ticket Médio = Fat./Nº Vendas (ponderados, não médias dos meses).</div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
