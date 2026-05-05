import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Search, Download, FileSearch, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { api, type PaginatedResponse } from '@/lib/api';
import { DataTable, type Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { KpiGroup } from '@/components/erp/KpiGroup';
import { KPICard } from '@/components/erp/KPICard';
import { formatDate } from '@/lib/format';

const ORIGEM_OPTIONS = ['TODOS', 'PEDIDO', 'NF'] as const;
type OrigemOption = (typeof ORIGEM_OPTIONS)[number];

interface AuditoriaRevendaItem {
  origem?: string | null;
  empresa?: string | null;
  filial?: string | null;
  data_emissao?: string | null;
  anomes?: string | number | null;
  pedido?: string | number | null;
  serie_nf?: string | null;
  nf?: string | number | null;
  numero_nf?: string | number | null;
  documento_nf?: string | number | null;
  id_nf?: string | number | null;
  num_nfv?: string | number | null;
  item_nf?: string | number | null;
  cod_cliente?: string | number | null;
  cliente?: string | null;
  projeto?: string | number | null;
  produto?: string | null;
  derivacao?: string | null;
  revenda?: string | null;
  tipo_pendencia?: string | null;
  motivo?: string | null;
  [k: string]: any;
}

const getNF = (r: AuditoriaRevendaItem) =>
  r.documento_nf || r.numero_nf || r.nf || r.id_nf || r.num_nfv || '';

interface AuditoriaRevendaResponse extends PaginatedResponse<AuditoriaRevendaItem> {
  resumo?: {
    total_pedidos_sem_revenda?: number;
    total_nfs_sem_revenda?: number;
    [k: string]: any;
  };
}

interface Filters {
  anomes_ini: string;
  anomes_fim: string;
  numprj: string;
  origem: OrigemOption;
  codfil: string;
  cliente: string;
  pedido: string;
  nf: string;
}

function currentYYYYMM(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const initialFilters = (): Filters => ({
  anomes_ini: currentYYYYMM(),
  anomes_fim: currentYYYYMM(),
  numprj: '',
  origem: 'TODOS',
  codfil: '',
  cliente: '',
  pedido: '',
  nf: '',
});

const fmtAnomes = (v: string | number | null | undefined) => {
  if (v === null || v === undefined || v === '') return '-';
  const s = String(v);
  if (s.length !== 6) return s;
  return `${s.slice(4, 6)}/${s.slice(0, 4)}`;
};

const isValidYYYYMM = (s: string) => {
  if (!/^\d{6}$/.test(s)) return false;
  const m = Number(s.slice(4, 6));
  return m >= 1 && m <= 12;
};

function buildParams(f: Filters, pagina: number, tamanhoPagina: number) {
  return {
    anomes_ini: f.anomes_ini,
    anomes_fim: f.anomes_fim,
    numprj: f.numprj,
    origem: f.origem,
    codfil: f.codfil || undefined,
    cliente: f.cliente || undefined,
    pedido: f.pedido || undefined,
    nf: f.nf || undefined,
    pagina,
    tamanho_pagina: tamanhoPagina,
  };
}

export function AuditoriaRevendaTab() {
  const [filters, setFilters] = useState<Filters>(initialFilters());
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina] = useState(50);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AuditoriaRevendaResponse | null>(null);

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const validar = (): string | null => {
    if (!isValidYYYYMM(filters.anomes_ini)) return 'Ano/Mês inicial inválido (use YYYYMM).';
    if (!isValidYYYYMM(filters.anomes_fim)) return 'Ano/Mês final inválido (use YYYYMM).';
    if (filters.anomes_ini > filters.anomes_fim) return 'Ano/Mês inicial deve ser ≤ Ano/Mês final.';
    if (!filters.numprj.trim()) return 'Informe o Projeto.';
    return null;
  };

  const consultar = async (page = 1) => {
    const erro = validar();
    if (erro) {
      toast.error(erro);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get<AuditoriaRevendaResponse>(
        '/api/faturamento-genius/auditoria-revenda',
        buildParams(filters, page, tamanhoPagina),
      );
      setResponse(data);
      setPagina(page);
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao consultar auditoria de revenda.');
    } finally {
      setLoading(false);
    }
  };

  const exportar = () => {
    const erro = validar();
    if (erro) {
      toast.error(erro);
      return;
    }
    const url = api.getExportUrl(
      '/api/export/faturamento-genius/auditoria-revenda',
      buildParams(filters, pagina, tamanhoPagina),
    );
    window.open(url, '_blank');
  };

  const dados = response?.dados ?? [];
  const totalRegistros = response?.total_registros ?? 0;
  const totalPaginas = response?.total_paginas ?? 0;

  const pedidosSemRevendaPagina =
    response?.resumo?.total_pedidos_sem_revenda ??
    dados.filter((d) => String(d.origem ?? '').toUpperCase() === 'PEDIDO').length;
  const nfsSemRevendaPagina =
    response?.resumo?.total_nfs_sem_revenda ??
    dados.filter((d) => String(d.origem ?? '').toUpperCase() === 'NF').length;

  const cols: Column<AuditoriaRevendaItem>[] = [
    {
      key: 'origem',
      header: 'Origem',
      render: (v) => {
        const s = String(v ?? '').toUpperCase();
        if (!s) return '-';
        const variant = s === 'PEDIDO' ? 'secondary' : s === 'NF' ? 'outline' : 'default';
        return <Badge variant={variant as any}>{s}</Badge>;
      },
    },
    { key: 'data_emissao', header: 'Data Emissão', render: (v) => (v ? formatDate(v) : '-') },
    { key: 'pedido', header: 'Pedido' },
    { key: 'nf', header: 'NF', render: (_v, row) => getNF(row as AuditoriaRevendaItem) || '-' },
    { key: 'serie_nf', header: 'Série NF' },
    { key: 'item_nf', header: 'Item NF' },
    { key: 'cliente', header: 'Cliente' },
    { key: 'projeto', header: 'Projeto' },
    { key: 'produto', header: 'Produto' },
    { key: 'derivacao', header: 'Derivação' },
    {
      key: 'revenda',
      header: 'Revenda',
      render: (v) => {
        const s = (v ?? '').toString().trim();
        return s ? s : <Badge variant="outline" className="text-muted-foreground">Sem revenda</Badge>;
      },
    },
    { key: 'motivo', header: 'Motivo' },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Ano/Mês inicial (YYYYMM) *</Label>
              <Input
                value={filters.anomes_ini}
                onChange={(e) => update('anomes_ini', e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="202601"
                maxLength={6}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ano/Mês final (YYYYMM) *</Label>
              <Input
                value={filters.anomes_fim}
                onChange={(e) => update('anomes_fim', e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="202612"
                maxLength={6}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Projeto *</Label>
              <Input
                value={filters.numprj}
                onChange={(e) => update('numprj', e.target.value)}
                placeholder="Número do projeto"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Origem</Label>
              <Select value={filters.origem} onValueChange={(v) => update('origem', v as OrigemOption)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORIGEM_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o} className="text-xs">
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Filial</Label>
              <Input
                value={filters.codfil}
                onChange={(e) => update('codfil', e.target.value)}
                placeholder="Código da filial"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cliente</Label>
              <Input
                value={filters.cliente}
                onChange={(e) => update('cliente', e.target.value)}
                placeholder="Nome ou código"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pedido</Label>
              <Input
                value={filters.pedido}
                onChange={(e) => update('pedido', e.target.value)}
                placeholder="Nº pedido"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nota Fiscal</Label>
              <Input
                value={filters.nf}
                onChange={(e) => update('nf', e.target.value)}
                placeholder="Nº NF"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" onClick={() => consultar(1)} disabled={loading}>
              {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Search className="mr-1 h-3 w-3" />}
              Buscar Auditoria
            </Button>
            <Button size="sm" variant="outline" onClick={exportar} disabled={loading}>
              <Download className="mr-1 h-3 w-3" />
              Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {response && (
        <KpiGroup title="Resumo da auditoria" icon={<FileSearch className="h-4 w-4" />}>
          <KPICard title="Total de registros" value={totalRegistros.toLocaleString('pt-BR')} icon={<FileSearch className="h-4 w-4" />} />
          <KPICard title="Exibidos na página" value={dados.length.toLocaleString('pt-BR')} icon={<FileSearch className="h-4 w-4" />} />
          <KPICard title="Pedidos s/ revenda (página)" value={pedidosSemRevendaPagina.toLocaleString('pt-BR')} icon={<FileSearch className="h-4 w-4" />} variant="warning" />
          <KPICard title="NFs s/ revenda (página)" value={nfsSemRevendaPagina.toLocaleString('pt-BR')} icon={<FileSearch className="h-4 w-4" />} variant="warning" />
        </KpiGroup>
      )}

      {response ? (
        <Card>
          <CardContent className="p-3 space-y-2">
            <DataTable
              columns={cols}
              data={dados}
              loading={loading}
              emptyMessage="Nenhum registro encontrado para os filtros informados."
              enableSearch
            />
            <PaginationControl
              pagina={pagina}
              totalPaginas={totalPaginas}
              totalRegistros={totalRegistros}
              onPageChange={(p) => consultar(p)}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-xs text-muted-foreground">
            Informe Ano/Mês, Projeto e clique em <span className="font-medium">Buscar Auditoria</span> para carregar os dados.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
