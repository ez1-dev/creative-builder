import { useCallback, useEffect, useMemo, useState } from 'react';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl, PageSize } from '@/components/erp/PaginationControl';
import { KPICard } from '@/components/erp/KPICard';
import { KpiGroup } from '@/components/erp/KpiGroup';
import { ExportButton } from '@/components/erp/ExportButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  getOpsJatoPeso,
  OpJatoPesoItem,
  OpJatoPesoResponse,
  OpsJatoPesoFilters,
  StatusPesoOp,
} from '@/lib/api';
import { formatNumber, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAiPageContext } from '@/hooks/useAiPageContext';
import { OpsJatoComponentesSheet } from './OpsJatoComponentesSheet';

type StatusPesoFilter = 'TODOS' | 'COM_PESO' | 'SEM_PESO' | 'PARCIAL';

interface FormState {
  data_ini: string;
  data_fim: string;
  origem: string;
  numero_op: string;
  codigo_produto: string;
  situacao_op: string; // '', E, L, A, F, C
  status_peso: StatusPesoFilter;
}

const hojeISO = () => new Date().toISOString().slice(0, 10);
const primeiroDiaMesISO = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

const initialForm: FormState = {
  data_ini: primeiroDiaMesISO(),
  data_fim: hojeISO(),
  origem: '',
  numero_op: '',
  codigo_produto: '',
  situacao_op: '',
  status_peso: 'TODOS',
};

const PAGE_SIZE_OPTIONS: PageSize[] = [50, 100, 200, 500];

const STATUS_PESO_BADGE: Record<string, string> = {
  OK: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-200',
  PESO_ZERO: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-200',
  PESO_PARCIAL: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-200',
  SEM_COMPONENTES_E900CMO: 'bg-muted text-muted-foreground border-border',
  PRODUZIDO_SEM_MODELO: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200',
  CICLO_BOM: 'bg-purple-100 text-red-700 border-red-400 dark:bg-purple-900/40 dark:text-red-200',
  SEM_CONVERSAO_UNIDADE: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200',
};

function StatusPesoBadge({ status }: { status?: StatusPesoOp | string }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const cls = STATUS_PESO_BADGE[status] ?? 'bg-muted text-muted-foreground border-border';
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium', cls)}>
      {status}
    </span>
  );
}

function buildApiFilters(form: FormState, pagina: number, tamanho_pagina: number): OpsJatoPesoFilters {
  return {
    data_ini: form.data_ini || undefined,
    data_fim: form.data_fim || undefined,
    origem: form.origem || undefined,
    numero_op: form.numero_op || undefined,
    codigo_produto: form.codigo_produto || undefined,
    situacao_op: form.situacao_op || undefined,
    somente_com_peso: form.status_peso === 'COM_PESO' || undefined,
    somente_sem_peso: form.status_peso === 'SEM_PESO' || undefined,
    somente_peso_parcial: form.status_peso === 'PARCIAL' || undefined,
    pagina,
    tamanho_pagina,
    usar_multinivel: true,
  };
}

export function OpsJatoPesoTab() {
  const erpReady = useErpReady();
  const [form, setForm] = useState<FormState>(initialForm);
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState<PageSize>(100);
  const [data, setData] = useState<OpJatoPesoResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [opAberta, setOpAberta] = useState<OpJatoPesoItem | null>(null);
  const [drawerAberto, setDrawerAberto] = useState(false);

  const buscar = useCallback(async (page = 1) => {
    if (!erpReady) {
      toast.error('Conexão ERP não disponível.', { id: 'erp-not-ready-jato' });
      return;
    }
    setLoading(true);
    try {
      const ts = typeof tamanhoPagina === 'number' ? tamanhoPagina : 100;
      const result = await getOpsJatoPeso(buildApiFilters(form, page, ts));
      setData(result);
      setPagina(page);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao carregar OPs Pintura/Jato', { id: 'err-ops-jato' });
    } finally {
      setLoading(false);
    }
  }, [erpReady, form, tamanhoPagina]);

  useEffect(() => {
    // recarrega quando muda tamanho de página (mantendo a página 1)
    if (data) buscar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tamanhoPagina]);

  const limpar = () => {
    setForm(initialForm);
    setData(null);
    setPagina(1);
  };

  const resumo = data?.resumo ?? {};
  const dados = data?.dados ?? [];

  useAiPageContext({
    title: 'Auditoria Apontamento Genius — OPs Pintura/Jato',
    filters: form,
    kpis: {
      'Total OPs': resumo.total_ops ?? data?.total_registros ?? 0,
      'Peso Multinível (kg)': resumo.peso_total_kg_multinivel ?? 0,
      'OPs com Peso': resumo.ops_com_peso ?? 0,
      'OPs sem Peso': resumo.ops_sem_peso ?? 0,
      'OPs Peso Parcial': resumo.ops_peso_parcial ?? 0,
      'OPs com Ciclo': resumo.ops_com_ciclo ?? 0,
      'OPs sem Componentes': resumo.ops_sem_componentes ?? 0,
    },
    summary: data
      ? `${data.total_registros ?? dados.length} OPs Genius com passagem por JATO/Pintura`
      : undefined,
  });

  const abrirComponentes = useCallback((row: OpJatoPesoItem) => {
    setOpAberta(row);
    setDrawerAberto(true);
  }, []);

  const columns: Column<OpJatoPesoItem>[] = useMemo(() => [
    { key: 'origem', header: 'Origem', align: 'center', render: (v) => v ?? '—' },
    {
      key: 'numero_op', header: 'Número OP',
      render: (v) => <span className="font-mono text-xs font-medium">{v ?? '—'}</span>,
    },
    {
      key: 'codigo_produto', header: 'Cód. Produto',
      render: (v) => <span className="font-mono text-xs">{v ?? '—'}</span>,
    },
    { key: 'descricao_produto', header: 'Descrição Produto' },
    {
      key: 'situacao_op', header: 'Sit.', align: 'center',
      render: (v) => v ? <Badge variant="outline" className="text-[10px]">{v}</Badge> : '—',
    },
    {
      key: 'data_jato', header: 'Data Jato',
      render: (v) => v ? formatDate(v) : '—',
    },
    {
      key: 'qtd_apontamentos_jato', header: 'Apont. Jato', align: 'right',
      render: (v) => formatNumber(Number(v ?? 0), 0),
    },
    {
      key: 'qtd_componentes_diretos', header: 'Comp. Diretos', align: 'right',
      render: (v) => formatNumber(Number(v ?? 0), 0),
    },
    {
      key: 'qtd_componentes_finais', header: 'Comp. Finais', align: 'right',
      render: (v) => formatNumber(Number(v ?? 0), 0),
    },
    {
      key: 'qtd_componentes_expandidos', header: 'Comp. Expand.', align: 'right',
      render: (v) => formatNumber(Number(v ?? 0), 0),
    },
    {
      key: 'nivel_maximo', header: 'Nível Máx.', align: 'right',
      render: (v) => formatNumber(Number(v ?? 0), 0),
    },
    {
      key: 'peso_kg_direto', header: 'Peso Direto (kg)', align: 'right',
      render: (v) => (
        <span className="text-xs text-muted-foreground">
          {v == null ? '—' : formatNumber(Number(v), 3)}
        </span>
      ),
    },
    {
      key: 'peso_kg_multinivel', header: 'Peso Multinível (kg)', align: 'right',
      render: (v) => (
        <span className="font-semibold text-foreground">
          {v == null ? '—' : formatNumber(Number(v), 3)}
        </span>
      ),
    },
    {
      key: 'status_peso', header: 'Status Peso', align: 'center',
      render: (v) => <StatusPesoBadge status={v} />,
    },
    {
      key: '__acoes', header: 'Ações', align: 'center',
      render: (_v, row) => (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={(e) => { e.stopPropagation(); abrirComponentes(row); }}
        >
          <Eye className="mr-1 h-3 w-3" /> Ver
        </Button>
      ),
    },
  ], [abrirComponentes]);

  const exportParams = buildApiFilters(form, 1, typeof tamanhoPagina === 'number' ? tamanhoPagina : 100);

  const fmtKg = (n?: number) =>
    `${formatNumber(Number(n ?? 0), 3)} kg`;

  return (
    <div className="space-y-4">
      <ErpConnectionAlert />

      <FilterPanel onSearch={() => buscar(1)} onClear={limpar}>
        <div className="space-y-1">
          <Label className="text-xs">Data Inicial</Label>
          <Input
            type="date"
            value={form.data_ini}
            onChange={(e) => setForm({ ...form, data_ini: e.target.value })}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data Final</Label>
          <Input
            type="date"
            value={form.data_fim}
            onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Origem</Label>
          <Input
            value={form.origem}
            onChange={(e) => setForm({ ...form, origem: e.target.value })}
            placeholder="ex.: 110"
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Número OP</Label>
          <Input
            value={form.numero_op}
            onChange={(e) => setForm({ ...form, numero_op: e.target.value })}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Código Produto</Label>
          <Input
            value={form.codigo_produto}
            onChange={(e) => setForm({ ...form, codigo_produto: e.target.value })}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Situação OP</Label>
          <Select
            value={form.situacao_op || 'TODOS'}
            onValueChange={(v) => setForm({ ...form, situacao_op: v === 'TODOS' ? '' : v })}
          >
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todas</SelectItem>
              <SelectItem value="E">E — Emitida</SelectItem>
              <SelectItem value="L">L — Liberada</SelectItem>
              <SelectItem value="A">A — Em andamento</SelectItem>
              <SelectItem value="F">F — Finalizada</SelectItem>
              <SelectItem value="C">C — Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Status Peso</Label>
          <Select
            value={form.status_peso}
            onValueChange={(v) => setForm({ ...form, status_peso: v as StatusPesoFilter })}
          >
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="COM_PESO">Somente com peso</SelectItem>
              <SelectItem value="SEM_PESO">Somente sem peso</SelectItem>
              <SelectItem value="PARCIAL">Somente peso parcial</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-full flex justify-end">
          <ExportButton
            endpoint="/api/export/auditoria-apontamento-genius/ops-jato-peso"
            params={exportParams}
            label="Exportar Excel"
          />
        </div>
      </FilterPanel>

      <KpiGroup title="OPs Pintura/Jato" tone="volume">
        <KPICard
          title="Total de OPs"
          value={formatNumber(Number(resumo.total_ops ?? data?.total_registros ?? 0), 0)}
        />
        <KPICard
          title="Peso Total Multinível"
          value={fmtKg(resumo.peso_total_kg_multinivel)}
          variant="info"
          subtitle={resumo.peso_total_kg_direto != null
            ? `Direto: ${fmtKg(resumo.peso_total_kg_direto)}`
            : undefined}
        />
        <KPICard
          title="OPs com Peso"
          value={formatNumber(Number(resumo.ops_com_peso ?? 0), 0)}
          variant="success"
        />
        <KPICard
          title="OPs sem Peso"
          value={formatNumber(Number(resumo.ops_sem_peso ?? 0), 0)}
          variant="destructive"
        />
        <KPICard
          title="OPs Peso Parcial"
          value={formatNumber(Number(resumo.ops_peso_parcial ?? 0), 0)}
          variant="warning"
        />
        <KPICard
          title="OPs com Ciclo"
          value={formatNumber(Number(resumo.ops_com_ciclo ?? 0), 0)}
          variant="destructive"
        />
        <KPICard
          title="OPs sem Componentes"
          value={formatNumber(Number(resumo.ops_sem_componentes ?? 0), 0)}
        />
      </KpiGroup>

      <div className="rounded-md border bg-card">
        <DataTable
          columns={columns}
          data={dados}
          loading={loading}
          emptyMessage="Nenhuma OP encontrada para os filtros aplicados."
          enableSearch
        />
        <PaginationControl
          pagina={pagina}
          totalPaginas={data?.total_paginas ?? 1}
          totalRegistros={data?.total_registros ?? 0}
          onPageChange={(p) => buscar(p)}
          pageSize={tamanhoPagina}
          onPageSizeChange={(s) => setTamanhoPagina(s === 'todos' ? 100 : s)}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
        />
      </div>

      <OpsJatoComponentesSheet
        open={drawerAberto}
        onOpenChange={setDrawerAberto}
        origem={opAberta?.origem}
        numero_op={opAberta?.numero_op}
        descricao_produto={opAberta?.descricao_produto}
      />
    </div>
  );
}
