import { useState, useCallback, useMemo } from 'react';
import { api, PaginatedResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl, type PageSize } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { ComboboxFilter } from '@/components/erp/ComboboxFilter';
import { KPICard } from '@/components/erp/KPICard';
import { useErpOptions } from '@/hooks/useErpOptions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatNumber } from '@/lib/format';
import { toast } from 'sonner';
import { Database, Layers, Package, AlertTriangle, Truck, Factory, CalendarClock, ShieldCheck } from 'lucide-react';
import { useAiFilters } from '@/hooks/useAiFilters';
import { useAiPageContext } from '@/hooks/useAiPageContext';
import { useSearchTracking } from '@/hooks/useSearchTracking';
import { BiAutoSlots } from '@/components/bi';

type EstoqueItem = {
  codpro?: string | null;
  codigo?: string | null;
  despro?: string | null;
  descricao?: string | null;
  codder?: string | null;
  desder?: string | null;
  derivacao?: string | null;
  coddep?: string | null;
  desdep?: string | null;
  deposito?: string | null;
  familia?: string | null;
  origem?: string | null;
  tipo_descricao?: string | null;
  unidade_medida?: string | null;
  saldo?: number | null;
  qtdest?: number | null;
  reservado?: number | null;
  ops_reservando?: number | null;
  disponivel?: number | null;
  a_receber?: number | null;
  proxima_entrega?: string | null;
  projetado?: number | null;
  falta_material?: boolean | null;
};

const FILTROS_INICIAIS = {
  codpro: '',
  despro: '',
  codfam: '',
  codori: '',
  coddep: '',
  somente_com_estoque: true,
  somente_com_reserva: false,
  somente_com_compra: false,
  somente_com_falta: false,
  criticidade: 'todas' as string,
  ordenar_por: '' as string,
  ordem: 'desc' as 'asc' | 'desc',
  situacao: 'A',
};

type Filtros = typeof FILTROS_INICIAIS;

const fmtQtd = (v: number | null | undefined) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  if (v < 0) return `(${formatNumber(Math.abs(v), 3)})`;
  return formatNumber(v, 3);
};

const fmtData = (s?: string | null) => {
  if (!s) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

type Situacao = 'FALTA_SEM_COMPRA' | 'COMPRA_COBRE' | 'COMPRA_INSUFICIENTE' | 'DISPONIVEL';

const situacaoDe = (item: EstoqueItem): Situacao => {
  const disp = Number(item.disponivel ?? item.saldo ?? 0);
  const aRec = Number(item.a_receber ?? 0);
  const proj = Number(item.projetado ?? disp);
  if (disp >= 0) return 'DISPONIVEL';
  if (aRec <= 0) return 'FALTA_SEM_COMPRA';
  if (proj >= 0) return 'COMPRA_COBRE';
  return 'COMPRA_INSUFICIENTE';
};

const SITUACAO_META: Record<Situacao, { label: string; className: string; icon: JSX.Element }> = {
  DISPONIVEL: {
    label: 'Disponível',
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    icon: <ShieldCheck className="h-3 w-3" />,
  },
  COMPRA_COBRE: {
    label: 'Compra cobre a falta',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    icon: <Truck className="h-3 w-3" />,
  },
  FALTA_SEM_COMPRA: {
    label: 'Falta sem compra',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  COMPRA_INSUFICIENTE: {
    label: 'Compra insuficiente',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

function SituacaoBadge({ item }: { item: EstoqueItem }) {
  const sit = situacaoDe(item);
  const meta = SITUACAO_META[sit];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>
      {meta.icon}
      {meta.label}
    </span>
  );
}

function QtdCell({ value, tone }: { value: number | null | undefined; tone?: 'critico' | 'atencao' | 'ok' | 'default' }) {
  const cls =
    tone === 'critico' ? 'text-destructive font-semibold'
    : tone === 'atencao' ? 'text-amber-600 dark:text-amber-400 font-medium'
    : tone === 'ok' ? 'text-emerald-600 dark:text-emerald-400'
    : '';
  return <span className={`tabular-nums ${cls}`}>{fmtQtd(value ?? null)}</span>;
}

export default function EstoquePage() {
  const [filters, setFilters] = useState<Filtros>(FILTROS_INICIAIS);
  const [data, setData] = useState<PaginatedResponse<EstoqueItem> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(100);
  const [detalhe, setDetalhe] = useState<EstoqueItem | null>(null);

  const erpReady = useErpReady();
  const { familias, origens, loading: optionsLoading } = useErpOptions(erpReady, data?.dados as any);

  useAiFilters('estoque', setFilters as any, () => search(1));
  const trackSearch = useSearchTracking('estoque');

  const toggleAdvanced = (key: 'somente_com_reserva' | 'somente_com_compra' | 'somente_com_falta', v: boolean) => {
    setFilters((f) => {
      const next = { ...f, [key]: v };
      if (v && f.somente_com_estoque) {
        next.somente_com_estoque = false;
        toast.info('O filtro "Somente com estoque" foi removido para incluir materiais reservados ou comprados com saldo zero.');
      }
      return next;
    });
  };

  const search = useCallback(async (page = 1, sizeOverride?: PageSize) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const { situacao, ordenar_por, ordem, criticidade, ...rest } = filters;
      const size = sizeOverride ?? pageSize;
      const tp = size === 'todos' ? 100000 : size;
      const params: Record<string, any> = {
        ...rest,
        situacao_cadastro: situacao,
        pagina: size === 'todos' ? 1 : page,
        tamanho_pagina: tp,
      };
      if (ordenar_por) { params.ordenar_por = ordenar_por; params.ordem = ordem; }
      if (criticidade && criticidade !== 'todas') params.criticidade = criticidade;
      const result = await api.get<PaginatedResponse<EstoqueItem>>('/api/estoque', params);
      setData(result);
      setPagina(page);
      if (page === 1) trackSearch(filters, result?.total_registros);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady, trackSearch, pageSize]);

  const dados = data?.dados ?? [];
  const meta: any = (data as any)?.meta ?? null;

  const kpis = useMemo(() => {
    if (!data) return null;
    const saldoTotal = dados.reduce((s, i) => s + Number(i.saldo ?? i.qtdest ?? 0), 0);
    const comReservaPagina = dados.filter((i) => Number(i.reservado ?? 0) > 0).length;
    const comCompraPagina = dados.filter((i) => Number(i.a_receber ?? 0) > 0).length;
    const comFaltaPagina = dados.filter((i) => Number(i.disponivel ?? i.saldo ?? 0) < 0 || i.falta_material === true).length;
    const compraCobrePagina = dados.filter((i) => situacaoDe(i) === 'COMPRA_COBRE').length;
    const compraInsufPagina = dados.filter((i) => situacaoDe(i) === 'COMPRA_INSUFICIENTE').length;
    return {
      totalRegistros: data.total_registros,
      itensPagina: dados.length,
      saldoTotal,
      comReservaPagina,
      comCompraPagina,
      comFaltaPagina,
      compraCobrePagina,
      compraInsufPagina,
      globais: meta ? {
        com_reserva: meta.itens_com_reserva ?? null,
        com_compra: meta.itens_com_compra ?? null,
        com_falta: meta.itens_com_falta ?? null,
        compra_cobre: meta.itens_compra_cobre ?? null,
        compra_insuficiente: meta.itens_compra_insuficiente ?? null,
      } : null,
    };
  }, [data, dados, meta]);

  const columns: Column<EstoqueItem>[] = useMemo(() => [
    { key: 'codigo', header: 'Produto', sticky: true, stickyWidth: 110, render: (_, r) => r.codpro ?? r.codigo ?? '—' },
    { key: 'descricao', header: 'Descrição', sticky: true, stickyWidth: 220, render: (_, r) => r.despro ?? r.descricao ?? '—' },
    { key: 'derivacao', header: 'Derivação', render: (_, r) => r.desder ?? r.codder ?? r.derivacao ?? '—' },
    { key: 'deposito', header: 'Depósito', render: (_, r) => r.desdep ?? r.coddep ?? r.deposito ?? '—' },
    { key: 'saldo', header: 'Saldo físico', align: 'right', render: (_, r) => <QtdCell value={r.saldo ?? r.qtdest ?? 0} /> },
    {
      key: 'reservado',
      header: 'Reservado em OP',
      align: 'right',
      render: (_, r) => {
        const v = Number(r.reservado ?? 0);
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1">
                {v > 0 && <Factory className="h-3 w-3 text-primary" />}
                <QtdCell value={v} tone={v > 0 ? 'atencao' : 'default'} />
              </span>
            </TooltipTrigger>
            <TooltipContent>Quantidade ainda necessária em OPs abertas ou liberadas. OPs encerradas não são consideradas.</TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: 'disponivel',
      header: 'Disponível',
      align: 'right',
      render: (_, r) => {
        const v = Number(r.disponivel ?? r.saldo ?? 0);
        const tone = v < 0 ? 'critico' : v === 0 ? 'atencao' : 'ok';
        return <QtdCell value={v} tone={tone} />;
      },
    },
    {
      key: 'a_receber',
      header: 'A receber',
      align: 'right',
      render: (_, r) => {
        const v = Number(r.a_receber ?? 0);
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1">
                {v > 0 && <Truck className="h-3 w-3 text-primary" />}
                <QtdCell value={v} />
              </span>
            </TooltipTrigger>
            <TooltipContent>Quantidade pendente em ordens de compra ativas. Itens cancelados não são considerados.</TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      key: 'projetado',
      header: 'Projetado',
      align: 'right',
      render: (_, r) => {
        const v = Number(r.projetado ?? r.disponivel ?? r.saldo ?? 0);
        return <QtdCell value={v} tone={v < 0 ? 'critico' : 'default'} />;
      },
    },
    {
      key: 'ops_reservando',
      header: 'OPs reservando',
      align: 'right',
      render: (_, r) => {
        const n = Number(r.ops_reservando ?? 0);
        if (!n) return <span className="text-muted-foreground">—</span>;
        return (
          <button
            type="button"
            className="text-primary hover:underline tabular-nums"
            onClick={(e) => { e.stopPropagation(); toast.info('Detalhamento de OPs em breve.'); }}
          >
            {n} {n === 1 ? 'OP' : 'OPs'}
          </button>
        );
      },
    },
    {
      key: 'proxima_entrega',
      header: 'Próxima entrega',
      render: (_, r) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1">
              {r.proxima_entrega && <CalendarClock className="h-3 w-3 text-muted-foreground" />}
              {fmtData(r.proxima_entrega)}
            </span>
          </TooltipTrigger>
          <TooltipContent>Data de entrega mais próxima entre os itens de compra pendentes.</TooltipContent>
        </Tooltip>
      ),
    },
    { key: 'situacao', header: 'Situação', render: (_, r) => <SituacaoBadge item={r} /> },
  ], []);

  useAiPageContext({
    title: 'Consulta de Estoque',
    module: 'estoque',
    filters,
    kpis: kpis
      ? {
          'Total Registros': formatNumber(kpis.totalRegistros, 0),
          'Itens na Página': formatNumber(kpis.itensPagina, 0),
          'Com Reserva (pág.)': formatNumber(kpis.comReservaPagina, 0),
          'Com Falta (pág.)': formatNumber(kpis.comFaltaPagina, 0),
          'Com Compra Pendente (pág.)': formatNumber(kpis.comCompraPagina, 0),
        }
      : undefined,
    summary: data ? `Página ${pagina} de ${data.total_paginas}, ${dados.length} itens visíveis.` : undefined,
  });

  const filtrosAvancadosAtivos = filters.somente_com_reserva || filters.somente_com_compra || filters.somente_com_falta;
  const paginado = data ? data.total_paginas > 1 : false;
  const usarGlobais = !!kpis?.globais && Object.values(kpis.globais).some((v) => v !== null && v !== undefined);

  const emptyReserva = filters.somente_com_reserva && !loading && dados.length === 0;
  const emptyCompra = !emptyReserva && filters.somente_com_compra && !loading && dados.length === 0;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4 p-4">
        <ErpConnectionAlert />
        <PageHeader
          title="Consulta de Estoque"
          description="Saldo físico, reservas de OPs ativas, compras pendentes e disponibilidade real."
          actions={<ExportButton endpoint="/api/export/estoque" params={filters as any} />}
        />

        <FilterPanel
          onSearch={() => search(1)}
          onClear={() => { setFilters(FILTROS_INICIAIS); setData(null); setPagina(1); }}
        >
          <div><Label className="text-xs">Código</Label><Input value={filters.codpro} onChange={(e) => setFilters((f) => ({ ...f, codpro: e.target.value }))} placeholder="Código do produto" className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Descrição</Label><Input value={filters.despro} onChange={(e) => setFilters((f) => ({ ...f, despro: e.target.value }))} placeholder="Descrição" className="h-8 text-xs" /></div>
          <div><Label className="text-xs">Família</Label><ComboboxFilter value={filters.codfam} onChange={(v) => setFilters((f) => ({ ...f, codfam: v }))} options={familias} placeholder="Família" loading={optionsLoading} /></div>
          <div><Label className="text-xs">Origem</Label><ComboboxFilter value={filters.codori} onChange={(v) => setFilters((f) => ({ ...f, codori: v }))} options={origens} placeholder="Origem" loading={optionsLoading} /></div>
          <div><Label className="text-xs">Depósito</Label><Input value={filters.coddep} onChange={(e) => setFilters((f) => ({ ...f, coddep: e.target.value }))} placeholder="Depósito" className="h-8 text-xs" /></div>
          <div>
            <Label className="text-xs">Situação</Label>
            <Select value={filters.situacao} onValueChange={(v) => setFilters((f) => ({ ...f, situacao: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Ativo</SelectItem>
                <SelectItem value="I">Inativo</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Criticidade</Label>
            <Select value={filters.criticidade} onValueChange={(v) => setFilters((f) => ({ ...f, criticidade: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos</SelectItem>
                <SelectItem value="com_falta">Com falta</SelectItem>
                <SelectItem value="falta_sem_compra">Falta sem compra</SelectItem>
                <SelectItem value="compra_cobre">Compra cobre a falta</SelectItem>
                <SelectItem value="compra_insuficiente">Compra insuficiente</SelectItem>
                <SelectItem value="com_reserva">Com reserva</SelectItem>
                <SelectItem value="com_compra">Com compra pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Ordenar por</Label>
            <Select value={filters.ordenar_por || '__none__'} onValueChange={(v) => setFilters((f) => ({ ...f, ordenar_por: v === '__none__' ? '' : v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Padrão" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Padrão</SelectItem>
                <SelectItem value="saldo">Saldo físico</SelectItem>
                <SelectItem value="reservado">Reservado</SelectItem>
                <SelectItem value="disponivel">Disponível</SelectItem>
                <SelectItem value="a_receber">A receber</SelectItem>
                <SelectItem value="projetado">Projetado</SelectItem>
                <SelectItem value="ops_reservando">Qtd OPs</SelectItem>
                <SelectItem value="proxima_entrega">Próxima entrega</SelectItem>
                <SelectItem value="maior_falta">Maior falta</SelectItem>
                <SelectItem value="maior_reserva">Maior reserva</SelectItem>
                <SelectItem value="maior_a_receber">Maior a receber</SelectItem>
                <SelectItem value="entrega_mais_proxima">Entrega mais próxima</SelectItem>
                <SelectItem value="compra_insuficiente">Compra insuficiente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Ordem</Label>
            <Select value={filters.ordem} onValueChange={(v) => setFilters((f) => ({ ...f, ordem: v as any }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Decrescente</SelectItem>
                <SelectItem value="asc">Crescente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 pb-1">
            <Checkbox id="somente_com_estoque" checked={filters.somente_com_estoque} disabled={filtrosAvancadosAtivos} onCheckedChange={(v) => setFilters((f) => ({ ...f, somente_com_estoque: !!v }))} />
            <Label htmlFor="somente_com_estoque" className="text-xs">Somente com estoque</Label>
          </div>
          <div className="flex items-end gap-2 pb-1">
            <Checkbox id="somente_com_reserva" checked={filters.somente_com_reserva} onCheckedChange={(v) => toggleAdvanced('somente_com_reserva', !!v)} />
            <Label htmlFor="somente_com_reserva" className="text-xs">Somente com reserva de OP</Label>
          </div>
          <div className="flex items-end gap-2 pb-1">
            <Checkbox id="somente_com_compra" checked={filters.somente_com_compra} onCheckedChange={(v) => toggleAdvanced('somente_com_compra', !!v)} />
            <Label htmlFor="somente_com_compra" className="text-xs">Somente com compra pendente</Label>
          </div>
          <div className="flex items-end gap-2 pb-1">
            <Checkbox id="somente_com_falta" checked={filters.somente_com_falta} onCheckedChange={(v) => toggleAdvanced('somente_com_falta', !!v)} />
            <Label htmlFor="somente_com_falta" className="text-xs">Somente com falta de material</Label>
          </div>
        </FilterPanel>

        {kpis && (
          <>
            {!usarGlobais && paginado && (
              <div className="text-xs text-muted-foreground -mb-1">Resultados da página atual</div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <KPICard title="Itens consultados" value={formatNumber(kpis.totalRegistros, 0)} icon={<Database className="h-5 w-5" />} variant="default" index={0} tooltip="Total de registros no filtro atual" />
              <KPICard title="Itens na página" value={formatNumber(kpis.itensPagina, 0)} icon={<Layers className="h-5 w-5" />} variant="info" index={1} tooltip="Registros carregados nesta página" />
              <KPICard title="Com reserva" value={formatNumber(usarGlobais && kpis.globais?.com_reserva != null ? kpis.globais.com_reserva : kpis.comReservaPagina, 0)} icon={<Factory className="h-5 w-5" />} variant="warning" index={2} tooltip="Itens com quantidade reservada por OPs ativas" />
              <KPICard title="Com falta" value={formatNumber(usarGlobais && kpis.globais?.com_falta != null ? kpis.globais.com_falta : kpis.comFaltaPagina, 0)} icon={<AlertTriangle className="h-5 w-5" />} variant="danger" index={3} tooltip="Itens onde o disponível é negativo" />
              <KPICard title="Compra cobre a falta" value={formatNumber(usarGlobais && kpis.globais?.compra_cobre != null ? kpis.globais.compra_cobre : kpis.compraCobrePagina, 0)} icon={<Truck className="h-5 w-5" />} variant="info" index={4} tooltip="Falta coberta por ordens de compra pendentes" />
              <KPICard title="Compra insuficiente" value={formatNumber(usarGlobais && kpis.globais?.compra_insuficiente != null ? kpis.globais.compra_insuficiente : kpis.compraInsufPagina, 0)} icon={<AlertTriangle className="h-5 w-5" />} variant="danger" index={5} tooltip="Falta cuja compra pendente não cobre" />
            </div>
            <div className="text-xs text-muted-foreground">
              Saldo físico (somatório na página): <span className="tabular-nums font-medium">{formatNumber(kpis.saldoTotal, 3)}</span>
            </div>
          </>
        )}

        {emptyReserva ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum material possui reserva em OPs abertas ou liberadas para os filtros selecionados.
          </div>
        ) : emptyCompra ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum material possui ordem de compra pendente para os filtros selecionados.
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={dados}
            loading={loading}
            onRowClick={(row) => setDetalhe(row)}
          />
        )}

        {data && (
          <PaginationControl
            pagina={pagina}
            totalPaginas={data.total_paginas}
            totalRegistros={data.total_registros}
            onPageChange={(p) => search(p)}
            pageSize={pageSize}
            onPageSizeChange={(s) => { setPageSize(s); if (s === 'todos') toast.info('Carregando todos os registros — pode levar alguns segundos.'); search(1, s); }}
          />
        )}

        <BiAutoSlots pageKey="estoque" />

        <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
          <DialogContent className="max-w-2xl">
            {detalhe && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    {detalhe.codpro ?? detalhe.codigo ?? '—'} · {detalhe.despro ?? detalhe.descricao ?? ''}
                  </DialogTitle>
                  <DialogDescription>
                    Derivação: {detalhe.desder ?? detalhe.codder ?? '—'} · Depósito: {detalhe.desdep ?? detalhe.coddep ?? '—'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div className="text-muted-foreground">Saldo físico</div>
                  <div className="text-right"><QtdCell value={detalhe.saldo ?? detalhe.qtdest ?? 0} /></div>
                  <div className="text-muted-foreground">Reservado em OP</div>
                  <div className="text-right"><QtdCell value={detalhe.reservado ?? 0} tone={Number(detalhe.reservado ?? 0) > 0 ? 'atencao' : 'default'} /></div>
                  <div className="text-muted-foreground">OPs reservando</div>
                  <div className="text-right tabular-nums">{Number(detalhe.ops_reservando ?? 0)} {Number(detalhe.ops_reservando ?? 0) === 1 ? 'OP' : 'OPs'}</div>
                  <div className="text-muted-foreground">Disponível</div>
                  <div className="text-right">
                    <QtdCell
                      value={detalhe.disponivel ?? detalhe.saldo ?? 0}
                      tone={Number(detalhe.disponivel ?? detalhe.saldo ?? 0) < 0 ? 'critico' : Number(detalhe.disponivel ?? detalhe.saldo ?? 0) === 0 ? 'atencao' : 'ok'}
                    />
                  </div>
                  <div className="text-muted-foreground">A receber</div>
                  <div className="text-right"><QtdCell value={detalhe.a_receber ?? 0} /></div>
                  <div className="text-muted-foreground">Próxima entrega</div>
                  <div className="text-right">{fmtData(detalhe.proxima_entrega)}</div>
                  <div className="text-muted-foreground">Projetado</div>
                  <div className="text-right">
                    <QtdCell
                      value={detalhe.projetado ?? detalhe.disponivel ?? detalhe.saldo ?? 0}
                      tone={Number(detalhe.projetado ?? detalhe.disponivel ?? detalhe.saldo ?? 0) < 0 ? 'critico' : 'default'}
                    />
                  </div>
                  <div className="text-muted-foreground">Situação</div>
                  <div className="text-right"><SituacaoBadge item={detalhe} /></div>
                </div>
                <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground leading-relaxed">
                  <p><strong>Disponível</strong> = saldo físico menos reservas de OPs ativas.</p>
                  <p><strong>Projetado</strong> = disponível mais compras pendentes.</p>
                  <p className="mt-1">Valores calculados pelo backend a partir de componentes de OPs abertas/liberadas e ordens de compra ativas.</p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDetalhe(null)}>Fechar</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
