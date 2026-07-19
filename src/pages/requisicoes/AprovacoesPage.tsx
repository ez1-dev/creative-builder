import { useState } from 'react';
import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { StatusBadge } from '@/components/requisicoes/StatusBadge';
import { JustificativaDialog } from '@/components/requisicoes/JustificativaDialog';
import { useRequisicoes, useAprovarRequisicao, useRejeitarRequisicao, useCancelarRequisicao } from '@/hooks/requisicoes';

type PendingAction = { id: string; numero: string; type: 'rejeitar' | 'devolver' } | null;

export default function AprovacoesPage() {
  const lista = useRequisicoes({ situacao: 'AGUARDANDO_APROVACAO' });
  const aprovar = useAprovarRequisicao();
  const rejeitar = useRejeitarRequisicao();
  const devolver = useCancelarRequisicao(); // devolver p/ ajuste usa endpoint cancelar com contexto
  const [pending, setPending] = useState<PendingAction>(null);

  const items = lista.data?.items ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Aprovações de requisições"
        description="Fila de requisições aguardando aprovação. Aprovar / Rejeitar / Devolver para ajuste."
      />

      {lista.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Não foi possível carregar a fila de aprovação.
          <button className="ml-2 underline" onClick={() => lista.refetch()}>Tentar novamente</button>
        </div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>OP</TableHead>
              <TableHead className="text-right">Itens</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Necessária</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="w-64 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.isLoading && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 10 }).map((_, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
              ))}</TableRow>
            ))}
            {!lista.isLoading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma requisição aguardando aprovação.
                </TableCell>
              </TableRow>
            )}
            {items.map((r) => {
              const busy = (aprovar.isPending || rejeitar.isPending || devolver.isPending)
                && (aprovar.variables as any)?.id === r.id;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link to={`/requisicoes/${encodeURIComponent(r.id)}`} className="text-primary hover:underline">
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
                  <TableCell className="space-x-1 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => aprovar.mutate({ id: r.id })}
                      disabled={busy}
                      className="text-emerald-700 hover:text-emerald-800"
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPending({ id: r.id, numero: r.numero, type: 'devolver' })}
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5" /> Devolver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPending({ id: r.id, numero: r.numero, type: 'rejeitar' })}
                      className="text-red-700 hover:text-red-800"
                    >
                      <XCircle className="mr-1 h-3.5 w-3.5" /> Rejeitar
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Card>
        <CardContent className="p-3 text-xs text-muted-foreground">
          A aprovação usa o endpoint <code>POST /api/requisicoes/:id/aprovar</code> (idempotente).
          Rejeições e devoluções exigem justificativa que fica gravada no histórico.
        </CardContent>
      </Card>

      <JustificativaDialog
        open={pending?.type === 'rejeitar'}
        onOpenChange={(v) => !v && setPending(null)}
        title={`Rejeitar requisição ${pending?.numero ?? ''}`}
        confirmLabel="Rejeitar"
        confirmVariant="destructive"
        onConfirm={async (justificativa) => {
          if (pending) await rejeitar.mutateAsync({ id: pending.id, justificativa });
        }}
      />
      <JustificativaDialog
        open={pending?.type === 'devolver'}
        onOpenChange={(v) => !v && setPending(null)}
        title={`Devolver para ajuste — ${pending?.numero ?? ''}`}
        description="A requisição volta para o solicitante alterar os itens."
        confirmLabel="Devolver"
        onConfirm={async (justificativa) => {
          if (pending) await devolver.mutateAsync({ id: pending.id, justificativa });
        }}
      />
    </div>
  );
}
