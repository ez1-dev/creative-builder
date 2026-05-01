import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PowerOff, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { avaliarSessoes, type Avaliacao, type Rule, type SessaoSeniorEval } from '@/lib/seniorRules';

const motivoSchema = z.string().trim().min(5, 'Mín. 5 caracteres').max(500);

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sessoes: SessaoSeniorEval[];
  rules: Rule[];
  whitelistUpper: string[];
  selfErpUser?: string;
  onCompleted: () => void | Promise<void>;
}

type ProgressItem = {
  numsec: number | string;
  usuario: string;
  status: 'pending' | 'ok' | 'fail';
  message?: string;
};

export function ApplyRulesDialog({
  open, onOpenChange, sessoes, rules, whitelistUpper, selfErpUser, onCompleted,
}: Props) {
  const { toast } = useToast();
  const [motivo, setMotivo] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [done, setDone] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Ao abrir o diálogo, marca por padrão as regras já habilitadas em Configurações.
  useEffect(() => {
    if (open) {
      setSelectedKeys(new Set(rules.filter((r) => r.enabled).map((r) => r.rule_key)));
    }
  }, [open, rules]);

  const rulesParaUsar = useMemo<Rule[]>(
    () => rules.filter((r) => selectedKeys.has(r.rule_key)).map((r) => ({ ...r, enabled: true })),
    [rules, selectedKeys],
  );

  const candidatos = useMemo<Avaliacao[]>(
    () => avaliarSessoes(sessoes, rulesParaUsar, whitelistUpper, new Date(), selfErpUser),
    [sessoes, rulesParaUsar, whitelistUpper, selfErpUser],
  );

  const porRegra = candidatos.reduce<Record<string, number>>((acc, a) => {
    acc[a.rule_key] = (acc[a.rule_key] ?? 0) + 1;
    return acc;
  }, {});

  const toggleKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const marcarTodas = () => setSelectedKeys(new Set(rules.map((r) => r.rule_key)));
  const desmarcarTodas = () => setSelectedKeys(new Set());

  const resumoParametros = (r: Rule): string => {
    const p = r.params ?? {};
    if (r.rule_key === 'fora_horario') {
      const ini = p.hora_inicio ?? 22;
      const fim = p.hora_fim ?? 6;
      return `fim de semana ou após ${ini}h e antes das ${fim}h`;
    }
    if (r.rule_key === 'ocioso_sem_modulo') {
      return `ocioso há mais de ${p.minutos_ocioso ?? 30} min`;
    }
    if (r.rule_key === 'sessao_longa') {
      return `conectado há mais de ${p.horas_max ?? 12}h`;
    }
    return '';
  };

  const reset = () => {
    setMotivo(''); setProgress([]); setDone(false); setRunning(false);
  };

  const handleClose = (o: boolean) => {
    if (running) return;
    if (!o) reset();
    onOpenChange(o);
  };

  const start = async () => {
    const parsed = motivoSchema.safeParse(motivo);
    if (!parsed.success) {
      toast({ title: 'Motivo inválido', description: parsed.error.issues[0].message, variant: 'destructive' });
      return;
    }
    if (candidatos.length === 0) return;

    const initial: ProgressItem[] = candidatos.map((c) => ({
      numsec: c.sessao.numsec,
      usuario: c.sessao.usuario_senior ?? '?',
      status: 'pending',
    }));
    setProgress(initial);
    setRunning(true);

    let okN = 0, failN = 0;
    for (let i = 0; i < candidatos.length; i++) {
      const c = candidatos[i];
      const motivoCompleto = `${parsed.data} — ${c.motivo}`;
      try {
        await api.post(`/api/senior/sessoes/${c.sessao.numsec}/desconectar`, {
          confirmar: true,
          motivo: motivoCompleto,
        });
        okN++;
        setProgress((prev) => prev.map((p, idx) => idx === i ? { ...p, status: 'ok' } : p));
      } catch (e: any) {
        failN++;
        setProgress((prev) => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'fail', message: e?.message ?? 'falhou' } : p));
      }
    }

    setRunning(false);
    setDone(true);
    toast({
      title: 'Lote concluído',
      description: `${okN} desconectada(s), ${failN} falha(s).`,
      variant: failN > 0 ? 'destructive' : 'default',
    });
    await onCompleted();
  };

  const total = progress.length;
  const concluidos = progress.filter((p) => p.status !== 'pending').length;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Aplicar regras de desconexão agora
          </DialogTitle>
          <DialogDescription>
            Avalia as regras ligadas contra as sessões ativas e desconecta as que baterem,
            respeitando a whitelist. Regras desligadas são ignoradas.
          </DialogDescription>
        </DialogHeader>

        {regrasAtivas.length === 0 ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Nenhuma regra está ligada.
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Ative pelo menos uma regra em Configurações → Regras de Desconexão Senior.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">{candidatos.length} sessão(ões) candidata(s)</Badge>
              {Object.entries(porRegra).map(([k, n]) => (
                <Badge key={k} variant="outline">{k}: {n}</Badge>
              ))}
            </div>

            {candidatos.length === 0 ? (
              <p className="rounded-md border bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
                Nenhuma sessão bate com as regras ativas neste momento.
              </p>
            ) : (
              <div className="max-h-[280px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sessão</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Computador</TableHead>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Min</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidatos.map((c, i) => {
                      const p = progress[i];
                      return (
                        <TableRow key={String(c.sessao.numsec) + i}>
                          <TableCell className="font-mono text-xs">{c.sessao.numsec}</TableCell>
                          <TableCell className="font-medium">{c.sessao.usuario_senior ?? '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.sessao.computador ?? '-'}</TableCell>
                          <TableCell className="text-xs">{c.sessao.modulo ?? c.sessao.cod_modulo ?? '-'}</TableCell>
                          <TableCell className="text-xs">{c.sessao.minutos_conectado ?? 0}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.motivo}</TableCell>
                          <TableCell>
                            {!p ? (
                              <Badge variant="outline" className="text-[10px]">aguardando</Badge>
                            ) : p.status === 'pending' ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : p.status === 'ok' ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 text-[10px]">ok</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]" title={p.message}>falhou</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {running && (
              <div className="space-y-1">
                <Progress value={pct} />
                <p className="text-xs text-muted-foreground">
                  {concluidos}/{total} processada(s)
                </p>
              </div>
            )}

            {!done && (
              <div className="space-y-2">
                <Label htmlFor="lote-motivo" className="text-xs">Motivo do lote (obrigatório)</Label>
                <Textarea
                  id="lote-motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ex.: Manutenção fim de semana — desconexão automática."
                  rows={2}
                  maxLength={500}
                  disabled={running}
                />
                <p className="text-[11px] text-muted-foreground">
                  O motivo será gravado em cada log junto com a regra que disparou.
                </p>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={running}>
            {done ? 'Fechar' : 'Cancelar'}
          </Button>
          {!done && (
            <Button
              variant="destructive"
              onClick={start}
              disabled={running || candidatos.length === 0 || regrasAtivas.length === 0}
              className="gap-1"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PowerOff className="h-4 w-4" />}
              Confirmar desconexão em lote
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
