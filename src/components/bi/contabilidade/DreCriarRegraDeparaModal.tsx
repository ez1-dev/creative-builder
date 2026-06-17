import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { criarRegra } from '@/lib/bi/dreDeparaApi';
import { DRE_MASCARAS_DEPARA, CENTRO_CUSTOS_TODAS } from '@/lib/bi/dreDepara';
import { formatCurrency } from '@/components/bi/utils/formatters';

export interface DreCriarRegraDeparaLancamento {
  cd_conta_contabil: string;
  cd_centro_custos: string;
  cd_mascara_atual?: string | null;
  cd_mascara_sugerida?: string | null;
  ds_historico?: string | null;
  vl_realizado?: number | null;
  linha_origem?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lancamento: DreCriarRegraDeparaLancamento;
  onSaved: () => void;
}

export function DreCriarRegraDeparaModal({ open, onOpenChange, lancamento, onSaved }: Props) {
  const [aplicaTodos, setAplicaTodos] = useState(false);
  const [mascara, setMascara] = useState('');
  const [descricao, setDescricao] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAplicaTodos(false);
      setMascara(lancamento.cd_mascara_sugerida ?? '');
      setDescricao('');
    }
  }, [open, lancamento]);

  const podeSalvar = mascara.length > 0 && lancamento.cd_conta_contabil;

  const salvar = async () => {
    if (!podeSalvar) return;
    setSaving(true);
    try {
      await criarRegra({
        cd_conta_contabil: lancamento.cd_conta_contabil,
        cd_centro_custos: aplicaTodos ? CENTRO_CUSTOS_TODAS : lancamento.cd_centro_custos,
        cd_mascara_dre: mascara,
        descricao: descricao.trim() || null,
        ativo: true,
      });
      toast.success('Regra criada — DRE será reclassificada.');
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(`Falha ao criar regra: ${e?.message ?? e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar regra de classificação</DialogTitle>
          <DialogDescription className="text-xs">
            Vincula esta combinação conta + centro de custos a uma linha da DRE. Aplica-se a todos os lançamentos futuros e atuais com a mesma chave.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] text-muted-foreground">Conta contábil</Label>
              <Input className="h-8 text-xs font-mono" value={lancamento.cd_conta_contabil} disabled />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Centro de custos</Label>
              <Input className="h-8 text-xs font-mono" value={lancamento.cd_centro_custos} disabled />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Máscara atual</Label>
              <Input className="h-8 text-xs font-mono" value={lancamento.cd_mascara_atual ?? '-'} disabled />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Valor</Label>
              <Input
                className="h-8 text-xs tabular-nums text-right"
                value={lancamento.vl_realizado != null ? formatCurrency(Number(lancamento.vl_realizado)) : '-'}
                disabled
              />
            </div>
          </div>

          {lancamento.ds_historico && (
            <div>
              <Label className="text-[11px] text-muted-foreground">Histórico</Label>
              <Textarea className="text-xs min-h-[50px]" value={lancamento.ds_historico} disabled />
            </div>
          )}

          <div>
            <Label className="text-xs">
              Linha destino da DRE
              {lancamento.cd_mascara_sugerida && (
                <span className="text-[11px] text-muted-foreground ml-2">
                  (sugerida: {lancamento.cd_mascara_sugerida})
                </span>
              )}
            </Label>
            <Select value={mascara} onValueChange={setMascara}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione a linha da DRE" />
              </SelectTrigger>
              <SelectContent>
                {DRE_MASCARAS_DEPARA.map((m) => (
                  <SelectItem key={m.codigo} value={m.codigo} className="text-xs">
                    <span className="font-mono mr-2">{m.codigo}</span>{m.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <Checkbox checked={aplicaTodos} onCheckedChange={(v) => setAplicaTodos(v === true)} />
            Aplicar a <strong>todos</strong> os centros de custos desta conta (grava como TODAS)
          </label>

          <div>
            <Label className="text-xs">Descrição (opcional)</Label>
            <Textarea
              className="text-xs min-h-[50px]"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Motivo da regra"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button size="sm" onClick={salvar} disabled={!podeSalvar || saving}>
            {saving ? 'Salvando...' : 'Criar regra'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
