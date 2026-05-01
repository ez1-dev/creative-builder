import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSeniorDisconnectRules, type RuleRow } from '@/hooks/useSeniorDisconnectRules';

const DIAS = [
  { v: 0, lbl: 'Dom' }, { v: 1, lbl: 'Seg' }, { v: 2, lbl: 'Ter' },
  { v: 3, lbl: 'Qua' }, { v: 4, lbl: 'Qui' }, { v: 5, lbl: 'Sex' }, { v: 6, lbl: 'Sáb' },
];

export function SeniorRulesSection() {
  const { toast } = useToast();
  const { rules, whitelist, loading, reload } = useSeniorDisconnectRules();
  const [drafts, setDrafts] = useState<Record<string, RuleRow>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [newUser, setNewUser] = useState('');
  const [newMotivo, setNewMotivo] = useState('');
  const [addingWl, setAddingWl] = useState(false);

  useEffect(() => {
    const next: Record<string, RuleRow> = {};
    for (const r of rules) next[r.id] = r;
    setDrafts(next);
  }, [rules]);

  const update = (id: string, patch: Partial<RuleRow>) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  };
  const updateParam = (id: string, key: string, value: any) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], params: { ...d[id].params, [key]: value } } }));
  };

  const saveRule = async (id: string) => {
    const r = drafts[id];
    if (!r) return;
    setSaving(id);
    const { error } = await supabase
      .from('senior_disconnect_rules')
      .update({ enabled: r.enabled, params: r.params })
      .eq('id', id);
    setSaving(null);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Regra salva', description: r.nome });
      await reload();
    }
  };

  const addWhitelist = async () => {
    const u = newUser.trim();
    if (!u) return;
    setAddingWl(true);
    const { error } = await supabase
      .from('senior_disconnect_whitelist')
      .insert({ usuario: u.toUpperCase(), motivo: newMotivo.trim() || null });
    setAddingWl(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    setNewUser(''); setNewMotivo('');
    await reload();
  };

  const removeWhitelist = async (id: string) => {
    const { error } = await supabase.from('senior_disconnect_whitelist').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    await reload();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Regras de Desconexão Senior
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Regras avaliadas quando você clica em <strong>Aplicar regras agora</strong> em Monitor de Usuários Senior.
            Regras desligadas são ignoradas.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.map((r) => {
            const d = drafts[r.id] ?? r;
            return (
              <div key={r.id} className="rounded-md border p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{r.nome}</p>
                      <Badge variant="outline" className="font-mono text-[10px]">{r.rule_key}</Badge>
                    </div>
                    {r.descricao && <p className="text-xs text-muted-foreground">{r.descricao}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={!!d.enabled}
                      onCheckedChange={(v) => update(r.id, { enabled: v })}
                      id={`sw-${r.id}`}
                    />
                    <Label htmlFor={`sw-${r.id}`} className="text-xs">
                      {d.enabled ? 'Ligada' : 'Desligada'}
                    </Label>
                  </div>
                </div>

                {/* Params */}
                {r.rule_key === 'fora_horario' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Dias da semana sempre bloqueados</Label>
                      <div className="flex flex-wrap gap-1">
                        {DIAS.map((dia) => {
                          const selected = (d.params?.dias_semana ?? []).includes(dia.v);
                          return (
                            <Button
                              key={dia.v}
                              type="button"
                              size="sm"
                              variant={selected ? 'default' : 'outline'}
                              className="h-7 px-2 text-xs"
                              onClick={() => {
                                const cur: number[] = d.params?.dias_semana ?? [];
                                const next = selected ? cur.filter((x) => x !== dia.v) : [...cur, dia.v].sort();
                                updateParam(r.id, 'dias_semana', next);
                              }}
                            >
                              {dia.lbl}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Início bloqueio (h)</Label>
                        <Input
                          type="number" min={0} max={23}
                          value={Number(d.params?.hora_inicio_bloqueio ?? 22)}
                          onChange={(e) => updateParam(r.id, 'hora_inicio_bloqueio', Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Fim bloqueio (h)</Label>
                        <Input
                          type="number" min={0} max={23}
                          value={Number(d.params?.hora_fim_bloqueio ?? 6)}
                          onChange={(e) => updateParam(r.id, 'hora_fim_bloqueio', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {r.rule_key === 'ocioso_sem_modulo' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Min. de ociosidade</Label>
                      <Input
                        type="number" min={1}
                        value={Number(d.params?.minutos_sem_modulo ?? 30)}
                        onChange={(e) => updateParam(r.id, 'minutos_sem_modulo', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Códigos considerados ociosos (separados por vírgula)</Label>
                      <Input
                        value={(d.params?.modulos_considerados_ociosos ?? []).join(',')}
                        onChange={(e) => updateParam(r.id, 'modulos_considerados_ociosos',
                          e.target.value.split(',').map((s) => s.trim()))}
                        placeholder=", All, -"
                      />
                    </div>
                  </div>
                )}

                {r.rule_key === 'sessao_longa' && (
                  <div className="space-y-1 max-w-xs">
                    <Label className="text-xs">Horas máximas</Label>
                    <Input
                      type="number" min={1} max={48}
                      value={Number(d.params?.horas_maximo ?? 12)}
                      onChange={(e) => updateParam(r.id, 'horas_maximo', Number(e.target.value))}
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => saveRule(r.id)}
                    disabled={saving === r.id}
                  >
                    {saving === r.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                    Salvar
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Whitelist (usuários protegidos)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Usuários listados aqui nunca são desconectados pelas regras automáticas. Use para
            integrações automatizadas e contas administrativas.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Usuário Senior (ex.: RENATO)"
              value={newUser}
              onChange={(e) => setNewUser(e.target.value)}
              className="max-w-[220px]"
            />
            <Input
              placeholder="Motivo (opcional)"
              value={newMotivo}
              onChange={(e) => setNewMotivo(e.target.value)}
              className="max-w-[280px]"
            />
            <Button onClick={addWhitelist} disabled={!newUser.trim() || addingWl} className="gap-1">
              {addingWl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Adicionar
            </Button>
          </div>

          <Separator />

          {whitelist.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum usuário na whitelist.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {whitelist.map((w) => (
                <div key={w.id} className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1 text-xs">
                  <span className="font-mono font-medium">{w.usuario}</span>
                  {w.motivo && <span className="text-muted-foreground">— {w.motivo}</span>}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5"
                    onClick={() => removeWhitelist(w.id)}
                    title="Remover"
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
