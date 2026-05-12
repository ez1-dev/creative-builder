import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { z } from 'zod';
import { toast } from 'sonner';
import { seniorApi } from '@/lib/senior/api';
import type { RegraLSP, AmbienteRegra } from '@/lib/senior/types';
import { PageHeader } from '@/components/erp/PageHeader';
import { AvisoErpBanner } from './AvisoErpBanner';
import { RegraWorkflowToolbar } from './RegraWorkflowToolbar';
import { VerVersoesDialog } from './VerVersoesDialog';

const schema = z.object({
  nome_regra: z.string().trim().min(1, 'Informe o nome').max(200),
  codreg_erp: z.coerce.number().int().nonnegative().optional().or(z.literal('').transform(() => undefined)),
  modsis: z.string().trim().max(20).optional(),
  idereg: z.string().trim().max(50).optional(),
  codtns: z.string().trim().max(50).optional(),
  descricao: z.string().trim().max(2000).optional(),
  ambiente: z.enum(['producao', 'homologacao', 'desenvolvimento']).optional(),
  ticket: z.string().trim().max(100).optional(),
  motivo: z.string().trim().min(1, 'Informe o motivo').max(1000),
  fonte_lsp: z.string().min(1, 'Informe a fonte LSP').max(200000),
});

type FormState = {
  nome_regra: string; codreg_erp: string; modsis: string; idereg: string; codtns: string;
  descricao: string; ambiente: AmbienteRegra | ''; ticket: string; motivo: string; fonte_lsp: string;
};

const empty: FormState = {
  nome_regra: '', codreg_erp: '', modsis: '', idereg: '', codtns: '',
  descricao: '', ambiente: '', ticket: '', motivo: '', fonte_lsp: '',
};

export function RegraForm({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [sp] = useSearchParams();
  const readOnly = mode === 'edit' && sp.get('edit') !== '1';
  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [regra, setRegra] = useState<RegraLSP | null>(null);
  const [versoesOpen, setVersoesOpen] = useState(false);

  const recarregar = () => {
    if (mode !== 'edit' || !id) return;
    setLoading(true);
    seniorApi.obterRegra(id)
      .then((r: RegraLSP) => {
        setRegra(r);
        setForm({
          nome_regra: r.nome_regra ?? '',
          codreg_erp: r.codreg_erp != null ? String(r.codreg_erp) : '',
          modsis: r.modsis ?? '', idereg: r.idereg ?? '', codtns: r.codtns ?? '',
          descricao: r.descricao ?? '', ambiente: (r.ambiente as AmbienteRegra) ?? '',
          ticket: r.ticket ?? '', motivo: r.motivo ?? '', fonte_lsp: r.fonte_lsp ?? '',
        });
      })
      .catch((e) => toast.error(e?.message ?? 'Erro ao carregar regra'))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { recarregar(); }, [id, mode]);

  const validarRiscos = async () => {
    if (!id) return;
    const r = await seniorApi.validarRegra(id);
    if (!r?.avisos?.length) {
      toast.success('Nenhum risco identificado.');
    } else {
      r.avisos.forEach((a) => {
        const fn = a.nivel === 'error' ? toast.error : a.nivel === 'warning' ? toast.warning : toast.info;
        fn(a.mensagem);
      });
    }
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const parsed = schema.safeParse({
      ...form,
      codreg_erp: form.codreg_erp === '' ? undefined : form.codreg_erp,
      ambiente: form.ambiente || undefined,
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first?.message ?? 'Verifique os campos');
      return;
    }
    setSaving(true);
    try {
      if (mode === 'edit' && id) {
        await seniorApi.atualizarRegra(id, parsed.data as Partial<RegraLSP>);
        toast.success('Regra atualizada.');
      } else {
        await seniorApi.criarRegra(parsed.data as Partial<RegraLSP>);
        toast.success('Regra criada.');
      }
      navigate('/regras-senior/regras');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={mode === 'edit' ? `Regra LSP #${id}` : 'Nova regra LSP'}
        description={readOnly ? 'Visualização da regra (somente leitura).' : 'Preencha os campos e salve para registrar.'}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate('/regras-senior/regras')}>Cancelar</Button>
            {!readOnly && <Button onClick={submit} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</Button>}
          </>
        }
      />
      <AvisoErpBanner />
      {mode === 'edit' && regra && (
        <RegraWorkflowToolbar
          regra={regra}
          onChanged={recarregar}
          onValidar={validarRiscos}
          onVerVersoes={() => setVersoesOpen(true)}
        />
      )}
      {versoesOpen && id && (
        <VerVersoesDialog regraId={id} onClose={() => setVersoesOpen(false)} />
      )}

      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Nome da regra *</label>
            <Input value={form.nome_regra} disabled={readOnly} onChange={(e) => set('nome_regra', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Código ERP</label>
            <Input value={form.codreg_erp} disabled={readOnly} onChange={(e) => set('codreg_erp', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Módulo (MODSIS)</label>
            <Input value={form.modsis} disabled={readOnly} onChange={(e) => set('modsis', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Identificador (IDEREG)</label>
            <Input value={form.idereg} disabled={readOnly} onChange={(e) => set('idereg', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Transação (CODTNS)</label>
            <Input value={form.codtns} disabled={readOnly} onChange={(e) => set('codtns', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Ambiente</label>
            <Select value={form.ambiente || 'none'} onValueChange={(v) => set('ambiente', v === 'none' ? '' : (v as AmbienteRegra))} disabled={readOnly}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="producao">Produção</SelectItem>
                <SelectItem value="homologacao">Homologação</SelectItem>
                <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Ticket</label>
            <Input value={form.ticket} disabled={readOnly} onChange={(e) => set('ticket', e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs text-muted-foreground">Descrição</label>
            <Textarea value={form.descricao} disabled={readOnly} onChange={(e) => set('descricao', e.target.value)} rows={2} />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs text-muted-foreground">Motivo *</label>
            <Textarea value={form.motivo} disabled={readOnly} onChange={(e) => set('motivo', e.target.value)} rows={2} />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs text-muted-foreground">Fonte LSP *</label>
            <Textarea
              value={form.fonte_lsp}
              disabled={readOnly}
              onChange={(e) => set('fonte_lsp', e.target.value)}
              className="min-h-[400px] font-mono text-xs leading-5"
              spellCheck={false}
              placeholder="-- Insira aqui o código LSP da regra"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
