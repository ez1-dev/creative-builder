import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useOpConsulta } from '@/hooks/requisicoes';
import { AlertTriangle, Search } from 'lucide-react';
import { requisicoesApi, IntegracaoDesabilitadaError } from '@/services/requisicoesApi';
import type { TipoAtendimentoOP } from '@/types/requisicoes';
import { toast } from '@/hooks/use-toast';
import { IntegracaoOfflineBanner } from '@/components/requisicoes/IntegracaoOfflineBanner';
import { useNavigate } from 'react-router-dom';

export default function NovaRequisicaoOpPage() {
  const nav = useNavigate();
  const [codori, setCodori] = useState('');
  const [numorp, setNumorp] = useState('');
  const [buscar, setBuscar] = useState<{ codori: string; numorp: string } | undefined>();
  const [sel, setSel] = useState<Record<number, number>>({}); // seqcmp -> qtd
  const [justif, setJustif] = useState<Record<number, string>>({});
  const [tipo, setTipo] = useState<TipoAtendimentoOP>('TRANSFERIR');
  const [depositoDestino, setDepositoDestino] = useState<string>('');
  const [enviando, setEnviando] = useState(false);
  const [pendenteIntegr, setPendenteIntegr] = useState<string | null>(null);

  const op = useOpConsulta(buscar?.codori, buscar?.numorp);

  const podeRequisitar = op.data?.pode_requisitar ?? false;

  const itensSelecionados = useMemo(
    () => Object.entries(sel)
      .filter(([, q]) => Number(q) > 0)
      .map(([seq, q]) => ({ seqcmp: Number(seq), quantidade: Number(q) })),
    [sel],
  );

  const enviar = async () => {
    if (!op.data || itensSelecionados.length === 0) return;
    setEnviando(true); setPendenteIntegr(null);
    try {
      const payload = {
        tipo: 'OP' as const,
        codemp: op.data.codemp,
        codfil: op.data.codfil,
        itens: itensSelecionados.map((it) => {
          const comp = op.data!.componentes.find((c) => c.seqcmp === it.seqcmp)!;
          return {
            seq: it.seqcmp,
            codemp: op.data!.codemp,
            codfil: op.data!.codfil,
            codori: op.data!.codori,
            numorp: op.data!.numorp,
            codetg: comp.codetg,
            seqcmp: comp.seqcmp,
            codcmp: comp.codcmp,          // componente = CODCMP (não CODPRO)
            codder: comp.codder,
            unidade: comp.unidade,
            quantidade: it.quantidade,
            deposito_origem: comp.deposito,
            deposito_destino: tipo === 'TRANSFERIR' ? (depositoDestino ? Number(depositoDestino) : null) : null,
            tipo_atendimento_op: tipo,
            justificativa_excesso: it.quantidade > comp.quantidade_disponivel ? (justif[it.seqcmp] ?? '') : undefined,
          };
        }),
      };
      const criada = await requisicoesApi.criar(payload as any);
      try {
        await requisicoesApi.enviar(criada.id);
      } catch (err) {
        if (err instanceof IntegracaoDesabilitadaError) {
          setPendenteIntegr(err.detail ?? null);
        } else {
          throw err;
        }
      }
      toast({ title: 'Requisição criada', description: `Nº ${criada.numero}` });
      nav(`/requisicoes/${encodeURIComponent(criada.id)}`);
    } catch (err: any) {
      toast({ title: 'Não foi possível criar a requisição', description: err?.message ?? 'Erro desconhecido', variant: 'destructive' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Nova requisição — com OP" description="Consulte a OP, selecione componentes e escolha o tipo de atendimento." />

      {pendenteIntegr !== null && <IntegracaoOfflineBanner detail={pendenteIntegr || undefined} />}

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <div>
            <Label>Origem (CODORI)</Label>
            <Input value={codori} onChange={(e) => setCodori(e.target.value)} placeholder="Ex.: 100" />
          </div>
          <div>
            <Label>Número da OP (NUMORP)</Label>
            <Input value={numorp} onChange={(e) => setNumorp(e.target.value)} placeholder="Ex.: 65958" />
          </div>
          <div className="flex items-end">
            <Button
              disabled={!codori || !numorp}
              onClick={() => setBuscar({ codori: codori.trim(), numorp: numorp.trim() })}
            >
              <Search className="mr-1 h-4 w-4" /> Consultar OP
            </Button>
          </div>
        </CardContent>
      </Card>

      {op.isLoading && (
        <Card><CardContent className="space-y-2 p-4">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-5 w-96" />
          <Skeleton className="h-24 w-full" />
        </CardContent></Card>
      )}

      {op.isError && buscar && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Não foi possível consultar a OP. Verifique os códigos informados e se a API está online.
        </div>
      )}

      {op.data && (
        <>
          <Card>
            <CardContent className="grid gap-3 p-4 text-sm md:grid-cols-4">
              <div><div className="text-xs text-muted-foreground">Produto final</div>{op.data.produto_final ?? '—'}</div>
              <div><div className="text-xs text-muted-foreground">Descrição</div>{op.data.descricao ?? '—'}</div>
              <div><div className="text-xs text-muted-foreground">Derivação</div>{op.data.codder ?? '—'}</div>
              <div><div className="text-xs text-muted-foreground">Projeto/Obra</div>{op.data.projeto ?? '—'}</div>
              <div><div className="text-xs text-muted-foreground">Situação (SITORP)</div>{op.data.situacao}</div>
              <div><div className="text-xs text-muted-foreground">Prevista</div>{op.data.quantidade_prevista}</div>
              <div><div className="text-xs text-muted-foreground">Produzida</div>{op.data.quantidade_produzida}</div>
              <div>
                <div className="text-xs text-muted-foreground">Pode requisitar?</div>
                {podeRequisitar
                  ? <span className="text-emerald-700 font-medium">Sim</span>
                  : <span className="text-red-700 font-medium">Não</span>}
              </div>
            </CardContent>
          </Card>

          {!podeRequisitar && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                Esta OP não permite requisição no momento{op.data.motivo_bloqueio ? `: ${op.data.motivo_bloqueio}` : ''}.
                Situações permitidas: <code>SITORP = L</code> ou <code>SITORP = A</code>.
              </div>
            </div>
          )}

          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Seq</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead>Componente (CODCMP)</TableHead>
                  <TableHead>Deriv.</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>UM</TableHead>
                  <TableHead>Dep.</TableHead>
                  <TableHead className="text-right">Prev.</TableHead>
                  <TableHead className="text-right">Util.</TableHead>
                  <TableHead className="text-right">Req.</TableHead>
                  <TableHead className="text-right">Transf.</TableHead>
                  <TableHead className="text-right">Disponível</TableHead>
                  <TableHead className="text-right">Saldo físico</TableHead>
                  <TableHead className="text-right w-32">A solicitar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {op.data.componentes.map((c) => {
                  const qtd = sel[c.seqcmp] ?? 0;
                  const excede = qtd > c.quantidade_disponivel;
                  return (
                    <TableRow key={c.seqcmp} className={excede ? 'bg-orange-50/60' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={qtd > 0}
                          onCheckedChange={(v) =>
                            setSel((s) => ({ ...s, [c.seqcmp]: v ? Math.max(1, c.quantidade_disponivel) : 0 }))
                          }
                          disabled={!podeRequisitar}
                        />
                      </TableCell>
                      <TableCell>{c.seqcmp}</TableCell>
                      <TableCell>{c.codetg}</TableCell>
                      <TableCell className="font-mono text-xs">{c.codcmp}</TableCell>
                      <TableCell>{c.codder ?? '—'}</TableCell>
                      <TableCell>{c.descricao ?? '—'}</TableCell>
                      <TableCell>{c.unidade ?? '—'}</TableCell>
                      <TableCell>{c.deposito ?? '—'}</TableCell>
                      <TableCell className="text-right">{c.quantidade_prevista}</TableCell>
                      <TableCell className="text-right">{c.quantidade_utilizada}</TableCell>
                      <TableCell className="text-right">{c.quantidade_requisitada}</TableCell>
                      <TableCell className="text-right">{c.quantidade_transferida}</TableCell>
                      <TableCell className="text-right font-medium">{c.quantidade_disponivel}</TableCell>
                      <TableCell className="text-right">{c.saldo_fisico ?? '—'}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.001"
                          value={qtd}
                          onChange={(e) => setSel((s) => ({ ...s, [c.seqcmp]: Number(e.target.value) || 0 }))}
                          disabled={!podeRequisitar}
                          className="h-8"
                        />
                        {excede && (
                          <Input
                            className="mt-1 h-8"
                            placeholder="Justificativa (excede disponível)"
                            value={justif[c.seqcmp] ?? ''}
                            onChange={(e) => setJustif((j) => ({ ...j, [c.seqcmp]: e.target.value }))}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <Card>
            <CardContent className="space-y-3 p-4">
              <Label className="font-medium">Tipo de atendimento</Label>
              <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as TipoAtendimentoOP)} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="TRANSFERIR" id="tipo-transf" />
                  <Label htmlFor="tipo-transf">Transferir para depósito produtivo (baixa posterior)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="BAIXAR_DIRETO" id="tipo-baixa" />
                  <Label htmlFor="tipo-baixa">Baixar diretamente na OP</Label>
                </div>
              </RadioGroup>
              {tipo === 'TRANSFERIR' && (
                <div className="max-w-xs">
                  <Label>Depósito de destino</Label>
                  <Input
                    value={depositoDestino}
                    onChange={(e) => setDepositoDestino(e.target.value)}
                    placeholder="Ex.: 21 (Produtos em Processo)"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    A decisão final de depósito e transação é da regra <code>900SDPBC01</code> no ERP.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              onClick={enviar}
              disabled={!podeRequisitar || itensSelecionados.length === 0 || enviando}
            >
              {enviando ? 'Enviando…' : 'Criar e enviar requisição'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
