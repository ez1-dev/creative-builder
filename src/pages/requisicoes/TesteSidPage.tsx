import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, PlugZap, Trash2, Play } from 'lucide-react';
import { useSidStatus } from '@/hooks/requisicoes';
import { usePermissionsContext } from '@/contexts/PermissionsContext';
import { requisicoesApi, IntegracaoDesabilitadaError, RequisicaoApiError } from '@/services/requisicoesApi';
import { toast } from '@/hooks/use-toast';

const CONFIRMACAO = 'CONFIRMAR TESTE SID';

export default function TesteSidPage() {
  const { isAdmin, loading: permLoading } = usePermissions();
  const status = useSidStatus();

  const [form, setForm] = useState({
    codemp: '', codfil: '', codpro: '', codder: '',
    quantidade: '', codtns: '', coddep: '', observacao: '',
  });
  const [confirmacao, setConfirmacao] = useState('');
  const [execBusy, setExecBusy] = useState(false);
  const [ultimoRetorno, setUltimoRetorno] = useState<any>(null);
  const [ultimoNumeme, setUltimoNumeme] = useState<{ numeme?: string; seqeme?: string } | null>(null);

  if (permLoading) return null;
  if (!isAdmin) return <Navigate to="/requisicoes/configuracoes" replace />;

  const sidHabilitado = !!status.data?.sid_habilitado && !!status.data?.ger_sid?.wsdl_ok;

  const camposOk = form.codemp && form.codfil && form.codpro && form.quantidade && form.codtns && form.coddep;
  const podeExecutar = sidHabilitado && camposOk && confirmacao.trim().toUpperCase() === CONFIRMACAO;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleTratamento = (err: unknown, ctx: string) => {
    if (err instanceof IntegracaoDesabilitadaError) {
      toast({ title: 'Integração desabilitada', description: err.detail ?? 'SID_HABILITADO=false no backend.' });
    } else if (err instanceof RequisicaoApiError) {
      toast({ title: `Erro ao ${ctx}`, description: err.detail ?? err.message, variant: 'destructive' });
    } else {
      const msg = (err as Error)?.message ?? 'Erro desconhecido';
      toast({ title: `Erro ao ${ctx}`, description: msg, variant: 'destructive' });
    }
  };

  const executar = async () => {
    setExecBusy(true);
    try {
      const payload = {
        codemp: Number(form.codemp),
        codfil: Number(form.codfil),
        codpro: form.codpro.trim(),
        codder: form.codder.trim() || null,
        quantidade: Number(form.quantidade),
        codtns: form.codtns.trim(),
        coddep: Number(form.coddep),
        observacao: form.observacao || null,
      };
      const ret: any = await requisicoesApi.sidRequisitar(payload);
      setUltimoRetorno(ret);
      const numeme = ret?.numeme ?? ret?.NUMEME ?? ret?.numEme;
      const seqeme = ret?.seqeme ?? ret?.SEQEME ?? ret?.seqEme;
      if (numeme) {
        setUltimoNumeme({ numeme: String(numeme), seqeme: seqeme ? String(seqeme) : undefined });
        toast({ title: 'Requisição SID criada', description: `NUMEME=${numeme}${seqeme ? ` / SEQEME=${seqeme}` : ''}` });
      } else {
        toast({ title: 'Retorno recebido', description: 'Verifique o resultado abaixo.' });
      }
    } catch (err) {
      handleTratamento(err, 'executar teste SID');
    } finally {
      setExecBusy(false);
    }
  };

  const excluir = async () => {
    if (!ultimoNumeme?.numeme) return;
    setExecBusy(true);
    try {
      const ret: any = await requisicoesApi.sidExcluir({
        codemp: Number(form.codemp),
        codfil: Number(form.codfil),
        numeme: ultimoNumeme.numeme,
        seqeme: ultimoNumeme.seqeme,
      });
      setUltimoRetorno(ret);
      toast({ title: 'Exclusão SID enviada' });
      setUltimoNumeme(null);
    } catch (err) {
      handleTratamento(err, 'excluir requisição de teste');
    } finally {
      setExecBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Teste controlado — Integração SID"
        description={<Link to="/requisicoes/configuracoes" className="text-primary hover:underline">Voltar às configurações</Link> as any}
      />

      <Alert variant="destructive" className="border-orange-300 bg-orange-50 text-orange-900">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Área restrita a administradores</AlertTitle>
        <AlertDescription>
          Este teste poderá criar uma requisição real no ERP. Utilize somente ambiente de homologação ou
          dados previamente autorizados. Para habilitar o botão de execução digite exatamente:
          <code className="mx-1 rounded bg-orange-200/60 px-1">{CONFIRMACAO}</code>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Diagnóstico da conexão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => status.refetch()} disabled={status.isFetching}>
              <PlugZap className="mr-1 h-4 w-4" /> {status.isFetching ? 'Verificando…' : 'Ping'}
            </Button>
            <span className="text-muted-foreground">
              {status.data ? (sidHabilitado ? 'Escrita habilitada' : 'Escrita indisponível') : '—'}
            </span>
          </div>
          {status.data && (
            <ul className="text-xs text-muted-foreground">
              <li>co_ger_sid: {status.data.ger_sid.wsdl_ok ? 'OK' : 'indisponível'} · operação <code>{status.data.ger_sid.operacao}</code></li>
              <li>cha_separacao: {status.data.cha_separacao.wsdl_ok ? 'OK' : 'indisponível'} · operação <code>{status.data.cha_separacao.operacao}</code></li>
              {status.data.proximo_passo && <li>Próximo passo: {status.data.proximo_passo}</li>}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Parâmetros do teste</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div><Label>Empresa (CODEMP)</Label><Input value={form.codemp} onChange={set('codemp')} inputMode="numeric" /></div>
          <div><Label>Filial (CODFIL)</Label><Input value={form.codfil} onChange={set('codfil')} inputMode="numeric" /></div>
          <div><Label>Produto (CODPRO)</Label><Input value={form.codpro} onChange={set('codpro')} className="font-mono" /></div>
          <div><Label>Derivação (CODDER)</Label><Input value={form.codder} onChange={set('codder')} placeholder="opcional" /></div>
          <div><Label>Quantidade</Label><Input type="number" step="0.001" value={form.quantidade} onChange={set('quantidade')} /></div>
          <div><Label>Transação (CODTNS)</Label><Input value={form.codtns} onChange={set('codtns')} /></div>
          <div><Label>Depósito (CODDEP)</Label><Input value={form.coddep} onChange={set('coddep')} inputMode="numeric" /></div>
          <div className="md:col-span-4"><Label>Observação</Label><Textarea rows={2} value={form.observacao} onChange={set('observacao')} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Executar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-w-md">
            <Label>Confirmação</Label>
            <Input
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder={CONFIRMACAO}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={executar} disabled={!podeExecutar || execBusy}>
              <Play className="mr-1 h-4 w-4" /> {execBusy ? 'Executando…' : 'Executar requisição SID'}
            </Button>
            <Button
              variant="outline"
              onClick={excluir}
              disabled={!ultimoNumeme?.numeme || execBusy}
              className="text-red-700"
            >
              <Trash2 className="mr-1 h-4 w-4" /> Excluir requisição de teste
            </Button>
          </div>
          {!sidHabilitado && (
            <p className="text-xs text-amber-800">A execução exige o SID habilitado e o WSDL do co_ger_sid acessível.</p>
          )}
        </CardContent>
      </Card>

      {ultimoRetorno && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Retorno tratado</CardTitle>
          </CardHeader>
          <CardContent>
            {ultimoNumeme?.numeme && (
              <div className="mb-2 text-sm">
                NUMEME: <code>{ultimoNumeme.numeme}</code>
                {ultimoNumeme.seqeme && <> · SEQEME: <code>{ultimoNumeme.seqeme}</code></>}
              </div>
            )}
            <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(ultimoRetorno, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
