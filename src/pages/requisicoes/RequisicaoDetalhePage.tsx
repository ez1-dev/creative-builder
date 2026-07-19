import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/requisicoes/StatusBadge';
import { JustificativaDialog } from '@/components/requisicoes/JustificativaDialog';
import { IntegracaoOfflineBanner } from '@/components/requisicoes/IntegracaoOfflineBanner';
import { useRequisicao, useHistoricoRequisicao, useEnviarRequisicao, useCancelarRequisicao, useEstornarRequisicao, useReprocessarIntegracao, useSidWriteEnabled } from '@/hooks/requisicoes';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Send, Ban, RotateCcw, RefreshCw } from 'lucide-react';

export default function RequisicaoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const req = useRequisicao(id);
  const hist = useHistoricoRequisicao(id);
  const enviar = useEnviarRequisicao();
  const cancelar = useCancelarRequisicao();
  const estornar = useEstornarRequisicao();
  const reprocessar = useReprocessarIntegracao();
  const sidWrite = useSidWriteEnabled();
  const [askCancel, setAskCancel] = useState(false);
  const [askEstorno, setAskEstorno] = useState(false);

  const situacao = req.data?.situacao;
  const podeEnviar = situacao === 'RASCUNHO' || situacao === 'DEVOLVIDA_AJUSTE';
  const podeCancelar = situacao && !['ATENDIDA', 'CANCELADA', 'ESTORNADA'].includes(situacao);
  const podeEstornar = situacao && ['ATENDIDA', 'PARCIALMENTE_ATENDIDA'].includes(situacao);
  const erroIntegr = situacao === 'ERRO_INTEGRACAO';

  const ultimoErro = hist.data?.find((e) => e.mensagem_integracao);

  return (
    <div className="space-y-4">
      <PageHeader
        title={req.data ? `Requisição ${req.data.numero}` : 'Requisição'}
        description={<Link to="/requisicoes" className="text-primary hover:underline">Voltar à lista</Link> as any}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {req.data && <StatusBadge status={req.data.situacao} />}
            {id && podeEnviar && (
              <Button size="sm" onClick={() => enviar.mutate(id)} disabled={enviar.isPending}>
                <Send className="mr-1 h-3.5 w-3.5" /> Enviar
              </Button>
            )}
            {id && erroIntegr && (
              <Button size="sm" variant="outline" onClick={() => reprocessar.mutate(id)} disabled={reprocessar.isPending}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reprocessar integração
              </Button>
            )}
            {id && podeCancelar && (
              <Button size="sm" variant="outline" onClick={() => setAskCancel(true)} className="text-red-700">
                <Ban className="mr-1 h-3.5 w-3.5" /> Cancelar
              </Button>
            )}
            {id && podeEstornar && (
              <Button size="sm" variant="outline" onClick={() => setAskEstorno(true)}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Estornar
              </Button>
            )}
          </div>
        }
      />

      {req.isLoading && <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>}
      {req.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Não foi possível carregar a requisição.
          <button className="ml-2 underline" onClick={() => req.refetch()}>Tentar novamente</button>
        </div>
      )}

      {erroIntegr && <IntegracaoOfflineBanner detail={ultimoErro?.mensagem_integracao ?? undefined} />}

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
              <div><div className="text-xs text-muted-foreground">Centro de custo</div>{req.data.centro_custo ?? '—'}</div>
            </CardContent>
          </Card>

          <Tabs defaultValue="itens">
            <TabsList>
              <TabsTrigger value="itens">Itens</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
              <TabsTrigger value="integracao">Integração</TabsTrigger>
            </TabsList>

            <TabsContent value="itens">
              <div className="rounded-md border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seq</TableHead>
                      <TableHead>Componente</TableHead>
                      <TableHead>OP</TableHead>
                      <TableHead className="text-right">Solic.</TableHead>
                      <TableHead className="text-right">Aprov.</TableHead>
                      <TableHead className="text-right">Sep.</TableHead>
                      <TableHead className="text-right">Atend.</TableHead>
                      <TableHead className="text-right">Pend.</TableHead>
                      <TableHead>Dep. O→D</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {req.data.itens.length === 0 && (
                      <TableRow><TableCell colSpan={10} className="py-6 text-center text-sm text-muted-foreground">Sem itens.</TableCell></TableRow>
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
                        <TableCell className="text-right font-medium">{it.qtd_pendente ?? '—'}</TableCell>
                        <TableCell className="text-xs">{it.deposito_origem ?? '—'} → {it.deposito_destino ?? '—'}</TableCell>
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
                  <div className="p-4 text-center text-sm text-muted-foreground">Sem eventos registrados.</div>
                )}
                <ul className="space-y-3">
                  {hist.data?.map((e) => (
                    <li key={e.id} className="border-l-2 border-primary/40 pl-3">
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.data).toLocaleString('pt-BR')} · {e.usuario ?? '—'}
                        {e.status_anterior && e.status_novo && (
                          <span className="ml-2">
                            {e.status_anterior} → <span className="font-medium">{e.status_novo}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium">{e.acao}</div>
                      {e.observacao && <div className="text-xs text-muted-foreground">{e.observacao}</div>}
                      {e.movimento_senior && <div className="text-xs text-muted-foreground">Movimento Senior: <code>{e.movimento_senior}</code></div>}
                      {e.mensagem_integracao && <div className="text-xs text-amber-700">Integração: {e.mensagem_integracao}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="integracao">
              <Card>
                <CardContent className="space-y-3 p-4 text-sm">
                  <div><span className="text-muted-foreground">Situação atual:</span> <StatusBadge status={req.data.situacao} /></div>
                  {ultimoErro ? (
                    <>
                      <div className="text-muted-foreground">Última mensagem da integração:</div>
                      <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{ultimoErro.mensagem_integracao}</pre>
                      {ultimoErro.movimento_senior && (
                        <div>Movimento Senior gerado: <code>{ultimoErro.movimento_senior}</code></div>
                      )}
                    </>
                  ) : (
                    <div className="text-muted-foreground">Nenhum retorno de integração registrado.</div>
                  )}
                  {id && erroIntegr && (
                    <Button size="sm" onClick={() => reprocessar.mutate(id)} disabled={reprocessar.isPending}>
                      <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reprocessar agora
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <JustificativaDialog
        open={askCancel}
        onOpenChange={setAskCancel}
        title="Cancelar requisição"
        confirmLabel="Cancelar requisição"
        confirmVariant="destructive"
        onConfirm={async (justificativa) => { if (id) await cancelar.mutateAsync({ id, justificativa }); }}
      />
      <JustificativaDialog
        open={askEstorno}
        onOpenChange={setAskEstorno}
        title="Estornar movimentos"
        description="Desfaz as movimentações no ERP. Ação sujeita às regras do Senior."
        confirmLabel="Estornar"
        confirmVariant="destructive"
        minLength={5}
        onConfirm={async () => { if (id) await estornar.mutateAsync(id); }}
      />
    </div>
  );
}
