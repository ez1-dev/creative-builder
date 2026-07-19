import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/erp/PageHeader';
import { StatusBadge } from '@/components/requisicoes/StatusBadge';
import { useRequisicoes, useRequisicoesKpis } from '@/hooks/requisicoes';
import type { RequisicaoFiltros } from '@/types/requisicoes';
import { Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { requisicoesApi } from '@/services/requisicoesApi';

const KPI_ITEMS: Array<{ key: keyof import('@/types/requisicoes').RequisicaoKpis; label: string }> = [
  { key: 'aguardando_aprovacao', label: 'Aguardando aprovação' },
  { key: 'aprovadas', label: 'Aprovadas' },
  { key: 'aguardando_separacao', label: 'Aguardando separação' },
  { key: 'em_separacao', label: 'Em separação' },
  { key: 'parcialmente_atendidas', label: 'Parcialmente atendidas' },
  { key: 'aguardando_saldo', label: 'Aguardando saldo' },
  { key: 'atrasadas', label: 'Atrasadas' },
  { key: 'atendidas_periodo', label: 'Atendidas no período' },
  { key: 'emergenciais', label: 'Emergenciais' },
  { key: 'erro_integracao', label: 'Erro de integração' },
];

export default function RequisicoesListPage() {
  const nav = useNavigate();
  const [filtros, setFiltros] = useState<RequisicaoFiltros>({});
  const [numero, setNumero] = useState('');
  const list = useRequisicoes(filtros);
  const kpis = useRequisicoesKpis(filtros);
  const isMock = useMemo(() => requisicoesApi.isMock(), []);

  const aplicar = () => setFiltros({ ...filtros, numero: numero || undefined });
  const limpar = () => { setNumero(''); setFiltros({}); };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Requisição de Materiais"
        description="Requisição, separação e baixa de materiais integrados ao ERP Senior."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => { list.refetch(); kpis.refetch(); }}>
              <RefreshCw className="mr-1 h-4 w-4" /> Atualizar
            </Button>
            <Button size="sm" onClick={() => nav('/requisicoes/nova')}>
              <Plus className="mr-1 h-4 w-4" /> Nova requisição
            </Button>
          </>
        }
      />

      {isMock && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            Exibindo dados <strong>simulados</strong> (variável <code>VITE_USE_REQUISICOES_MOCK=true</code>).
            Desative para consumir a API real.
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {KPI_ITEMS.map((k) => (
          <Card key={k.key}>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className="mt-1 text-xl font-semibold">
                {kpis.isLoading ? <Skeleton className="h-6 w-12" /> : (kpis.data?.[k.key] ?? 0)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtro simples */}
      <div className="flex flex-wrap items-end gap-2 rounded-md border bg-card p-3">
        <div className="w-56">
          <label className="mb-1 block text-xs text-muted-foreground">Número da requisição</label>
          <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ex.: 000123" />
        </div>
        <Button size="sm" onClick={aplicar}>Aplicar</Button>
        <Button size="sm" variant="ghost" onClick={limpar}>Limpar</Button>
      </div>

      {/* Tabela */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requisição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>OP</TableHead>
              <TableHead className="text-right">Itens</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Necessária</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="text-right">% Atend.</TableHead>
              <TableHead>Atualizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 11 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                  ))}
                </TableRow>
              ))}
            {!list.isLoading && list.isError && (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-sm text-red-700">
                  Não foi possível carregar as requisições.{' '}
                  <button className="underline" onClick={() => list.refetch()}>Tentar novamente</button>
                </TableCell>
              </TableRow>
            )}
            {!list.isLoading && !list.isError && (list.data?.items?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma requisição encontrada.
                </TableCell>
              </TableRow>
            )}
            {!list.isLoading && !list.isError && list.data?.items?.map((r) => (
              <TableRow key={r.id} className="hover:bg-accent/40">
                <TableCell>
                  <Link className="text-primary hover:underline" to={`/requisicoes/${encodeURIComponent(r.id)}`}>
                    {r.numero}
                  </Link>
                </TableCell>
                <TableCell>{r.tipo}</TableCell>
                <TableCell>{r.solicitante ?? '—'}</TableCell>
                <TableCell>{r.setor ?? '—'}</TableCell>
                <TableCell>{r.op ?? '—'}</TableCell>
                <TableCell className="text-right">{r.qtd_itens}</TableCell>
                <TableCell>{r.prioridade}</TableCell>
                <TableCell>{r.data_necessaria ? new Date(r.data_necessaria).toLocaleString('pt-BR') : '—'}</TableCell>
                <TableCell><StatusBadge status={r.situacao} /></TableCell>
                <TableCell className="text-right">{r.percentual_atendido}%</TableCell>
                <TableCell>{r.atualizado_em ? new Date(r.atualizado_em).toLocaleString('pt-BR') : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
