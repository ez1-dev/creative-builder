import { useState, useCallback, useMemo } from 'react';
import { api, PaginatedResponse } from '@/lib/api';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNumber, formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { Database, FolderTree, DollarSign, Receipt } from 'lucide-react';
import { useAiFilters } from '@/hooks/useAiFilters';
import { useAiPageContext } from '@/hooks/useAiPageContext';

const columns: Column<any>[] = [
  { key: 'codigo', header: 'Código' },
  { key: 'descricao', header: 'Descrição' },
  { key: 'familia', header: 'Família' },
  { key: 'origem', header: 'Origem' },
  { key: 'tipo_descricao', header: 'Tipo' },
  { key: 'derivacao', header: 'Derivação' },
  { key: 'saldo', header: 'Saldo', align: 'right', render: (v) => formatNumber(v, 2) },
  { key: 'preco_medio', header: 'Preço Médio', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'data_preco_medio', header: 'Data Preço Médio', render: (v) => formatDate(v) },
  { key: 'custo_calculado', header: 'Custo Calculado', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'data_custo_calculado', header: 'Data Custo Calc.', render: (v) => formatDate(v) },
  { key: 'numero_nf_ultima_compra', header: 'Última NF' },
  { key: 'fornecedor_ultima_compra', header: 'Fornecedor' },
  { key: 'preco_nf_ultima_compra', header: 'Preço NF', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'quantidade_nf_ultima_compra', header: 'Qtd. Última Compra', align: 'right', render: (v) => formatNumber(v, 2) },
  { key: 'data_entrada_nf_ultima_compra', header: 'Data Entrada', render: (v) => formatDate(v) },
  { key: 'numero_oc_ultima', header: 'Última OC' },
  { key: 'possui_oc_aberta', header: 'OC Aberta?' },
  { key: 'qtde_ocs_abertas', header: 'Qtd. OCs', align: 'right' },
];

export default function ComprasProdutoPage() {
  const [filters, setFilters] = useState({ codpro: '', despro: '', projeto: '', centro_custo: '', codfam: '', codori: '', codder: '', somente_com_oc_aberta: false, situacao: 'A' });
  const [data, setData] = useState<PaginatedResponse<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);

  const erpReady = useErpReady();
  const { familias, origens, loading: optionsLoading } = useErpOptions(erpReady, data?.dados);

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const { situacao, ...rest } = filters;
      const result = await api.get<PaginatedResponse<any>>('/api/compras-produto', { ...rest, situacao_cadastro: situacao, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady]);

  useAiFilters('compras-produto', setFilters, () => search(1));

  useAiPageContext({
    title: 'Compras / Custos do Produto',
    module: 'compras-produto',
    filters,
    summary: data
      ? `${data.total_registros} produtos; página ${pagina}/${data.total_paginas}`
      : undefined,
  });

  const kpis = useMemo(() => {
    if (!data) return null;
    const dados = data.dados || [];
    const familiasDistintas = new Set(dados.map((d) => d.familia).filter(Boolean)).size;
    const precosMedios = dados.filter((d) => d.preco_medio != null && d.preco_medio > 0);
    const mediaPrecoMedio = precosMedios.length > 0 ? precosMedios.reduce((s, d) => s + d.preco_medio, 0) / precosMedios.length : 0;
    const precosNf = dados.filter((d) => d.preco_nf_ultima_compra != null && d.preco_nf_ultima_compra > 0);
    const mediaPrecoNf = precosNf.length > 0 ? precosNf.reduce((s, d) => s + d.preco_nf_ultima_compra, 0) / precosNf.length : 0;
    return { totalRegistros: data.total_registros, familiasDistintas, mediaPrecoMedio, mediaPrecoNf };
  }, [data]);

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Compras / Custos do Produto"
        description="Consulte informações de compras, preços e OCs por produto"
        actions={<ExportButton endpoint="/api/export/compras-produto" params={filters} />}
      />
      <FilterPanel onSearch={() => search(1)} onClear={() => { setFilters({ codpro: '', despro: '', projeto: '', centro_custo: '', codfam: '', codori: '', codder: '', somente_com_oc_aberta: false, situacao: 'A' }); setData(null); setPagina(1); }}>
        <div><Label className="text-xs">Código</Label><Input value={filters.codpro} onChange={(e) => setFilters(f => ({ ...f, codpro: e.target.value }))} placeholder="Código" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Descrição</Label><Input value={filters.despro} onChange={(e) => setFilters(f => ({ ...f, despro: e.target.value }))} placeholder="Descrição" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.projeto} onChange={(e) => setFilters(f => ({ ...f, projeto: e.target.value }))} placeholder="Projeto" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Centro de Custo</Label><Input value={filters.centro_custo} onChange={(e) => setFilters(f => ({ ...f, centro_custo: e.target.value }))} placeholder="Centro de Custo" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Família</Label><ComboboxFilter value={filters.codfam} onChange={(v) => setFilters(f => ({ ...f, codfam: v }))} options={familias} placeholder="Família" loading={optionsLoading} /></div>
        <div><Label className="text-xs">Origem</Label><ComboboxFilter value={filters.codori} onChange={(v) => setFilters(f => ({ ...f, codori: v }))} options={origens} placeholder="Origem" loading={optionsLoading} /></div>
        <div><Label className="text-xs">Derivação</Label><Input value={filters.codder} onChange={(e) => setFilters(f => ({ ...f, codder: e.target.value }))} placeholder="Derivação" className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Situação</Label><Select value={filters.situacao} onValueChange={(v) => setFilters(f => ({ ...f, situacao: v }))}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="A">Ativo</SelectItem><SelectItem value="I">Inativo</SelectItem><SelectItem value="all">Todos</SelectItem></SelectContent></Select></div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox id="oc_aberta" checked={filters.somente_com_oc_aberta} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_com_oc_aberta: !!v }))} />
          <Label htmlFor="oc_aberta" className="text-xs">Somente com OC aberta</Label>
        </div>
      </FilterPanel>
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Total Registros" value={formatNumber(kpis.totalRegistros, 0)} icon={<Database className="h-5 w-5" />} variant="default" index={0} tooltip="Total de registros encontrados" />
          <KPICard title="Famílias" value={formatNumber(kpis.familiasDistintas, 0)} icon={<FolderTree className="h-5 w-5" />} variant="info" index={1} tooltip="Famílias distintas nos itens visíveis" />
          <KPICard title="Preço Médio" value={formatCurrency(kpis.mediaPrecoMedio)} icon={<DollarSign className="h-5 w-5" />} variant="success" index={2} tooltip="Média do preço médio dos itens visíveis" />
          <KPICard title="Último Preço NF" value={formatCurrency(kpis.mediaPrecoNf)} icon={<Receipt className="h-5 w-5" />} variant="warning" index={3} tooltip="Média do preço da última NF dos itens visíveis" />
        </div>
      )}
      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
