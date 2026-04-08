import { useState, useCallback } from 'react';
import { api, AuditoriaResponse } from '@/lib/api';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const statusBadge = (status: string) => {
  switch (status) {
    case 'Ok': return <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px]">Ok</Badge>;
    case 'Parcial': return <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] text-[10px]">Parcial</Badge>;
    case 'Divergente': return <Badge className="bg-destructive text-destructive-foreground text-[10px]">Divergente</Badge>;
    case 'Vazio': return <Badge variant="outline" className="text-[10px]">Vazio</Badge>;
    default: return <Badge variant="secondary" className="text-[10px]">{status || '-'}</Badge>;
  }
};

const columns: Column<any>[] = [
  { key: 'codigo', header: 'Código' },
  { key: 'descricao', header: 'Descrição' },
  { key: 'familia', header: 'Família' },
  { key: 'origem_produto', header: 'Origem' },
  { key: 'tipo_produto_descricao', header: 'Tipo' },
  { key: 'ncm_produto', header: 'NCM Prod.' },
  { key: 'ncm_familia', header: 'NCM Família' },
  { key: 'cst_icms', header: 'CST ICMS' },
  { key: 'cod_str_efetivo', header: 'Sit. Trib.' },
  { key: 'status_ncm', header: 'Status NCM', render: (v) => statusBadge(v) },
  { key: 'status_cst', header: 'Status CST', render: (v) => statusBadge(v) },
  { key: 'status_geral', header: 'Status Geral', render: (v) => statusBadge(v) },
];

export default function AuditoriaTributariaPage() {
  const [filters, setFilters] = useState({
    codpro: '', despro: '', codfam: '', codori: '', ncm: '', codstr: '', cst: '', tns: '',
    somente_divergencia: false, somente_ncm_vazio: false, somente_cst_vazio: false, somente_cclass: false,
  });
  const [data, setData] = useState<AuditoriaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);

  const erpReady = useErpReady();
  const { familias, origens, loading: optionsLoading } = useErpOptions(erpReady, data?.dados, { familiaKey: 'familia', origemKey: 'origem_produto' });

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<AuditoriaResponse>('/api/auditoria-tributaria', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady]);

  const clearFilters = () => { setFilters({
    codpro: '', despro: '', codfam: '', codori: '', ncm: '', codstr: '', cst: '', tns: '',
    somente_divergencia: false, somente_ncm_vazio: false, somente_cst_vazio: false, somente_cclass: false,
  }); setData(null); setPagina(1); };

  const resumo = data?.resumo;

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Auditoria Tributária"
        description="Auditoria de NCM, CST e situação tributária dos produtos"
        actions={
          <div className="flex gap-2">
            <ExportButton endpoint="/api/export/auditoria-tributaria" params={{ ...filters, formato: 'xlsx' }} label="Excel" />
            <ExportButton endpoint="/api/export/auditoria-tributaria-csv" params={filters} label="CSV" />
          </div>
        }
      />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Código</Label><Input value={filters.codpro} onChange={(e) => setFilters(f => ({ ...f, codpro: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Descrição</Label><Input value={filters.despro} onChange={(e) => setFilters(f => ({ ...f, despro: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Família</Label><ComboboxFilter value={filters.codfam} onChange={(v) => setFilters(f => ({ ...f, codfam: v }))} options={familias} placeholder="Família" loading={optionsLoading} /></div>
        <div><Label className="text-xs">Origem</Label><ComboboxFilter value={filters.codori} onChange={(v) => setFilters(f => ({ ...f, codori: v }))} options={origens} placeholder="Origem" loading={optionsLoading} /></div>
        <div><Label className="text-xs">NCM</Label><Input value={filters.ncm} onChange={(e) => setFilters(f => ({ ...f, ncm: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Sit. Tributária</Label><Input value={filters.codstr} onChange={(e) => setFilters(f => ({ ...f, codstr: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">CST</Label><Input value={filters.cst} onChange={(e) => setFilters(f => ({ ...f, cst: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Transação</Label><Input value={filters.tns} onChange={(e) => setFilters(f => ({ ...f, tns: e.target.value }))} className="h-8 text-xs" /></div>
        <div className="flex items-end gap-2 pb-1"><Checkbox id="diverg" checked={filters.somente_divergencia} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_divergencia: !!v }))} /><Label htmlFor="diverg" className="text-xs">Divergências</Label></div>
        <div className="flex items-end gap-2 pb-1"><Checkbox id="ncmv" checked={filters.somente_ncm_vazio} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_ncm_vazio: !!v }))} /><Label htmlFor="ncmv" className="text-xs">NCM vazio</Label></div>
        <div className="flex items-end gap-2 pb-1"><Checkbox id="cstv" checked={filters.somente_cst_vazio} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_cst_vazio: !!v }))} /><Label htmlFor="cstv" className="text-xs">CST vazio</Label></div>
        <div className="flex items-end gap-2 pb-1"><Checkbox id="cclass" checked={filters.somente_cclass} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_cclass: !!v }))} /><Label htmlFor="cclass" className="text-xs">Somente CClass</Label></div>
      </FilterPanel>

      {resumo && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPICard title="Total Produtos" value={resumo.total_registros} />
          <KPICard title="NCM Vazio" value={resumo.total_ncm_vazio} variant="warning" />
          <KPICard title="CST Vazio" value={resumo.total_cst_vazio} variant="warning" />
          <KPICard title="Divergências" value={resumo.total_divergencias} variant="destructive" />
        </div>
      )}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
