import { useState, useCallback } from 'react';
import { api, NotasRecebimentoResponse } from '@/lib/api';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { KPICard } from '@/components/erp/KPICard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNumber, formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { FileText, Package, Users, DollarSign, TrendingUp, Boxes } from 'lucide-react';

const columns: Column<any>[] = [
  { key: 'numero_nf', header: 'NF' },
  { key: 'serie_nf', header: 'Série' },
  { key: 'nome_fornecedor', header: 'Fornecedor' },
  { key: 'data_emissao', header: 'Emissão', render: (v) => formatDate(v) },
  { key: 'data_recebimento', header: 'Recebimento', render: (v) => formatDate(v) },
  { key: 'tipo_item', header: 'Tipo' },
  { key: 'codigo_item', header: 'Código Item' },
  { key: 'descricao_item', header: 'Descrição' },
  { key: 'derivacao', header: 'Derivação' },
  { key: 'unidade_medida', header: 'UM' },
  { key: 'transacao', header: 'Transação' },
  { key: 'deposito', header: 'Depósito' },
  { key: 'codigo_centro_custo', header: 'Centro Custo' },
  { key: 'descricao_centro_custo', header: 'Desc. Centro Custo' },
  { key: 'numero_projeto', header: 'Projeto', render: (v) => v && v !== 0 ? v : '-' },
  { key: 'nome_projeto', header: 'Nome Projeto' },
  { key: 'codigo_fase_projeto', header: 'Fase Projeto', render: (v) => v && v !== 0 ? v : '-' },
  { key: 'quantidade_recebida', header: 'Qtd. Recebida', align: 'right', render: (v) => formatNumber(v, 2) },
  { key: 'preco_unitario', header: 'Preço Unit.', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'valor_bruto', header: 'Vlr. Bruto', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'valor_liquido', header: 'Vlr. Líquido', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'valor_ipi', header: 'IPI', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'valor_icms', header: 'ICMS', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'valor_icms_st', header: 'ICMS ST', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'valor_pis', header: 'PIS', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'valor_cofins', header: 'COFINS', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'valor_iss', header: 'ISS', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'numero_oc_origem', header: 'OC Origem', render: (v) => v && v !== 0 ? v : '-' },
];

export default function NotasRecebimentoPage() {
  const [filters, setFilters] = useState({
    fornecedor: '', numero_nf: '', serie_nf: '',
    codigo_item: '', descricao_item: '',
    centro_custo: '', numero_projeto: '', transacao: '',
    data_recebimento_ini: '', data_recebimento_fim: '',
    tipo_item: 'TODOS', valor_min: '', valor_max: '',
    situacao_nf: '',
  });
  const [data, setData] = useState<NotasRecebimentoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);

  const search = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: any = { ...filters, pagina: page, tamanho_pagina: 100 };
      if (params.valor_min) params.valor_min = parseFloat(params.valor_min);
      else delete params.valor_min;
      if (params.valor_max) params.valor_max = parseFloat(params.valor_max);
      else delete params.valor_max;
      if (!params.tipo_item || params.tipo_item === 'TODOS') delete params.tipo_item;
      const result = await api.get<NotasRecebimentoResponse>('/api/notas-recebimento', params);
      setData(result);
      setPagina(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const clearFilters = () => setFilters({
    fornecedor: '', numero_nf: '', serie_nf: '',
    codigo_item: '', descricao_item: '',
    centro_custo: '', numero_projeto: '', transacao: '',
    data_recebimento_ini: '', data_recebimento_fim: '',
    tipo_item: 'TODOS', valor_min: '', valor_max: '',
  });

  // KPIs from resumo if available, otherwise calculate from page data
  const resumo = data?.resumo;
  const dados = data?.dados || [];
  const totalNfs = resumo?.total_nfs ?? new Set(dados.map(d => `${d.codigo_empresa}|${d.codigo_filial}|${d.numero_nf}|${d.serie_nf}`)).size;
  const totalItens = resumo?.total_itens ?? dados.length;
  const totalFornecedores = resumo?.total_fornecedores ?? new Set(dados.map(d => d.codigo_fornecedor)).size;
  const valorLiquidoTotal = resumo?.valor_liquido_total ?? dados.reduce((acc, d) => acc + Number(d.valor_liquido || 0), 0);
  const valorBrutoTotal = resumo?.valor_bruto_total ?? dados.reduce((acc, d) => acc + Number(d.valor_bruto || 0), 0);
  const qtdRecebidaTotal = resumo?.quantidade_recebida_total ?? dados.reduce((acc, d) => acc + Number(d.quantidade_recebida || 0), 0);

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Notas Fiscais de Recebimento"
        description="Consulta analítica de NFs de entrada por item, projeto, centro de custo e transação"
        actions={<ExportButton endpoint="/api/export/notas-recebimento" params={filters} />}
      />

      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Fornecedor</Label><Input value={filters.fornecedor} onChange={(e) => setFilters(f => ({ ...f, fornecedor: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Número NF</Label><Input value={filters.numero_nf} onChange={(e) => setFilters(f => ({ ...f, numero_nf: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Série</Label><Input value={filters.serie_nf} onChange={(e) => setFilters(f => ({ ...f, serie_nf: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Código Item</Label><Input value={filters.codigo_item} onChange={(e) => setFilters(f => ({ ...f, codigo_item: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Descrição Item</Label><Input value={filters.descricao_item} onChange={(e) => setFilters(f => ({ ...f, descricao_item: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Centro de Custo</Label><Input value={filters.centro_custo} onChange={(e) => setFilters(f => ({ ...f, centro_custo: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.numero_projeto} onChange={(e) => setFilters(f => ({ ...f, numero_projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Transação</Label><Input value={filters.transacao} onChange={(e) => setFilters(f => ({ ...f, transacao: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Recebimento de</Label><Input type="date" value={filters.data_recebimento_ini} onChange={(e) => setFilters(f => ({ ...f, data_recebimento_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Recebimento até</Label><Input type="date" value={filters.data_recebimento_fim} onChange={(e) => setFilters(f => ({ ...f, data_recebimento_fim: e.target.value }))} className="h-8 text-xs" /></div>
        <div>
          <Label className="text-xs">Tipo Item</Label>
          <Select value={filters.tipo_item} onValueChange={(v) => setFilters(f => ({ ...f, tipo_item: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="PRODUTO">Produto</SelectItem>
              <SelectItem value="SERVIÇO">Serviço</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Valor Líq. Mín.</Label><Input type="number" value={filters.valor_min} onChange={(e) => setFilters(f => ({ ...f, valor_min: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Valor Líq. Máx.</Label><Input type="number" value={filters.valor_max} onChange={(e) => setFilters(f => ({ ...f, valor_max: e.target.value }))} className="h-8 text-xs" /></div>
      </FilterPanel>

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <KPICard index={0} title="NFs" value={totalNfs} icon={<FileText className="h-5 w-5" />} tooltip="Notas fiscais distintas" />
            <KPICard index={1} title="Itens Recebidos" value={totalItens} icon={<Package className="h-5 w-5" />} tooltip="Total de itens retornados" />
            <KPICard index={2} title="Fornecedores" value={totalFornecedores} icon={<Users className="h-5 w-5" />} tooltip="Fornecedores distintos" />
            <KPICard index={3} title="Valor Líquido" value={formatCurrency(valorLiquidoTotal)} variant="info" icon={<DollarSign className="h-5 w-5" />} tooltip="Soma do valor líquido" />
            <KPICard index={4} title="Valor Bruto" value={formatCurrency(valorBrutoTotal)} variant="default" icon={<TrendingUp className="h-5 w-5" />} tooltip="Soma do valor bruto" />
            <KPICard index={5} title="Qtd. Recebida" value={formatNumber(qtdRecebidaTotal, 2)} variant="success" icon={<Boxes className="h-5 w-5" />} tooltip="Quantidade total recebida" />
          </div>

          <DataTable columns={columns} data={dados} loading={loading} emptyMessage="Nenhuma nota fiscal encontrada." />

          {data.total_paginas > 1 && (
            <PaginationControl
              pagina={pagina}
              totalPaginas={data.total_paginas}
              totalRegistros={data.total_registros}
              onPageChange={(p) => search(p)}
            />
          )}
        </>
      )}
    </div>
  );
}
