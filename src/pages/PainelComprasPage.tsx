import { useState, useCallback, useMemo } from 'react';
import { api, PainelComprasResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { ComboboxFilter } from '@/components/erp/ComboboxFilter';
import { useErpOptions } from '@/hooks/useErpOptions';
import { KPICard } from '@/components/erp/KPICard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNumber, formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ShoppingCart, AlertTriangle, TrendingUp, Package, DollarSign, Clock, Percent, FileText, Layers, Receipt } from 'lucide-react';
import { useAiFilters } from '@/hooks/useAiFilters';

const COLORS = ['hsl(215,70%,45%)', 'hsl(142,70%,40%)', 'hsl(38,92%,50%)', 'hsl(0,72%,51%)', 'hsl(199,89%,48%)', 'hsl(280,60%,50%)', 'hsl(160,60%,40%)', 'hsl(30,80%,55%)'];

const situacaoLabel = (s: number) => {
  const map: Record<number, string> = { 1: 'Aberto Total', 2: 'Aberto Parcial', 3: 'Suspenso', 4: 'Liquidado', 5: 'Cancelado', 6: 'Aguard. Integração WMS', 7: 'Em Transmissão', 8: 'Prep. Análise/NF', 9: 'Não Fechado' };
  return map[s] || `Sit. ${s}`;
};

const baseColumns: Column<any>[] = [
  { key: 'numero_oc', header: 'Nº OC' },
  { key: 'codigo_item', header: 'Item' },
  { key: 'descricao_item', header: 'Descrição' },
  { key: 'tipo_item', header: 'Tipo' },
  { key: 'fantasia_fornecedor', header: 'Fornecedor' },
  { key: 'transacao', header: 'Transação' },
  { key: 'data_emissao', header: 'Emissão', render: (v) => formatDate(v) },
  { key: 'data_entrega', header: 'Entrega', render: (v) => formatDate(v) },
  { key: 'quantidade_pedida', header: 'Qtd. Pedida', align: 'right', render: (v) => formatNumber(v, 2) },
  { key: 'saldo_pendente', header: 'Saldo Pend.', align: 'right', render: (v) => formatNumber(v, 2) },
  { key: 'preco_unitario', header: 'Preço Unit.', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'percentual_desconto', header: '% Desc.', align: 'right', render: (v) => v ? `${formatNumber(v, 2)}%` : '-' },
  { key: 'valor_desconto_total', header: 'Vlr. Desconto', align: 'right' as const, render: (v: any) => formatCurrency(v) },
  { key: 'valor_liquido', header: 'Vlr. Líquido', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'situacao_oc', header: 'Situação', render: (v) => situacaoLabel(v) },
  { key: 'dias_atraso', header: 'Dias Atraso', align: 'right', render: (v) => v > 0 ? <span className="text-destructive font-semibold">{v}</span> : '-' },
];

export default function PainelComprasPage() {
  const [filters, setFilters] = useState({
    codigo_item: '', descricao_item: '', fornecedor: '', numero_oc: '',
    numero_projeto: '', centro_custo: '', transacao: '',
    valor_min: '', valor_max: '', tipo_item: 'TODOS', tipo_oc: 'TODOS',
    data_emissao_ini: '', data_emissao_fim: '', data_entrega_ini: '', data_entrega_fim: '',
    origem_material: '', familia: '', somente_pendentes: true,
    agrupar_por_fornecedor: false, situacao_oc: 'TODOS', codigo_motivo_oc: 'TODOS', observacao_oc: '',
    mostrar_valor_total_oc: false,
  });
  const [data, setData] = useState<PainelComprasResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);

  const erpReady = useErpReady();
  const { familias, origens, loading: optionsLoading } = useErpOptions(erpReady, data?.dados, { familiaKey: 'familia_item', origemKey: 'origem_item' });

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const params: any = { ...filters, pagina: page, tamanho_pagina: 100 };
      if (params.valor_min) params.valor_min = parseFloat(params.valor_min);
      else delete params.valor_min;
      if (params.valor_max) params.valor_max = parseFloat(params.valor_max);
      else delete params.valor_max;
      if (!params.situacao_oc || params.situacao_oc === 'TODOS') delete params.situacao_oc;
      if (!params.tipo_item || params.tipo_item === 'TODOS') delete params.tipo_item;
      if (!params.tipo_oc || params.tipo_oc === 'TODOS') delete params.tipo_oc;
      if (!params.codigo_motivo_oc || params.codigo_motivo_oc === 'TODOS') delete params.codigo_motivo_oc;
      if (!params.observacao_oc) delete params.observacao_oc;
      const result = await api.get<PainelComprasResponse>('/api/painel-compras', params);
      setData(result);
      setPagina(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady]);

  useAiFilters('painel-compras', setFilters, () => search(1));
  const clearFilters = () => { setFilters({
    codigo_item: '', descricao_item: '', fornecedor: '', numero_oc: '',
    numero_projeto: '', centro_custo: '', transacao: '',
    valor_min: '', valor_max: '', tipo_item: 'TODOS', tipo_oc: 'TODOS',
    data_emissao_ini: '', data_emissao_fim: '', data_entrega_ini: '', data_entrega_fim: '',
    origem_material: '', familia: '', somente_pendentes: true,
    agrupar_por_fornecedor: false, situacao_oc: 'TODOS', codigo_motivo_oc: 'TODOS', observacao_oc: '',
    mostrar_valor_total_oc: false,
  });

  const columns = useMemo(() => {
    const cols = [...baseColumns];
    if (filters.mostrar_valor_total_oc) {
      // Insert "Valor Total OC" after "Vlr. Líquido" (index 13)
      const insertIdx = cols.findIndex(c => c.key === 'situacao_oc');
      const valorTotalCol: Column<any> = { key: 'valor_total_oc', header: 'Valor Total OC', align: 'right', render: (v) => formatCurrency(v) };
      if (insertIdx >= 0) cols.splice(insertIdx, 0, valorTotalCol);
      else cols.push(valorTotalCol);
    }
    return cols;
  }, [filters.mostrar_valor_total_oc]);

  const chartData = useMemo(() => {
    if (data?.graficos) return data.graficos;
    if (!data?.dados?.length) return null;
    const dados = data.dados;

    // Top Fornecedores by valor_liquido
    const fornMap = new Map<string, number>();
    dados.forEach((d: any) => {
      const key = d.fantasia_fornecedor || 'Desconhecido';
      fornMap.set(key, (fornMap.get(key) || 0) + (d.valor_liquido || 0));
    });
    const top_fornecedores = [...fornMap.entries()]
      .map(([fantasia_fornecedor, valor_liquido_total]) => ({ fantasia_fornecedor, valor_liquido_total }))
      .sort((a, b) => b.valor_liquido_total - a.valor_liquido_total)
      .slice(0, 10);

    // Situação das OCs
    const sitMap = new Map<number, number>();
    dados.forEach((d: any) => {
      const s = d.situacao_oc ?? 0;
      sitMap.set(s, (sitMap.get(s) || 0) + 1);
    });
    const situacoes = [...sitMap.entries()].map(([situacao_oc, quantidade_itens]) => ({ situacao_oc, quantidade_itens }));

    // Produtos x Serviços
    const tipoMap = new Map<string, number>();
    dados.forEach((d: any) => {
      const t = d.tipo_item || 'Outros';
      tipoMap.set(t, (tipoMap.get(t) || 0) + 1);
    });
    const tipos = [...tipoMap.entries()].map(([tipo_item, quantidade_itens]) => ({ tipo_item, quantidade_itens }));

    // Top Famílias por valor líquido
    const famMap = new Map<string, number>();
    dados.forEach((d: any) => {
      const key = d.familia_item || 'Sem família';
      famMap.set(key, (famMap.get(key) || 0) + (d.valor_liquido || 0));
    });
    const familias = [...famMap.entries()]
      .map(([codigo_familia, valor_liquido_total]) => ({ codigo_familia, valor_liquido_total }))
      .sort((a, b) => b.valor_liquido_total - a.valor_liquido_total)
      .slice(0, 10);

    // Top Origens por valor líquido
    const origMap = new Map<string, number>();
    dados.forEach((d: any) => {
      const key = d.origem_item || 'Sem origem';
      origMap.set(key, (origMap.get(key) || 0) + (d.valor_liquido || 0));
    });
    const origens = [...origMap.entries()]
      .map(([origem, valor_liquido_total]) => ({ origem, valor_liquido_total }))
      .sort((a, b) => b.valor_liquido_total - a.valor_liquido_total)
      .slice(0, 10);

    // Entregas por mês
    const mesMap = new Map<string, { valor: number; itens: number }>();
    dados.forEach((d: any) => {
      if (!d.data_entrega) return;
      const periodo = String(d.data_entrega).substring(0, 7); // YYYY-MM
      const cur = mesMap.get(periodo) || { valor: 0, itens: 0 };
      cur.valor += d.valor_liquido || 0;
      cur.itens += 1;
      mesMap.set(periodo, cur);
    });
    const entregas_por_mes = [...mesMap.entries()]
      .map(([periodo_entrega, v]) => ({ periodo_entrega, valor_pendente_total: v.valor, quantidade_itens: v.itens }))
      .sort((a, b) => a.periodo_entrega.localeCompare(b.periodo_entrega));

    return { top_fornecedores, situacoes, tipos, familias, origens, entregas_por_mes };
  }, [data]);

  const kpis = useMemo(() => {
    if (data?.resumo) return data.resumo;
    if (!data?.dados || data.dados.length === 0) return null;
    const dados = data.dados;
    const uniqueOcs = new Set(dados.map((d: any) => d.numero_oc));
    const uniqueFornecedores = new Set(dados.map((d: any) => d.fantasia_fornecedor).filter(Boolean));
    const valorBruto = dados.reduce((s: number, d: any) => s + (d.valor_bruto || d.quantidade_pedida * d.preco_unitario || 0), 0);
    const valorLiquido = dados.reduce((s: number, d: any) => s + (d.valor_liquido || 0), 0);
    const valorDesconto = dados.reduce((s: number, d: any) => s + (d.valor_desconto_total || 0), 0);
    const valorPendente = dados.reduce((s: number, d: any) => s + ((d.saldo_pendente || 0) * (d.preco_unitario || 0)), 0);
    const itensPendentes = dados.filter((d: any) => (d.saldo_pendente || 0) > 0).length;
    const itensAtrasados = dados.filter((d: any) => (d.dias_atraso || 0) > 0).length;
    const ocsAtrasadas = new Set(dados.filter((d: any) => (d.dias_atraso || 0) > 0).map((d: any) => d.numero_oc)).size;
    const maiorAtraso = Math.max(0, ...dados.map((d: any) => d.dias_atraso || 0));
    const itensProduto = dados.filter((d: any) => d.tipo_item === 'PRODUTO' || d.tipo_item === 'P').length;
    const itensServico = dados.filter((d: any) => d.tipo_item === 'SERVICO' || d.tipo_item === 'S').length;
    const totalLinhas = dados.length;
    return {
      total_ocs: uniqueOcs.size,
      valor_bruto_total: valorBruto,
      valor_liquido_total: valorLiquido,
      valor_desconto_total: valorDesconto,
      total_fornecedores: uniqueFornecedores.size,
      valor_pendente_total: valorPendente,
      itens_pendentes: itensPendentes,
      itens_atrasados: itensAtrasados,
      ocs_atrasadas: ocsAtrasadas,
      maior_atraso_dias: maiorAtraso,
      ticket_medio_item: totalLinhas > 0 ? valorLiquido / totalLinhas : 0,
      impostos_totais: dados.reduce((s: number, d: any) => s + (d.impostos || 0), 0),
      total_linhas: totalLinhas,
      itens_produto: itensProduto,
      itens_servico: itensServico,
    };
  }, [data]);

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Painel de Compras"
        description="Dashboard e detalhamento de ordens de compra"
        actions={<ExportButton endpoint="/api/export/painel-compras" params={filters} />}
      />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Item</Label><Input value={filters.codigo_item} onChange={(e) => setFilters(f => ({ ...f, codigo_item: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Descrição Item</Label><Input value={filters.descricao_item} onChange={(e) => setFilters(f => ({ ...f, descricao_item: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Fornecedor</Label><Input value={filters.fornecedor} onChange={(e) => setFilters(f => ({ ...f, fornecedor: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Nº OC</Label><Input value={filters.numero_oc} onChange={(e) => setFilters(f => ({ ...f, numero_oc: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.numero_projeto} onChange={(e) => setFilters(f => ({ ...f, numero_projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Centro Custo</Label><Input value={filters.centro_custo} onChange={(e) => setFilters(f => ({ ...f, centro_custo: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Transação</Label><Input value={filters.transacao} onChange={(e) => setFilters(f => ({ ...f, transacao: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Emissão de</Label><Input type="date" value={filters.data_emissao_ini} onChange={(e) => setFilters(f => ({ ...f, data_emissao_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Emissão até</Label><Input type="date" value={filters.data_emissao_fim} onChange={(e) => setFilters(f => ({ ...f, data_emissao_fim: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Entrega de</Label><Input type="date" value={filters.data_entrega_ini} onChange={(e) => setFilters(f => ({ ...f, data_entrega_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Entrega até</Label><Input type="date" value={filters.data_entrega_fim} onChange={(e) => setFilters(f => ({ ...f, data_entrega_fim: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Família</Label><ComboboxFilter value={filters.familia} onChange={(v) => setFilters(f => ({ ...f, familia: v }))} options={familias} placeholder="Família" loading={optionsLoading} /></div>
        <div><Label className="text-xs">Origem</Label><ComboboxFilter value={filters.origem_material} onChange={(v) => setFilters(f => ({ ...f, origem_material: v }))} options={origens} placeholder="Origem" loading={optionsLoading} /></div>
        <div>
          <Label className="text-xs">Situação da OC</Label>
          <Select value={filters.situacao_oc} onValueChange={(v) => setFilters(f => ({ ...f, situacao_oc: v, somente_pendentes: v === '4' ? false : f.somente_pendentes }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todas</SelectItem>
              <SelectItem value="1">Aberto Total</SelectItem>
              <SelectItem value="2">Aberto Parcial</SelectItem>
              <SelectItem value="3">Suspenso</SelectItem>
              <SelectItem value="4">Liquidado</SelectItem>
              <SelectItem value="5">Cancelado</SelectItem>
              <SelectItem value="6">Aguard. Integração WMS</SelectItem>
              <SelectItem value="7">Em Transmissão</SelectItem>
              <SelectItem value="8">Prep. Análise/NF</SelectItem>
              <SelectItem value="9">Não Fechado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Desconto</Label>
          <Select value={filters.codigo_motivo_oc} onValueChange={(v) => setFilters(f => ({ ...f, codigo_motivo_oc: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="19">Com desconto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Obs./Valor Desconto</Label><Input value={filters.observacao_oc} onChange={(e) => setFilters(f => ({ ...f, observacao_oc: e.target.value }))} placeholder="Pesquisar desconto..." className="h-8 text-xs" /></div>
        <div>
          <Label className="text-xs">Tipo Item</Label>
          <Select value={filters.tipo_item} onValueChange={(v) => setFilters(f => ({ ...f, tipo_item: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="PRODUTO">Produto</SelectItem>
              <SelectItem value="SERVICO">Serviço</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tipo OC</Label>
          <Select value={filters.tipo_oc} onValueChange={(v) => setFilters(f => ({ ...f, tipo_oc: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="NORMAL">Normal</SelectItem>
              <SelectItem value="MISTA">Mista</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox id="pendentes" checked={filters.somente_pendentes} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_pendentes: !!v }))} />
          <Label htmlFor="pendentes" className="text-xs">Somente pendentes</Label>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox id="mostrarValorTotalOc" checked={filters.mostrar_valor_total_oc} onCheckedChange={(v) => setFilters(f => ({ ...f, mostrar_valor_total_oc: !!v }))} />
          <Label htmlFor="mostrarValorTotalOc" className="text-xs">Mostrar valor total da OC</Label>
        </div>
      </FilterPanel>

      {data && kpis && (
        <>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Indicadores Financeiros</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
              <KPICard index={0} title="Total OCs" value={kpis.total_ocs} icon={<ShoppingCart className="h-5 w-5" />} tooltip="Quantidade total de Ordens de Compra" details={chartData?.situacoes?.map((s: any) => ({ label: situacaoLabel(s.situacao_oc), value: String(s.quantidade_itens) }))} />
              <KPICard index={1} title="Valor Bruto" value={formatCurrency(kpis.valor_bruto_total)} variant="default" icon={<DollarSign className="h-5 w-5" />} tooltip="Soma dos valores brutos antes de descontos" />
              <KPICard index={2} title="Desconto Total" value={formatCurrency(kpis.valor_desconto_total)} variant="warning" icon={<Percent className="h-5 w-5" />} tooltip="Soma de todos os descontos aplicados" />
              <KPICard index={3} title="Valor Líquido" value={formatCurrency(kpis.valor_liquido_total)} variant="info" icon={<TrendingUp className="h-5 w-5" />} tooltip="Valor bruto menos descontos" details={[{ label: 'Valor Bruto', value: formatCurrency(kpis.valor_bruto_total) }, { label: 'Descontos', value: formatCurrency(kpis.valor_desconto_total) }, { label: 'Valor Líquido', value: formatCurrency(kpis.valor_liquido_total) }]} />
              <KPICard index={4} title="Impostos Totais" value={formatCurrency(kpis.impostos_totais)} variant="default" icon={<Receipt className="h-5 w-5" />} tooltip="Soma de IPI, ICMS, ISS e outros impostos" />
              <KPICard index={5} title="Fornecedores" value={kpis.total_fornecedores} variant="default" icon={<Layers className="h-5 w-5" />} tooltip="Quantidade de fornecedores distintos" />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Indicadores de Pendência</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
              <KPICard index={6} title="Valor Pendente" value={formatCurrency(kpis.valor_pendente_total)} variant="warning" icon={<Clock className="h-5 w-5" />} tooltip="Valor total de itens ainda não recebidos" />
              <KPICard index={7} title="Itens Pendentes" value={kpis.itens_pendentes} variant="warning" icon={<Package className="h-5 w-5" />} tooltip="Quantidade de itens com saldo pendente de recebimento" />
              <KPICard index={8} title="Itens Atrasados" value={kpis.itens_atrasados} variant="destructive" icon={<AlertTriangle className="h-5 w-5" />} tooltip="Itens cuja data de entrega já passou e ainda possuem saldo" />
              <KPICard index={9} title="OCs Atrasadas" value={kpis.ocs_atrasadas ?? '-'} variant="destructive" icon={<AlertTriangle className="h-5 w-5" />} tooltip="Quantidade de OCs com pelo menos um item atrasado" />
              <KPICard index={10} title="Maior Atraso" value={`${kpis.maior_atraso_dias} dias`} variant="destructive" icon={<Clock className="h-5 w-5" />} tooltip="Maior número de dias de atraso entre todos os itens pendentes" />
              <KPICard index={11} title="Ticket Médio/Item" value={formatCurrency(kpis.ticket_medio_item)} variant="info" icon={<TrendingUp className="h-5 w-5" />} tooltip="Valor líquido total dividido pelo número de itens" />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contagem de Itens</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
              <KPICard index={12} title="Total Linhas" value={kpis.total_linhas ?? '-'} icon={<FileText className="h-5 w-5" />} tooltip="Total de linhas de itens nas ordens de compra" />
              <KPICard index={13} title="Itens Produto" value={kpis.itens_produto ?? '-'} variant="info" icon={<Package className="h-5 w-5" />} tooltip="Quantidade de itens classificados como Produto" details={kpis.total_linhas ? [{ label: 'Produtos', value: `${kpis.itens_produto ?? 0} (${((kpis.itens_produto ?? 0) / kpis.total_linhas * 100).toFixed(1)}%)` }, { label: 'Serviços', value: `${kpis.itens_servico ?? 0} (${((kpis.itens_servico ?? 0) / kpis.total_linhas * 100).toFixed(1)}%)` }] : undefined} />
              <KPICard index={14} title="Itens Serviço" value={kpis.itens_servico ?? '-'} variant="success" icon={<Layers className="h-5 w-5" />} tooltip="Quantidade de itens classificados como Serviço" />
            </div>
          </div>
        </>
      )}

      {data && (
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="lista">Lista Detalhada</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {chartData && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Análises Gráficas</h3>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {chartData.top_fornecedores?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Top Fornecedores (Valor Líquido)</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData.top_fornecedores} layout="vertical">
                          <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <YAxis type="category" dataKey="fantasia_fornecedor" width={120} className="text-xs" tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor_liquido_total" fill="hsl(215,70%,45%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {chartData.situacoes?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Situação das OCs</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={chartData.situacoes.map((s: any) => ({ ...s, name: situacaoLabel(s.situacao_oc) }))} dataKey="quantidade_itens" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                            {chartData.situacoes.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {chartData.tipos?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Produtos x Serviços</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={chartData.tipos} dataKey="quantidade_itens" nameKey="tipo_item" cx="50%" cy="50%" outerRadius={80} label>
                            {chartData.tipos.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {chartData.entregas_por_mes?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Entregas por Mês (Itens por mês de entrega)</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData.entregas_por_mes}>
                          <XAxis dataKey="periodo_entrega" className="text-xs" tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor_pendente_total" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {chartData.familias?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Top Famílias por Valor Líquido</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData.familias} layout="vertical">
                          <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <YAxis type="category" dataKey="codigo_familia" width={100} className="text-xs" tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor_liquido_total" fill="hsl(142,70%,40%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {chartData.origens?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Top Origens por Valor Líquido</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData.origens} layout="vertical">
                          <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <YAxis type="category" dataKey="origem" width={100} className="text-xs" tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor_liquido_total" fill="hsl(280,60%,50%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="lista" className="space-y-2">
            <DataTable columns={columns} data={data.dados} loading={loading} />
            <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
