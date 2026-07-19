import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useConfigRequisicoes, useAtualizarConfiguracoes } from '@/hooks/requisicoes';
import type { ConfigRequisicoes, TipoRequisicao } from '@/types/requisicoes';

const TIPOS: TipoRequisicao[] = ['OP', 'CONSUMO', 'TRANSFERENCIA', 'DEVOLUCAO', 'EMERGENCIAL'];

export default function ConfiguracoesRequisicoesPage() {
  const q = useConfigRequisicoes();
  const salvar = useAtualizarConfiguracoes();
  const [form, setForm] = useState<ConfigRequisicoes | null>(null);

  useEffect(() => { if (q.data) setForm(q.data); }, [q.data]);

  if (q.isLoading || !form) {
    return (
      <div className="space-y-4">
        <PageHeader title="Configurações — Requisição de Materiais" />
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
