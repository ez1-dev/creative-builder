import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, AlertTriangle, CheckCircle2, Info as InfoIcon, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  requisicoesApi,
  IntegracaoDesabilitadaError,
  RequisicaoApiError,
  ApiOfflineError,
  type ComponenteLookup,
  type CentroCustoLookup,
  type ProjetoLookup,
  type DepositoLookup,
} from '@/services/requisicoesApi';
import type { SidRequisitarResponse, TipoRequisicao, PrioridadeRequisicao } from '@/types/requisicoes';
import { IntegracaoOfflineBanner } from '@/components/requisicoes/IntegracaoOfflineBanner';
import { RemoteCombobox, highlight } from '@/components/requisicoes/RemoteCombobox';
import { OperadorBadge, useOperadorInfo } from '@/components/requisicoes/OperadorBadge';
import { useSidWriteEnabled } from '@/hooks/requisicoes';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** TNS default para consumo avulso — validado pelo ERP. */
const CODTNS_CONSUMO_AVULSO = '90250';

interface Linha {
  componente: ComponenteLookup | null;
  codcmp: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  depositoSugerido: DepositoLookup | null;
  observacao: string;
}

interface ResultadoLinha {
  linha: number;
  codigo: string;
  numeme: number | null;
  seqeme: number | null;
  resultado: string | null;
  aviso: string | null;
  erro?: string;
}

const linhaVazia = (): Linha => ({
  componente: null,
  codcmp: '', descricao: '', unidade: '',
  quantidade: 0,
  depositoSugerido: null,
  observacao: '',
});

const CC_OBRIGATORIO: TipoRequisicao[] = ['CONSUMO', 'EMERGENCIAL'];

export default function NovaRequisicaoAvulsaPage() {
  const nav = useNavigate();
  const [tipo, setTipo] = useState<TipoRequisicao>('CONSUMO');
  const [prioridade, setPrioridade] = useState<PrioridadeRequisicao>('NORMAL');
  const [codemp, setCodemp] = useState('1');
  const [codfil, setCodfil] = useState('1');
  const [setor, setSetor] = useState('');
  const [cc, setCc] = useState<CentroCustoLookup | null>(null);
  const [projeto, setProjeto] = useState<ProjetoLookup | null>(null);
  const [justificativa, setJustificativa] = useState('');
  const [obs, setObs] = useState('');
  const [linhas, setLinhas] = useState<Linha[]>([linhaVazia()]);
  const [busy, setBusy] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoLinha[] | null>(null);
  const sidWrite = useSidWriteEnabled();
  const operador = useOperadorInfo();

  const primeiroErroRef = useRef<HTMLInputElement | null>(null);

  // Rascunho local
  const RASCUNHO_KEY = 'requisicoes:avulsa:rascunho:v1';

  const setLinha = (i: number, patch: Partial<Linha>) =>
    setLinhas((arr) => arr.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLinha = () => setLinhas((arr) => [...arr, linhaVazia()]);
  const delLinha = (i: number) => setLinhas((arr) => arr.filter((_, idx) => idx !== i));

  const aplicarComponente = (i: number, c: ComponenteLookup | null) => {
    if (!c) {
      setLinha(i, { componente: null, codcmp: '', descricao: '', unidade: '' });
      return;
    }
    setLinha(i, {
      componente: c,
      codcmp: c.codigo,
      descricao: c.descricao,
      unidade: c.um,
    });
  };

  const ccObrigatorio = CC_OBRIGATORIO.includes(tipo);
  const linhasValidas = useMemo(
    () => linhas.filter((l) => l.componente && l.codcmp.trim() && l.quantidade > 0 && l.depositoSugerido),
    [linhas],
  );
  const dirty = useMemo(
    () => linhas.some((l) => l.componente || l.quantidade > 0 || l.observacao) || !!cc || !!projeto || !!justificativa || !!obs,
    [linhas, cc, projeto, justificativa, obs],
  );
  useUnsavedChangesGuard(dirty && !resultado, 'Você tem uma requisição em preenchimento. Sair mesmo assim?');

  const disableSubmit =
    busy ||
    !sidWrite.enabled ||
    !operador.ready ||
    linhasValidas.length === 0 ||
    (ccObrigatorio && !cc);

  const submit = async () => {
    setErroEnvio(null); setResultado(null);
    if (!operador.ready) {
      setErroEnvio(operador.motivo ?? 'Usuário não identificado.');
      return;
    }
    if (linhasValidas.length === 0) {
      setErroEnvio('Selecione ao menos um componente, informe quantidade e depósito sugerido.');
      primeiroErroRef.current?.focus();
      return;
    }
    if (ccObrigatorio && !cc) {
      setErroEnvio('Este tipo de requisição exige centro de custo.');
      return;
    }
    setBusy(true);
    const resultados: ResultadoLinha[] = [];
    try {
      let idx = 0;
      for (const l of linhasValidas) {
        idx += 1;
        const payload = {
          codpro: l.codcmp,
          codder: null,
          qtdeme: l.quantidade,
          codtns: CODTNS_CONSUMO_AVULSO,
          coddep: l.depositoSugerido!.codigo,
          ccures: cc?.codccu ?? undefined,
          obseme: l.observacao || obs || justificativa || undefined,
          // metadados de auditoria (o backend pode ignorar campos extra)
          origem_usuario_portal: operador.portalLogin,
          origem_usuario_erp: operador.erpUser,
        };
        try {
          const res = await requisicoesApi.sidRequisitar(payload) as SidRequisitarResponse;
          resultados.push({
            linha: idx,
            codigo: l.codcmp,
            numeme: typeof res?.numeme === 'number' ? res.numeme : null,
            seqeme: typeof res?.seqeme === 'number' ? res.seqeme : null,
            resultado: res?.resultado ?? null,
            aviso: res?.aviso_parse ?? null,
          });
        } catch (err) {
          const detail = err instanceof RequisicaoApiError ? (err.detail ?? err.message)
            : err instanceof IntegracaoDesabilitadaError ? (err.detail ?? err.message)
            : err instanceof ApiOfflineError ? 'Falha de comunicação com o servidor. Não foi possível confirmar se o ERP concluiu a operação. Consulte o ERP antes de reenviar.'
            : (err as Error)?.message ?? 'Erro desconhecido';
          resultados.push({
            linha: idx,
            codigo: l.codcmp,
            numeme: null, seqeme: null, resultado: null, aviso: null,
            erro: detail,
          });
          setResultado(resultados);
          setErroEnvio(`Falha ao enviar o item ${l.codcmp}: ${detail}`);
          setBusy(false);
          return;
        }
      }
      setResultado(resultados);
      try { localStorage.removeItem(RASCUNHO_KEY); } catch { /* noop */ }
      toast({ title: 'Requisições enviadas ao ERP', description: `${resultados.length} item(ns) processado(s).` });
    } finally {
      setBusy(false);
    }
  };

  const limparFormulario = () => {
    setLinhas([linhaVazia()]);
    setCc(null); setProjeto(null); setJustificativa(''); setObs('');
    setResultado(null); setErroEnvio(null);
  };

  const salvarRascunhoLocal = () => {
    try {
      const dump = { tipo, prioridade, codemp, codfil, setor, cc, projeto, justificativa, obs, linhas };
      localStorage.setItem(RASCUNHO_KEY, JSON.stringify(dump));
      toast({ title: 'Rascunho salvo somente neste navegador' });
    } catch {
      toast({ title: 'Não foi possível salvar o rascunho local', variant: 'destructive' });
    }
  };

  const restaurarRascunho = () => {
    try {
      const raw = localStorage.getItem(RASCUNHO_KEY);
      if (!raw) { toast({ title: 'Sem rascunho salvo neste navegador' }); return; }
      const d = JSON.parse(raw);
      setTipo(d.tipo ?? 'CONSUMO'); setPrioridade(d.prioridade ?? 'NORMAL');
      setCodemp(d.codemp ?? '1'); setCodfil(d.codfil ?? '1'); setSetor(d.setor ?? '');
      setCc(d.cc ?? null); setProjeto(d.projeto ?? null);
      setJustificativa(d.justificativa ?? ''); setObs(d.obs ?? '');
      setLinhas(Array.isArray(d.linhas) && d.linhas.length ? d.linhas : [linhaVazia()]);
      toast({ title: 'Rascunho local restaurado' });
    } catch {
      toast({ title: 'Rascunho local corrompido', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nova requisição — sem OP"
        description="Consumo interno, manutenção, qualidade, administrativo ou transferência entre depósitos. Envio direto ao ERP Senior via SID."
      />

      <OperadorBadge />

      <IntegracaoOfflineBanner />

      {resultado ? (
        <ResultadoPanel
          resultado={resultado}
          onNova={() => { limparFormulario(); }}
          onIrParaLista={() => nav('/requisicoes')}
        />
      ) : null}

      {erroEnvio && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Não foi possível concluir a requisição</AlertTitle>
          <AlertDescription>{erroEnvio}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-12">
          <div className="md:col-span-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoRequisicao)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CONSUMO">Consumo</SelectItem>
                <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                <SelectItem value="DEVOLUCAO">Devolução</SelectItem>
                <SelectItem value="EMERGENCIAL">Emergencial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Prioridade</Label>
            <Select value={prioridade} onValueChange={(v) => setPrioridade(v as PrioridadeRequisicao)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BAIXA">Baixa</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="ALTA">Alta</SelectItem>
                <SelectItem value="URGENTE">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Empresa</Label>
            <Input value={codemp} onChange={(e) => setCodemp(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Filial</Label>
            <Input value={codfil} onChange={(e) => setCodfil(e.target.value)} />
          </div>
          <div className="md:col-span-4">
            <Label>Setor</Label>
            <Input value={setor} onChange={(e) => setSetor(e.target.value)} />
          </div>

          <div className="md:col-span-6">
            <Label>
              Centro de custo{ccObrigatorio && <span className="ml-0.5 text-destructive">*</span>}
            </Label>
            <RemoteCombobox<CentroCustoLookup>
              value={cc}
              onSelect={setCc}
              fetcher={(q) => requisicoesApi.buscarCentrosCusto({ q })}
              getKey={(i) => i.codccu}
              getLabel={(i) => `${i.codccu} — ${i.desccu}`}
              renderItem={(i, q) => (
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-semibold">{highlight(i.codccu, q)}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {highlight(i.desccu, q)}
                    {i.abreviacao ? ` · ${i.abreviacao}` : ''}
                  </span>
                </div>
              )}
              placeholder="Buscar centro de custo por código ou descrição"
            />
            {ccObrigatorio && !cc && (
              <p className="mt-1 text-[11px] text-destructive">Obrigatório para este tipo de requisição.</p>
            )}
          </div>

          <div className="md:col-span-6">
            <Label>Projeto / obra</Label>
            <RemoteCombobox<ProjetoLookup>
              value={projeto}
              onSelect={setProjeto}
              fetcher={(q) => requisicoesApi.buscarProjetos({ q })}
              getKey={(i) => String(i.numprj)}
              getLabel={(i) => `${i.numprj} — ${i.desprj ?? ''}`.trim()}
              renderItem={(i, q) => (
                <div className="flex flex-col">
                  <span className="text-xs font-semibold">
                    <span className="font-mono">{highlight(String(i.numprj), q)}</span>
                    {' — '}
                    {highlight(i.desprj ?? '', q)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {i.abreviacao ? `${i.abreviacao}` : ''}
                    {i.abreviacao && i.situacao_desc ? ' · ' : ''}
                    {i.situacao_desc ?? ''}
                  </span>
                </div>
              )}
              placeholder="Buscar projeto ou obra"
              unavailableMessage="A busca de projetos ainda não foi disponibilizada pela API."
            />
          </div>

          <div className="md:col-span-6">
            <Label>Justificativa</Label>
            <Input
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Motivo da requisição (obrigatório em EMERGENCIAL)"
              maxLength={200}
            />
          </div>
          <div className="md:col-span-6">
            <Label>Observações gerais</Label>
            <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} maxLength={500} />
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[280px]">Produto / componente</TableHead>
              <TableHead className="min-w-[220px]">Descrição</TableHead>
              <TableHead className="w-16">UM</TableHead>
              <TableHead className="w-24 text-right">Qtd</TableHead>
              <TableHead className="w-56">Depósito sugerido</TableHead>
              <TableHead>Obs. do item</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l, i) => (
              <TableRow key={i} className={l.codcmp && !l.componente ? 'bg-destructive/5' : undefined}>
                <TableCell>
                  <RemoteCombobox<ComponenteLookup>
                    value={l.componente}
                    onSelect={(c) => aplicarComponente(i, c)}
                    fetcher={(q) => requisicoesApi.buscarComponentes({ q })}
                    getKey={(c) => c.codigo}
                    getLabel={(c) => `${c.codigo} — ${c.descricao}`}
                    renderItem={(c, q) => (
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">
                          <span className="font-mono">{highlight(c.codigo, q)}</span>
                          {' — '}
                          {highlight(c.descricao, q)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">UM: {c.um || '—'}</span>
                      </div>
                    )}
                    placeholder="Buscar componente por código ou descrição"
                    popoverWidth={460}
                  />
                </TableCell>
                <TableCell>
                  <Input value={l.descricao} readOnly placeholder="—" className="h-8 bg-muted/40" />
                </TableCell>
                <TableCell>
                  <Input value={l.unidade} readOnly placeholder="—" className="h-8 w-14 bg-muted/40" />
                </TableCell>
                <TableCell>
                  <Input
                    ref={i === 0 ? primeiroErroRef : undefined}
                    type="number" step="0.001" min={0}
                    value={l.quantidade || ''}
                    onChange={(e) => setLinha(i, { quantidade: Number(e.target.value) || 0 })}
                    className="h-8 text-right"
                  />
                </TableCell>
                <TableCell>
                  <RemoteCombobox<DepositoLookup>
                    value={l.depositoSugerido}
                    onSelect={(d) => setLinha(i, { depositoSugerido: d })}
                    fetcher={(q) => requisicoesApi.buscarDepositos({ q, limit: 50 })}
                    getKey={(d) => String(d.codigo)}
                    getLabel={(d) => `${d.codigo} — ${d.descricao}`}
                    placeholder="Buscar depósito"
                    minChars={1}
                    popoverWidth={320}
                  />
                </TableCell>
                <TableCell><Input value={l.observacao} onChange={(e) => setLinha(i, { observacao: e.target.value })} className="h-8" maxLength={200} /></TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => delLinha(i)} disabled={linhas.length === 1}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t p-2 flex items-center justify-between">
          <Button size="sm" variant="ghost" onClick={addLinha}><Plus className="mr-1 h-4 w-4" /> Adicionar item</Button>
          <div className="flex items-start gap-1.5 pr-2 text-[11px] text-muted-foreground">
            <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>O depósito informado é uma <b>sugestão</b>. O depósito definitivo poderá ser determinado pelas regras do ERP durante o atendimento.</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={restaurarRascunho} disabled={busy}>Restaurar rascunho</Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={salvarRascunhoLocal} disabled={busy}>
              Salvar rascunho (local)
            </Button>
          </TooltipTrigger>
          <TooltipContent>Salva apenas neste navegador — o ERP não é notificado.</TooltipContent>
        </Tooltip>
        <Button variant="ghost" onClick={limparFormulario} disabled={busy}>Limpar</Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button onClick={submit} disabled={disableSubmit}>
                {busy ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Enviando…</> : 'Enviar requisição ao ERP'}
              </Button>
            </span>
          </TooltipTrigger>
          {!sidWrite.enabled && sidWrite.reason && <TooltipContent>{sidWrite.reason}</TooltipContent>}
          {sidWrite.enabled && !operador.ready && <TooltipContent>{operador.motivo}</TooltipContent>}
        </Tooltip>
      </div>
    </div>
  );
}

function ResultadoPanel({ resultado, onNova, onIrParaLista }: {
  resultado: ResultadoLinha[];
  onNova: () => void;
  onIrParaLista: () => void;
}) {
  const houveErro = resultado.some((r) => r.erro);
  return (
    <Card className={houveErro ? 'border-amber-500/50' : 'border-emerald-500/60 bg-emerald-500/5'}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          {houveErro
            ? <AlertTriangle className="h-5 w-5 text-amber-600" />
            : <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          <h3 className="text-base font-semibold">
            {houveErro ? 'Envio parcial' : 'Requisições enviadas ao ERP Senior'}
          </h3>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">#</TableHead>
                <TableHead>Componente</TableHead>
                <TableHead>Retorno</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultado.map((r) => (
                <TableRow key={r.linha}>
                  <TableCell>{r.linha}</TableCell>
                  <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                  <TableCell className="text-sm">
                    {r.erro && <Badge variant="destructive">{r.erro}</Badge>}
                    {!r.erro && typeof r.numeme === 'number' && (
                      <span>
                        Requisição <strong>{r.numeme}{r.seqeme != null ? `/${r.seqeme}` : ''}</strong> criada com sucesso no ERP Senior.
                      </span>
                    )}
                    {!r.erro && r.numeme == null && (
                      <span className="text-amber-800 dark:text-amber-200">
                        A requisição foi processada, mas o número não pôde ser interpretado automaticamente. Confira no ERP Senior.
                        {r.aviso && <em className="ml-1 text-xs">({r.aviso})</em>}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onIrParaLista}>Ver lista de requisições</Button>
          <Button onClick={onNova}>Nova requisição</Button>
        </div>
      </CardContent>
    </Card>
  );
}
