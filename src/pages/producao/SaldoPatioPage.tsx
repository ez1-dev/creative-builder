import { useState, useCallback } from 'react';
import { api, PaginatedResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatNumber, formatPercent } from '@/lib/format';
import { toast } from 'sonner';
import { useAiFilters } from '@/hooks/useAiFilters';
import { KPICard } from '@/components/erp/KPICard';
import { Package, ArrowUpFromLine, Warehouse, Truck } from 'lucide-react';

const statusColor = (s: string) => {
  switch (s) {
    case 'TOTALMENTE EXPEDIDO': return 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]';
    case 'EXPEDIÇÃO PARCIAL': return 'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]';
    case 'PRODUZIDO / EM PÁTIO': return 'bg-destructive text-destructive-foreground';
    case 'EM PRODUÇÃO / SEM ENTRADA ESTOQUE': return 'bg-primary text-primary-foreground';
    case 'AGUARDANDO PRODUÇÃO': return 'bg-muted text-muted-foreground';
    case 'SEM MOVIMENTO': return 'bg-muted text-muted-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
};

const columns: Column<any>[] = [
  { key: 'numero_projeto', header: 'Projeto' },
  { key: 'numero_desenho', header: 'Desenho' },
  { key: 'revisao', header: 'Rev.' },
  { key: 'nome_cliente', header: 'Cliente' },
  { key: 'kg_previsto_projeto', header: 'Kg Previsto', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_produzido', header: 'Kg Produzido', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_expedido', header: 'Kg Expedido', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'kg_patio', header: 'Kg Pátio', align: 'right', render: (v) => formatNumber(v, 1) },
  { key: 'perc_produzido_sobre_previsto', header: '% Prod.', align: 'right', render: (v) => formatPercent(v) },
  { key: 'perc_expedido_sobre_previsto', header: '% Expedido', align: 'right', render: (v) => formatPercent(v) },
  { key: 'perc_expedido_sobre_produzido', header: '% Exp/Prod', align: 'right', render: (v) => formatPercent(v) },
  {
    key: 'status_geral', header: 'Status',
    render: (v) => <Badge className={`text-[10px] ${statusColor(v)}`}>{v}</Badge>,
  },
];

export default function SaldoPatioPage() {
  const [filters, setFilters] = useState({
    numero_projeto: '', numero_desenho: '', revisao: '', cliente: '', cidade: '',
  });
  const [data, setData] = useState<PaginatedResponse<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const erpReady = useErpReady();

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<PaginatedResponse<any>>('/api/producao/patio', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filters, erpReady]);

  useAiFilters('producao-patio', setFilters, () => search(1));
  const clearFilters = () => {
    setFilters({ numero_projeto: '', numero_desenho: '', revisao: '', cliente: '', cidade: '' });
    setData(null); setPagina(1);
  };

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader title="Saldo em Pátio" description="Saldo entre produzido e expedido" actions={<ExportButton endpoint="/api/export/producao-patio" params={filters} />} />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.numero_projeto} onChange={(e) => setFilters(f => ({ ...f, numero_projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Desenho</Label><Input value={filters.numero_desenho} onChange={(e) => setFilters(f => ({ ...f, numero_desenho: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Revisão</Label><Input value={filters.revisao} onChange={(e) => setFilters(f => ({ ...f, revisao: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cliente</Label><Input value={filters.cliente} onChange={(e) => setFilters(f => ({ ...f, cliente: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cidade</Label><Input value={filters.cidade} onChange={(e) => setFilters(f => ({ ...f, cidade: e.target.value }))} className="h-8 text-xs" /></div>
      </FilterPanel>

      {data && (() => {
        const dados = data.dados || [];
        const totalRegistros = dados.length;
        const kgProduzido = dados.reduce((s: number, r: any) => s + (Number(r.kg_produzido) || 0), 0);
        const kgExpedido = dados.reduce((s: number, r: any) => s + (Number(r.kg_expedido) || 0), 0);
        const kgPatio = dados.reduce((s: number, r: any) => s + (Number(r.kg_patio) || 0), 0);
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard title="Total Registros" value={formatNumber(totalRegistros, 0)} subtitle="na página atual" icon={<Package className="h-5 w-5" />} index={0} />
            <KPICard title="Kg Produzido" value={`${formatNumber(kgProduzido, 1)} Kg`} subtitle="na página atual" icon={<ArrowUpFromLine className="h-5 w-5" />} variant="info" index={1} />
            <KPICard title="Kg Expedido" value={`${formatNumber(kgExpedido, 1)} Kg`} subtitle="na página atual" icon={<Truck className="h-5 w-5" />} variant="success" index={2} />
            <KPICard title="Kg em Pátio" value={`${formatNumber(kgPatio, 1)} Kg`} subtitle="na página atual" icon={<Warehouse className="h-5 w-5" />} variant="warning" index={3} />
          </div>
        );
      })()}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
