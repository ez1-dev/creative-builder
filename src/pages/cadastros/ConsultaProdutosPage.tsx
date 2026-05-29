import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  getProdutosCadastro,
  getProdutosFamilias,
  getProdutosFiltrosIniciais,
  type ProdutoCadastroComboItem,
  type ProdutoCadastroFilters,
  type ProdutoCadastroItem,
  type ProdutoCadastroResponse,
} from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, type Column } from '@/components/erp/DataTable';
import { PaginationControl, type PageSize } from '@/components/erp/PaginationControl';
import { ComboboxFilter } from '@/components/erp/ComboboxFilter';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';

interface FormState {
  codori: string;
  codfam: string;
  codpro: string;
  despro: string;
  tippro: string;
  somente_ativos: boolean;
  incluir_derivacoes: boolean;
}

const initialForm: FormState = {
  codori: '',
  codfam: '',
  codpro: '',
  despro: '',
  tippro: '',
  somente_ativos: true,
  incluir_derivacoes: false,
};

function SituacaoBadge({ value }: { value?: string | null }) {
  if (!value) return <>-</>;
  const v = String(value).trim().toUpperCase();
  const ativo = v === 'A' || v === 'ATIVO' || v === 'ATIVA';
  return (
    <Badge variant={ativo ? 'default' : 'secondary'} className="text-[10px]">
      {value}
    </Badge>
  );
}

export default function ConsultaProdutosPage() {
  const erpReady = useErpReady();

  const [form, setForm] = useState<FormState>(initialForm);
  const [origens, setOrigens] = useState<ProdutoCadastroComboItem[]>([]);
  const [familias, setFamilias] = useState<ProdutoCadastroComboItem[]>([]);
  const [loadingFiltros, setLoadingFiltros] = useState(false);
  const [erroFiltros, setErroFiltros] = useState<string | null>(null);
  const [loadingFamilias, setLoadingFamilias] = useState(false);
  const [filtrosCarregados, setFiltrosCarregados] = useState(false);

  const [data, setData] = useState<ProdutoCadastroResponse | null>(null);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [erroProdutos, setErroProdutos] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(100);
  const [appliedIncluirDeriv, setAppliedIncluirDeriv] = useState(false);

  // Carrega origens + famílias num único endpoint ao abrir a tela
  useEffect(() => {
    if (!erpReady) return;
    let cancelled = false;
    setLoadingFiltros(true);
    setErroFiltros(null);
    getProdutosFiltrosIniciais(true)
      .then((res) => {
        if (cancelled) return;
        setOrigens(res.origens);
        setFamilias(res.familias);
        setFiltrosCarregados(true);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setErroFiltros('Não foi possível carregar origens e famílias.');
        toast.error(e?.message || 'Não foi possível carregar origens e famílias.');
      })
      .finally(() => { if (!cancelled) setLoadingFiltros(false); });
    return () => { cancelled = true; };
  }, [erpReady]);

  // Recarrega famílias quando a origem muda (após carga inicial)
  useEffect(() => {
    if (!erpReady || !filtrosCarregados) return;
    let cancelled = false;
    setLoadingFamilias(true);
    getProdutosFamilias(form.codori || undefined)
      .then((res) => { if (!cancelled) setFamilias(res); })
      .catch((e: any) => { if (!cancelled) toast.error(e?.message || 'Erro ao carregar famílias'); })
      .finally(() => { if (!cancelled) setLoadingFamilias(false); });
    return () => { cancelled = true; };
  }, [erpReady, filtrosCarregados, form.codori]);


  const buildFilters = useCallback((page: number, size: PageSize): ProdutoCadastroFilters => {
    const tp = size === 'todos' ? 100000 : size;
    return {
      codori: form.codori || undefined,
      codfam: form.codfam || undefined,
      codpro: form.codpro || undefined,
      despro: form.despro || undefined,
      tippro: form.tippro || undefined,
      somente_ativos: form.somente_ativos,
      incluir_derivacoes: form.incluir_derivacoes,
      pagina: size === 'todos' ? 1 : page,
      tamanho_pagina: tp,
    };
  }, [form]);

  const search = useCallback(async (page = 1, sizeOverride?: PageSize) => {
    if (!erpReady) {
      toast.error('Conexão ERP não disponível.');
      return;
    }
    setLoadingProdutos(true);
    setErroProdutos(null);
    try {
      const size = sizeOverride ?? pageSize;
      const result = await getProdutosCadastro(buildFilters(page, size));
      setData(result);
      setPagina(page);
      setAppliedIncluirDeriv(form.incluir_derivacoes);
    } catch (e: any) {
      const msg = e?.message || 'Erro ao consultar produtos';
      setErroProdutos(msg);
      toast.error(msg);
    } finally {
      setLoadingProdutos(false);
    }
  }, [erpReady, pageSize, buildFilters, form.incluir_derivacoes]);

  const handleClear = useCallback(() => {
    setForm(initialForm);
    setData(null);
    setErroProdutos(null);
    setPagina(1);
  }, []);


  const origensOptions = useMemo(
    () => origens.map((o) => ({ value: o.codigo, label: o.descricao ? `${o.codigo} - ${o.descricao}` : o.codigo })),
    [origens],
  );
  const familiasOptions = useMemo(
    () => familias.map((f) => ({ value: f.codigo, label: f.descricao ? `${f.codigo} - ${f.descricao}` : f.codigo })),
    [familias],
  );

  const columns = useMemo<Column<ProdutoCadastroItem>[]>(() => {
    const base: Column<ProdutoCadastroItem>[] = [
      { key: 'codigo_produto', header: 'Código Produto', sticky: true, stickyWidth: 130 },
      { key: 'descricao_produto', header: 'Descrição Produto', sticky: true, stickyWidth: 240 },
      { key: 'codigo_origem', header: 'Origem' },
      { key: 'descricao_origem', header: 'Descrição Origem' },
      { key: 'codigo_familia', header: 'Família' },
      { key: 'descricao_familia', header: 'Descrição Família' },
      { key: 'unidade_medida', header: 'UM', align: 'center' },
      { key: 'tipo_produto', header: 'Tipo' },
      { key: 'situacao', header: 'Situação', align: 'center', render: (v) => <SituacaoBadge value={v} /> },
      {
        key: 'qtd_derivacoes_ativas',
        header: 'Qtd Deriv. Ativas',
        align: 'right',
        render: (v) => (v == null ? '-' : formatNumber(Number(v), 0)),
      },
    ];
    if (appliedIncluirDeriv) {
      base.push(
        { key: 'codigo_derivacao', header: 'Cód. Derivação' },
        { key: 'descricao_derivacao', header: 'Descrição Derivação' },
        { key: 'situacao_derivacao', header: 'Situação Deriv.', align: 'center', render: (v) => <SituacaoBadge value={v} /> },
      );
    }
    return base;
  }, [appliedIncluirDeriv]);

  const dados = data?.dados ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Consulta de Produtos"
        description="Consulta de produtos cadastrados no ERP Senior por origem e/ou família."
      />

      <ErpConnectionAlert />

      <FilterPanel onSearch={() => search(1)} onClear={handleClear}>
        <div className="space-y-1">
          <Label className="text-xs">Origem</Label>
          <ComboboxFilter
            value={form.codori}
            onChange={(v) => setForm((f) => ({ ...f, codori: v, codfam: '' }))}
            options={origensOptions}
            placeholder={loadingFiltros ? 'Carregando origens e famílias...' : 'Todas...'}
            loading={loadingFiltros}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Família</Label>
          <ComboboxFilter
            value={form.codfam}
            onChange={(v) => setForm((f) => ({ ...f, codfam: v }))}
            options={familiasOptions}
            placeholder={
              loadingFiltros
                ? 'Carregando origens e famílias...'
                : loadingFamilias
                  ? 'Carregando famílias...'
                  : 'Todas...'
            }
            loading={loadingFiltros || loadingFamilias}
          />
        </div>


        <div className="space-y-1">
          <Label className="text-xs">Código do Produto</Label>
          <Input
            value={form.codpro}
            onChange={(e) => setForm((f) => ({ ...f, codpro: e.target.value }))}
            placeholder="Ex.: 123456"
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Descrição do Produto</Label>
          <Input
            value={form.despro}
            onChange={(e) => setForm((f) => ({ ...f, despro: e.target.value }))}
            placeholder="Trecho da descrição"
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Tipo do Produto</Label>
          <Input
            value={form.tippro}
            onChange={(e) => setForm((f) => ({ ...f, tippro: e.target.value }))}
            placeholder="Ex.: PA, MP, SA"
            className="h-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 pt-5">
          <Checkbox
            id="somente_ativos"
            checked={form.somente_ativos}
            onCheckedChange={(c) => setForm((f) => ({ ...f, somente_ativos: !!c }))}
          />
          <Label htmlFor="somente_ativos" className="text-xs cursor-pointer">
            Somente ativos
          </Label>
        </div>

        <div className="flex items-center gap-2 pt-5">
          <Checkbox
            id="incluir_derivacoes"
            checked={form.incluir_derivacoes}
            onCheckedChange={(c) => setForm((f) => ({ ...f, incluir_derivacoes: !!c }))}
          />
          <Label htmlFor="incluir_derivacoes" className="text-xs cursor-pointer">
            Incluir derivações
          </Label>
        </div>
      </FilterPanel>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={dados}
        loading={loading}
        emptyMessage={
          data
            ? 'Nenhum produto encontrado para os filtros informados.'
            : 'Use os filtros acima e clique em Pesquisar para consultar produtos.'
        }
      />

      {data && data.total_registros > 0 && (
        <PaginationControl
          pagina={pagina}
          totalPaginas={data.total_paginas || 1}
          totalRegistros={data.total_registros}
          pageSize={pageSize}
          onPageSizeChange={(s) => { setPageSize(s); search(1, s); }}
          onPageChange={(p) => search(p)}
        />
      )}
    </div>
  );
}
