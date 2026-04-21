import { useState, useCallback, useMemo, useEffect } from 'react';
import { api, EstoqueMovimentacaoResponse, SugestaoPoliticaResponse } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatNumber, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { Package, TrendingDown, TrendingUp, Clock, ArrowDownToLine, ArrowUpFromLine, Save, Sparkles, Search, Wand2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const MISSING_ENDPOINT_MSG: Record<string, string> = {
  movimentacao: 'Endpoint /api/estoque/movimentacao ainda não publicado no ERP. Veja docs/backend-sugestao-minmax.md.',
  sugestao: 'Endpoint /api/estoque/sugestao-politica ainda não publicado no ERP. Veja docs/backend-sugestao-minmax.md.',
  salvar: 'Endpoint /api/estoque/politica/salvar ainda não publicado no ERP. Veja docs/backend-sugestao-minmax.md.',
};

function is404(e: any): boolean {
  if (e?.statusCode === 404) return true;
  const msg = String(e?.message || '').toLowerCase();
  return msg.includes('not found') || msg.includes('404');
}

type Status = 'SEM_POLITICA' | 'ABAIXO_MINIMO' | 'NO_MINIMO' | 'ACIMA_MAXIMO' | 'ENTRE_MIN_E_MAX';

const statusVariants: Record<Status, { label: string; className: string }> = {
  SEM_POLITICA: { label: 'Sem Política', className: 'bg-muted text-muted-foreground' },
  ABAIXO_MINIMO: { label: 'Abaixo Mín', className: 'bg-destructive text-destructive-foreground' },
  NO_MINIMO: { label: 'No Mínimo', className: 'bg-amber-500 text-white' },
  ACIMA_MAXIMO: { label: 'Acima Máx', className: 'bg-blue-500 text-white' },
  ENTRE_MIN_E_MAX: { label: 'OK', className: 'bg-green-600 text-white' },
};

function computeStatus(saldo: number, min: number, max: number): Status {
  if ((min ?? 0) === 0 && (max ?? 0) === 0) return 'SEM_POLITICA';
  if (saldo < min) return 'ABAIXO_MINIMO';
  if (saldo === min) return 'NO_MINIMO';
  if (saldo > max && max > 0) return 'ACIMA_MAXIMO';
  return 'ENTRE_MIN_E_MAX';
}

const today = new Date();
const d180 = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000);
const toIso = (d: Date) => d.toISOString().slice(0, 10);

const initialFilters = {
  codpro: '',
  despro: '',
  codfam: '',
  codori: '',
  codder: '',
  coddep: '',
  data_ini: toIso(d180),
  data_fim: toIso(today),
};

const columns: Column<any>[] = [
  { key: 'data_movimento', header: 'Data Mov.', sticky: true, stickyWidth: 100, render: (v) => v ? formatDate(v) : '-' },
  { key: 'tipo_movimento', header: 'Tipo Mov.' },
  { key: 'transacao', header: 'Transação' },
  { key: 'deposito', header: 'Depósito' },
  { key: 'quantidade', header: 'Quantidade', align: 'right', render: (v) => formatNumber(v, 4) },
  { key: 'documento', header: 'Documento' },
  { key: 'fornecedor', header: 'Fornecedor / Origem', render: (_, r) => r.fornecedor || r.origem || '-' },
  { key: 'saldo_atual', header: 'Saldo Atual', align: 'right', render: (v) => formatNumber(v, 4) },
  { key: 'consumo_medio', header: 'Consumo Médio', align: 'right', render: (v) => formatNumber(v, 4) },
  { key: 'minimo_sugerido', header: 'Mín. Sugerido', align: 'right', render: (v) => formatNumber(v, 4) },
  { key: 'maximo_sugerido', header: 'Máx. Sugerido', align: 'right', render: (v) => formatNumber(v, 4) },
  {
    key: 'justificativa',
    header: 'Justificativa IA',
    render: (v: string) => v
      ? <span className="block max-w-[280px] truncate text-xs text-muted-foreground" title={v}>{v}</span>
      : <span className="text-xs text-muted-foreground">-</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: (v: Status, r: any) => {
      const status = v || computeStatus(Number(r.saldo_atual || 0), Number(r.minimo_sugerido || 0), Number(r.maximo_sugerido || 0));
      const cfg = statusVariants[status] || statusVariants.ENTRE_MIN_E_MAX;
      return <Badge className={cfg.className}>{cfg.label}</Badge>;
    },
  },
];

export default function SugestaoMinMaxPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState<EstoqueMovimentacaoResponse | SugestaoPoliticaResponse | null>(null);
  const [mode, setMode] = useState<'movimentacao' | 'sugestao'>('movimentacao');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [endpointMissing, setEndpointMissing] = useState(false);

  const erpReady = useErpReady();
  const { familias, origens, loading: optionsLoading } = useErpOptions(erpReady, data?.dados);

  const fetchMovimentacao = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.', { id: 'erp-not-ready' }); return; }
    setLoading(true);
    try {
      const result = await api.get<EstoqueMovimentacaoResponse>('/api/estoque/movimentacao', {
        ...filters, pagina: page, tamanho_pagina: 100,
      });
      setData(result);
      setMode('movimentacao');
      setPagina(page);
      setEndpointMissing(false);
    } catch (e: any) {
      if (is404(e)) {
        setEndpointMissing(true);
        toast.error(MISSING_ENDPOINT_MSG.movimentacao, { id: 'missing-movimentacao', duration: 6000 });
      } else {
        toast.error(e.message, { id: 'err-movimentacao' });
      }
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady]);

  const fetchSugestao = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.', { id: 'erp-not-ready' }); return; }
    setLoading(true);
    try {
      const result = await api.get<SugestaoPoliticaResponse>('/api/estoque/sugestao-politica', {
        ...filters, pagina: page, tamanho_pagina: 100,
      });
      setData(result);
      setMode('sugestao');
      setPagina(page);
      setEndpointMissing(false);
      toast.success('Sugestão gerada com base no histórico.');
    } catch (e: any) {
      if (is404(e)) {
        setEndpointMissing(true);
        toast.error(MISSING_ENDPOINT_MSG.sugestao, { id: 'missing-sugestao', duration: 6000 });
      } else {
        toast.error(e.message, { id: 'err-sugestao' });
      }
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady]);

  const sugerirComIa = useCallback(async () => {
    if (!data?.dados?.length) { toast.error('Consulte movimentação primeiro.', { id: 'ia-no-data' }); return; }
    setLoading(true);
    const t = toast.loading('Analisando movimentação com IA...');
    try {
      const { data: result, error } = await supabase.functions.invoke('sugestao-minmax-ia', {
        body: { movimentacoes: data.dados, filtros: filters },
      });
      if (error) throw new Error(error.message || 'Falha ao chamar IA.');
      if ((result as any)?.error) throw new Error((result as any).error);
      setData(result as SugestaoPoliticaResponse);
      setMode('sugestao');
      setPagina(1);
      toast.success(`IA sugeriu política para ${(result as any)?.total_registros ?? 0} item(ns).`, { id: t });
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar sugestão com IA.', { id: t });
    } finally {
      setLoading(false);
    }
  }, [data, filters]);

  const salvarPolitica = useCallback(async () => {
    if (!data?.dados?.length) { toast.error('Nada para salvar. Gere a sugestão primeiro.', { id: 'salvar-no-data' }); return; }
    if (mode !== 'sugestao') { toast.error('Gere a sugestão antes de salvar.', { id: 'salvar-mode' }); return; }
    setSaving(true);
    try {
      const politicas = data.dados.map((r: any) => ({
        codemp: r.codemp,
        codpro: r.codpro,
        codder: r.codder,
        coddep: r.coddep,
        estoque_minimo: Number(r.minimo_sugerido || 0),
        estoque_maximo: Number(r.maximo_sugerido || 0),
        ponto_pedido: Number(r.ponto_pedido ?? r.minimo_sugerido ?? 0),
        lote_compra: Number(r.lote_compra || 0),
        consumo_medio_mensal: Number(r.consumo_mensal ?? r.consumo_medio ?? 0),
        lead_time_dias: Number(r.lead_time_dias || 0),
        obs: r.justificativa ? `Sugestão IA: ${r.justificativa}` : (r.obs || 'Sugestão automática (movimentação histórica)'),
      }));
      await api.post('/api/estoque/politica/salvar', { politicas });
      setEndpointMissing(false);
      toast.success(`Política salva: ${politicas.length} item(ns).`);
    } catch (e: any) {
      if (is404(e)) {
        setEndpointMissing(true);
        toast.error(MISSING_ENDPOINT_MSG.salvar, { id: 'missing-salvar', duration: 6000 });
      } else {
        toast.error(e.message, { id: 'err-salvar' });
      }
    } finally {
      setSaving(false);
    }
  }, [data, mode]);

  const kpis = useMemo(() => {
    if (!data) return null;
    const r: any = data.resumo;
    if (r) {
      return {
        saldo_atual_total: r.saldo_atual_total ?? 0,
        consumo_90d: r.consumo_90d ?? 0,
        consumo_180d: r.consumo_180d ?? 0,
        lead_time_medio_dias: r.lead_time_medio_dias ?? 0,
        minimo_sugerido_total: r.minimo_sugerido_total ?? 0,
        maximo_sugerido_total: r.maximo_sugerido_total ?? 0,
      };
    }
    const acc = { saldo_atual_total: 0, consumo_90d: 0, consumo_180d: 0, lead_time_medio_dias: 0, minimo_sugerido_total: 0, maximo_sugerido_total: 0 };
    let ltCount = 0, ltSum = 0;
    for (const row of (data.dados || []) as any[]) {
      acc.saldo_atual_total += Number(row.saldo_atual || 0);
      acc.minimo_sugerido_total += Number(row.minimo_sugerido || 0);
      acc.maximo_sugerido_total += Number(row.maximo_sugerido || 0);
      if (row.lead_time_dias) { ltSum += Number(row.lead_time_dias); ltCount++; }
    }
    acc.lead_time_medio_dias = ltCount ? ltSum / ltCount : 0;
    return acc;
  }, [data]);

  // Reativa botões automaticamente quando o usuário troca filtros
  useEffect(() => { setEndpointMissing(false); }, [filters]);

  const disabledTitle = endpointMissing ? 'Backend ainda não publicado' : undefined;

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      {endpointMissing && (
        <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Backend pendente</AlertTitle>
          <AlertDescription className="text-xs">
            Os endpoints de Sugestão Min/Max ainda não estão publicados no ERP. Esta tela ficará operacional assim que o backend implementar{' '}
            <code className="rounded bg-muted px-1">/api/estoque/movimentacao</code>,{' '}
            <code className="rounded bg-muted px-1">/api/estoque/sugestao-politica</code> e{' '}
            <code className="rounded bg-muted px-1">/api/estoque/politica/salvar</code>. Veja{' '}
            <code className="rounded bg-muted px-1">docs/backend-sugestao-minmax.md</code>.
          </AlertDescription>
        </Alert>
      )}
      <PageHeader
        title="Sugestão Min/Max"
        description="Análise de movimentação histórica para sugerir política de reposição (mínimo, máximo, ponto de pedido)"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => fetchMovimentacao(1)} disabled={loading || endpointMissing} title={disabledTitle}>
              <Search className="mr-1 h-3 w-3" /> Consultar movimentação
            </Button>
            <Button size="sm" onClick={() => fetchSugestao(1)} disabled={loading || endpointMissing} title={disabledTitle}>
              <Sparkles className="mr-1 h-3 w-3" /> Gerar sugestão
            </Button>
            <Button
              size="sm"
              onClick={sugerirComIa}
              disabled={loading || !data?.dados?.length || endpointMissing}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              title={disabledTitle}
            >
              <Wand2 className="mr-1 h-3 w-3" /> Sugerir com IA
            </Button>
            <Button size="sm" variant="secondary" onClick={salvarPolitica} disabled={saving || mode !== 'sugestao' || endpointMissing} title={disabledTitle}>
              <Save className="mr-1 h-3 w-3" /> {saving ? 'Salvando...' : 'Salvar política'}
            </Button>
            <ExportButton endpoint="/api/export/estoque/sugestao-politica" params={filters} />
          </div>
        }
      />
      <FilterPanel
        onSearch={() => (mode === 'sugestao' ? fetchSugestao(1) : fetchMovimentacao(1))}
        onClear={() => { setFilters(initialFilters); setData(null); setPagina(1); setEndpointMissing(false); }}
      >
        <div><Label className="text-xs">Código</Label><Input value={filters.codpro} onChange={(e) => setFilters(f => ({ ...f, codpro: e.target.value }))} placeholder="Código" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Descrição</Label><Input value={filters.despro} onChange={(e) => setFilters(f => ({ ...f, despro: e.target.value }))} placeholder="Descrição" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Família</Label><ComboboxFilter value={filters.codfam} onChange={(v) => setFilters(f => ({ ...f, codfam: v }))} options={familias} placeholder="Família" loading={optionsLoading} /></div>
        <div><Label className="text-xs">Origem</Label><ComboboxFilter value={filters.codori} onChange={(v) => setFilters(f => ({ ...f, codori: v }))} options={origens} placeholder="Origem" loading={optionsLoading} /></div>
        <div><Label className="text-xs">Derivação</Label><Input value={filters.codder} onChange={(e) => setFilters(f => ({ ...f, codder: e.target.value }))} placeholder="Derivação" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Depósito</Label><Input value={filters.coddep} onChange={(e) => setFilters(f => ({ ...f, coddep: e.target.value }))} placeholder="Depósito" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Período inicial</Label><Input type="date" value={filters.data_ini} onChange={(e) => setFilters(f => ({ ...f, data_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Período final</Label><Input type="date" value={filters.data_fim} onChange={(e) => setFilters(f => ({ ...f, data_fim: e.target.value }))} className="h-8 text-xs" /></div>
      </FilterPanel>

      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard title="Saldo Atual" value={formatNumber(kpis.saldo_atual_total, 2)} icon={<Package className="h-5 w-5" />} variant="default" index={0} tooltip="Soma do saldo atual dos itens filtrados" />
          <KPICard title="Consumo 90d" value={formatNumber(kpis.consumo_90d, 2)} icon={<TrendingDown className="h-5 w-5" />} variant="info" index={1} tooltip="Consumo total nos últimos 90 dias" />
          <KPICard title="Consumo 180d" value={formatNumber(kpis.consumo_180d, 2)} icon={<TrendingDown className="h-5 w-5" />} variant="info" index={2} tooltip="Consumo total nos últimos 180 dias" />
          <KPICard title="Lead Time Médio" value={`${formatNumber(kpis.lead_time_medio_dias, 1)} d`} icon={<Clock className="h-5 w-5" />} variant="warning" index={3} tooltip="Tempo médio entre pedido e entrada da NF" />
          <KPICard title="Mínimo Sugerido" value={formatNumber(kpis.minimo_sugerido_total, 2)} icon={<ArrowDownToLine className="h-5 w-5" />} variant="success" index={4} tooltip="Soma do mínimo sugerido (consumo × lead time + segurança)" />
          <KPICard title="Máximo Sugerido" value={formatNumber(kpis.maximo_sugerido_total, 2)} icon={<ArrowUpFromLine className="h-5 w-5" />} variant="success" index={5} tooltip="Soma do máximo sugerido (mínimo + lote de compra)" />
        </div>
      )}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => (mode === 'sugestao' ? fetchSugestao(p) : fetchMovimentacao(p))} />}
    </div>
  );
}
