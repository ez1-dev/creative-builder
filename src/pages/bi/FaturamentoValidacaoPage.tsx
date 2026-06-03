import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Download } from 'lucide-react';
import { PageHeader } from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  KpiCard,
  KpiGrid,
  DataTableBI,
  NoDataState,
  LoadingState,
  ErrorState,
  formatCurrency,
  formatNumber,
  formatDateBR,
  type Column,
} from '@/components/bi';
import {
  getResumo,
  getPorMovimento,
  getPorTns,
  getDetalhes,
  type FaturamentoValidacaoFiltros,
  type PorMovimentoRow,
  type PorTnsRow,
  type DetalheRow,
} from '@/lib/bi/faturamentoValidacao';
import { useToast } from '@/hooks/use-toast';

const num = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const defaultAnomes = () => {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  return { ini: `${ano}01`, fim: `${ano}${mes}` };
};

export default function FaturamentoValidacaoPage() {
  const { toast } = useToast();
  const def = defaultAnomes();
  const [draft, setDraft] = useState<FaturamentoValidacaoFiltros>({
    anomes_ini: def.ini,
    anomes_fim: def.fim,
  });
  const [filtros, setFiltros] = useState<FaturamentoValidacaoFiltros>(draft);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const qResumo = useQuery({
    queryKey: ['bi-fat-val', 'resumo', filtros],
    queryFn: () => getResumo(filtros),
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const qMov = useQuery({
    queryKey: ['bi-fat-val', 'movimento', filtros],
    queryFn: () => getPorMovimento(filtros),
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const qTns = useQuery({
    queryKey: ['bi-fat-val', 'tns', filtros],
    queryFn: () => getPorTns(filtros),
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const qDet = useQuery({
    queryKey: ['bi-fat-val', 'detalhes', filtros, page, pageSize],
    queryFn: () => getDetalhes(filtros, page, pageSize),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const aplicarFiltros = () => {
    setFiltros({ ...draft });
    setPage(1);
  };

  const atualizar = () => {
    try {
      qResumo.refetch();
      qMov.refetch();
      qTns.refetch();
      qDet.refetch();
    } catch (err) {
      console.warn('[FaturamentoValidacao] falha ao atualizar:', err);
      toast({ title: 'Falha ao atualizar', description: 'Tente novamente em instantes.', variant: 'destructive' });
    }
  };

  const exportarCsv = () => {
    try {
      const rows = qDet.data?.rows ?? [];
      if (rows.length === 0) {
        toast({ title: 'Nada para exportar', description: 'A tabela de detalhes está vazia.' });
        return;
      }
      const cols: Array<keyof DetalheRow> = [
        'cd_tp_movimento', 'cd_origem', 'cd_empresa', 'cd_filial', 'cd_nf', 'cd_serie',
        'dt_emissao', 'anomes_emissao', 'cd_tns', 'cd_cliente', 'cd_centro_custos_3', 'fonte_acao',
        'vl_bruto', 'vl_total', 'vl_devolucao', 'created_at',
      ];
      const renderCell = (r: DetalheRow, c: keyof DetalheRow) =>
        c === 'fonte_acao' ? (r.fonte_acao ?? 'SEM_FONTE') : r[c];

      const escape = (v: any) => {
        const s = v === null || v === undefined ? '' : String(v);
        return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const header = cols.join(';');
      const body = rows.map(r => cols.map(c => escape(r[c])).join(';')).join('\n');
      const blob = new Blob(['\ufeff' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bi-faturamento-detalhes-pag${page}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('[FaturamentoValidacao] falha ao exportar CSV:', err);
      toast({ title: 'Falha ao exportar', description: 'Não foi possível gerar o CSV.', variant: 'destructive' });
    }
  };

  const resumo = qResumo.data;

  const movColumns: Column<PorMovimentoRow>[] = useMemo(() => [
    { key: 'anomes_emissao', header: 'AnoMês', render: (_, r) => r.anomes_emissao ?? '-' },
    { key: 'cd_tp_movimento', header: 'Tp Mov', render: (_, r) => r.cd_tp_movimento ?? '-' },
    { key: 'cd_origem', header: 'Origem', render: (_, r) => r.cd_origem ?? '-' },
    { key: 'qtd_linhas', header: 'Linhas', render: (_, r) => formatNumber(num(r.qtd_linhas)), align: 'right' },
    { key: 'vl_bruto', header: 'VL Bruto', render: (_, r) => formatCurrency(num(r.vl_bruto)), align: 'right' },
    { key: 'vl_total', header: 'VL Total', render: (_, r) => formatCurrency(num(r.vl_total)), align: 'right' },
    { key: 'vl_devolucao', header: 'VL Devolução', render: (_, r) => formatCurrency(num(r.vl_devolucao)), align: 'right' },
    { key: 'vl_icms', header: 'VL ICMS', render: (_, r) => formatCurrency(num(r.vl_icms)), align: 'right' },
    { key: 'vl_pis', header: 'VL PIS', render: (_, r) => formatCurrency(num(r.vl_pis)), align: 'right' },
    { key: 'vl_cofins', header: 'VL COFINS', render: (_, r) => formatCurrency(num(r.vl_cofins)), align: 'right' },
  ], []);

  const tnsColumns: Column<PorTnsRow>[] = useMemo(() => [
    { key: 'cd_tns', header: 'TNS', render: (_, r) => r.cd_tns ?? '-' },
    { key: 'cd_natureza', header: 'Natureza', render: (_, r) => r.cd_natureza ?? '-' },
    { key: 'qtd_linhas', header: 'Linhas', render: (_, r) => formatNumber(num(r.qtd_linhas)), align: 'right' },
    { key: 'vl_total', header: 'VL Total', render: (_, r) => formatCurrency(num(r.vl_total)), align: 'right' },
    { key: 'vl_devolucao', header: 'VL Devolução', render: (_, r) => formatCurrency(num(r.vl_devolucao)), align: 'right' },
  ], []);

  const detColumns: Column<DetalheRow>[] = useMemo(() => [
    { key: 'cd_tp_movimento', header: 'Tp Mov', render: (_, r) => r.cd_tp_movimento ?? '-' },
    { key: 'cd_origem', header: 'Origem', render: (_, r) => r.cd_origem ?? '-' },
    { key: 'cd_empresa', header: 'Empresa', render: (_, r) => r.cd_empresa ?? '-' },
    { key: 'cd_filial', header: 'Filial', render: (_, r) => r.cd_filial ?? '-' },
    { key: 'cd_nf', header: 'NF', render: (_, r) => r.cd_nf ?? '-' },
    { key: 'cd_serie', header: 'Série', render: (_, r) => r.cd_serie ?? '-' },
    { key: 'dt_emissao', header: 'Dt Emissão', render: (_, r) => formatDateBR(r.dt_emissao) },
    { key: 'anomes_emissao', header: 'AnoMês', render: (_, r) => r.anomes_emissao ?? '-' },
    { key: 'cd_tns', header: 'TNS', render: (_, r) => r.cd_tns ?? '-' },
    { key: 'cd_cliente', header: 'Cliente', render: (_, r) => r.cd_cliente ?? '-' },
    { key: 'cd_centro_custos_3', header: 'CC3', render: (_, r) => r.cd_centro_custos_3 ?? '-' },
    { key: 'vl_bruto', header: 'VL Bruto', render: (_, r) => formatCurrency(num(r.vl_bruto)), align: 'right' },
    { key: 'vl_total', header: 'VL Total', render: (_, r) => formatCurrency(num(r.vl_total)), align: 'right' },
    { key: 'vl_devolucao', header: 'VL Devolução', render: (_, r) => formatCurrency(num(r.vl_devolucao)), align: 'right' },
    { key: 'created_at', header: 'Criado em', render: (_, r) => formatDateBR(r.created_at) },
  ], []);

  const totalPaginas = qDet.data ? Math.max(1, Math.ceil(qDet.data.total / pageSize)) : 1;

  const filtroField = (
    key: keyof FaturamentoValidacaoFiltros,
    label: string,
    placeholder?: string,
  ) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        className="h-8 text-xs"
        value={draft[key] ?? ''}
        placeholder={placeholder}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        onKeyDown={(e) => { if (e.key === 'Enter') aplicarFiltros(); }}
      />
    </div>
  );

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Validação BI Faturamento"
        description="Conferência dos dados carregados em bi_faturamento (somente leitura)."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={atualizar} disabled={qResumo.isFetching}>
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${qResumo.isFetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button size="sm" variant="outline" onClick={exportarCsv}>
              <Download className="mr-1 h-3.5 w-3.5" />
              Exportar CSV
            </Button>
          </div>
        }
      />

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtroField('anomes_ini', 'AnoMês Início', '202601')}
            {filtroField('anomes_fim', 'AnoMês Fim', '202612')}
            {filtroField('cd_tp_movimento', 'CD Tp Movimento', 'S,E')}
            {filtroField('cd_origem', 'CD Origem', 'PROP,...')}
            {filtroField('cd_empresa', 'CD Empresa', '1,2')}
            {filtroField('cd_filial', 'CD Filial', '1,2,3')}
            {filtroField('cd_tns', 'CD TNS', '511,...')}
            {filtroField('cd_centro_custos_3', 'CD CC3', '001,...')}
            {filtroField('cd_nf', 'CD NF', '12345')}
            <div className="flex items-end">
              <Button size="sm" className="h-8 w-full" onClick={aplicarFiltros}>
                Aplicar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção 1: Cards resumo */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Resumo</CardTitle></CardHeader>
        <CardContent>
          {qResumo.isLoading ? (
            <LoadingState height={120} />
          ) : qResumo.isError ? (
            <ErrorState message={String((qResumo.error as any)?.message ?? 'Erro ao carregar resumo')} />
          ) : !resumo ? (
            <NoDataState />
          ) : (
            <KpiGrid cols={7}>
              <KpiCard title="Qtd Linhas" value={num(resumo.qtd_linhas)} format="number" />
              <KpiCard title="VL Bruto" value={num(resumo.vl_bruto)} format="currency" />
              <KpiCard title="VL Total" value={num(resumo.vl_total)} format="currency" />
              <KpiCard title="VL Devolução" value={num(resumo.vl_devolucao)} format="currency" />
              <KpiCard title="VL ICMS" value={num(resumo.vl_icms)} format="currency" />
              <KpiCard title="VL PIS" value={num(resumo.vl_pis)} format="currency" />
              <KpiCard title="VL COFINS" value={num(resumo.vl_cofins)} format="currency" />
            </KpiGrid>
          )}
        </CardContent>
      </Card>

      {/* Seção 2: Por movimento */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Resumo por movimento</CardTitle></CardHeader>
        <CardContent>
          <DataTableBI
            columns={movColumns}
            data={qMov.data ?? []}
            loading={qMov.isLoading}
            emptyMessage="Sem dados para os filtros selecionados."
          />
        </CardContent>
      </Card>

      {/* Seção 3: Por TNS */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Resumo por TNS</CardTitle></CardHeader>
        <CardContent>
          <DataTableBI
            columns={tnsColumns}
            data={qTns.data ?? []}
            loading={qTns.isLoading}
            emptyMessage="Sem dados para os filtros selecionados."
          />
        </CardContent>
      </Card>

      {/* Seção 4: Detalhes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            Detalhes {qDet.data ? `(${formatNumber(qDet.data.total)} registros)` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTableBI
            columns={detColumns}
            data={qDet.data?.rows ?? []}
            loading={qDet.isLoading}
            emptyMessage="Sem dados para os filtros selecionados."
            pagination={{
              pagina: page,
              totalPaginas,
              totalRegistros: qDet.data?.total ?? 0,
              onPageChange: setPage,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
