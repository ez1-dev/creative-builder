import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/erp/PageHeader';
import { StatusBadge } from '@/components/requisicoes/StatusBadge';
import { useRequisicoes, useRequisicoesKpis } from '@/hooks/requisicoes';
import type { RequisicaoFiltros, RequisicaoKpis, StatusRequisicao, PrioridadeRequisicao } from '@/types/requisicoes';
import {
  Plus, RefreshCw, AlertTriangle, Search, X, Inbox,
  Clock, CheckCircle2, PackageSearch, Boxes, PieChart,
  Hourglass, AlertOctagon, PackageCheck, Zap, PlugZap,
} from 'lucide-react';
import { requisicoesApi } from '@/services/requisicoesApi';
import { cn } from '@/lib/utils';

type Tone = 'primary' | 'warning' | 'success' | 'destructive' | 'info';

interface KpiDef {
  key: keyof RequisicaoKpis;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  situacao?: StatusRequisicao;
}

const KPI_ITEMS: KpiDef[] = [
  { key: 'aguardando_aprovacao',   label: 'Aguardando aprovação',   icon: Clock,          tone: 'warning',     situacao: 'AGUARDANDO_APROVACAO' },
  { key: 'aprovadas',              label: 'Aprovadas',              icon: CheckCircle2,   tone: 'success',     situacao: 'APROVADA' },
  { key: 'aguardando_separacao',   label: 'Aguardando separação',   icon: PackageSearch,  tone: 'warning',     situacao: 'AGUARDANDO_ALMOXARIFADO' },
  { key: 'em_separacao',           label: 'Em separação',           icon: Boxes,          tone: 'info',        situacao: 'EM_SEPARACAO' },
  { key: 'parcialmente_atendidas', label: 'Parcialmente atendidas', icon: PieChart,       tone: 'warning',     situacao: 'PARCIALMENTE_ATENDIDA' },
  { key: 'aguardando_saldo',       label: 'Aguardando saldo',       icon: Hourglass,      tone: 'warning',     situacao: 'AGUARDANDO_SALDO' },
  { key: 'atrasadas',              label: 'Atrasadas',              icon: AlertOctagon,   tone: 'destructive' },
  { key: 'atendidas_periodo',      label: 'Atendidas no período',   icon: PackageCheck,   tone: 'success',     situacao: 'ATENDIDA' },
  { key: 'emergenciais',           label: 'Emergenciais',           icon: Zap,            tone: 'destructive' },
  { key: 'erro_integracao',        label: 'Erro de integração',     icon: PlugZap,        tone: 'destructive', situacao: 'ERRO_INTEGRACAO' },
];

const TONE_STYLES: Record<Tone, { bar: string; iconBg: string; iconFg: string; ring: string }> = {
  primary:     { bar: 'bg-primary',         iconBg: 'bg-primary/10',       iconFg: 'text-primary',         ring: 'ring-primary/30' },
  info:        { bar: 'bg-sky-500',         iconBg: 'bg-sky-500/10',       iconFg: 'text-sky-600 dark:text-sky-400',       ring: 'ring-sky-500/30' },
  success:     { bar: 'bg-emerald-500',     iconBg: 'bg-emerald-500/10',   iconFg: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/30' },
  warning:     { bar: 'bg-amber-500',       iconBg: 'bg-amber-500/10',     iconFg: 'text-amber-600 dark:text-amber-400',   ring: 'ring-amber-500/30' },
  destructive: { bar: 'bg-destructive',     iconBg: 'bg-destructive/10',   iconFg: 'text-destructive',     ring: 'ring-destructive/30' },
};

const PRIORIDADE_STYLES: Record<PrioridadeRequisicao, { label: string; className: string }> = {
  BAIXA:   { label: 'Baixa',   className: 'border-muted-foreground/30 text-muted-foreground' },
  NORMAL:  { label: 'Normal',  className: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  ALTA:    { label: 'Alta',    className: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  URGENTE: { label: 'Urgente', className: 'border-destructive/40 bg-destructive/10 text-destructive' },
};

function fmtDateShort(d?: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const STATUS_FINAIS: StatusRequisicao[] = ['ATENDIDA', 'CANCELADA', 'ESTORNADA', 'INTEGRADA'];

export default function RequisicoesListPage() {
  const nav = useNavigate();
  const [filtros, setFiltros] = useState<RequisicaoFiltros>({});
  const [numero, setNumero] = useState('');
  const list = useRequisicoes(filtros);
  const kpis = useRequisicoesKpis(filtros);
  const isMock = useMemo(() => requisicoesApi.isMock(), []);

  const aplicar = () => setFiltros((f) => ({ ...f, numero: numero || undefined }));
  const limpar = () => { setNumero(''); setFiltros({}); };
  const hasFilters = Boolean(filtros.numero || filtros.situacao);

  const kpiSituacaoAtiva = filtros.situacao;

  const toggleSituacao = (situacao?: StatusRequisicao) => {
    if (!situacao) return;
    setFiltros((f) => ({ ...f, situacao: f.situacao === situacao ? undefined : situacao }));
  };

  const items = list.data?.items ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Requisição de Materiais"
        description="Requisição, separação e baixa de materiais integrados ao ERP Senior."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { list.refetch(); kpis.refetch(); }}
              disabled={list.isFetching || kpis.isFetching}
            >
              <RefreshCw className={cn('mr-1 h-4 w-4', (list.isFetching || kpis.isFetching) && 'animate-spin')} />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => nav('/requisicoes/nova')}>
              <Plus className="mr-1 h-4 w-4" /> Nova requisição
            </Button>
          </>
        }
      />

      {isMock && (
        <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
          <AlertDescription>
            Exibindo dados <strong>simulados</strong> (variável <code>VITE_USE_REQUISICOES_MOCK=true</code>). Desative para consumir a API real.
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {KPI_ITEMS.map((k) => {
          const tone = TONE_STYLES[k.tone];
          const Icon = k.icon;
          const active = k.situacao && kpiSituacaoAtiva === k.situacao;
          const clickable = Boolean(k.situacao);
          return (
            <button
              key={k.key}
              type="button"
              disabled={!clickable}
              onClick={() => toggleSituacao(k.situacao)}
              className={cn(
                'group relative overflow-hidden rounded-lg border bg-card text-left shadow-sm transition-all',
                clickable && 'hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2',
                clickable && tone.ring,
                active && 'ring-2 shadow-md',
                active && tone.ring,
                !clickable && 'cursor-default',
              )}
            >
              <span className={cn('absolute inset-y-0 left-0 w-1', tone.bar)} aria-hidden />
              <div className="flex items-start gap-3 p-4 pl-5">
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', tone.iconBg)}>
                  <Icon className={cn('h-5 w-5', tone.iconFg)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k.label}</div>
                  <div className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">
                    {kpis.isLoading ? <Skeleton className="h-7 w-12" /> : (kpis.data?.[k.key] ?? 0)}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Toolbar filtros */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') aplicar(); }}
            placeholder="Buscar por número (ex.: 000123)"
            className="pl-8"
          />
        </div>
        <Button size="sm" onClick={aplicar}>Aplicar</Button>

        {hasFilters && (
          <div className="ml-auto flex items-center gap-2">
            {filtros.situacao && (
              <Badge variant="outline" className="gap-1 pr-1">
                Situação: <StatusBadge status={filtros.situacao} />
                <button
                  type="button"
                  onClick={() => setFiltros((f) => ({ ...f, situacao: undefined }))}
                  className="ml-1 rounded p-0.5 hover:bg-muted"
                  aria-label="Remover filtro"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            <Button size="sm" variant="ghost" onClick={limpar}>Limpar tudo</Button>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-xs font-semibold uppercase tracking-wide">Requisição</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide">Solicitante</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide">Setor</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide">OP</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Itens</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide">Prioridade</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide">Necessária</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide">Situação</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide w-[160px]">Atendimento</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide">Atualizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full max-w-[120px]" /></TableCell>
                  ))}
                </TableRow>
              ))}

            {!list.isLoading && list.isError && (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-sm text-destructive">
                  <AlertOctagon className="mx-auto mb-2 h-6 w-6" />
                  Não foi possível carregar as requisições.{' '}
                  <button className="underline underline-offset-2" onClick={() => list.refetch()}>Tentar novamente</button>
                </TableCell>
              </TableRow>
            )}

            {!list.isLoading && !list.isError && items.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={10} className="py-14 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                      <Inbox className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">Nenhuma requisição encontrada</div>
                      <div className="text-xs">Ajuste os filtros ou crie uma nova requisição.</div>
                    </div>
                    <Button size="sm" onClick={() => nav('/requisicoes/nova')}>
                      <Plus className="mr-1 h-4 w-4" /> Nova requisição
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!list.isLoading && !list.isError && items.map((r) => {
              const prio = PRIORIDADE_STYLES[r.prioridade] ?? { label: r.prioridade, className: '' };
              const necessaria = r.data_necessaria ? new Date(r.data_necessaria) : null;
              const vencida = necessaria && necessaria.getTime() < Date.now() && !STATUS_FINAIS.includes(r.situacao);
              const pct = Math.max(0, Math.min(100, r.percentual_atendido ?? 0));
              return (
                <TableRow key={r.id} className="even:bg-muted/20 hover:bg-accent/40">
                  <TableCell>
                    <Link
                      className="font-mono text-sm font-semibold text-primary hover:underline"
                      to={`/requisicoes/${encodeURIComponent(r.id)}`}
                    >
                      {r.numero}
                    </Link>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{r.tipo}</div>
                  </TableCell>
                  <TableCell className="text-sm">{r.solicitante ?? '—'}</TableCell>
                  <TableCell className="text-sm">{r.setor ?? '—'}</TableCell>
                  <TableCell className="text-sm font-mono">{r.op ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.qtd_itens}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={prio.className}>{prio.label}</Badge>
                  </TableCell>
                  <TableCell className={cn('text-sm tabular-nums', vencida && 'font-medium text-destructive')}>
                    {fmtDateShort(r.data_necessaria)}
                  </TableCell>
                  <TableCell><StatusBadge status={r.situacao} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {fmtDateShort(r.atualizado_em)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
