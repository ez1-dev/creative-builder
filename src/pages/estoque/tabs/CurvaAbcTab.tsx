import { useMemo, useState } from 'react';
import { useErpReady } from '@/components/erp/ErpConnectionAlert';
import { DataTable, Column } from '@/components/erp/DataTable';
import { KPICard } from '@/components/erp/KPICard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, TrendingUp, DollarSign, AlertCircle, FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { AnaliseFiltrosHeader, type AnaliseFiltros } from '../components/AnaliseFiltrosHeader';
import { AnaliseItemDrawer } from '../components/AnaliseItemDrawer';
import { useEstoqueAnalise } from '@/hooks/estoque/useEstoqueAnalise';
import { classificarBadge, formatCobertura, type EstoqueAnaliseItem } from '@/lib/estoque/analiseApi';
import { exportAnaliseXlsx, exportAnaliseCsv, exportAnalisePdf, type ExportColumn } from '../exportAnalise';
import { toast } from 'sonner';

const DEFAULTS: AnaliseFiltros = {
  codemp: '1',
  codfil: '',
  meses_consumo: 12,
  criterio_abc: 'CONSUMO',
  corte_a: 80,
  corte_b: 95,
};

const BADGE_CLS: Record<string, string> = {
  A: 'bg-primary/15 text-primary border-primary/30',
  B: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  C: 'bg-muted text-muted-foreground border-border',
  SEM_CONSUMO: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30',
};

function CurvaBadge({ item }: { item: EstoqueAnaliseItem }) {
  const c = classificarBadge(item);
  const label = c === 'SEM_CONSUMO' ? 'Sem consumo' : `Curva ${c}`;
  return <Badge variant="outline" className={BADGE_CLS[c]}>{label}</Badge>;
}

export function CurvaAbcTab() {
  const erpReady = useErpReady();
  const [filtros, setFiltros] = useState<AnaliseFiltros>(DEFAULTS);
  const [applied, setApplied] = useState<AnaliseFiltros>(DEFAULTS);
  const [detalhe, setDetalhe] = useState<EstoqueAnaliseItem | null>(null);
  const [somenteFalta, setSomenteFalta] = useState(false);
  const [classeSel, setClasseSel] = useState<'ALL' | 'A' | 'B' | 'C' | 'SEM'>('ALL');

  const q = useEstoqueAnalise(
    {
      codemp: applied.codemp,
      codfil: applied.codfil,
      meses_consumo: applied.meses_consumo,
      criterio_abc: applied.criterio_abc,
      corte_a: applied.corte_a,
      corte_b: applied.corte_b,
    },
    erpReady,
  );

  const dados = q.data?.dados ?? [];
  const resumo = q.data?.resumo ?? null;

  const filtrados = useMemo(() => {
    return dados.filter((it) => {
      if (somenteFalta && !(Number(it.disponivel ?? 0) < 0)) return false;
      const cls = classificarBadge(it);
      if (classeSel === 'ALL') return true;
      if (classeSel === 'SEM') return cls === 'SEM_CONSUMO';
      return cls === classeSel;
    });
  }, [dados, somenteFalta, classeSel]);

  const criterioLabel = applied.criterio_abc === 'CONSUMO' ? 'Consumo no período' : 'Valor atual em estoque';

  const columns: Column<EstoqueAnaliseItem>[] = useMemo(() => [
    { key: 'codpro', header: 'Produto', sticky: true, stickyWidth: 110, render: (_, r) => r.codpro ?? '—' },
    { key: 'despro', header: 'Descrição', sticky: true, stickyWidth: 240, render: (_, r) => r.despro ?? '—' },
    { key: 'coddep', header: 'Depósito', render: (_, r) => r.desdep ?? r.coddep ?? '—' },
    { key: 'saldo', header: 'Saldo', align: 'right', render: (_, r) => r.saldo == null ? '—' : formatNumber(r.saldo, 3) },
    { key: 'custo_medio', header: 'Custo médio', align: 'right', render: (_, r) => r.custo_medio == null ? '—' : `R$ ${formatNumber(r.custo_medio, 2)}` },
    { key: 'valor_estoque', header: 'Valor em estoque', align: 'right', render: (_, r) => r.valor_estoque == null ? '—' : `R$ ${formatNumber(r.valor_estoque, 2)}` },
    { key: 'consumo_quantidade', header: 'Consumo (qtd)', align: 'right', render: (_, r) => r.consumo_quantidade == null ? '—' : formatNumber(r.consumo_quantidade, 3) },
    { key: 'consumo_valor', header: 'Consumo (valor)', align: 'right', render: (_, r) => r.consumo_valor == null ? '—' : `R$ ${formatNumber(r.consumo_valor, 2)}` },
    { key: 'giro', header: 'Giro', align: 'right', render: (_, r) => r.giro == null ? '—' : formatNumber(r.giro, 2) },
    { key: 'cobertura_meses', header: 'Cobertura', align: 'right', render: (_, r) => formatCobertura(r.cobertura_meses ?? null) },
    { key: 'abc_pct_acumulado', header: '% acum.', align: 'right', render: (_, r) => r.abc_pct_acumulado == null ? '—' : `${formatNumber(r.abc_pct_acumulado, 2)}%` },
    { key: 'curva_abc', header: 'Classe', render: (_, r) => <CurvaBadge item={r} /> },
  ], []);

  const exportCols: ExportColumn[] = [
    { key: 'codpro', label: 'Produto', type: 'text' },
    { key: 'despro', label: 'Descrição', type: 'text' },
    { key: 'coddep', label: 'Depósito', type: 'text', get: (i) => i.desdep ?? i.coddep ?? '' },
    { key: 'saldo', label: 'Saldo', type: 'number' },
    { key: 'custo_medio', label: 'Custo médio', type: 'currency' },
    { key: 'valor_estoque', label: 'Valor em estoque', type: 'currency' },
    { key: 'consumo_quantidade', label: 'Consumo (qtd)', type: 'number' },
    { key: 'consumo_valor', label: 'Consumo (valor)', type: 'currency' },
    { key: 'giro', label: 'Giro', type: 'number' },
    { key: 'cobertura_meses', label: 'Cobertura (meses)', type: 'number' },
    { key: 'abc_pct_acumulado', label: '% acumulado', type: 'number' },
    { key: 'curva_abc', label: 'Classe', type: 'text', get: (i) => {
      const c = classificarBadge(i);
      return c === 'SEM_CONSUMO' ? 'Sem consumo' : c;
    } },
  ];

  const titulo = 'Curva ABC de Estoque';
  const doExport = async (fmt: 'xlsx' | 'csv' | 'pdf') => {
    if (!filtrados.length) { toast.info('Sem dados para exportar.'); return; }
    const opts = { titulo, filtros: applied, columns: exportCols, data: filtrados };
    try {
      if (fmt === 'xlsx') await exportAnaliseXlsx(opts);
      else if (fmt === 'csv') exportAnaliseCsv(opts);
      else await exportAnalisePdf(opts);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao exportar');
    }
  };

  return (
    <div className="space-y-4">
      <AnaliseFiltrosHeader
        value={filtros}
        onChange={(p) => setFiltros((f) => ({ ...f, ...p }))}
        onApply={() => setApplied(filtros)}
        observacoes={q.data?.observacoes ?? null}
        loading={q.isFetching}
      />

      {q.isLoading ? (
        <div className="grid gap-3 md:grid-cols-4"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      ) : q.isError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Falha ao carregar análise: {(q.error as any)?.message ?? 'erro desconhecido'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            <KPICard title="Valor total em estoque" value={`R$ ${formatNumber(Number(resumo?.valor_total_estoque ?? 0), 2)}`} icon={<DollarSign className="h-5 w-5" />} variant="info" index={0} tooltip={`Critério: ${criterioLabel}`} />
            <KPICard title={`Consumo (${applied.meses_consumo}m)`} value={`R$ ${formatNumber(Number(resumo?.consumo_periodo_valor ?? 0), 2)}`} icon={<TrendingUp className="h-5 w-5" />} variant="default" index={1} />
            <KPICard title="Itens Curva A" value={formatNumber(Number(resumo?.itens_curva_a ?? 0), 0)} icon={<Package className="h-5 w-5" />} variant="warning" index={2} />
            <KPICard title="Itens Curva B" value={formatNumber(Number(resumo?.itens_curva_b ?? 0), 0)} icon={<Package className="h-5 w-5" />} variant="default" index={3} />
            <KPICard title="Itens Curva C" value={formatNumber(Number(resumo?.itens_curva_c ?? 0), 0)} icon={<Package className="h-5 w-5" />} variant="default" index={4} />
            <KPICard title="Sem consumo" value={formatNumber(Number(resumo?.itens_sem_consumo ?? 0), 0)} icon={<AlertCircle className="h-5 w-5" />} variant="destructive" index={5} tooltip={resumo?.valor_itens_sem_consumo != null ? `Valor: R$ ${formatNumber(Number(resumo.valor_itens_sem_consumo), 2)}` : undefined} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs text-muted-foreground mr-2">Filtros locais:</div>
            {(['ALL', 'A', 'B', 'C', 'SEM'] as const).map((c) => (
              <Button key={c} size="sm" variant={classeSel === c ? 'default' : 'outline'} onClick={() => setClasseSel(c)}>
                {c === 'ALL' ? 'Todas' : c === 'SEM' ? 'Sem consumo' : `Curva ${c}`}
              </Button>
            ))}
            <Button size="sm" variant={somenteFalta ? 'default' : 'outline'} onClick={() => setSomenteFalta((v) => !v)}>Somente com falta</Button>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => doExport('xlsx')}><FileSpreadsheet className="mr-1 h-3 w-3" />XLSX</Button>
              <Button size="sm" variant="outline" onClick={() => doExport('csv')}><FileText className="mr-1 h-3 w-3" />CSV</Button>
              <Button size="sm" variant="outline" onClick={() => doExport('pdf')}><FileDown className="mr-1 h-3 w-3" />PDF</Button>
            </div>
          </div>

          <DataTable columns={columns} data={filtrados} loading={q.isFetching} onRowClick={(r) => setDetalhe(r)} />

          <div className="text-xs text-muted-foreground">
            {filtrados.length} de {dados.length} itens exibidos. Critério ABC: <strong>{criterioLabel}</strong>. Cortes: A {applied.corte_a}% · B {applied.corte_b}%.
          </div>
        </>
      )}

      <AnaliseItemDrawer item={detalhe} onClose={() => setDetalhe(null)} />
    </div>
  );
}
