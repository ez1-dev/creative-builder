import { useState } from 'react';
import { DollarSign, ShoppingCart, Package, Percent } from 'lucide-react';
import { DashboardSection, DashboardGrid, ChartGrid } from '../layout/DashboardLayout';
import { FilterBar } from '../filters/FilterBar';
import { DateRangeFilter } from '../filters/DateRangeFilter';
import { SelectFilter } from '../filters/SelectFilter';
import { SearchFilter } from '../filters/SearchFilter';
import { KpiGrid } from '../kpis/KpiGrid';
import { KpiCard } from '../kpis/KpiCard';
import { ComboChartCard } from '../charts/ComboChartCard';
import { DonutChartCard } from '../charts/DonutChartCard';
import { RankingChartCard } from '../charts/RankingChartCard';
import { TreemapChartCard } from '../charts/TreemapChartCard';
import { BrazilMapCard } from '../charts/maps/BrazilMapCard';
import { DrillDownTable } from '../tables/DrillDownTable';

const meses = [
  { label: 'Jan', valor: 1240000, recebido: 980000 },
  { label: 'Fev', valor: 1380000, recebido: 1150000 },
  { label: 'Mar', valor: 1620000, recebido: 1390000 },
  { label: 'Abr', valor: 1490000, recebido: 1230000 },
  { label: 'Mai', valor: 1710000, recebido: 1480000 },
  { label: 'Jun', valor: 1890000, recebido: 1620000 },
];
const tipos = [
  { label: 'Matéria Prima', valor: 4800000 },
  { label: 'Serviços', valor: 1200000 },
  { label: 'Manutenção', valor: 760000 },
  { label: 'Logística', valor: 540000 },
];
const fornecedores = [
  { label: 'Acme Aço', valor: 2180000 },
  { label: 'Metalúrgica Sul', valor: 1740000 },
  { label: 'Insumos Brasil', valor: 1320000 },
  { label: 'Ferro & Cia', valor: 980000 },
  { label: 'Distribuidora XYZ', valor: 740000 },
];
const ufs = [
  { uf: 'SP', valor: 3200000 }, { uf: 'MG', valor: 1800000 }, { uf: 'RS', valor: 1100000 },
  { uf: 'PR', valor: 870000 }, { uf: 'SC', valor: 740000 }, { uf: 'BA', valor: 520000 },
  { uf: 'GO', valor: 410000 }, { uf: 'PE', valor: 320000 },
];
const treemap = [
  { name: 'Aço', value: 2800000 },
  { name: 'Componentes', value: 1900000 },
  { name: 'Tintas', value: 980000 },
  { name: 'Logística', value: 540000 },
  { name: 'Outros', value: 280000 },
];
const drillRows = [
  { tipo: 'Matéria Prima', centro: 'Produção', fornecedor: 'Acme Aço', valor_liquido: 1280000 },
  { tipo: 'Matéria Prima', centro: 'Produção', fornecedor: 'Metalúrgica Sul', valor_liquido: 940000 },
  { tipo: 'Serviços', centro: 'Administrativo', fornecedor: 'TechParts', valor_liquido: 410000 },
  { tipo: 'Logística', centro: 'Expedição', fornecedor: 'Distribuidora XYZ', valor_liquido: 540000 },
];

export function ComprasDashboardTemplate() {
  const [tipo, setTipo] = useState('all');
  const [search, setSearch] = useState('');
  const [start, setStart] = useState('2026-01-01');
  const [end, setEnd] = useState('2026-06-30');

  return (
    <div className="space-y-4">
      <FilterBar>
        <DateRangeFilter startValue={start} endValue={end} onStartChange={setStart} onEndChange={setEnd} />
        <SelectFilter label="Tipo" value={tipo} onChange={setTipo} options={[
          { value: 'all', label: 'Todos' },
          { value: 'mp', label: 'Matéria Prima' },
          { value: 'serv', label: 'Serviços' },
        ]} />
        <SearchFilter value={search} onChange={setSearch} placeholder="Buscar fornecedor/produto..." />
      </FilterBar>

      <KpiGrid cols={4}>
        <KpiCard title="Compras" value={9330000} format="currency" variant="info" icon={<ShoppingCart className="h-4 w-4" />} trend={{ value: 12.4 }} />
        <KpiCard title="Recebido" value={7850000} format="currency" variant="success" icon={<DollarSign className="h-4 w-4" />} trend={{ value: 8.1 }} />
        <KpiCard title="Pendente" value={1480000} format="currency" variant="warning" icon={<Package className="h-4 w-4" />} />
        <KpiCard title="% Recebimento" value={84.1} format="percent" variant="info" icon={<Percent className="h-4 w-4" />} />
      </KpiGrid>

      <ChartGrid>
        <ComboChartCard title="Compras x Recebido (mensal)" data={meses}
          barKey="valor" barLabel="Compras" lineKey="recebido" lineLabel="Recebido" />
        <DonutChartCard title="Tipos de despesa" data={tipos} />
      </ChartGrid>

      <DashboardGrid cols={2}>
        <BrazilMapCard title="Compras por UF" data={ufs} valueFormatter={(v) => `R$ ${(v/1_000_000).toFixed(1)}M`} />
        <RankingChartCard title="Top fornecedores" data={fornecedores} topN={5} />
      </DashboardGrid>

      <TreemapChartCard title="Participação por categoria" data={treemap} />

      <DashboardSection title="Detalhamento drill-down">
        <DrillDownTable
          data={drillRows}
          levels={[
            { key: 'tipo', label: 'Tipo' },
            { key: 'centro', label: 'Centro' },
            { key: 'fornecedor', label: 'Fornecedor' },
          ]}
        />
      </DashboardSection>
    </div>
  );
}
