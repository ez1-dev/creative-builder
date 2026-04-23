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
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { useAiPageContext } from '@/hooks/useAiPageContext';

const statusBadge = (status: string) => {
  switch (status) {
    case 'OK':
      return <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px]">OK</Badge>;
    case 'SEM_EDOCS':
      return <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] text-[10px]">Sem EDocs</Badge>;
    case 'ERRO_EDOCS':
      return <Badge className="bg-destructive text-destructive-foreground text-[10px]">Erro EDocs</Badge>;
    case 'DIVERGENCIA_SITUACAO':
      return <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] text-[10px]">Diverg. Situação</Badge>;
    case 'CHAVE_DIVERGENTE':
      return <Badge variant="outline" className="text-[10px] border-[hsl(var(--warning))] text-[hsl(var(--warning))]">Chave Diverg.</Badge>;
    case 'NUMERO_DIVERGENTE':
      return <Badge variant="outline" className="text-[10px] border-[hsl(var(--warning))] text-[hsl(var(--warning))]">Nº Diverg.</Badge>;
    case 'SERIE_DIVERGENTE':
      return <Badge variant="outline" className="text-[10px] border-[hsl(var(--warning))] text-[hsl(var(--warning))]">Série Diverg.</Badge>;
    default:
      return <Badge variant="secondary" className="text-[10px]">{status || '-'}</Badge>;
  }
};

const columns: Column<any>[] = [
  { key: 'tipo_nota', header: 'Tipo' },
  { key: 'codigo_empresa', header: 'Empresa' },
  { key: 'codigo_filial', header: 'Filial' },
  { key: 'numero_nf', header: 'Nº NF' },
  { key: 'serie_nf', header: 'Série' },
  { key: 'situacao_erp', header: 'Sit. ERP' },
  { key: 'situacao_edocs', header: 'Sit. EDocs' },
  { key: 'status_conciliacao', header: 'Status', render: (v) => statusBadge(v) },
  { key: 'data_documento', header: 'Dt. Documento' },
  { key: 'numero_lote', header: 'Lote' },
  { key: 'codigo_pessoa', header: 'Cód. Pessoa' },
  { key: 'nome_pessoa', header: 'Nome Pessoa' },
  { key: 'valor_liquido', header: 'Vlr. Líquido', render: (v) => formatCurrency(v) },
  { key: 'valor_final', header: 'Vlr. Final', render: (v) => formatCurrency(v) },
  { key: 'chave_nota', header: 'Chave NF' },
  { key: 'mensagem_edocs', header: 'Msg EDocs' },
  { key: 'id_requisicao_edocs', header: 'ID Req. EDocs' },
  { key: 'descricao_motivo_edocs', header: 'Motivo EDocs' },
  { key: 'observacao_conciliacao', header: 'Observação' },
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

const initialFilters = {
  tipo_nota: '',
  data_ini: '',
  data_fim: '',
  numero_nf: '',
  serie_nf: '',
  codigo_filial: '',
  codigo_pessoa: '',
  nome_pessoa: '',
  numero_lote: '',
  situacao_erp: '',
  situacao_edocs: '',
  status_conciliacao: '',
  somente_divergencia: false,
  somente_sem_edocs: false,
  somente_com_erro: false,
};

export default function ConciliacaoEdocsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState<ConciliacaoEdocsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);

  const erpReady = useErpReady();

  const buildParams = (page = 1) => {
    const params: Record<string, any> = { pagina: page, tamanho_pagina: 100 };
    if (filters.tipo_nota && filters.tipo_nota !== 'TODOS') params.tipo_nota = filters.tipo_nota;
    if (filters.data_ini) params.data_ini = filters.data_ini;
    if (filters.data_fim) params.data_fim = filters.data_fim;
    if (filters.numero_nf) params.numero_nf = filters.numero_nf;
    if (filters.serie_nf) params.serie_nf = filters.serie_nf;
    if (filters.codigo_filial) params.codigo_filial = filters.codigo_filial;
    if (filters.codigo_pessoa) params.codigo_pessoa = filters.codigo_pessoa;
    if (filters.nome_pessoa) params.nome_pessoa = filters.nome_pessoa;
    if (filters.numero_lote) params.numero_lote = filters.numero_lote;
    if (filters.situacao_erp) params.situacao_erp = filters.situacao_erp;
    if (filters.situacao_edocs) params.situacao_edocs = filters.situacao_edocs;
    if (filters.status_conciliacao && filters.status_conciliacao !== 'TODOS') params.status_conciliacao = filters.status_conciliacao;
    if (filters.somente_divergencia) params.somente_divergencia = true;
    if (filters.somente_sem_edocs) params.somente_sem_edocs = true;
    if (filters.somente_com_erro) params.somente_com_erro = true;
    return params;
  };

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const result = await api.get<ConciliacaoEdocsResponse>('/api/notas-edocs-conciliacao', buildParams(page));
      setData(result);
      setPagina(page);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao consultar conciliação ERP x EDocs.');
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady]);

  const clearFilters = () => { setFilters(initialFilters); setData(null); setPagina(1); };

  const resumo = data?.resumo;
  const exportParams = buildParams(1);
  delete exportParams.pagina;
  delete exportParams.tamanho_pagina;

  useAiPageContext({
    title: 'Conciliação ERP x EDocs',
    filters,
    kpis: resumo ? {
      'Total Registros': resumo.total_registros,
      'OK': resumo.total_ok,
      'Sem EDocs': resumo.total_sem_edocs,
      'Com Erro': resumo.total_com_erro,
      'Diverg. Situação': resumo.total_divergencia_situacao,
    } : undefined,
    summary: data
      ? `${data.total_registros} notas conciliadas; página ${pagina}/${data.total_paginas}`
      : undefined,
  });


  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Conciliação ERP x EDocs"
        description="Comparação de situação entre ERP Senior e EDocs"
        actions={
          <ExportButton endpoint="/api/export/notas-edocs-conciliacao" params={{ ...exportParams, formato: 'xlsx' }} label="Exportar Excel" />
        }
      />

      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div>
          <Label className="text-xs">Tipo Nota</Label>
          <Select value={filters.tipo_nota || 'TODOS'} onValueChange={(v) => setFilters(f => ({ ...f, tipo_nota: v === 'TODOS' ? '' : v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="ENTRADA">Entrada</SelectItem>
              <SelectItem value="SAIDA">Saída</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DateFilter label="Período Inicial" value={filters.data_ini} onChange={(v) => setFilters(f => ({ ...f, data_ini: v }))} />
        <DateFilter label="Período Final" value={filters.data_fim} onChange={(v) => setFilters(f => ({ ...f, data_fim: v }))} />
        <div><Label className="text-xs">Nº NF</Label><Input value={filters.numero_nf} onChange={(e) => setFilters(f => ({ ...f, numero_nf: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Série</Label><Input value={filters.serie_nf} onChange={(e) => setFilters(f => ({ ...f, serie_nf: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Filial</Label><Input value={filters.codigo_filial} onChange={(e) => setFilters(f => ({ ...f, codigo_filial: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Cód. Pessoa</Label><Input value={filters.codigo_pessoa} onChange={(e) => setFilters(f => ({ ...f, codigo_pessoa: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Nome Pessoa</Label><Input value={filters.nome_pessoa} onChange={(e) => setFilters(f => ({ ...f, nome_pessoa: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Nº Lote</Label><Input value={filters.numero_lote} onChange={(e) => setFilters(f => ({ ...f, numero_lote: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Situação ERP</Label><Input value={filters.situacao_erp} onChange={(e) => setFilters(f => ({ ...f, situacao_erp: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Situação EDocs</Label><Input value={filters.situacao_edocs} onChange={(e) => setFilters(f => ({ ...f, situacao_edocs: e.target.value }))} className="h-8 text-xs" /></div>
        <div>
          <Label className="text-xs">Status Conciliação</Label>
          <Select value={filters.status_conciliacao || 'TODOS'} onValueChange={(v) => setFilters(f => ({ ...f, status_conciliacao: v === 'TODOS' ? '' : v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="OK">OK</SelectItem>
              <SelectItem value="SEM_EDOCS">Sem EDocs</SelectItem>
              <SelectItem value="ERRO_EDOCS">Erro EDocs</SelectItem>
              <SelectItem value="DIVERGENCIA_SITUACAO">Diverg. Situação</SelectItem>
              <SelectItem value="CHAVE_DIVERGENTE">Chave Divergente</SelectItem>
              <SelectItem value="NUMERO_DIVERGENTE">Número Divergente</SelectItem>
              <SelectItem value="SERIE_DIVERGENTE">Série Divergente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-4 col-span-full">
          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={filters.somente_divergencia} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_divergencia: !!v }))} />
            Somente divergências
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={filters.somente_sem_edocs} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_sem_edocs: !!v }))} />
            Somente sem EDocs
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={filters.somente_com_erro} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_com_erro: !!v }))} />
            Somente com erro
          </label>
        </div>
      </FilterPanel>

      {resumo && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <KPICard title="Total Registros" value={resumo.total_registros} />
          <KPICard title="OK" value={resumo.total_ok} variant="success" />
          <KPICard title="Sem EDocs" value={resumo.total_sem_edocs} variant="warning" />
          <KPICard title="Com Erro" value={resumo.total_com_erro} variant="destructive" />
          <KPICard title="Diverg. Situação" value={resumo.total_divergencia_situacao} variant="warning" />
        </div>
      )}

      <DataTable columns={columns} data={data?.dados || []} loading={loading} />
      {data && <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />}
    </div>
  );
}
