import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Loader2, Sparkles, Save } from 'lucide-react';
import { formatCurrency } from '@/components/bi/utils/formatters';
import {
  classificarLancamento, simularClassificacao,
  DRE_CLASSIFICACAO_ESCOPOS, DRE_LINHAS_DESTINO,
  type DreClassificacaoEscopo, type DreClassificarSimulacao,
} from '@/lib/bi/dreClassificarApi';

export interface DreClassificarModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  codigoLinhaOrigem: string;
  periodo: { ano: number; mes_ini: string; mes_fim: string; unidade?: string };
  /** Dados do lançamento para pré-preencher e enviar. */
  lancamento: {
    anomes_referente?: number | string | null;
    nr_lancamento?: string | null;
    nr_lote?: string | null;
    nr_documento?: string | null;
    cd_mascara?: string | null;
    cd_conta_contabil?: string | null;
    cd_centro_custos?: string | null;
    cd_centro_custos_3?: string | null;
    cd_origem_lcto?: string | null;
    cd_tns?: string | null;
    ds_historico?: string | null;
    vl_realizado?: number | null;
  };
  onSaved?: () => void;
}

const Field = ({ label, value }: { label: string; value: any }) => (
  <div className="space-y-0.5">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-xs font-medium truncate" title={String(value ?? '-')}>
      {value === null || value === undefined || value === '' ? '-' : String(value)}
    </div>
  </div>
);

export function DreClassificarModal({
  open, onOpenChange, codigoLinhaOrigem, periodo, lancamento, onSaved,
}: DreClassificarModalProps) {
  const [destino, setDestino] = useState<string>('NAO_CLASSIFICADO');
  const [escopo, setEscopo] = useState<DreClassificacaoEscopo>('LANCAMENTO');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [simulando, setSimulando] = useState(false);
  const [simulacao, setSimulacao] = useState<DreClassificarSimulacao | null>(null);

  useEffect(() => {
    if (!open) return;
    setDestino('NAO_CLASSIFICADO');
    setEscopo('LANCAMENTO');
    setMotivo('');
    setSimulacao(null);
  }, [open]);

  const buildPayload = () => ({
    anomes_referente: lancamento.anomes_referente != null
      ? Number(lancamento.anomes_referente) || null : null,
    nr_lancamento: lancamento.nr_lancamento ?? null,
    nr_lote: lancamento.nr_lote ?? null,
    nr_documento: lancamento.nr_documento ?? null,
    cd_mascara: lancamento.cd_mascara ?? null,
    cd_conta_contabil: lancamento.cd_conta_contabil ?? null,
    cd_centro_custos: lancamento.cd_centro_custos ?? null,
    cd_centro_custos_3: lancamento.cd_centro_custos_3 ?? null,
    cd_origem_lcto: lancamento.cd_origem_lcto ?? null,
    cd_tns: lancamento.cd_tns ?? null,
    ds_historico: lancamento.ds_historico ?? null,
    vl_realizado: lancamento.vl_realizado ?? null,
    codigo_linha_origem: codigoLinhaOrigem,
    codigo_linha_destino: destino,
    escopo,
    motivo: motivo.trim(),
  });

  const handleSimular = async () => {
    if (destino === codigoLinhaOrigem) {
      toast.error('Linha destino deve ser diferente da origem.');
      return;
    }
    setSimulando(true);
    setSimulacao(null);
    try {
      const r = await simularClassificacao({
        ...buildPayload(),
        ano: periodo.ano,
        mes_ini: periodo.mes_ini,
        mes_fim: periodo.mes_fim,
        unidade: periodo.unidade,
      });
      setSimulacao(r);
    } catch (e: any) {
      toast.error(`Falha ao simular: ${e?.message ?? e}`);
    } finally {
      setSimulando(false);
    }
  };

  const handleSalvar = async () => {
    if (!motivo.trim()) {
      toast.error('Informe o motivo.');
      return;
    }
    if (destino === codigoLinhaOrigem) {
      toast.error('Linha destino deve ser diferente da origem.');
      return;
    }
    setSaving(true);
    try {
      const r = await classificarLancamento(buildPayload());
      if (r.status === 'PENDENTE_APROVACAO') {
        toast.success('Regra definitiva enviada para aprovação.');
      } else {
        toast.success('Classificação registrada.');
      }
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast.error(`Falha ao salvar: ${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  const labelSalvar = escopo === 'REGRA_DEFINITIVA' ? 'Enviar para aprovação' : 'Salvar classificação';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Classificar lançamento</DialogTitle>
          <DialogDescription className="text-xs">
            Reclassifique o lançamento em uma linha específica da DRE. Escopos amplos
            (Documento, Combinação, Regra Definitiva) afetam mais de um lançamento.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-3 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
          <Field label="Anomes Ref." value={lancamento.anomes_referente} />
          <Field label="Linha atual" value={codigoLinhaOrigem} />
          <Field label="Valor" value={lancamento.vl_realizado != null ? formatCurrency(Number(lancamento.vl_realizado)) : '-'} />
          <Field label="Lançamento" value={lancamento.nr_lancamento} />
          <Field label="Lote" value={lancamento.nr_lote} />
          <Field label="Documento" value={lancamento.nr_documento} />
          <Field label="Máscara" value={lancamento.cd_mascara} />
          <Field label="Conta Contábil" value={lancamento.cd_conta_contabil} />
          <Field label="TNS" value={lancamento.cd_tns} />
          <Field label="Centro Custos" value={lancamento.cd_centro_custos} />
          <Field label="Centro Custos 3" value={lancamento.cd_centro_custos_3} />
          <Field label="Origem Lcto" value={lancamento.cd_origem_lcto} />
          <div className="col-span-2 md:col-span-3">
            <Field label="Histórico" value={lancamento.ds_historico} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="space-y-1">
            <Label className="text-xs">Linha destino *</Label>
            <Select value={destino} onValueChange={setDestino}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {DRE_LINHAS_DESTINO.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Escopo da classificação *</Label>
            <RadioGroup
              value={escopo}
              onValueChange={(v) => { setEscopo(v as DreClassificacaoEscopo); setSimulacao(null); }}
              className="space-y-1.5"
            >
              {DRE_CLASSIFICACAO_ESCOPOS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-start gap-2 rounded-md border px-2.5 py-1.5 cursor-pointer hover:bg-accent/40"
                  title={opt.descricao}
                >
                  <RadioGroupItem value={opt.value} id={`esc-${opt.value}`} className="mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium">{opt.label}</div>
                    <div className="text-[10.5px] text-muted-foreground leading-tight">{opt.descricao}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>
        </div>

        <div className="mt-2">
          <Label className="text-xs">Motivo *</Label>
          <Textarea
            rows={2}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="text-xs"
            placeholder="Explique por que esse lançamento (ou grupo) deve ser reclassificado."
          />
        </div>

        {simulacao && (
          <div className="rounded-md border bg-card p-3 mt-2 space-y-2">
            <div className="text-xs font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Impacto simulado
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded border p-2">
                <div className="text-[10px] text-muted-foreground uppercase">{simulacao.linha_origem.codigo}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground line-through tabular-nums">{formatCurrency(simulacao.linha_origem.antes)}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(simulacao.linha_origem.depois)}</span>
                </div>
              </div>
              <div className="rounded border p-2">
                <div className="text-[10px] text-muted-foreground uppercase">{simulacao.linha_destino.codigo}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground line-through tabular-nums">{formatCurrency(simulacao.linha_destino.antes)}</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(simulacao.linha_destino.depois)}</span>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Lançamentos afetados: <span className="font-medium text-foreground">{simulacao.qtd_lancamentos_afetados}</span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button variant="secondary" onClick={handleSimular} disabled={simulando || saving}>
            {simulando ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
            Simular impacto
          </Button>
          <Button onClick={handleSalvar} disabled={saving || !motivo.trim()}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            {labelSalvar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
