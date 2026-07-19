import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CircleCheck, CircleAlert, CircleX, CircleDashed, FlaskConical } from 'lucide-react';
import { useConfigRequisicoes, useAtualizarConfiguracoes, useSidStatus } from '@/hooks/requisicoes';
import { usePermissionsContext } from '@/contexts/PermissionsContext';
import type { ConfigRequisicoes, TipoRequisicao, SidServicoStatus } from '@/types/requisicoes';

const TIPOS: TipoRequisicao[] = ['OP', 'CONSUMO', 'TRANSFERENCIA', 'DEVOLUCAO', 'EMERGENCIAL'];

type Cor = 'verde' | 'amarelo' | 'vermelho' | 'azul';

function corGeral(loading: boolean, data: ReturnType<typeof useSidStatus>['data']): { cor: Cor; label: string } {
  if (loading || !data) return { cor: 'azul', label: 'Verificando…' };
  const gerOk = !!data.ger_sid?.wsdl_ok;
  const chaOk = !!data.cha_separacao?.wsdl_ok;
  if (!gerOk || !chaOk) return { cor: 'vermelho', label: 'Serviço inacessível' };
  if (!data.sid_habilitado) return { cor: 'amarelo', label: 'Escrita desabilitada' };
  return { cor: 'verde', label: 'Integração operacional' };
}

const CORES: Record<Cor, string> = {
  verde:    'bg-emerald-100 text-emerald-800 border-emerald-200',
  amarelo:  'bg-amber-100 text-amber-800 border-amber-200',
  vermelho: 'bg-red-100 text-red-800 border-red-200',
  azul:     'bg-blue-100 text-blue-800 border-blue-200',
};

const ICONES: Record<Cor, JSX.Element> = {
  verde:    <CircleCheck className="h-4 w-4" />,
  amarelo:  <CircleAlert className="h-4 w-4" />,
  vermelho: <CircleX className="h-4 w-4" />,
  azul:     <CircleDashed className="h-4 w-4 animate-spin" />,
};

function LinhaServico({ nome, s }: { nome: string; s: SidServicoStatus | undefined }) {
  if (!s) return null;
  const ok = !!s.wsdl_ok;
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border bg-card p-3">
      <div className="text-sm">
        <div className="font-medium">{nome}</div>
        <div className="text-xs text-muted-foreground">Operação: <code>{s.operacao}</code></div>
        {!ok && s.erro && <div className="mt-1 text-xs text-red-700">Erro: {s.erro}</div>}
      </div>
      <Badge variant="outline" className={ok ? CORES.verde : CORES.vermelho}>
        {ok ? 'WSDL OK' : 'Indisponível'}
      </Badge>
    </div>
  );
}


export default function ConfiguracoesRequisicoesPage() {
  const q = useConfigRequisicoes();
  const salvar = useAtualizarConfiguracoes();
  const sid = useSidStatus();
  const { isAdmin } = usePermissionsContext();
  const [form, setForm] = useState<ConfigRequisicoes | null>(null);
  const [ultimoPing, setUltimoPing] = useState<Date | null>(null);

  useEffect(() => { if (q.data) setForm(q.data); }, [q.data]);
  useEffect(() => { if (sid.dataUpdatedAt) setUltimoPing(new Date(sid.dataUpdatedAt)); }, [sid.dataUpdatedAt]);

  const geral = corGeral(sid.isLoading, sid.data);

  const secaoSid = (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Integração Senior SID</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`gap-1 ${CORES[geral.cor]}`}>
            {ICONES[geral.cor]} {geral.label}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => sid.refetch()} disabled={sid.isFetching}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${sid.isFetching ? 'animate-spin' : ''}`} /> Testar conexão
          </Button>
          {isAdmin && (
            <Button asChild size="sm" variant="ghost">
              <Link to="/requisicoes/configuracoes/teste-sid">
                <FlaskConical className="mr-1 h-3.5 w-3.5" /> Teste controlado
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid gap-2 md:grid-cols-2">
          <LinhaServico nome="co_ger_sid" s={sid.data?.ger_sid} />
          <LinhaServico nome="cha_separacao" s={sid.data?.cha_separacao} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            Escrita: <strong>{sid.data?.sid_habilitado ? 'habilitada' : 'desabilitada'}</strong>
            {' · '}Última verificação: {ultimoPing ? ultimoPing.toLocaleString('pt-BR') : '—'}
          </span>
          {sid.data?.proximo_passo && <span>Próximo passo: {sid.data.proximo_passo}</span>}
        </div>
        <p className="text-xs text-muted-foreground">
          A variável <code>SID_HABILITADO</code> é controlada exclusivamente pelo backend. Esta tela apenas consulta o status.
        </p>
      </CardContent>
    </Card>
  );

  if (q.isLoading || !form) {
    return (
      <div className="space-y-4">
        <PageHeader title="Configurações — Requisição de Materiais" />
        {secaoSid}
        <Card><CardContent className="space-y-2 p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    );
  }

  const toggleTipo = (t: TipoRequisicao) => {
    setForm((f) => f && ({
      ...f,
      tipos_habilitados: f.tipos_habilitados.includes(t)
        ? f.tipos_habilitados.filter((x) => x !== t)
        : [...f.tipos_habilitados, t],
    }));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Configurações — Requisição de Materiais"
        description="Parâmetros aplicados a todo o módulo. As regras finais permanecem no ERP; aqui só definimos comportamento da interface."
      />

      {secaoSid}


      <Card>
        <CardContent className="space-y-4 p-4">
          <div>
            <Label className="mb-2 block">Tipos habilitados</Label>
            <div className="flex flex-wrap gap-3">
              {TIPOS.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.tipos_habilitados.includes(t)} onCheckedChange={() => toggleTipo(t)} />
                  {t}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Depósitos permitidos (separados por vírgula)</Label>
              <Input
                value={form.depositos_permitidos.join(', ')}
                onChange={(e) => setForm({
                  ...form,
                  depositos_permitidos: e.target.value.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n)),
                })}
              />
            </div>
            <div>
              <Label>Famílias bloqueadas</Label>
              <Input
                value={(form.familias_bloqueadas ?? []).join(', ')}
                onChange={(e) => setForm({
                  ...form,
                  familias_bloqueadas: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Exige aprovação</Label>
                <div className="text-xs text-muted-foreground">Se desligado, requisições vão direto ao almoxarifado.</div>
              </div>
              <Switch
                checked={form.exige_aprovacao}
                onCheckedChange={(v) => setForm({ ...form, exige_aprovacao: v })}
              />
            </div>
            <div>
              <Label>Limite de aprovação automática (R$)</Label>
              <Input
                type="number" step="0.01"
                value={form.limite_aprovacao_automatica ?? ''}
                onChange={(e) => setForm({ ...form, limite_aprovacao_automatica: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
            <div>
              <Label>Tolerância acima do disponível na OP (%)</Label>
              <Input
                type="number" step="0.1"
                value={form.tolerancia_op_pct}
                onChange={(e) => setForm({ ...form, tolerancia_op_pct: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>SLA de atendimento (horas)</Label>
              <Input
                type="number"
                value={form.sla_horas ?? ''}
                onChange={(e) => setForm({ ...form, sla_horas: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          </div>

          <div>
            <Label>Observações internas</Label>
            <Textarea rows={3} value={form.observacoes ?? ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => salvar.mutate(form)} disabled={salvar.isPending}>
              {salvar.isPending ? 'Salvando…' : 'Salvar configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
