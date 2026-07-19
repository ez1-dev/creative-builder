import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/requisicoes/StatusBadge';
import { useRequisicao, useHistoricoRequisicao } from '@/hooks/requisicoes';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function RequisicaoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const req = useRequisicao(id);
  const hist = useHistoricoRequisicao(id);

  return (
    <div className="space-y-4">
      <PageHeader
        title={req.data ? `Requisição ${req.data.numero}` : 'Requisição'}
        description={<Link to="/requisicoes" className="text-primary hover:underline">Voltar à lista</Link> as any}
        actions={req.data ? <StatusBadge status={req.data.situacao} /> : null}
      />

      {req.isLoading && <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>}
      {req.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Não foi possível carregar a requisição.
          <button className="ml-2 underline" onClick={() => req.refetch()}>Tentar novamente</button>
        </div>
      )}

      {req.data && (
        <>
          <Card>
            <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-4">
              <div><div className="text-xs text-muted-foreground">Tipo</div>{req.data.tipo}</div>
              <div><div className="text-xs text-muted-foreground">Solicitante</div>{req.data.solicitante ?? '—'}</div>
              <div><div className="text-xs text-muted-foreground">Setor</div>{req.data.setor ?? '—'}</div>
              <div><div className="text-xs text-muted-foreground">Prioridade</div>{req.data.prioridade}</div>
              <div><div className="text-xs text-muted-foreground">Aprovador</div>{req.data.aprovador ?? '—'}</div>
              <div><div className="text-xs text-muted-foreground">Data necessária</div>{req.data.data_necessaria ? new Date(req.data.data_necessaria).toLocaleString('pt-BR') : '—'}</div>
              <div><div className="text-xs text-muted-foreground">% atendido</div>{req.data.percentual_atendido}%</div>
            </CardContent>
          </Card>

          <Tabs defaultValue="itens">
            <TabsList>
              <TabsTrigger value="itens">Itens</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>
            <TabsContent value="itens">
              <div className="rounded-md border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seq</TableHead>
                      <TableHead>Componente</TableHead>
                      <TableHead>OP</TableHead>
                      <TableHead className="text-right">Solicitada</TableHead>
                      <TableHead className="text-right">Aprovada</TableHead>
                      <TableHead className="text-right">Separada</TableHead>
                      <TableHead className="text-right">Atendida</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {req.data.itens.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">Sem itens.</TableCell></TableRow>
                    )}
                    {req.data.itens.map((it) => (
                      <TableRow key={it.seq}>
                        <TableCell>{it.seq}</TableCell>
                        <TableCell className="font-mono text-xs">{it.codcmp}</TableCell>
                        <TableCell>{it.numorp ? `${it.codori}/${it.numorp}` : '—'}</TableCell>
                        <TableCell className="text-right">{it.quantidade}</TableCell>
                        <TableCell className="text-right">{it.qtd_aprovada ?? '—'}</TableCell>
                        <TableCell className="text-right">{it.qtd_separada ?? '—'}</TableCell>
                        <TableCell className="text-right">{it.qtd_atendida ?? '—'}</TableCell>
                        <TableCell><StatusBadge status={it.situacao} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="historico">
              <div className="rounded-md border bg-card p-3">
                {hist.isLoading && <Skeleton className="h-24 w-full" />}
                {!hist.isLoading && (hist.data?.length ?? 0) === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">Sem eventos.</div>
                )}
                <ul className="space-y-3">
                  {hist.data?.map((e) => (
                    <li key={e.id} className="border-l-2 border-primary/40 pl-3">
                      <div className="text-xs text-muted-foreground">{new Date(e.data).toLocaleString('pt-BR')} · {e.usuario ?? '—'}</div>
                      <div className="text-sm font-medium">{e.acao}</div>
                      {e.observacao && <div className="text-xs text-muted-foreground">{e.observacao}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
