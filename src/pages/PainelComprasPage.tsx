import { useState, useCallback } from 'react';
import { api, PainelComprasResponse } from '@/lib/api';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
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

const COLORS = ['hsl(215,70%,45%)', 'hsl(142,70%,40%)', 'hsl(38,92%,50%)', 'hsl(0,72%,51%)', 'hsl(199,89%,48%)', 'hsl(280,60%,50%)', 'hsl(160,60%,40%)', 'hsl(30,80%,55%)'];

const situacaoLabel = (s: number) => {
  const map: Record<number, string> = { 1: 'Aberto Total', 2: 'Aberto Parcial', 3: 'Suspenso', 4: 'Liquidado', 5: 'Cancelado', 6: 'Aguard. Integração WMS', 7: 'Em Transmissão', 8: 'Prep. Análise/NF', 9: 'Não Fechado' };
  return map[s] || `Sit. ${s}`;
};

const columns: Column<any>[] = [
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
  });
  const [data, setData] = useState<PainelComprasResponse | null>(null);
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
  }, [filters]);

  const clearFilters = () => setFilters({
    codigo_item: '', descricao_item: '', fornecedor: '', numero_oc: '',
    numero_projeto: '', centro_custo: '', transacao: '',
    valor_min: '', valor_max: '', tipo_item: 'TODOS', tipo_oc: 'TODOS',
    data_emissao_ini: '', data_emissao_fim: '', data_entrega_ini: '', data_entrega_fim: '',
    origem_material: '', familia: '', somente_pendentes: true,
    agrupar_por_fornecedor: false, situacao_oc: 'TODOS', codigo_motivo_oc: '',
  });

  const resumo = data?.resumo;
  const graficos = data?.graficos;

  return (
    <div className="space-y-4 p-4">
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
        <div><Label className="text-xs">Família</Label><Input value={filters.familia} onChange={(e) => setFilters(f => ({ ...f, familia: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Origem</Label><Input value={filters.origem_material} onChange={(e) => setFilters(f => ({ ...f, origem_material: e.target.value }))} className="h-8 text-xs" /></div>
        <div>
          <Label className="text-xs">Situação da OC</Label>
          <Select value={filters.situacao_oc} onValueChange={(v) => setFilters(f => ({ ...f, situacao_oc: v }))}>
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
        <div><Label className="text-xs">Motivo Desconto (CodMot)</Label><Input value={filters.codigo_motivo_oc} onChange={(e) => setFilters(f => ({ ...f, codigo_motivo_oc: e.target.value }))} placeholder="Ex.: 19" className="h-8 text-xs" /></div>
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
      </FilterPanel>

      {data && (
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="lista">Lista Detalhada</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {resumo && (
              <>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Indicadores Financeiros</h3>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                    <KPICard title="Total OCs" value={resumo.total_ocs} icon={<ShoppingCart className="h-5 w-5" />} tooltip="Quantidade total de Ordens de Compra" details={graficos?.situacoes?.map((s: any) => ({ label: situacaoLabel(s.situacao_oc), value: String(s.quantidade_itens) }))} />
                    <KPICard title="Valor Bruto" value={formatCurrency(resumo.valor_bruto_total)} variant="default" icon={<DollarSign className="h-5 w-5" />} tooltip="Soma dos valores brutos antes de descontos" />
                    <KPICard title="Desconto Total" value={formatCurrency(resumo.valor_desconto_total)} variant="warning" icon={<Percent className="h-5 w-5" />} tooltip="Soma de todos os descontos aplicados" />
                    <KPICard title="Valor Líquido" value={formatCurrency(resumo.valor_liquido_total)} variant="info" icon={<TrendingUp className="h-5 w-5" />} tooltip="Valor bruto menos descontos" details={[{ label: 'Valor Bruto', value: formatCurrency(resumo.valor_bruto_total) }, { label: 'Descontos', value: formatCurrency(resumo.valor_desconto_total) }, { label: 'Valor Líquido', value: formatCurrency(resumo.valor_liquido_total) }]} />
                    <KPICard title="Impostos Totais" value={formatCurrency(resumo.impostos_totais)} variant="default" icon={<Receipt className="h-5 w-5" />} tooltip="Soma de IPI, ICMS, ISS e outros impostos" />
                    <KPICard title="Fornecedores" value={resumo.total_fornecedores} variant="default" icon={<Layers className="h-5 w-5" />} tooltip="Quantidade de fornecedores distintos" />
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Indicadores de Pendência</h3>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                    <KPICard title="Valor Pendente" value={formatCurrency(resumo.valor_pendente_total)} variant="warning" icon={<Clock className="h-5 w-5" />} tooltip="Valor total de itens ainda não recebidos" />
                    <KPICard title="Itens Pendentes" value={resumo.itens_pendentes} variant="warning" icon={<Package className="h-5 w-5" />} tooltip="Quantidade de itens com saldo pendente de recebimento" />
                    <KPICard title="Itens Atrasados" value={resumo.itens_atrasados} variant="destructive" icon={<AlertTriangle className="h-5 w-5" />} tooltip="Itens cuja data de entrega já passou e ainda possuem saldo" />
                    <KPICard title="OCs Atrasadas" value={resumo.ocs_atrasadas ?? '-'} variant="destructive" icon={<AlertTriangle className="h-5 w-5" />} tooltip="Quantidade de OCs com pelo menos um item atrasado" />
                    <KPICard title="Maior Atraso" value={`${resumo.maior_atraso_dias} dias`} variant="destructive" icon={<Clock className="h-5 w-5" />} tooltip="Maior número de dias de atraso entre todos os itens pendentes" />
                    <KPICard title="Ticket Médio/Item" value={formatCurrency(resumo.ticket_medio_item)} variant="info" icon={<TrendingUp className="h-5 w-5" />} tooltip="Valor líquido total dividido pelo número de itens" />
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contagem de Itens</h3>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                    <KPICard title="Total Linhas" value={resumo.total_linhas ?? '-'} icon={<FileText className="h-5 w-5" />} tooltip="Total de linhas de itens nas ordens de compra" />
                    <KPICard title="Itens Produto" value={resumo.itens_produto ?? '-'} variant="info" icon={<Package className="h-5 w-5" />} tooltip="Quantidade de itens classificados como Produto" details={resumo.total_linhas ? [{ label: 'Produtos', value: `${resumo.itens_produto ?? 0} (${((resumo.itens_produto ?? 0) / resumo.total_linhas * 100).toFixed(1)}%)` }, { label: 'Serviços', value: `${resumo.itens_servico ?? 0} (${((resumo.itens_servico ?? 0) / resumo.total_linhas * 100).toFixed(1)}%)` }] : undefined} />
                    <KPICard title="Itens Serviço" value={resumo.itens_servico ?? '-'} variant="success" icon={<Layers className="h-5 w-5" />} tooltip="Quantidade de itens classificados como Serviço" />
                  </div>
                </div>
              </>
            )}

            {graficos && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Análises Gráficas</h3>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {graficos.top_fornecedores?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Top Fornecedores (Valor Líquido)</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={graficos.top_fornecedores} layout="vertical">
                          <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <YAxis type="category" dataKey="fantasia_fornecedor" width={120} className="text-xs" tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor_liquido_total" fill="hsl(215,70%,45%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {graficos.situacoes?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Situação das OCs</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={graficos.situacoes.map((s: any) => ({ ...s, name: situacaoLabel(s.situacao_oc) }))} dataKey="quantidade_itens" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                            {graficos.situacoes.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {graficos.tipos?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Tipos de Item</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie data={graficos.tipos} dataKey="quantidade_itens" nameKey="tipo_item" cx="50%" cy="50%" outerRadius={80} label>
                            {graficos.tipos.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {graficos.entregas_por_mes?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Entregas por Mês</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={graficos.entregas_por_mes}>
                          <XAxis dataKey="periodo_entrega" className="text-xs" tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor_pendente_total" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {graficos.familias?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Top Famílias</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={graficos.familias} layout="vertical">
                          <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <YAxis type="category" dataKey="codigo_familia" width={100} className="text-xs" tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor_liquido_total" fill="hsl(142,70%,40%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {graficos.origens?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Origens</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={graficos.origens} layout="vertical">
                          <XAxis type="number" className="text-xs" />
                          <YAxis type="category" dataKey="origem" width={100} className="text-xs" tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="quantidade_itens" fill="hsl(280,60%,50%)" radius={[0, 4, 4, 0]} />
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
