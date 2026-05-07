import { useState, useCallback, useMemo, useRef } from "react";
import { api, NotasRecebimentoResponse } from "@/lib/api";
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from "@/components/erp/PageHeader";
import { FilterPanel } from "@/components/erp/FilterPanel";
import { DataTable, Column } from "@/components/erp/DataTable";
import { PaginationControl } from "@/components/erp/PaginationControl";
import { ExportButton } from "@/components/erp/ExportButton";
import { KPICard } from "@/components/erp/KPICard";
import { ComboboxFilter } from "@/components/erp/ComboboxFilter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatNumber, formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";
import {
  FileText, Package, Users, DollarSign, TrendingUp, Boxes, Link2, Unlink, Layers,
  RefreshCw, BarChart3, PieChart as PieIcon, Building2, Briefcase, Receipt, X as XIcon,
} from "lucide-react";
import { useAiPageContext } from "@/hooks/useAiPageContext";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  ReferenceLine, CartesianGrid,
} from "recharts";
import { enrichRow } from "@/lib/comprasClassificacao";
import { GenericDrillView, DrillNivel, DrillMetric } from "@/components/erp/GenericDrillView";

const COLORS = [
  'hsl(215,70%,45%)', 'hsl(142,70%,40%)', 'hsl(38,92%,50%)', 'hsl(0,72%,51%)',
  'hsl(199,89%,48%)', 'hsl(280,60%,50%)', 'hsl(160,60%,40%)', 'hsl(30,80%,55%)',
];

// ---------- Badges para situação NF ----------
function SituacaoBadge({ value }: { value: any }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; cls?: string }> = {
    DIGITADA: { label: 'Digitada', variant: 'secondary' },
    FECHADA: { label: 'Fechada', variant: 'default', cls: 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]' },
    CANCELADA: { label: 'Cancelada', variant: 'destructive' },
    DOC_FISCAL_EMITIDO: { label: 'Doc. Fiscal', variant: 'outline' },
    AGUARD_FECHAMENTO: { label: 'Aguard. Fechamento', variant: 'outline' },
    AGUARD_INTEGRACAO_WMS: { label: 'Aguard. WMS', variant: 'outline' },
    DIGITADA_INTEGRACAO: { label: 'Dig. Integração', variant: 'outline' },
    AGRUPADA: { label: 'Agrupada', variant: 'outline' },
  };
  const cfg = map[String(value)] || { label: String(value || '-'), variant: 'outline' as const };
  return <Badge variant={cfg.variant} className={cfg.cls}>{cfg.label}</Badge>;
}

const columns: Column<any>[] = [
  { key: "projeto_macro", header: "Projeto Macro", render: (v) => v ? <Badge variant="secondary">{v}</Badge> : '-' },
  { key: "tipo_despesa_calc", header: "Tipo de Despesa" },
  { key: "mes_competencia_calc", header: "Mês" },
  { key: "numero_nf", header: "NF" },
  { key: "serie_nf", header: "Série" },
  { key: "situacao_nf", header: "Situação", render: (v) => <SituacaoBadge value={v} /> },
  { key: "codigo_fornecedor", header: "Cód. Fornecedor" },
  { key: "nome_fornecedor", header: "Fornecedor" },
  {
    key: "condicao_pagamento", header: "Cond. Pagto",
    render: (v: any, row: any) => {
      const cod = v ?? '';
      const desc = row?.descricao_condicao_pagamento ?? '';
      if (!cod && !desc) return '-';
      return desc ? `${cod} - ${desc}` : String(cod);
    },
  },
  { key: "data_emissao", header: "Emissão", render: (v) => formatDate(v) },
  { key: "data_recebimento", header: "Recebimento", render: (v) => formatDate(v) },
  { key: "tipo_item", header: "Tipo" },
  { key: "codigo_item", header: "Código Item" },
  { key: "descricao_item", header: "Descrição" },
  { key: "derivacao", header: "Derivação" },
  { key: "unidade_medida", header: "UM" },
  { key: "transacao", header: "Transação" },
  { key: "deposito", header: "Depósito" },
  { key: "codigo_centro_custo", header: "Centro Custo" },
  { key: "descricao_centro_custo", header: "Desc. Centro Custo" },
  { key: "numero_projeto", header: "Projeto", render: (v) => (v && v !== 0 ? v : "-") },
  { key: "nome_projeto", header: "Nome Projeto" },
  { key: "codigo_fase_projeto", header: "Fase Projeto", render: (v) => (v && v !== 0 ? v : "-") },
  { key: "quantidade_recebida", header: "Qtd. Recebida", align: "right", render: (v) => <span className="tabular-nums">{formatNumber(v, 2)}</span> },
  { key: "preco_unitario", header: "Preço Unit.", align: "right", render: (v) => <span className="tabular-nums">{formatCurrency(v)}</span> },
  { key: "valor_bruto", header: "Vlr. Bruto", align: "right", render: (v) => <span className="tabular-nums">{formatCurrency(v)}</span> },
  { key: "valor_liquido", header: "Vlr. Líquido", align: "right", render: (v) => <span className="font-semibold tabular-nums">{formatCurrency(v)}</span> },
  { key: "valor_ipi", header: "IPI", align: "right", render: (v) => <span className="tabular-nums">{formatCurrency(v)}</span> },
  { key: "valor_icms", header: "ICMS", align: "right", render: (v) => <span className="tabular-nums">{formatCurrency(v)}</span> },
  { key: "valor_icms_st", header: "ICMS ST", align: "right", render: (v) => <span className="tabular-nums">{formatCurrency(v)}</span> },
  { key: "valor_pis", header: "PIS", align: "right", render: (v) => <span className="tabular-nums">{formatCurrency(v)}</span> },
  { key: "valor_cofins", header: "COFINS", align: "right", render: (v) => <span className="tabular-nums">{formatCurrency(v)}</span> },
  { key: "valor_iss", header: "ISS", align: "right", render: (v) => <span className="tabular-nums">{formatCurrency(v)}</span> },
  {
    key: "numero_oc_origem", header: "OC Origem",
    render: (v) => v && v !== 0
      ? <Badge variant="outline" className="border-[hsl(var(--success))] text-[hsl(var(--success))] gap-1"><Link2 className="h-3 w-3" />OC {v}</Badge>
      : <Badge variant="outline" className="border-[hsl(var(--warning))] text-[hsl(var(--warning))] gap-1"><Unlink className="h-3 w-3" />Sem OC</Badge>,
  },
];

const initialFilters = {
  fornecedor: "",
  numero_nf: "",
  serie_nf: "",
  codigo_item: "",
  descricao_item: "",
  centro_custo: "",
  numero_projeto: "",
  transacao: "",
  deposito: "",
  numero_oc_origem: "",
  data_emissao_ini: "",
  data_emissao_fim: "",
  data_recebimento_ini: "",
  data_recebimento_fim: "",
  tipo_item: "TODOS",
  valor_min: "",
  valor_max: "",
  situacao_nf: "",
  projeto_macro: "TODOS",
  tipo_despesa: "TODOS",
  mes_competencia: "",
  condicao_pagamento: "",
  familia: "",
};

const NIVEIS_DRILL: DrillNivel[] = [
  { key: 'projeto_macro', label: 'Projeto Macro' },
  { key: 'numero_projeto', label: 'Projeto' },
  { key: 'codigo_centro_custo', label: 'Centro de Custo' },
  { key: 'tipo_despesa_calc', label: 'Tipo de Despesa' },
  { key: 'mes_competencia_calc', label: 'Mês' },
  { key: 'nome_fornecedor', label: 'Fornecedor' },
  { key: 'numero_nf', label: 'Nota Fiscal' },
  { key: 'codigo_item', label: 'Item' },
];

const METRICS_DRILL: DrillMetric[] = [
  { key: 'valor_recebido', label: 'Valor Recebido', format: 'currency', accessor: (r) => Number(r.valor_liquido || 0) },
  {
    key: 'qtd_nfs', label: 'Qtd NFs', format: 'number', accessor: () => 0,
    distinctOf: (r) => `${r.codigo_empresa}|${r.codigo_filial}|${r.numero_nf}|${r.serie_nf}`,
  },
  { key: 'qtd_itens', label: 'Qtd Itens', format: 'number', accessor: () => 1 },
];

// Labels amigáveis para os chips de filtros ativos
const FILTER_LABELS: Record<string, string> = {
  projeto_macro: 'Projeto Macro', tipo_despesa: 'Tipo de Despesa', mes_competencia: 'Mês',
  condicao_pagamento: 'Cond. Pagto', familia: 'Família', fornecedor: 'Fornecedor',
  numero_nf: 'NF', serie_nf: 'Série', situacao_nf: 'Situação',
  numero_oc_origem: 'OC Origem', codigo_item: 'Cód. Item', descricao_item: 'Desc. Item',
  tipo_item: 'Tipo Item', transacao: 'Transação', deposito: 'Depósito',
  centro_custo: 'Centro de Custo', numero_projeto: 'Projeto',
  data_emissao_ini: 'Emissão de', data_emissao_fim: 'Emissão até',
  data_recebimento_ini: 'Recebim. de', data_recebimento_fim: 'Recebim. até',
  valor_min: 'Vlr. Mín.', valor_max: 'Vlr. Máx.',
};

function ChartCard({
  title, icon, count, children,
}: { title: string; icon: React.ReactNode; count?: string; children: React.ReactNode }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </CardTitle>
        {count && <span className="text-xs text-muted-foreground">{count}</span>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function NotasRecebimentoPage() {
  const [filters, setFilters] = useState({ ...initialFilters });
  const [data, setData] = useState<NotasRecebimentoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [activeTab, setActiveTab] = useState<'lista' | 'drill'>('lista');
  const [drillSeed, setDrillSeed] = useState<{ nivel: string; chave: string; label: string; nonce: number } | null>(null);
  const drillRef = useRef<HTMLDivElement>(null);
  const openDrill = useCallback((nivel: string, chave: any, label?: string) => {
    if (chave == null || chave === '') return;
    const ch = String(chave);
    setDrillSeed({ nivel, chave: ch, label: label ?? ch, nonce: Date.now() });
    setActiveTab('drill');
    setTimeout(() => drillRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, []);
  const openDrillRoot = useCallback(() => {
    setDrillSeed(null);
    setActiveTab('drill');
    setTimeout(() => drillRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, []);

  const erpReady = useErpReady();

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
        if (!params.tipo_item || params.tipo_item === "TODOS") delete params.tipo_item;
        if (!params.situacao_nf) delete params.situacao_nf;
        if (!params.deposito) delete params.deposito;
        if (!params.numero_oc_origem) delete params.numero_oc_origem;
        if (!params.data_emissao_ini) delete params.data_emissao_ini;
        if (!params.data_emissao_fim) delete params.data_emissao_fim;
        if (!params.projeto_macro || params.projeto_macro === "TODOS") delete params.projeto_macro;
        if (!params.tipo_despesa || params.tipo_despesa === "TODOS") delete params.tipo_despesa;
        if (!params.mes_competencia) delete params.mes_competencia;
        if (!params.condicao_pagamento) delete params.condicao_pagamento;
        if (!params.familia) delete params.familia;
        const result = await api.get<NotasRecebimentoResponse>("/api/notas-recebimento", params);
        setData(result);
        setPagina(page);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    },
    [filters, erpReady],
  );

  const clearFilters = () => setFilters({ ...initialFilters });

  const dadosBrutos = data?.dados || [];
  const dadosEnriquecidos = useMemo(() => dadosBrutos.map((d: any) => enrichRow(d)), [dadosBrutos]);

  const dados = useMemo(() => {
    return dadosEnriquecidos.filter((d: any) => {
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
    });
  }, [dadosEnriquecidos, filters.projeto_macro, filters.tipo_despesa, filters.mes_competencia, filters.condicao_pagamento]);

  const transacaoOptions = useMemo(() => {
    const unique = [...new Set(dados.map((d: any) => d.transacao).filter(Boolean))].sort();
    return unique.map((v) => ({ value: String(v), label: String(v) }));
  }, [dados]);
  const depositoOptions = useMemo(() => {
    const unique = [...new Set(dados.map((d: any) => d.deposito).filter(Boolean))].sort();
    return unique.map((v) => ({ value: String(v), label: String(v) }));
  }, [dados]);
  const centroCustoOptions = useMemo(() => {
    const map = new Map<string, string>();
    dados.forEach((d: any) => {
      if (d.codigo_centro_custo) map.set(String(d.codigo_centro_custo), d.descricao_centro_custo || String(d.codigo_centro_custo));
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([value, label]) => ({ value, label }));
  }, [dados]);

  const kpis = useMemo(() => {
    const totalNfs = new Set(dados.map((d: any) => `${d.codigo_empresa}|${d.codigo_filial}|${d.numero_nf}|${d.serie_nf}`)).size;
    const totalItens = dados.length;
    const totalFornecedores = new Set(dados.map((d: any) => d.codigo_fornecedor).filter(Boolean)).size;
    const valorRecebido = dados.reduce((acc: number, d: any) => acc + Number(d.valor_liquido || 0), 0);
    const valorBruto = dados.reduce((acc: number, d: any) => acc + Number(d.valor_bruto || 0), 0);
    const qtdRecebida = dados.reduce((acc: number, d: any) => acc + Number(d.quantidade_recebida || 0), 0);
    const valorMedioNf = totalNfs > 0 ? valorRecebido / totalNfs : 0;

    const fornMap = new Map<string, number>();
    dados.forEach((d: any) => {
      const k = d.nome_fornecedor || d.codigo_fornecedor || '—';
      fornMap.set(k, (fornMap.get(k) || 0) + Number(d.valor_liquido || 0));
    });
    const top = [...fornMap.entries()].sort((a, b) => b[1] - a[1])[0];

    const nfsComOc = new Set(dados.filter((d: any) => d.numero_oc_origem && d.numero_oc_origem !== 0).map((d: any) => `${d.numero_nf}|${d.serie_nf}`)).size;
    const nfsSemOc = totalNfs - nfsComOc;
    const pctComOc = totalNfs > 0 ? (nfsComOc / totalNfs) * 100 : 0;
    const pctSemOc = totalNfs > 0 ? (nfsSemOc / totalNfs) * 100 : 0;

    return {
      totalNfs, totalItens, totalFornecedores, valorRecebido, valorBruto, qtdRecebida, valorMedioNf,
      maiorFornecedor: top ? { nome: top[0], valor: top[1] } : null,
      nfsComOc, nfsSemOc, pctComOc, pctSemOc,
    };
  }, [dados]);

  const charts = useMemo(() => {
    if (!dados.length) return null;
    /** keyForChave: campo usado para abrir o drill; keyForLabel: campo exibido. */
    const agg = (keyForChave: string, keyForLabel?: string) => {
      const m = new Map<string, { label: string; valor: number }>();
      dados.forEach((d: any) => {
        const chave = String(d[keyForChave] ?? '—');
        const label = String((keyForLabel ? d[keyForLabel] : d[keyForChave]) ?? chave);
        const cur = m.get(chave) || { label, valor: 0 };
        cur.valor += Number(d.valor_liquido || 0);
        m.set(chave, cur);
      });
      return [...m.entries()]
        .map(([chave, v]) => ({ chave, label: v.label, valor: v.valor }))
        .sort((a, b) => b.valor - a.valor);
    };
    const porMes = agg('mes_competencia_calc').sort((a, b) => a.label.localeCompare(b.label));
    const mediaMes = porMes.length ? porMes.reduce((s, x) => s + x.valor, 0) / porMes.length : 0;
    return {
      porMes, mediaMes,
      porTipoDespesa: agg('tipo_despesa_calc'),
      topFornecedores: agg('nome_fornecedor').slice(0, 10),
      porCentroCusto: agg('codigo_centro_custo', 'descricao_centro_custo').slice(0, 10),
      porProjeto: agg('numero_projeto', 'nome_projeto').slice(0, 10),
      porTransacao: agg('transacao').slice(0, 10),
      totalFornecedores: new Set(dados.map((d: any) => d.nome_fornecedor || d.codigo_fornecedor).filter(Boolean)).size,
      totalProjetos: new Set(dados.map((d: any) => d.nome_projeto || d.numero_projeto).filter(Boolean)).size,
      totalCC: new Set(dados.map((d: any) => d.descricao_centro_custo || d.codigo_centro_custo).filter(Boolean)).size,
    };
  }, [dados]);

  const set = (key: string, value: string) => setFilters((f) => ({ ...f, [key]: value }));

  // Filtros ativos para chips
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    Object.entries(filters).forEach(([k, v]) => {
      const sv = String(v ?? '').trim();
      if (!sv) return;
      if (sv === 'TODOS' || sv === 'TODAS') return;
      const label = FILTER_LABELS[k] || k;
      chips.push({ key: k, label: `${label}: ${sv}` });
    });
    return chips;
  }, [filters]);

  const removeFilterChip = (key: string) => {
    const reset = (initialFilters as any)[key] ?? '';
    setFilters((f) => ({ ...f, [key]: reset }));
  };

  useAiPageContext({
    title: 'Notas Fiscais de Recebimento',
    filters,
    kpis: data ? {
      'NFs distintas': kpis.totalNfs,
      'Itens Recebidos': kpis.totalItens,
      'Fornecedores': kpis.totalFornecedores,
      'Total Recebido': formatCurrency(kpis.valorRecebido),
      'Valor Bruto': formatCurrency(kpis.valorBruto),
      'Valor Médio/NF': formatCurrency(kpis.valorMedioNf),
      'NFs com OC': kpis.nfsComOc,
      'NFs sem OC': kpis.nfsSemOc,
    } : undefined,
    summary: data ? `${data.total_registros} itens; página ${pagina}/${data.total_paginas}` : undefined,
  });

  const exportParams = useMemo(() => {
    const p: any = { ...filters };
    if (p.valor_min) p.valor_min = parseFloat(p.valor_min); else delete p.valor_min;
    if (p.valor_max) p.valor_max = parseFloat(p.valor_max); else delete p.valor_max;
    if (!p.tipo_item || p.tipo_item === "TODOS") delete p.tipo_item;
    if (!p.projeto_macro || p.projeto_macro === "TODOS") delete p.projeto_macro;
    if (!p.tipo_despesa || p.tipo_despesa === "TODOS") delete p.tipo_despesa;
    Object.keys(p).forEach((k) => { if (p[k] === '' || p[k] == null) delete p[k]; });
    return p;
  }, [filters]);

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Notas Fiscais de Recebimento"
        description="Dashboard gerencial de recebimentos por projeto, centro de custo, tipo de despesa e fornecedor"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => search(pagina)} disabled={loading || !data}>
              <RefreshCw className={`mr-1 h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </Button>
            <ExportButton endpoint="/api/export/notas-recebimento" params={exportParams} />
          </div>
        }
      />

      {/* Chips de filtros ativos */}
      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-accent/40 px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Filtros ativos:</span>
          {activeFilterChips.map((c) => (
            <Badge key={c.key} variant="secondary" className="gap-1 pr-1">
              {c.label}
              <button
                onClick={() => removeFilterChip(c.key)}
                className="ml-1 rounded-sm p-0.5 hover:bg-background/60"
                aria-label={`Remover ${c.label}`}
              >
                <XIcon className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button size="sm" variant="ghost" className="ml-auto h-6 px-2 text-xs" onClick={clearFilters}>
            Limpar todos
          </Button>
        </div>
      )}

      <FilterPanel onSearch={() => search(1)} onClear={clearFilters} defaultOpen={!data}>
        {/* Filtros gerenciais */}
        <div>
          <Label className="text-xs">Projeto Macro</Label>
          <Select value={filters.projeto_macro} onValueChange={(v) => set("projeto_macro", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="Genius">Genius</SelectItem>
              <SelectItem value="Estrutural">Estrutural</SelectItem>
              <SelectItem value="Outros">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tipo de Despesa</Label>
          <Select value={filters.tipo_despesa} onValueChange={(v) => set("tipo_despesa", v)}>
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
          <Input value={filters.mes_competencia} onChange={(e) => set("mes_competencia", e.target.value)} placeholder="2026-05" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Cond. Pagamento</Label>
          <Input value={filters.condicao_pagamento} onChange={(e) => set("condicao_pagamento", e.target.value)} placeholder="Código ou descrição" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Família</Label>
          <Input value={filters.familia} onChange={(e) => set("familia", e.target.value)} placeholder="Código família" className="h-8 text-xs" />
        </div>

        {/* Filtros operacionais */}
        <div>
          <Label className="text-xs">Número NF</Label>
          <Input value={filters.numero_nf} onChange={(e) => set("numero_nf", e.target.value)} placeholder="Ex: 12345" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Série</Label>
          <Input value={filters.serie_nf} onChange={(e) => set("serie_nf", e.target.value)} placeholder="Ex: 1" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Situação NF</Label>
          <Select value={filters.situacao_nf} onValueChange={(v) => set("situacao_nf", v === "TODAS" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas</SelectItem>
              <SelectItem value="DIGITADA">Digitada</SelectItem>
              <SelectItem value="FECHADA">Fechada</SelectItem>
              <SelectItem value="CANCELADA">Cancelada</SelectItem>
              <SelectItem value="DOC_FISCAL_EMITIDO">Doc. Fiscal Emitido</SelectItem>
              <SelectItem value="AGUARD_FECHAMENTO">Aguard. Fechamento</SelectItem>
              <SelectItem value="AGUARD_INTEGRACAO_WMS">Aguard. Integração WMS</SelectItem>
              <SelectItem value="DIGITADA_INTEGRACAO">Digitada Integração</SelectItem>
              <SelectItem value="AGRUPADA">Agrupada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Fornecedor</Label>
          <Input value={filters.fornecedor} onChange={(e) => set("fornecedor", e.target.value)} placeholder="Nome ou código" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">OC Origem</Label>
          <Input value={filters.numero_oc_origem} onChange={(e) => set("numero_oc_origem", e.target.value)} placeholder="Nº da OC" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Código Item</Label>
          <Input value={filters.codigo_item} onChange={(e) => set("codigo_item", e.target.value)} placeholder="Ex: 001.0001" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Descrição Item</Label>
          <Input value={filters.descricao_item} onChange={(e) => set("descricao_item", e.target.value)} placeholder="Buscar por descrição" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Tipo Item</Label>
          <Select value={filters.tipo_item} onValueChange={(v) => set("tipo_item", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="PRODUTO">Produto</SelectItem>
              <SelectItem value="SERVIÇO">Serviço</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Transação</Label>
          <ComboboxFilter value={filters.transacao} onChange={(v) => set("transacao", v)} options={transacaoOptions} placeholder="Código transação" />
        </div>
        <div>
          <Label className="text-xs">Depósito</Label>
          <ComboboxFilter value={filters.deposito} onChange={(v) => set("deposito", v)} options={depositoOptions} placeholder="Código depósito" />
        </div>
        <div>
          <Label className="text-xs">Centro de Custo</Label>
          <ComboboxFilter value={filters.centro_custo} onChange={(v) => set("centro_custo", v)} options={centroCustoOptions} placeholder="Centro de custo" />
        </div>
        <div>
          <Label className="text-xs">Projeto</Label>
          <Input value={filters.numero_projeto} onChange={(e) => set("numero_projeto", e.target.value)} placeholder="Nº do projeto" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Emissão de</Label>
          <Input type="date" value={filters.data_emissao_ini} onChange={(e) => set("data_emissao_ini", e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Emissão até</Label>
          <Input type="date" value={filters.data_emissao_fim} onChange={(e) => set("data_emissao_fim", e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Recebimento de</Label>
          <Input type="date" value={filters.data_recebimento_ini} onChange={(e) => set("data_recebimento_ini", e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Recebimento até</Label>
          <Input type="date" value={filters.data_recebimento_fim} onChange={(e) => set("data_recebimento_fim", e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Valor Líq. Mín.</Label>
          <Input type="number" value={filters.valor_min} onChange={(e) => set("valor_min", e.target.value)} placeholder="0,00" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Valor Líq. Máx.</Label>
          <Input type="number" value={filters.valor_max} onChange={(e) => set("valor_max", e.target.value)} placeholder="0,00" className="h-8 text-xs" />
        </div>
      </FilterPanel>

      {data && (
        <>
          {/* ============ HERO KPIs ============ */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            {/* Card hero — Total Recebido */}
            <Card className="md:col-span-2 lg:col-span-2 xl:col-span-2 border-l-4 border-l-[hsl(var(--info))] bg-gradient-to-br from-card to-accent/30">
              <CardContent className="flex h-full flex-col justify-between p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Recebido</p>
                    <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{formatCurrency(kpis.valorRecebido)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ticket médio <span className="font-semibold text-foreground tabular-nums">{formatCurrency(kpis.valorMedioNf)}</span>
                    </p>
                  </div>
                  <div className="rounded-md bg-[hsl(var(--info))]/10 p-2 text-[hsl(var(--info))]">
                    <DollarSign className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  <span>Bruto: <span className="font-medium tabular-nums text-foreground">{formatCurrency(kpis.valorBruto)}</span></span>
                  <span>Qtd. Recebida: <span className="font-medium tabular-nums text-foreground">{formatNumber(kpis.qtdRecebida, 2)}</span></span>
                </div>
              </CardContent>
            </Card>

            <KPICard index={0} title="Qtd NFs" value={kpis.totalNfs} icon={<FileText className="h-5 w-5" />} onClick={openDrillRoot} />
            <KPICard index={1} title="Itens Recebidos" value={kpis.totalItens} icon={<Package className="h-5 w-5" />} onClick={openDrillRoot} />
            <KPICard index={2} title="Fornecedores" value={kpis.totalFornecedores} icon={<Users className="h-5 w-5" />} onClick={() => openDrill('nome_fornecedor', '', '')} />
            <KPICard
              index={3}
              title="Maior Fornecedor"
              value={kpis.maiorFornecedor ? formatCurrency(kpis.maiorFornecedor.valor) : '--'}
              subtitle={kpis.maiorFornecedor?.nome}
              variant="info"
              icon={<Layers className="h-5 w-5" />}
              onClick={kpis.maiorFornecedor ? () => openDrill('nome_fornecedor', kpis.maiorFornecedor!.nome, kpis.maiorFornecedor!.nome) : undefined}
            />
          </div>

          {/* Vínculo OC — barras de progresso */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                Vínculo de Ordem de Compra
                <span className="ml-auto text-xs font-normal text-muted-foreground">{kpis.totalNfs} NFs</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <Link2 className="h-3 w-3 text-[hsl(var(--success))]" />
                    NFs com OC vinculada
                  </span>
                  <span className="tabular-nums">
                    <span className="font-semibold text-foreground">{kpis.nfsComOc}</span>
                    <span className="text-muted-foreground"> ({kpis.pctComOc.toFixed(1)}%)</span>
                  </span>
                </div>
                <Progress value={kpis.pctComOc} className="h-2 [&>div]:bg-[hsl(var(--success))]" />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <Unlink className="h-3 w-3 text-[hsl(var(--warning))]" />
                    Recebimentos sem OC
                  </span>
                  <span className="tabular-nums">
                    <span className="font-semibold text-foreground">{kpis.nfsSemOc}</span>
                    <span className="text-muted-foreground"> ({kpis.pctSemOc.toFixed(1)}%)</span>
                  </span>
                </div>
                <Progress value={kpis.pctSemOc} className="h-2 [&>div]:bg-[hsl(var(--warning))]" />
              </div>
            </CardContent>
          </Card>

          {/* Indicadores operacionais (recolhível) */}
          <details className="group rounded-md border bg-card">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent/30">
              <span>Indicadores Operacionais Detalhados</span>
              <span className="text-xs font-normal">clique para expandir</span>
            </summary>
            <div className="grid grid-cols-2 gap-3 border-t p-3 md:grid-cols-3 lg:grid-cols-6">
              <KPICard index={0} title="NFs" value={kpis.totalNfs} icon={<FileText className="h-5 w-5" />} />
              <KPICard index={1} title="Itens Recebidos" value={kpis.totalItens} icon={<Package className="h-5 w-5" />} />
              <KPICard index={2} title="Fornecedores" value={kpis.totalFornecedores} icon={<Users className="h-5 w-5" />} />
              <KPICard index={3} title="Valor Líquido" value={formatCurrency(kpis.valorRecebido)} variant="info" icon={<DollarSign className="h-5 w-5" />} />
              <KPICard index={4} title="Valor Bruto" value={formatCurrency(kpis.valorBruto)} icon={<TrendingUp className="h-5 w-5" />} />
              <KPICard index={5} title="Qtd. Recebida" value={formatNumber(kpis.qtdRecebida, 2)} variant="success" icon={<Boxes className="h-5 w-5" />} />
            </div>
          </details>

          {/* ============ GRÁFICOS ============ */}
          {charts && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Mês — feature, col-span-2 */}
              {charts.porMes.length > 0 && (
                <div className="lg:col-span-2">
                  <ChartCard
                    title="Recebimentos por Mês"
                    icon={<BarChart3 className="h-4 w-4" />}
                    count={`${charts.porMes.length} meses`}
                  >
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={charts.porMes} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="grad-mes" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(v: number) => formatCurrency(v)}
                          contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
                        />
                        <ReferenceLine y={charts.mediaMes} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: `Média ${formatCurrency(charts.mediaMes)}`, fontSize: 10, fill: 'hsl(var(--muted-foreground))', position: 'insideTopRight' }} />
                        <Bar dataKey="valor" fill="url(#grad-mes)" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(d: any) => openDrill('mes_competencia_calc', d?.chave ?? d?.label, d?.label)} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              )}

              {/* Donut — Tipo de Despesa */}
              {charts.porTipoDespesa.length > 0 && (
                <ChartCard
                  title="Por Tipo de Despesa"
                  icon={<PieIcon className="h-4 w-4" />}
                  count={`${charts.porTipoDespesa.length} categorias`}
                >
                  <div className="relative">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={charts.porTipoDespesa} dataKey="valor" nameKey="label" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} cursor="pointer" onClick={(d: any) => openDrill('tipo_despesa_calc', d?.chave ?? d?.label, d?.label)}>
                          {charts.porTipoDespesa.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => formatCurrency(v)}
                          contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-10">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</span>
                      <span className="text-sm font-bold tabular-nums">{formatCurrency(kpis.valorRecebido)}</span>
                    </div>
                  </div>
                </ChartCard>
              )}

              {/* Top 10 Fornecedores */}
              {charts.topFornecedores.length > 0 && (
                <ChartCard
                  title="Top 10 Fornecedores"
                  icon={<Building2 className="h-4 w-4" />}
                  count={`10 de ${charts.totalFornecedores}`}
                >
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={charts.topFornecedores} layout="vertical" margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="label" width={130} className="text-xs" tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
                      <Bar dataKey="valor" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d: any) => openDrill('nome_fornecedor', d?.chave ?? d?.label, d?.label)} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Top 10 Centros de Custo */}
              {charts.porCentroCusto.length > 0 && (
                <ChartCard
                  title="Top 10 Centros de Custo"
                  icon={<Briefcase className="h-4 w-4" />}
                  count={`10 de ${charts.totalCC}`}
                >
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={charts.porCentroCusto} layout="vertical" margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="label" width={130} className="text-xs" tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
                      <Bar dataKey="valor" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d: any) => openDrill('codigo_centro_custo', d?.chave, d?.label)} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Top 10 Projetos */}
              {charts.porProjeto.length > 0 && (
                <ChartCard
                  title="Top 10 Projetos"
                  icon={<Layers className="h-4 w-4" />}
                  count={`10 de ${charts.totalProjetos}`}
                >
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={charts.porProjeto} layout="vertical" margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="label" width={130} className="text-xs" tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
                      <Bar dataKey="valor" fill="hsl(280,60%,50%)" radius={[0, 4, 4, 0]} cursor="pointer" onClick={(d: any) => openDrill('numero_projeto', d?.chave, d?.label)} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Por Transação NF — full width */}
              {charts.porTransacao.length > 0 && (
                <div className="lg:col-span-3">
                  <ChartCard
                    title="Por Transação NF"
                    icon={<Receipt className="h-4 w-4" />}
                    count={`${charts.porTransacao.length} transações`}
                  >
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={charts.porTransacao} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 10 }} />
                        <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6, fontSize: 12 }} />
                        <Bar dataKey="valor" fill="hsl(var(--info))" radius={[6, 6, 0, 0]} cursor="pointer" onClick={(d: any) => openDrill('transacao', d?.chave ?? d?.label, d?.label)} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              )}
            </div>
          )}

          {/* ============ TABELA + DRILL ============ */}
          <Card ref={drillRef}>
            <CardHeader className="pb-2">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'lista' | 'drill')}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <TabsList>
                    <TabsTrigger value="lista">Lista Detalhada</TabsTrigger>
                    <TabsTrigger value="drill">Drill-down Gerencial</TabsTrigger>
                  </TabsList>
                  <span className="text-xs text-muted-foreground">
                    {data.total_registros.toLocaleString('pt-BR')} registros · página {pagina}/{data.total_paginas}
                  </span>
                </div>
                <TabsContent value="lista" className="mt-3 space-y-2">
                  <DataTable columns={columns} data={dados} loading={loading} emptyMessage="Nenhuma nota fiscal encontrada para os filtros aplicados." />
                  {data.total_paginas > 1 && (
                    <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />
                  )}
                </TabsContent>
                <TabsContent value="drill" className="mt-3 space-y-2">
                  <GenericDrillView dados={dados} niveis={NIVEIS_DRILL} metrics={METRICS_DRILL} primaryMetricKey="valor_recebido" seed={drillSeed} />
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>
        </>
      )}
    </div>
  );
}
