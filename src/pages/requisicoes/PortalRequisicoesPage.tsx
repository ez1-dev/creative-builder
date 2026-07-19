import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Search, Barcode, PackageOpen, PackageMinus, Trash2, PlusCircle, RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useOpConsulta, useSidStatus, useSidWriteEnabled,
  useSidRequisitar, useSidReservarComponente, useSidBaixarComponentes, useSidExcluir } from '@/hooks/requisicoes';
import { IntegracaoOfflineBanner } from '@/components/requisicoes/IntegracaoOfflineBanner';
import type { ComponenteOP } from '@/types/requisicoes';

const TNS_DEFAULTS = {
  CONSUMO_AVULSO: '90250',
  TRANSFERENCIA: '90253',
  BAIXA_OP: '90251',
};

function parseBarcode(v: string): { codori?: string; numorp?: string } {
  const trim = v.trim();
  if (!trim) return {};
  const parts = trim.split(/[|\-\s]+/).filter(Boolean);
  if (parts.length >= 2) return { codori: parts[0], numorp: parts[1] };
  return { codori: trim };
}

export default function PortalRequisicoesPage() {
  const [barcode, setBarcode] = useState('');
  const [codori, setCodori] = useState('');
  const [numorp, setNumorp] = useState('');
  const [query, setQuery] = useState<{ codori: string; numorp: string } | null>(null);
  const [openAvulsa, setOpenAvulsa] = useState(false);
  const [lastNumEme, setLastNumEme] = useState<string | null>(null);
  const [reservarItem, setReservarItem] = useState<{ comp: ComponenteOP; qtd: number } | null>(null);
  const [baixarItem, setBaixarItem] = useState<{ comp: ComponenteOP; qtd: number; codlot: string } | null>(null);

  const op = useOpConsulta(query?.codori, query?.numorp);
  const sid = useSidStatus();
  const sidWrite = useSidWriteEnabled();
  const excluir = useSidExcluir();

  function consultar() {
    const c = (codori || '').trim();
    const n = (numorp || '').trim();
    if (!c || !n) { toast.error('Informe codori e numorp'); return; }
    setQuery({ codori: c, numorp: n });
  }

  function consultarBarcode() {
    const p = parseBarcode(barcode);
    if (!p.codori || !p.numorp) { toast.error('Formato esperado: CODORI|NUMORP'); return; }
    setCodori(p.codori); setNumorp(p.numorp); setBarcode('');
    setQuery({ codori: p.codori, numorp: p.numorp });
  }

  const podeReq = !!op.data?.pode_requisitar;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Portal de Requisições"
        description="Consulta de OP, reserva/baixa de componentes e emissão avulsa integradas ao ERP via SID."
      />

      <IntegracaoOfflineBanner />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Consulta de OP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div>
                <Label htmlFor="codori">codori</Label>
                <Input id="codori" value={codori} onChange={(e) => setCodori(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && consultar()} placeholder="Ex.: PCP" />
              </div>
              <div>
                <Label htmlFor="numorp">numorp</Label>
                <Input id="numorp" value={numorp} onChange={(e) => setNumorp(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && consultar()} placeholder="Ex.: 12345" />
              </div>
              <div className="flex items-end">
                <Button onClick={consultar} disabled={op.isFetching}>
                  <Search className="mr-1 h-4 w-4" /> Consultar
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <Label htmlFor="barcode" className="flex items-center gap-1">
                  <Barcode className="h-3.5 w-3.5" /> Código de barras
                </Label>
                <Input id="barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && consultarBarcode()}
                  placeholder="CODORI|NUMORP ou CODORI-NUMORP" autoFocus />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={consultarBarcode}>Ler</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Integração SID</CardTitle>
            <Button size="icon" variant="ghost" onClick={() => sid.refetch()} disabled={sid.isFetching}
              title="Atualizar status">
              <RefreshCw className={`h-4 w-4 ${sid.isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Escrita habilitada</span>
              <Badge variant={sid.data?.sid_habilitado ? 'default' : 'secondary'}>
                {sid.data?.sid_habilitado ? 'Sim' : 'Não'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>co_ger_sid</span>
              <Badge variant={sid.data?.ger_sid?.wsdl_ok ? 'default' : 'destructive'}>
                {sid.data?.ger_sid?.wsdl_ok ? 'WSDL OK' : 'Indisponível'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>cha_separacao</span>
              <Badge variant={sid.data?.cha_separacao?.wsdl_ok ? 'default' : 'destructive'}>
                {sid.data?.cha_separacao?.wsdl_ok ? 'WSDL OK' : 'Indisponível'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => setOpenAvulsa(true)}>
          <PlusCircle className="mr-1 h-4 w-4" /> Requisição avulsa (sem OP)
        </Button>
        {lastNumEme && (
          <>
            <Badge variant="secondary" className="gap-1">
              Última numEme: <strong>{lastNumEme}</strong>
              <button type="button" onClick={() => { navigator.clipboard.writeText(lastNumEme); toast.success('Copiado'); }}
                className="ml-1 opacity-70 hover:opacity-100">
                <Copy className="h-3 w-3" />
              </button>
            </Badge>
            <Button variant="outline" size="sm" disabled={!sidWrite.enabled}
              onClick={() => excluir.mutate({ numeme: lastNumEme }, { onSuccess: () => setLastNumEme(null) })}>
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Excluir requisição
            </Button>
          </>
        )}
      </div>

      {op.isFetching && (
        <Card><CardContent className="p-4 space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </CardContent></Card>
      )}

      {op.isError && (
        <Alert variant="destructive">
          <AlertTitle>Falha ao consultar OP</AlertTitle>
          <AlertDescription>{(op.error as Error)?.message ?? 'Erro desconhecido'}</AlertDescription>
        </Alert>
      )}

      {op.data && (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">
                  OP {op.data.codori} / {op.data.numorp}
                </CardTitle>
                <Badge variant={podeReq ? 'default' : 'destructive'}>Situação: {op.data.situacao}</Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div><strong>Produto:</strong> {op.data.produto_final ?? '—'} {op.data.descricao ? `— ${op.data.descricao}` : ''}</div>
              <div className="text-muted-foreground">
                Empresa {op.data.codemp} · Filial {op.data.codfil} · Derivação {op.data.codder ?? '—'} ·
                Projeto {op.data.projeto ?? '—'} · Prevista {op.data.quantidade_prevista} · Produzida {op.data.quantidade_produzida}
              </div>
              {!podeReq && (
                <Alert className="mt-2 border-amber-300 bg-amber-50 text-amber-900">
                  <AlertTitle>OP não aceita requisição</AlertTitle>
                  <AlertDescription>
                    Situação {op.data.situacao}. {op.data.motivo_bloqueio ?? 'Ações de reserva e baixa estão desabilitadas.'}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Componentes</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Componente</TableHead>
                    <TableHead>Deriv.</TableHead>
                    <TableHead>UN</TableHead>
                    <TableHead className="text-right">Dep.</TableHead>
                    <TableHead className="text-right">Prev.</TableHead>
                    <TableHead className="text-right">Util.</TableHead>
                    <TableHead className="text-right">Req.</TableHead>
                    <TableHead className="text-right">Transf.</TableHead>
                    <TableHead className="text-right text-primary">Disponível</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {op.data.componentes.map((c) => (
                    <ComponenteRow
                      key={`${c.seqcmp}-${c.codcmp}`}
                      op={{ codori: op.data.codori, numorp: op.data.numorp }}
                      comp={c}
                      bloqueado={!podeReq || !sidWrite.enabled}
                      motivoBloqueio={!podeReq ? 'OP não aceita requisição' : sidWrite.reason}
                      onReservar={(qtd) => setReservarItem({ comp: c, qtd })}
                      onBaixar={(qtd) => setBaixarItem({ comp: c, qtd, codlot: '' })}
                    />
                  ))}
                  {op.data.componentes.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                      Nenhum componente encontrado
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <RequisitarAvulsaDialog
        open={openAvulsa}
        onOpenChange={setOpenAvulsa}
        onCreated={(numEme) => { setLastNumEme(numEme); setOpenAvulsa(false); }}
      />

      <ConfirmReservar
        item={reservarItem}
        codori={op.data?.codori}
        numorp={op.data?.numorp}
        onClose={() => setReservarItem(null)}
      />

      <ConfirmBaixar
        item={baixarItem}
        codori={op.data?.codori}
        numorp={op.data?.numorp}
        onClose={() => setBaixarItem(null)}
        onChangeLot={(codlot) => baixarItem && setBaixarItem({ ...baixarItem, codlot })}
      />
    </div>
  );
}

/* ---------- Linha de componente ---------- */

function ComponenteRow({ op, comp, bloqueado, motivoBloqueio, onReservar, onBaixar }: {
  op: { codori: string; numorp: string };
  comp: ComponenteOP;
  bloqueado: boolean;
  motivoBloqueio?: string;
  onReservar: (qtd: number) => void;
  onBaixar: (qtd: number) => void;
}) {
  const [qtd, setQtd] = useState<string>('');
  const max = Number(comp.quantidade_disponivel || 0);
  const n = Number(qtd || 0);
  const invalid = !n || n <= 0 || n > max;

  return (
    <TableRow>
      <TableCell className="font-medium">
        {comp.codcmp}
        {comp.descricao && <div className="text-xs text-muted-foreground">{comp.descricao}</div>}
      </TableCell>
      <TableCell>{comp.codder ?? '—'}</TableCell>
      <TableCell>{comp.unidade ?? '—'}</TableCell>
      <TableCell className="text-right">{comp.deposito ?? '—'}</TableCell>
      <TableCell className="text-right">{comp.quantidade_prevista}</TableCell>
      <TableCell className="text-right">{comp.quantidade_utilizada}</TableCell>
      <TableCell className="text-right">{comp.quantidade_requisitada}</TableCell>
      <TableCell className="text-right">{comp.quantidade_transferida}</TableCell>
      <TableCell className="text-right font-semibold text-primary">{max}</TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <Input
            type="number" min={0} max={max} step="any"
            className="h-8 w-24"
            value={qtd} onChange={(e) => setQtd(e.target.value)}
            placeholder="Qtd" disabled={bloqueado}
          />
          <Button size="sm" variant="outline" disabled={bloqueado || invalid}
            title={bloqueado ? motivoBloqueio : undefined}
            onClick={() => onReservar(n)}>
            <PackageOpen className="mr-1 h-3.5 w-3.5" /> Reservar
          </Button>
          <Button size="sm" variant="outline" disabled={bloqueado || invalid}
            title={bloqueado ? motivoBloqueio : undefined}
            onClick={() => onBaixar(n)}>
            <PackageMinus className="mr-1 h-3.5 w-3.5" /> Baixar
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

/* ---------- Dialogs ---------- */

function RequisitarAvulsaDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (numEme: string) => void;
}) {
  const [codpro, setCodpro] = useState('');
  const [codder, setCodder] = useState('');
  const [qtdeme, setQtdeme] = useState('');
  const [codtns, setCodtns] = useState(TNS_DEFAULTS.CONSUMO_AVULSO);
  const [coddep, setCoddep] = useState('');
  const [ccures, setCcures] = useState('');
  const [obseme, setObseme] = useState('');
  const req = useSidRequisitar();
  const sidWrite = useSidWriteEnabled();

  useEffect(() => { if (open) { /* reset nada */ } }, [open]);

  const submit = () => {
    if (!codpro || !qtdeme || !codtns || !coddep) { toast.error('Preencha produto, qtd, TNS e depósito'); return; }
    req.mutate(
      { codpro, codder: codder || undefined, qtdeme: Number(qtdeme), codtns, coddep: Number(coddep),
        ccures: ccures || undefined, obseme: obseme || undefined },
      {
        onSuccess: (res: any) => {
          const num = res?.numEme ?? res?.numeme ?? res?.NUMEME;
          if (num) { toast.success(`Requisição ${num} criada`); onCreated(String(num)); }
          else { toast.success('Requisição criada'); onOpenChange(false); }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Requisição avulsa (sem OP)</DialogTitle>
          <DialogDescription>
            POST /sid/requisitar. TNS default {TNS_DEFAULTS.CONSUMO_AVULSO} (consumo avulso) — o ERP valida a regra final.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>codpro *</Label><Input value={codpro} onChange={(e) => setCodpro(e.target.value)} /></div>
          <div><Label>codder</Label><Input value={codder} onChange={(e) => setCodder(e.target.value)} /></div>
          <div><Label>qtdeme *</Label><Input type="number" step="any" value={qtdeme} onChange={(e) => setQtdeme(e.target.value)} /></div>
          <div><Label>codtns *</Label><Input value={codtns} onChange={(e) => setCodtns(e.target.value)} /></div>
          <div><Label>coddep *</Label><Input type="number" value={coddep} onChange={(e) => setCoddep(e.target.value)} /></div>
          <div><Label>ccures</Label><Input value={ccures} onChange={(e) => setCcures(e.target.value)} /></div>
          <div className="sm:col-span-2">
            <Label>obseme</Label>
            <Textarea rows={2} value={obseme} onChange={(e) => setObseme(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={req.isPending || !sidWrite.enabled}
            title={!sidWrite.enabled ? sidWrite.reason : undefined}>
            {req.isPending ? 'Enviando…' : 'Enviar ao ERP'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmReservar({ item, codori, numorp, onClose }: {
  item: { comp: ComponenteOP; qtd: number } | null;
  codori?: string;
  numorp?: string;
  onClose: () => void;
}) {
  const reservar = useSidReservarComponente();
  const sidWrite = useSidWriteEnabled();
  if (!item || !codori || !numorp) return null;

  const submit = () => {
    reservar.mutate(
      {
        codori, numorp,
        codetg: item.comp.codetg,
        seqcmp: item.comp.seqcmp,
        qtd: item.qtd,
        codcmp: item.comp.codcmp,
        coddep: item.comp.deposito,
        lotes: [],
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reservar componente</DialogTitle>
          <DialogDescription>
            OP {codori}/{numorp} · componente {item.comp.codcmp} · qtd {item.qtd} · depósito {item.comp.deposito ?? '—'}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={reservar.isPending || !sidWrite.enabled}
            title={!sidWrite.enabled ? sidWrite.reason : undefined}>
            {reservar.isPending ? 'Reservando…' : 'Confirmar reserva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmBaixar({ item, codori, numorp, onClose, onChangeLot }: {
  item: { comp: ComponenteOP; qtd: number; codlot: string } | null;
  codori?: string;
  numorp?: string;
  onClose: () => void;
  onChangeLot: (v: string) => void;
}) {
  const baixar = useSidBaixarComponentes();
  const sidWrite = useSidWriteEnabled();
  if (!item || !codori || !numorp) return null;

  const submit = () => {
    baixar.mutate(
      {
        codori, numorp,
        codetg: item.comp.codetg,
        seqcmp: item.comp.seqcmp,
        qtd: item.qtd,
        codlot: item.codlot || undefined,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Baixar componente</DialogTitle>
          <DialogDescription>
            OP {codori}/{numorp} · componente {item.comp.codcmp} · qtd {item.qtd}.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label>Lote (opcional)</Label>
          <Input value={item.codlot} onChange={(e) => onChangeLot(e.target.value)} placeholder="codlot" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={baixar.isPending || !sidWrite.enabled}
            title={!sidWrite.enabled ? sidWrite.reason : undefined}>
            {baixar.isPending ? 'Baixando…' : 'Confirmar baixa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
