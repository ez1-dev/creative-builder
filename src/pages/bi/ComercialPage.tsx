import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  KpiCard,
  KpiGrid,
  DataTableBI,
  DashboardTabs,
  LoadingState,
  ErrorState,
  ComboChartCard,
  BarChartCard,
  DonutChartCard,
  TreemapChartCard,
  FunnelChartCard,
  BrazilMapCard,
  formatCurrency,
  formatNumber,
  type Column,
} from '@/components/bi';
import { fetchComercial, type ComercialRow, type ComercialFiltros } from '@/lib/bi/comercial';
import { cn } from '@/lib/utils';

type Unidade = 'CONSOLIDADO' | 'GENIUS' | 'ESTRUTURAL ZORTEA';

const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const defaultAnomes = () => {
  const now = new Date();
  const ano = now.getFullYear();
  return { ini: `${ano}01`, fim: `${ano}12` };
};

const UNIDADE_STYLE: Record<Unidade, { trigger: string; barColor: string; mapVar: string; chip: string }> = {
  CONSOLIDADO: {
    trigger: 'data-[state=active]:bg-muted data-[state=active]:text-foreground',
    barColor: 'hsl(var(--muted-foreground))',
    mapVar: '--muted-foreground',
    chip: 'bg-muted text-muted-foreground',
  },
  GENIUS: {
    trigger: 'data-[state=active]:bg-[hsl(var(--warning))] data-[state=active]:text-[hsl(var(--warning-foreground))]',
    barColor: 'hsl(var(--warning))',
    mapVar: '--warning',
    chip: 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]',
  },
  'ESTRUTURAL ZORTEA': {
    trigger: 'data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary-foreground))]',
    barColor: 'hsl(var(--primary))',
    mapVar: '--primary',
    chip: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]',
  },
};

interface AggregadosMensais {
  mes: string;
  faturamento: number;
  impostos: number;
  liquido: number;
  devolucao: number;
  vendas: number;
  clientes: number;
  quantidade: number;
  ticket_medio: number;
  preco_medio: number;
}

interface AggregadosGerais {
  faturamento: number;
  liquido: number;
  impostos: number;
  devolucao: number;
  quantidade: number;
  vendas: number;
  clientes: number;
  estados: number;
  ticket_medio: number;
  preco_medio: number;
}

const safeDiv = (a: number, b: number) => (b > 0 ? a / b : 0);

function aggregateGerais(rows: ComercialRow[]): AggregadosGerais {
  const nfs = new Set<string>();
  const clientes = new Set<string>();
  const estados = new Set<string>();
  let faturamento = 0,
    impostos = 0,
    liquido = 0,
    devolucao = 0,
    quantidade = 0;
  for (const r of rows) {
    faturamento += num(r.vl_bruto);
    impostos += num(r.impostos);
    liquido += num(r.vl_liquido);
    devolucao += num(r.vl_devolucao);
    quantidade += num(r.qtd_produtos);
    if (r.id_nf) nfs.add(r.id_nf);
    if (r.cd_cliente) clientes.add(r.cd_cliente);
    if (r.cd_estado) estados.add(r.cd_estado);
  }
  const vendas = nfs.size;
  return {
    faturamento,
    impostos,
    liquido,
    devolucao,
    quantidade,
    vendas,
    clientes: clientes.size,
    estados: estados.size,
    ticket_medio: safeDiv(faturamento, vendas),
    preco_medio: safeDiv(faturamento, quantidade),
  };
}

function aggregateMensal(rows: ComercialRow[]): AggregadosMensais[] {
  const m = new Map<string, { rows: ComercialRow[]; nfs: Set<string>; clientes: Set<string> }>();
  for (const r of rows) {
    const k = r.anomes_emissao ?? '';
    if (!k) continue;
    if (!m.has(k)) m.set(k, { rows: [], nfs: new Set(), clientes: new Set() });
    const g = m.get(k)!;
    g.rows.push(r);
    if (r.id_nf) g.nfs.add(r.id_nf);
    if (r.cd_cliente) g.clientes.add(r.cd_cliente);
  }
  return Array.from(m.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, g]) => {
      let faturamento = 0,
        impostos = 0,
        liquido = 0,
        devolucao = 0,
        quantidade = 0;
      for (const r of g.rows) {
        faturamento += num(r.vl_bruto);
        impostos += num(r.impostos);
        liquido += num(r.vl_liquido);
        devolucao += num(r.vl_devolucao);
        quantidade += num(r.qtd_produtos);
      }
      const vendas = g.nfs.size;
      return {
        mes,
        faturamento,
        impostos,
        liquido,
        devolucao,
        vendas,
        clientes: g.clientes.size,
        quantidade,
        ticket_medio: safeDiv(faturamento, vendas),
        preco_medio: safeDiv(faturamento, quantidade),
      };
    });
}

function aggregateBy<K extends string>(
  rows: ComercialRow[],
  keyOf: (r: ComercialRow) => K | null | undefined,
): Array<{ label: string; valor: number }> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = keyOf(r);
    if (!k) continue;
    m.set(k, (m.get(k) ?? 0) + num(r.vl_bruto));
  }
  return Array.from(m.entries())
    .map(([label, valor]) => ({ label, valor }))
    .sort((a, b) => b.valor - a.valor);
}

function PainelUnidade({
  rows,
  unidade,
}: {
  rows: ComercialRow[];
  unidade: Unidade;
}) {
  const style = UNIDADE_STYLE[unidade];
  const gerais = useMemo(() => aggregateGerais(rows), [rows]);
  const mensal = useMemo(() => aggregateMensal(rows), [rows]);

  const dadosCombo = mensal.map((m) => ({
    label: m.mes,
    faturamento: m.faturamento,
    ticket: m.ticket_medio,
  }));

  const porEstado = useMemo(() => aggregateBy(rows, (r) => r.cd_estado), [rows]);
  const funilTop = porEstado.slice(0, 8).map((d) => ({ name: d.label, value: d.valor }));
  const mapaData = porEstado.map((d) => ({ uf: d.label, valor: d.valor }));
  const donutMix = porEstado.slice(0, 8);

  const colsMensal: Column<AggregadosMensais>[] = [
    { key: 'mes', header: 'Mês', render: (_v, r) => r.mes },
    { key: 'vendas', header: 'Vendas', render: (_v, r) => formatNumber(r.vendas), align: 'right' },
    { key: 'clientes', header: 'Clientes', render: (_v, r) => formatNumber(r.clientes), align: 'right' },
    { key: 'quantidade', header: 'Quantidade', render: (_v, r) => formatNumber(r.quantidade, 2), align: 'right' },
    { key: 'faturamento', header: 'Faturamento', render: (_v, r) => formatCurrency(r.faturamento), align: 'right' },
    { key: 'impostos', header: 'Impostos', render: (_v, r) => formatCurrency(r.impostos), align: 'right' },
    { key: 'liquido', header: 'Líquido', render: (_v, r) => formatCurrency(r.liquido), align: 'right' },
    { key: 'devolucao', header: 'Devolução', render: (_v, r) => formatCurrency(r.devolucao), align: 'right' },
    { key: 'ticket_medio', header: 'Ticket Médio', render: (_v, r) => formatCurrency(r.ticket_medio), align: 'right' },
    { key: 'preco_medio', header: 'Preço Médio', render: (_v, r) => formatCurrency(r.preco_medio), align: 'right' },
  ];

  // Painéis específicos
  const revendas = useMemo(
    () =>
      aggregateBy(
        rows.filter((r) => r.unidade_negocio === 'GENIUS'),
        (r) => r.ds_abr_fpj || r.cd_fpj || r.cd_grupo_cliente,
      ).slice(0, 12),
    [rows],
  );
  const obras = useMemo(
    () =>
      aggregateBy(
        rows.filter((r) => r.unidade_negocio === 'ESTRUTURAL ZORTEA'),
        (r) => r.ds_abr_prj || r.cd_prj,
      ).slice(0, 20),
    [rows],
  );

  const showGenius = unidade === 'GENIUS' || unidade === 'CONSOLIDADO';
  const showEstrutural = unidade === 'ESTRUTURAL ZORTEA' || unidade === 'CONSOLIDADO';

  return (
    <div className="space-y-4">
      <KpiGrid cols={5}>
        <KpiCard title="Faturamento" value={gerais.faturamento} format="currency" variant="info" />
        <KpiCard title="Faturamento Líquido" value={gerais.liquido} format="currency" variant="success" />
        <KpiCard title="Impostos" value={gerais.impostos} format="currency" variant="warning" />
        <KpiCard title="Devolução" value={gerais.devolucao} format="currency" variant="danger" />
        <KpiCard title="Nº Vendas" value={gerais.vendas} format="number" />
        <KpiCard title="Nº Clientes" value={gerais.clientes} format="number" />
        <KpiCard title="Nº Estados" value={gerais.estados} format="number" />
        <KpiCard title="Quantidade" value={gerais.quantidade} format="quantity" />
        <KpiCard title="Ticket Médio" value={gerais.ticket_medio} format="currency" />
        <KpiCard title="Preço Médio" value={gerais.preco_medio} format="currency" />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ComboChartCard
          title="Faturamento mensal x Ticket médio"
          data={dadosCombo}
          barKey="faturamento"
          barLabel="Faturamento"
          lineKey="ticket"
          lineLabel="Ticket médio"
          barColor={style.barColor}
        />
        <DonutChartCard title="Mix por estado (top 8)" data={donutMix} />
      </div>

      <Card>
        <CardContent className="pt-4">
          <DataTableBI columns={colsMensal} data={mensal} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FunnelChartCard title="Top estados (funil)" data={funilTop} />
        <BrazilMapCard title="Faturamento por estado" data={mapaData} colorVar={style.mapVar} />
      </div>

      {(showGenius || showEstrutural) && (
        <div className={cn('grid grid-cols-1 gap-4', showGenius && showEstrutural && 'lg:grid-cols-2')}>
          {showGenius && (
            <BarChartCard
              title="GENIUS — Faturamento por revenda"
              data={revendas}
              color={UNIDADE_STYLE.GENIUS.barColor}
            />
          )}
          {showEstrutural && (
            <TreemapChartCard
              title="ESTRUTURAL ZORTEA — Faturamento por obra"
              data={obras.map((o) => ({ name: o.label, value: o.valor }))}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default function ComercialPage() {
  const def = defaultAnomes();
  const [draft, setDraft] = useState<ComercialFiltros>({ anomes_ini: def.ini, anomes_fim: def.fim });
  const [filtros, setFiltros] = useState<ComercialFiltros>({ anomes_ini: def.ini, anomes_fim: def.fim });

  const q = useQuery({
    queryKey: ['bi-comercial', filtros],
    queryFn: () => fetchComercial(filtros),
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const rows = q.data ?? [];
  const rowsGenius = useMemo(() => rows.filter((r) => r.unidade_negocio === 'GENIUS'), [rows]);
  const rowsEstrutural = useMemo(
    () => rows.filter((r) => r.unidade_negocio === 'ESTRUTURAL ZORTEA'),
    [rows],
  );

  const aplicar = () => setFiltros({ ...draft });

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Dashboard Comercial"
        description="Faturamento comercial por unidade de negócio (somente fonte_acao = VM_FATURAMENTO)."
        actions={
          <Button size="sm" variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
            <RefreshCw className={cn('mr-1 h-3.5 w-3.5', q.isFetching && 'animate-spin')} />
            Atualizar
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <Label className="text-xs">AnoMês Início</Label>
              <Input
                className="h-8 text-xs"
                value={draft.anomes_ini ?? ''}
                placeholder="202601"
                onChange={(e) => setDraft({ ...draft, anomes_ini: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && aplicar()}
              />
            </div>
            <div>
              <Label className="text-xs">AnoMês Fim</Label>
              <Input
                className="h-8 text-xs"
                value={draft.anomes_fim ?? ''}
                placeholder="202612"
                onChange={(e) => setDraft({ ...draft, anomes_fim: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && aplicar()}
              />
            </div>
            <div className="flex items-end">
              <Button size="sm" className="h-8 w-full" onClick={aplicar}>
                Aplicar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {q.isLoading ? (
        <LoadingState height={400} />
      ) : q.isError ? (
        <ErrorState message={String((q.error as any)?.message ?? 'Erro ao carregar dados')} />
      ) : (
        <DashboardTabs
          defaultValue="CONSOLIDADO"
          tabs={[
            {
              value: 'CONSOLIDADO',
              label: 'CONSOLIDADO',
              content: <PainelUnidade rows={rows} unidade="CONSOLIDADO" />,
            },
            {
              value: 'GENIUS',
              label: 'GENIUS',
              content: <PainelUnidade rows={rowsGenius} unidade="GENIUS" />,
            },
            {
              value: 'ESTRUTURAL ZORTEA',
              label: 'ESTRUTURAL ZORTEA',
              content: <PainelUnidade rows={rowsEstrutural} unidade="ESTRUTURAL ZORTEA" />,
            },
          ]}
        />
      )}
    </div>
  );
}
