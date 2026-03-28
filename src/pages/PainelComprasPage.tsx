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
import { ShoppingCart, AlertTriangle, TrendingUp, Package } from 'lucide-react';

const COLORS = ['hsl(215,70%,45%)', 'hsl(142,70%,40%)', 'hsl(38,92%,50%)', 'hsl(0,72%,51%)', 'hsl(199,89%,48%)', 'hsl(280,60%,50%)', 'hsl(160,60%,40%)', 'hsl(30,80%,55%)'];

const situacaoLabel = (s: number) => {
  const map: Record<number, string> = { 0: 'Aberta', 1: 'Parcial', 2: 'Recebida', 3: 'Cancelada', 9: 'Encerrada' };
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
    agrupar_por_fornecedor: false, situacao_oc: '', codigo_motivo: '',
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
    agrupar_por_fornecedor: false, situacao_oc: '', codigo_motivo: '',
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
          <Label className="text-xs">Situação OC</Label>
          <Select value={filters.situacao_oc} onValueChange={(v) => setFilters(f => ({ ...f, situacao_oc: v === 'TODAS' ? '' : v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas</SelectItem>
              <SelectItem value="0">Aberta</SelectItem>
              <SelectItem value="1">Parcial</SelectItem>
              <SelectItem value="2">Recebida</SelectItem>
              <SelectItem value="3">Cancelada</SelectItem>
              <SelectItem value="9">Encerrada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Cód. Desconto</Label><Input value={filters.codigo_motivo} onChange={(e) => setFilters(f => ({ ...f, codigo_motivo: e.target.value }))} className="h-8 text-xs" /></div>
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

          <TabsContent value="dashboard" className="space-y-4">
            {resumo && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                <KPICard title="Total OCs" value={resumo.total_ocs} icon={<ShoppingCart className="h-5 w-5" />} />
                <KPICard title="Valor Líquido" value={formatCurrency(resumo.valor_liquido_total)} variant="info" icon={<TrendingUp className="h-5 w-5" />} />
                <KPICard title="Itens Pendentes" value={resumo.itens_pendentes} variant="warning" icon={<Package className="h-5 w-5" />} />
                <KPICard title="Itens Atrasados" value={resumo.itens_atrasados} variant="destructive" icon={<AlertTriangle className="h-5 w-5" />} />
                <KPICard title="Fornecedores" value={resumo.total_fornecedores} variant="default" />
                <KPICard title="Maior Atraso" value={`${resumo.maior_atraso_dias} dias`} variant="destructive" />
              </div>
            )}

            {graficos && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
