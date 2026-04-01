import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { api, ConciliacaoEdocsResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { KPICard } from '@/components/erp/KPICard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

const statusBadge = (status: string) => {
  switch (status) {
    case 'OK': return <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px]">OK</Badge>;
    case 'SEM_EDOCS': return <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] text-[10px]">Sem EDocs</Badge>;
    case 'SEM_ERP': return <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] text-[10px]">Sem ERP</Badge>;
    case 'DIVERGENTE_VALOR': return <Badge className="bg-destructive text-destructive-foreground text-[10px]">Diverg. Valor</Badge>;
    case 'DIVERGENTE_SITUACAO': return <Badge className="bg-destructive text-destructive-foreground text-[10px]">Diverg. Situação</Badge>;
    default: return <Badge variant="secondary" className="text-[10px]">{status || '-'}</Badge>;
  }
};

const columns: Column<any>[] = [
  { key: 'empresa', header: 'Empresa' },
  { key: 'filial', header: 'Filial' },
  { key: 'numero_nf', header: 'Nº NF' },
  { key: 'serie', header: 'Série' },
  { key: 'fornecedor', header: 'Fornecedor' },
  { key: 'cnpj', header: 'CNPJ' },
  { key: 'data_emissao', header: 'Dt. Emissão' },
  { key: 'data_entrada', header: 'Dt. Entrada' },
  { key: 'valor_erp', header: 'Valor ERP', render: (v) => formatCurrency(v) },
  { key: 'valor_edocs', header: 'Valor EDocs', render: (v) => formatCurrency(v) },
  { key: 'situacao_erp', header: 'Sit. ERP' },
  { key: 'situacao_edocs', header: 'Sit. EDocs' },
  { key: 'status_conciliacao', header: 'Status', render: (v) => statusBadge(v) },
];

function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const date = value ? new Date(value + 'T00:00:00') : undefined;
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full h-8 text-xs justify-start", !date && "text-muted-foreground")}>
            <CalendarIcon className="mr-1 h-3 w-3" />
            {date ? format(date, 'dd/MM/yyyy') : 'Selecionar'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => onChange(d ? format(d, 'yyyy-MM-dd') : '')}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function ConciliacaoEdocsPage() {
  const [filters, setFilters] = useState({
    data_inicio: '', data_fim: '',
    empresa: '', filial: '', fornecedor: '', cnpj: '',
    numero_nf: '', serie: '', chave_nf: '',
    status_conciliacao: '',
  });
  const [data, setData] = useState<ConciliacaoEdocsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);

  const erpReady = useErpReady();

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<ConciliacaoEdocsResponse>('/api/conciliacao-edocs', { ...filters, pagina: page, tamanho_pagina: 100 });
      setData(result);
      setPagina(page);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady]);

  const clearFilters = () => setFilters({
    data_inicio: '', data_fim: '',
    empresa: '', filial: '', fornecedor: '', cnpj: '',
    numero_nf: '', serie: '', chave_nf: '',
    status_conciliacao: '',
  });

  const resumo = data?.resumo;

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Conciliação ERP x EDocs"
        description="Comparação entre registros do ERP e documentos eletrônicos"
        actions={
          <div className="flex gap-2">
            <ExportButton endpoint="/api/export/conciliacao-edocs" params={{ ...filters, formato: 'xlsx' }} label="Excel" />
            <ExportButton endpoint="/api/export/conciliacao-edocs-csv" params={filters} label="CSV" />
          </div>
        }
      />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <DateFilter label="Data Início" value={filters.data_inicio} onChange={(v) => setFilters(f => ({ ...f, data_inicio: v }))} />
        <DateFilter label="Data Fim" value={filters.data_fim} onChange={(v) => setFilters(f => ({ ...f, data_fim: v }))} />
        <div><Label className="text-xs">Empresa</Label><Input value={filters.empresa} onChange={(e) => setFilters(f => ({ ...f, empresa: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Filial</Label><Input value={filters.filial} onChange={(e) => setFilters(f => ({ ...f, filial: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Fornecedor</Label><Input value={filters.fornecedor} onChange={(e) => setFilters(f => ({ ...f, fornecedor: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">CNPJ</Label><Input value={filters.cnpj} onChange={(e) => setFilters(f => ({ ...f, cnpj: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Nº NF</Label><Input value={filters.numero_nf} onChange={(e) => setFilters(f => ({ ...f, numero_nf: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Série</Label><Input value={filters.serie} onChange={(e) => setFilters(f => ({ ...f, serie: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Chave NF</Label><Input value={filters.chave_nf} onChange={(e) => setFilters(f => ({ ...f, chave_nf: e.target.value }))} className="h-8 text-xs" /></div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={filters.status_conciliacao} onValueChange={(v) => setFilters(f => ({ ...f, status_conciliacao: v === 'TODOS' ? '' : v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="OK">OK</SelectItem>
              <SelectItem value="SEM_EDOCS">Sem EDocs</SelectItem>
              <SelectItem value="SEM_ERP">Sem ERP</SelectItem>
              <SelectItem value="DIVERGENTE_VALOR">Diverg. Valor</SelectItem>
              <SelectItem value="DIVERGENTE_SITUACAO">Diverg. Situação</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FilterPanel>

      {resumo && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <KPICard title="Total Registros" value={resumo.total_registros} />
          <KPICard title="OK" value={resumo.total_ok} variant="success" />
          <KPICard title="Sem EDocs" value={resumo.total_sem_edocs} variant="warning" />
          <KPICard title="Sem ERP" value={resumo.total_sem_erp} variant="warning" />
          <KPICard title="Divergentes" value={resumo.total_divergentes} variant="destructive" />
        </div>
      )}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
