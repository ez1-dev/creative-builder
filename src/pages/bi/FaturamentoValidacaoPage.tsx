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
  DashboardTabs,
  NoDataState,
  LoadingState,
  ErrorState,
  formatCurrency,
  formatNumber,
  formatDateBR,
  type Column,
} from '@/components/bi';
import { MultiSelectFilter } from '@/components/bi/MultiSelectFilter';
import {
  getResumo,
  getPorMovimento,
  getPorTns,
  getDetalhes,
  getUnidadeComercial,
  getUnidadeTecnica,
  type FaturamentoValidacaoFiltros,
  type PorMovimentoRow,
  type PorTnsRow,
  type DetalheRow,
  type UnidadeComercialRow,
  type UnidadeTecnicaRow,
} from '@/lib/bi/faturamentoValidacao';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const FONTE_ACAO_OPTIONS = ['faturamento', 'faturamento_manual', 'fat_contabil', 'fat_trb', 'SEM_FONTE'];
const UNIDADE_NEGOCIO_OPTIONS = ['GENIUS', 'ESTRUTURAL ZORTEA', 'SEM_UNIDADE'];
const TP_MOVIMENTO_FALLBACK = ['S', 'E'];
const ORIGEM_FALLBACK = ['PROP', 'TERC'];


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
  const defaultsIniciais: FaturamentoValidacaoFiltros = {
    anomes_ini: def.ini,
    anomes_fim: def.fim,
    fonte_acao: 'faturamento,faturamento_manual',
    unidade_negocio: 'GENIUS,ESTRUTURAL ZORTEA',
    cd_tp_movimento: 'S',
    cd_origem: 'PROP',
  };
  const [draft, setDraft] = useState<FaturamentoValidacaoFiltros>(defaultsIniciais);
  const [filtros, setFiltros] = useState<FaturamentoValidacaoFiltros>(defaultsIniciais);
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
  // unidade_negocio é aplicado no frontend, então removemos do payload backend
  const filtrosBackend = useMemo(() => {
    const { unidade_negocio: _u, ...rest } = filtros;
    return rest as FaturamentoValidacaoFiltros;
  }, [filtros]);

  const qUniCom = useQuery({
    queryKey: ['bi-fat-val', 'unidade-comercial', filtrosBackend],
    queryFn: () => getUnidadeComercial(filtrosBackend),
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const qUniTec = useQuery({
    queryKey: ['bi-fat-val', 'unidade-tecnica', filtrosBackend],
    queryFn: () => getUnidadeTecnica(filtrosBackend),
    retry: 1,
    refetchOnWindowFocus: false,
  });


  const qOptions = useQuery({
    queryKey: ['bi-fat-val', 'distinct-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bi_faturamento')
        .select('cd_tp_movimento, cd_origem')
        .limit(5000);
      if (error) throw error;
      const tp = new Set<string>();
      const og = new Set<string>();
      (data ?? []).forEach((r: any) => {
        if (r.cd_tp_movimento) tp.add(String(r.cd_tp_movimento));
        if (r.cd_origem) og.add(String(r.cd_origem));
      });
      return {
        tp_movimento: Array.from(tp).sort(),
        origem: Array.from(og).sort(),
      };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const tpMovimentoOptions = qOptions.data?.tp_movimento.length
    ? qOptions.data.tp_movimento
    : TP_MOVIMENTO_FALLBACK;
  const origemOptions = qOptions.data?.origem.length
    ? qOptions.data.origem
    : ORIGEM_FALLBACK;

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
      qUniCom.refetch();
      qUniTec.refetch();
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
      const body = rows.map(r => cols.map(c => escape(renderCell(r, c))).join(';')).join('\n');
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
    { key: 'fonte_acao', header: 'Fonte Ação', render: (_, r) => r.fonte_acao ?? 'SEM_FONTE' },
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
    { key: 'fonte_acao', header: 'Fonte Ação', render: (_, r) => r.fonte_acao ?? 'SEM_FONTE' },
    { key: 'vl_bruto', header: 'VL Bruto', render: (_, r) => formatCurrency(num(r.vl_bruto)), align: 'right' },

    { key: 'vl_total', header: 'VL Total', render: (_, r) => formatCurrency(num(r.vl_total)), align: 'right' },
    { key: 'vl_devolucao', header: 'VL Devolução', render: (_, r) => formatCurrency(num(r.vl_devolucao)), align: 'right' },
    { key: 'created_at', header: 'Criado em', render: (_, r) => formatDateBR(r.created_at) },
  ], []);

  const uniComColumns: Column<UnidadeComercialRow>[] = useMemo(() => [
    { key: 'anomes_emissao', header: 'AnoMês', render: (_, r) => r.anomes_emissao ?? '-' },
    { key: 'unidade_negocio', header: 'Unidade', render: (_, r) => r.unidade_negocio ?? '-' },
    { key: 'qtd_linhas', header: 'Linhas', render: (_, r) => formatNumber(num(r.qtd_linhas)), align: 'right' },
    { key: 'vl_bruto', header: 'VL Bruto', render: (_, r) => formatCurrency(num(r.vl_bruto)), align: 'right' },
    { key: 'vl_total', header: 'VL Total', render: (_, r) => formatCurrency(num(r.vl_total)), align: 'right' },
    { key: 'vl_devolucao', header: 'VL Devolução', render: (_, r) => formatCurrency(num(r.vl_devolucao)), align: 'right' },
    { key: 'vl_icms', header: 'VL ICMS', render: (_, r) => formatCurrency(num(r.vl_icms)), align: 'right' },
    { key: 'vl_pis', header: 'VL PIS', render: (_, r) => formatCurrency(num(r.vl_pis)), align: 'right' },
    { key: 'vl_cofins', header: 'VL COFINS', render: (_, r) => formatCurrency(num(r.vl_cofins)), align: 'right' },
  ], []);

  const uniTecColumns: Column<UnidadeTecnicaRow>[] = useMemo(() => [
    { key: 'anomes_emissao', header: 'AnoMês', render: (_, r) => r.anomes_emissao ?? '-' },
    { key: 'unidade_negocio', header: 'Unidade', render: (_, r) => r.unidade_negocio ?? '-' },
    { key: 'fonte_acao', header: 'Fonte Ação', render: (_, r) => r.fonte_acao ?? 'SEM_FONTE' },
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
            <MultiSelectFilter
              label="CD Tp Movimento"
              options={tpMovimentoOptions}
              value={draft.cd_tp_movimento ?? ''}
              onChange={(v) => setDraft({ ...draft, cd_tp_movimento: v })}
              placeholder="Todos"
            />
            <MultiSelectFilter
              label="CD Origem"
              options={origemOptions}
              value={draft.cd_origem ?? ''}
              onChange={(v) => setDraft({ ...draft, cd_origem: v })}
              placeholder="Todos"
            />
            {filtroField('cd_empresa', 'CD Empresa', '1,2')}
            {filtroField('cd_filial', 'CD Filial', '1,2,3')}
            {filtroField('cd_tns', 'CD TNS', '511,...')}
            {filtroField('cd_centro_custos_3', 'CD CC3', '001,...')}
            {filtroField('cd_nf', 'CD NF', '12345')}
            <MultiSelectFilter
              label="Fonte Ação"
              options={FONTE_ACAO_OPTIONS}
              value={draft.fonte_acao ?? ''}
              onChange={(v) => setDraft({ ...draft, fonte_acao: v })}
              placeholder="Todas"
            />
            <MultiSelectFilter
              label="Unidade Negócio"
              options={UNIDADE_NEGOCIO_OPTIONS}
              value={draft.unidade_negocio ?? ''}
              onChange={(v) => setDraft({ ...draft, unidade_negocio: v })}
              placeholder="Todas"
            />



            <div className="flex items-end">
              <Button size="sm" className="h-8 w-full" onClick={aplicarFiltros}>
                Aplicar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DashboardTabs
        tabs={[
          {
            value: 'geral',
            label: 'Resumo geral',
            content: (
              <div className="space-y-4">
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
            ),
          },
          {
            value: 'comercial',
            label: 'Comercial por Unidade',
            content: (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Faturamento por unidade (fontes: VM_FATURAMENTO, VM_FATURAMENTO_MANUAL)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {qUniCom.isError ? (
                    <ErrorState message={String((qUniCom.error as any)?.message ?? 'Erro ao carregar comercial por unidade')} />
                  ) : (
                    <DataTableBI
                      columns={uniComColumns}
                      data={qUniCom.data ?? []}
                      loading={qUniCom.isLoading}
                      emptyMessage="Sem dados para os filtros selecionados."
                      rowClassName={(r) => r.unidade_negocio === 'CONSOLIDADO' ? 'font-semibold bg-muted/40' : ''}
                    />
                  )}
                </CardContent>
              </Card>
            ),
          },
          {
            value: 'tecnico',
            label: 'Técnico / Conciliação',
            content: (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Conciliação por fonte (todas as fontes ETL)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {qUniTec.isError ? (
                    <ErrorState message={String((qUniTec.error as any)?.message ?? 'Erro ao carregar conciliação técnica')} />
                  ) : (
                    <DataTableBI
                      columns={uniTecColumns}
                      data={qUniTec.data ?? []}
                      loading={qUniTec.isLoading}
                      emptyMessage="Sem dados para os filtros selecionados."
                    />
                  )}
                </CardContent>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}
