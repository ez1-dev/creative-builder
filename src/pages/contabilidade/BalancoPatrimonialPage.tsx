import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { KpiGroup } from '@/components/erp/KpiGroup';
import { KPICard } from '@/components/erp/KPICard';
import { ExportButton } from '@/components/erp/ExportButton';
import { DataTableBI, Column } from '@/components/bi/tables/DataTableBI';
import { getBalancoPatrimonial, BalancoPatrimonialItem, BalancoPatrimonialFilters } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { Landmark, Scale, Wallet, Hash } from 'lucide-react';

const currentYear = new Date().getFullYear();

export default function BalancoPatrimonialPage() {
  const [filters, setFilters] = useState<BalancoPatrimonialFilters>({
    anomes_ini: `${currentYear}01`,
    anomes_fim: `${currentYear}12`,
    codigo_empresa: '',
    codigo_filial: '',
    conta: '',
    grupo: '',
    subgrupo: '',
  });
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(false);
  const [itens, setItens] = useState<BalancoPatrimonialItem[]>([]);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [totalRegistros, setTotalRegistros] = useState(0);

  const buildParams = (overridePagina?: number): BalancoPatrimonialFilters => ({
    ...filters,
    pagina: overridePagina ?? pagina,
    por_pagina: 100,
  });

  const fetchData = async (overridePagina?: number) => {
    const p = overridePagina ?? 1;
    setLoading(true);
    try {
      const res = await getBalancoPatrimonial({ ...filters, pagina: p, por_pagina: 100 });
      setItens(res.itens ?? []);
      setPagina(res.pagina ?? p);
      setTotalPaginas(res.total_paginas ?? 0);
      setTotalRegistros(res.total_registros ?? (res.itens?.length ?? 0));
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao carregar balanço patrimonial');
      setItens([]);
    } finally {
      setLoading(false);
    }
  };

  const onSearch = () => { setPagina(1); fetchData(1); };
  const onClear = () => {
    setFilters({
      anomes_ini: `${currentYear}01`,
      anomes_fim: `${currentYear}12`,
      codigo_empresa: '', codigo_filial: '', conta: '', grupo: '', subgrupo: '',
    });
    setItens([]); setPagina(1); setTotalPaginas(0); setTotalRegistros(0);
  };

  const kpis = useMemo(() => {
    const sum = (pred: (i: BalancoPatrimonialItem) => boolean) =>
      itens.filter(pred).reduce((acc, i) => acc + (Number(i.saldo) || 0), 0);
    const ativo = sum((i) => /ativo/i.test(String(i.grupo ?? '')));
    const passivo = sum((i) => /passivo/i.test(String(i.grupo ?? '')));
    const pl = sum((i) => /patrim/i.test(String(i.grupo ?? '')));
    const contas = new Set(itens.map((i) => String(i.conta ?? ''))).size;
    return { ativo, passivo, pl, contas };
  }, [itens]);

  const columns: Column<BalancoPatrimonialItem>[] = [
    { key: 'anomes', header: 'Ano/Mês', align: 'center' },
    { key: 'codigo_empresa', header: 'Empresa', align: 'center' },
    { key: 'codigo_filial', header: 'Filial', align: 'center' },
    { key: 'conta', header: 'Conta' },
    { key: 'grupo', header: 'Grupo' },
    { key: 'subgrupo', header: 'Subgrupo' },
    {
      key: 'saldo', header: 'Saldo', align: 'right',
      render: (v) => <span className="font-mono">{formatCurrency(Number(v) || 0)}</span>,
    },
  ];

  const exportParams = buildParams();

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Contabilidade — Balanço Patrimonial"
        description="Consulta da view V_BALANCO_PATRIMONIAL com filtros por período, empresa, filial, conta e grupo."
        actions={
          <ExportButton
            endpoint="/api/export/contabilidade/balanco"
            params={exportParams}
            label="Exportar Excel"
          />
        }
      />

      <FilterPanel onSearch={onSearch} onClear={onClear}>
        <div>
          <Label className="text-xs">Anomes Início (AAAAMM)</Label>
          <Input className="h-8 text-xs" value={String(filters.anomes_ini ?? '')}
            onChange={(e) => setFilters({ ...filters, anomes_ini: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Anomes Fim (AAAAMM)</Label>
          <Input className="h-8 text-xs" value={String(filters.anomes_fim ?? '')}
            onChange={(e) => setFilters({ ...filters, anomes_fim: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Empresa</Label>
          <Input className="h-8 text-xs" value={String(filters.codigo_empresa ?? '')}
            onChange={(e) => setFilters({ ...filters, codigo_empresa: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Filial</Label>
          <Input className="h-8 text-xs" value={String(filters.codigo_filial ?? '')}
            onChange={(e) => setFilters({ ...filters, codigo_filial: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Conta</Label>
          <Input className="h-8 text-xs" value={filters.conta ?? ''}
            onChange={(e) => setFilters({ ...filters, conta: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Grupo</Label>
          <Input className="h-8 text-xs" value={filters.grupo ?? ''}
            onChange={(e) => setFilters({ ...filters, grupo: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Subgrupo</Label>
          <Input className="h-8 text-xs" value={filters.subgrupo ?? ''}
            onChange={(e) => setFilters({ ...filters, subgrupo: e.target.value })} />
        </div>
      </FilterPanel>

      <KpiGroup title="Resumo (página atual)" tone="volume">
        <KPICard title="Total Ativo" value={formatCurrency(kpis.ativo)} icon={<Landmark className="h-4 w-4" />} variant="info" />
        <KPICard title="Total Passivo" value={formatCurrency(kpis.passivo)} icon={<Scale className="h-4 w-4" />} variant="warning" />
        <KPICard title="Patrimônio Líquido" value={formatCurrency(kpis.pl)} icon={<Wallet className="h-4 w-4" />} variant="success" />
        <KPICard title="Contas Distintas" value={String(kpis.contas)} icon={<Hash className="h-4 w-4" />} />
      </KpiGroup>

      <DataTableBI
        columns={columns}
        data={itens}
        loading={loading}
        emptyMessage="Use os filtros e clique em Pesquisar para carregar o balanço."
        pagination={{
          pagina,
          totalPaginas,
          totalRegistros,
          onPageChange: (p) => { setPagina(p); fetchData(p); },
        }}
      />
    </div>
  );
}
