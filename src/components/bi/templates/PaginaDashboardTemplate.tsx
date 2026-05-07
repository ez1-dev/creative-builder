/**
 * TEMPLATE DE PÁGINA DASHBOARD usando a Biblioteca BI.
 *
 * Copie este arquivo como ponto de partida para uma nova página.
 * Substitua os mocks por chamadas reais (preferencialmente via useDashboardData).
 *
 * Veja docs/biblioteca-bi-guia-uso.md para o guia completo.
 */
import { useState } from 'react';
import { DollarSign, TrendingUp, Package } from 'lucide-react';
import {
  DashboardPage, DashboardHeader,
  KpiGrid, KpiCard,
  ChartGrid, BarChartCard, DonutChartCard, RankingChartCard,
  FilterBar, SelectFilter, SearchFilter,
  DataTableBI, StatusBadge,
  type Column, type BiStatus,
  formatCurrency,
} from '@/components/bi';

interface Linha {
  id: number;
  descricao: string;
  valor: number;
  status: BiStatus;
}

export function PaginaDashboardTemplate() {
  // ====== Filtros ======
  const [tipo, setTipo] = useState('all');
  const [busca, setBusca] = useState('');

  // ====== Dados (substituir pelos seus hooks reais) ======
  // Recomendado: const { dashboard, loading, dados, pagina, setPagina, ... } = useDashboardData({...});
  const dashboard = {
    kpis: { total: 1820000, recebido: 1530000, pendente: 290000 },
    porMes: [
      { label: 'Jan', valor: 280000 },
      { label: 'Fev', valor: 340000 },
      { label: 'Mar', valor: 420000 },
    ],
    porTipo: [
      { label: 'A', valor: 800000 },
      { label: 'B', valor: 620000 },
      { label: 'C', valor: 400000 },
    ],
    topItens: [
      { label: 'Item X', valor: 540000 },
      { label: 'Item Y', valor: 320000 },
    ],
  };
  const loading = false;
  const dados: Linha[] = [
    { id: 1, descricao: 'Linha exemplo', valor: 1200, status: 'recebido' },
  ];

  const cols: Column<Linha>[] = [
    { key: 'id', header: '#', sortable: true },
    { key: 'descricao', header: 'Descrição' },
    { key: 'valor', header: 'Valor', align: 'right', render: (_v, r) => formatCurrency(r.valor) },
    { key: 'status', header: 'Status', render: (_v, r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <DashboardPage>
      <DashboardHeader
        title="Título da Página"
        description="Descrição curta do que esta página mostra"
      />

      <FilterBar>
        <SelectFilter
          label="Tipo"
          value={tipo}
          onChange={setTipo}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'a', label: 'Tipo A' },
          ]}
        />
        <SearchFilter value={busca} onChange={setBusca} placeholder="Buscar..." />
      </FilterBar>

      {/* KPIs SEMPRE do dashboard global — nunca calcular de dados.reduce() */}
      <KpiGrid cols={4}>
        <KpiCard title="Total" value={dashboard?.kpis.total ?? 0} format="currency"
          variant="info" icon={<DollarSign className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Recebido" value={dashboard?.kpis.recebido ?? 0} format="currency"
          variant="success" icon={<TrendingUp className="h-4 w-4" />} loading={loading} />
        <KpiCard title="Pendente" value={dashboard?.kpis.pendente ?? 0} format="currency"
          variant="warning" icon={<Package className="h-4 w-4" />} loading={loading} />
        <KpiCard title="% Recebido" value={84.1} format="percent" variant="info" loading={loading} />
      </KpiGrid>

      <ChartGrid>
        <BarChartCard title="Por mês" data={dashboard?.porMes ?? []} loading={loading} />
        <DonutChartCard title="Por tipo" data={dashboard?.porTipo ?? []} loading={loading} />
        <RankingChartCard title="Top itens" data={dashboard?.topItens ?? []} topN={10} loading={loading} />
      </ChartGrid>

      <DataTableBI
        columns={cols}
        data={dados}
        loading={loading}
        pagination={{ pagina: 1, totalPaginas: 1, totalRegistros: dados.length, onPageChange: () => {} }}
      />
    </DashboardPage>
  );
}
