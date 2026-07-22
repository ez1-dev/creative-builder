import { useMemo, useState } from 'react';
import { useErpReady } from '@/components/erp/ErpConnectionAlert';
import { DataTable, Column } from '@/components/erp/DataTable';
import { KPICard } from '@/components/erp/KPICard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, DollarSign, AlertTriangle, PackageX, FileSpreadsheet, FileText, FileDown, Truck } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import { AnaliseFiltrosHeader, type AnaliseFiltros } from '../components/AnaliseFiltrosHeader';
import { AnaliseItemDrawer } from '../components/AnaliseItemDrawer';
import { useEstoqueAnalise } from '@/hooks/estoque/useEstoqueAnalise';
import { AGING_FAIXAS, faixaAging, type AgingKey, type EstoqueAnaliseItem } from '@/lib/estoque/analiseApi';
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

const fmtDate = (s?: string | null) => {
  if (!s) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

export function BaixoGiroTab() {
  const erpReady = useErpReady();
  const [filtros, setFiltros] = useState<AnaliseFiltros>(DEFAULTS);
  const [applied, setApplied] = useState<AnaliseFiltros>(DEFAULTS);
  const [detalhe, setDetalhe] = useState<EstoqueAnaliseItem | null>(null);
  const [faixaSel, setFaixaSel] = useState<AgingKey | 'ALL'>('ALL');
  const [somenteComCompra, setSomenteComCompra] = useState(false);

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

  // baixo giro = itens com giro baixo/sem saída. Backend classifica via faixa_aging/dias_sem_saida.
  const baixoGiro = useMemo(() => {
    return dados.filter((it) => {
      const f = faixaAging(it);
      // "baixo giro" = tudo que não seja aging até 6 meses OU sem consumo
      return f !== 'ate_6m' || (it.consumo_valor == null || Number(it.consumo_valor) === 0);
    });
  }, [dados]);

  const filtrados = useMemo(() => {
    return baixoGiro.filter((it) => {
      if (faixaSel !== 'ALL' && faixaAging(it) !== faixaSel) return false;
      if (somenteComCompra && !(Number(it.a_receber ?? 0) > 0)) return false;
      return true;
    });
  }, [baixoGiro, faixaSel, somenteComCompra]);

  const bucketCounts = useMemo(() => {
    const acc: Record<AgingKey, { count: number; valor: number }> = {
      ate_6m: { count: 0, valor: 0 },
      de_6_12m: { count: 0, valor: 0 },
      de_12_24m: { count: 0, valor: 0 },
      acima_24m: { count: 0, valor: 0 },
      sem_saida: { count: 0, valor: 0 },
    };
    baixoGiro.forEach((it) => {
      const f = faixaAging(it);
      acc[f].count += 1;
      acc[f].valor += Number(it.valor_estoque ?? 0);
    });
    return acc;
  }, [baixoGiro]);

  const capital12 = resumo?.capital_parado_12m ?? bucketCounts.de_12_24m.valor + bucketCounts.acima_24m.valor + bucketCounts.sem_saida.valor;
  const capital24 = resumo?.capital_parado_24m ?? bucketCounts.acima_24m.valor + bucketCounts.sem_saida.valor;

  const columns: Column<EstoqueAnaliseItem>[] = useMemo(() => [
    { key: 'codpro', header: 'Produto', sticky: true, stickyWidth: 110, render: (_, r) => r.codpro ?? '—' },
    { key: 'despro', header: 'Descrição', sticky: true, stickyWidth: 240, render: (_, r) => r.despro ?? '—' },
    { key: 'coddep', header: 'Depósito', render: (_, r) => r.desdep ?? r.coddep ?? '—' },
    { key: 'saldo', header: 'Saldo', align: 'right', render: (_, r) => r.saldo == null ? '—' : formatNumber(r.saldo, 3) },
    { key: 'valor_estoque', header: 'Valor em estoque', align: 'right', render: (_, r) => r.valor_estoque == null ? '—' : `R$ ${formatNumber(r.valor_estoque, 2)}` },
    { key: 'ultima_saida', header: 'Última saída', render: (_, r) => fmtDate(r.ultima_saida) },
    { key: 'dias_sem_saida', header: 'Dias sem saída', align: 'right', render: (_, r) => r.dias_sem_saida ?? '—' },
    { key: 'faixa_aging', header: 'Faixa', render: (_, r) => {
      const f = faixaAging(r);
      const label = AGING_FAIXAS.find((x) => x.key === f)?.label ?? f;
      const cls = f === 'sem_saida' || f === 'acima_24m' ? 'bg-destructive/15 text-destructive border-destructive/30'
        : f === 'de_12_24m' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
        : 'bg-muted text-muted-foreground border-border';
      return <Badge variant="outline" className={cls}>{label}</Badge>;
    } },
    { key: 'a_receber', header: 'A receber', align: 'right', render: (_, r) => {
      const v = Number(r.a_receber ?? 0);
      if (!v) return '—';
      return <span className="inline-flex items-center gap-1"><Truck className="h-3 w-3 text-primary" />{formatNumber(v, 3)}</span>;
    } },
    { key: 'proxima_entrega', header: 'Próxima entrega', render: (_, r) => fmtDate(r.proxima_entrega) },
  ], []);

  const exportCols: ExportColumn[] = [
    { key: 'codpro', label: 'Produto', type: 'text' },
    { key: 'despro', label: 'Descrição', type: 'text' },
    { key: 'coddep', label: 'Depósito', type: 'text', get: (i) => i.desdep ?? i.coddep ?? '' },
    { key: 'saldo', label: 'Saldo', type: 'number' },
    { key: 'valor_estoque', label: 'Valor em estoque', type: 'currency' },
    { key: 'ultima_saida', label: 'Última saída', type: 'text', get: (i) => i.ultima_saida ?? '' },
    { key: 'dias_sem_saida', label: 'Dias sem saída', type: 'number' },
    { key: 'faixa_aging', label: 'Faixa', type: 'text', get: (i) => AGING_FAIXAS.find((x) => x.key === faixaAging(i))?.label ?? '' },
    { key: 'a_receber', label: 'A receber', type: 'number' },
    { key: 'proxima_entrega', label: 'Próxima entrega', type: 'text', get: (i) => i.proxima_entrega ?? '' },
  ];

  const titulo = 'Estoque de Baixo Giro';
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
        showCriterio={false}
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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KPICard title="Capital parado > 12m" value={`R$ ${formatNumber(Number(capital12), 2)}`} icon={<DollarSign className="h-5 w-5" />} variant="warning" index={0} />
            <KPICard title="Capital parado > 24m" value={`R$ ${formatNumber(Number(capital24), 2)}`} icon={<DollarSign className="h-5 w-5" />} variant="destructive" index={1} />
            <KPICard title="Itens sem saída" value={formatNumber(Number(resumo?.itens_sem_saida ?? bucketCounts.sem_saida.count), 0)} icon={<PackageX className="h-5 w-5" />} variant="destructive" index={2} tooltip={`Valor: R$ ${formatNumber(bucketCounts.sem_saida.valor, 2)}`} />
            <KPICard title="Baixo giro com compra pendente" value={formatNumber(Number(resumo?.itens_baixo_giro_com_compra ?? baixoGiro.filter((i) => Number(i.a_receber ?? 0) > 0).length), 0)} icon={<AlertTriangle className="h-5 w-5" />} variant="warning" index={3} />
          </div>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {AGING_FAIXAS.map((faixa) => {
              const b = bucketCounts[faixa.key];
              const active = faixaSel === faixa.key;
              return (
                <button
                  key={faixa.key}
                  onClick={() => setFaixaSel(active ? 'ALL' : faixa.key)}
                  className={`rounded-md border p-3 text-left text-xs transition ${active ? 'border-primary bg-primary/10' : 'bg-card hover:bg-accent/30'}`}
                >
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <CalendarClock className="h-3 w-3" />
                    {faixa.label}
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">{formatNumber(b.count, 0)}</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">R$ {formatNumber(b.valor, 2)}</div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={faixaSel === 'ALL' ? 'default' : 'outline'} onClick={() => setFaixaSel('ALL')}>Todas as faixas</Button>
            <Button size="sm" variant={somenteComCompra ? 'default' : 'outline'} onClick={() => setSomenteComCompra((v) => !v)}>Somente com compra pendente</Button>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => doExport('xlsx')}><FileSpreadsheet className="mr-1 h-3 w-3" />XLSX</Button>
              <Button size="sm" variant="outline" onClick={() => doExport('csv')}><FileText className="mr-1 h-3 w-3" />CSV</Button>
              <Button size="sm" variant="outline" onClick={() => doExport('pdf')}><FileDown className="mr-1 h-3 w-3" />PDF</Button>
            </div>
          </div>

          <DataTable columns={columns} data={filtrados} loading={q.isFetching} onRowClick={(r) => setDetalhe(r)} />

          <div className="text-xs text-muted-foreground">
            {filtrados.length} itens de baixo giro exibidos. "Sem saída registrada" indica itens sem histórico de consumo no período analisado.
          </div>
        </>
      )}

      <AnaliseItemDrawer item={detalhe} onClose={() => setDetalhe(null)} />
    </div>
  );
}
