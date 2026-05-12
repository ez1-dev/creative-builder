import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, CheckCircle2, XCircle, FileDown, Wrench, FlaskConical, Rocket, Power, PowerOff, ShieldAlert, History } from 'lucide-react';
import { toast } from 'sonner';
import { seniorApi } from '@/lib/senior/api';
import type { StatusRegra, RegraLSP } from '@/lib/senior/types';
import { StatusRegraBadge } from './StatusRegraBadge';
import { useIsSeniorAdmin } from '@/hooks/useIsSeniorAdmin';

interface Transition {
  to: StatusRegra; label: string; icon: any; variant?: 'default' | 'outline' | 'destructive'; danger?: boolean;
}

const TRANSITIONS: Partial<Record<StatusRegra, Transition[]>> = {
  rascunho: [{ to: 'em_revisao', label: 'Enviar p/ revisão', icon: Send }],
  em_revisao: [
    { to: 'aprovada', label: 'Aprovar', icon: CheckCircle2 },
    { to: 'rejeitada', label: 'Reprovar', icon: XCircle, variant: 'destructive' },
  ],
  aprovada: [{ to: 'exportada', label: 'Marcar exportada', icon: FileDown }],
  exportada: [{ to: 'compilada_homologacao', label: 'Compilada (homol.)', icon: Wrench }],
  compilada_homologacao: [{ to: 'testada_homologacao', label: 'Testada (homol.)', icon: FlaskConical }],
  testada_homologacao: [{ to: 'publicada_producao', label: 'Publicar em produção', icon: Rocket, danger: true }],
  publicada_producao: [
    { to: 'ativa', label: 'Ativar', icon: Power, danger: true },
    { to: 'inativa', label: 'Inativar', icon: PowerOff, variant: 'outline', danger: true },
  ],
  ativa: [{ to: 'inativa', label: 'Inativar', icon: PowerOff, variant: 'outline', danger: true }],
  inativa: [{ to: 'ativa', label: 'Ativar', icon: Power, danger: true }],
};

export function RegraWorkflowToolbar({ regra, onChanged, onValidar, onVerVersoes }: {
  regra: RegraLSP;
  onChanged: () => void;
  onValidar: () => void;
  onVerVersoes: () => void;
}) {
  const { isSeniorAdmin } = useIsSeniorAdmin();
  const [trans, setTrans] = useState<Transition | null>(null);
  const [motivo, setMotivo] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [saving, setSaving] = useState(false);

  const transitions = TRANSITIONS[regra.status_regra] ?? [];

  const disabled = !motivo.trim() || (trans?.danger ? !confirmar : false) || saving;

  const submit = async () => {
    if (!trans) return;
    setSaving(true);
    try {
      await seniorApi.alterarStatusRegra(regra.id, trans.to, motivo.trim());
      toast.success(`Status alterado para ${trans.label}.`);
      setTrans(null); setMotivo(''); setConfirmar(false);
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao alterar status');
    } finally { setSaving(false); }
  };

  const exportar = () => {
    try { window.open(seniorApi.exportarRegraTxtUrl(regra.id), '_blank'); }
    catch { toast.error('Não foi possível exportar.'); }
  };

  return (
    <>
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <div className="mr-2 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldAlert className="h-3.5 w-3.5" /> Status atual:
          </div>
          <StatusRegraBadge value={regra.status_regra} />
          <div className="ml-auto flex flex-wrap gap-2">
            {transitions.map((t) => (
              <Button
                key={t.to}
                size="sm"
                variant={t.variant ?? 'default'}
                disabled={t.danger && !isSeniorAdmin}
                title={t.danger && !isSeniorAdmin ? 'Somente administradores' : t.label}
                onClick={() => setTrans(t)}
              >
                <t.icon className="mr-1 h-3.5 w-3.5" />{t.label}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={exportar}><FileDown className="mr-1 h-3.5 w-3.5" />Exportar TXT</Button>
            <Button size="sm" variant="outline" onClick={onValidar}><ShieldAlert className="mr-1 h-3.5 w-3.5" />Validar riscos</Button>
            <Button size="sm" variant="ghost" onClick={onVerVersoes}><History className="mr-1 h-3.5 w-3.5" />Ver versões</Button>
          </div>
        </CardContent>
      </Card>

      {trans && (
        <Dialog open onOpenChange={(o) => !o && setTrans(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{trans.label} — {regra.nome_regra}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <StatusRegraBadge value={regra.status_regra} />
                <span className="text-muted-foreground">→</span>
                <StatusRegraBadge value={trans.to} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Motivo *</label>
                <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} />
              </div>
              {trans.danger && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={confirmar} onCheckedChange={(c) => setConfirmar(c === true)} />
                  Confirmo a transição (afeta o ERP Senior).
                </label>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setTrans(null)}>Cancelar</Button>
              <Button onClick={submit} disabled={disabled}>{saving ? 'Salvando…' : 'Confirmar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
