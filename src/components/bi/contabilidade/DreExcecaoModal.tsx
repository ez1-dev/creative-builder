import { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { criarExcecao, type DreExcecaoInput } from '@/lib/bi/dreExcecoesApi';

export interface DreExcecaoModalProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  codigoLinhaOrigem: string;
  /** Pré-carregamento da linha de lançamento que originou a abertura. */
  lancamento: {
    nr_lancamento?: string;
    nr_lote?: string;
    nr_documento?: string;
    cd_conta?: string;
    cd_cencus?: string;
    cd_origem?: string;
    cd_transacao?: string;
    ds_historico?: string;
    anomes_referente?: number | string;
    vl_realizado?: number;
  };
  /** Lista de códigos de linha disponíveis para destino. */
  codigosLinha: string[];
  onSaved?: () => void;
}

const DEFAULT_DESTINO = 'NAO_CLASSIFICADO';

export function DreExcecaoModal({
  open, onOpenChange, codigoLinhaOrigem, lancamento, codigosLinha, onSaved,
}: DreExcecaoModalProps) {
  const [destino, setDestino] = useState(DEFAULT_DESTINO);
  const [motivo, setMotivo] = useState('');
  const [nrLancamento, setNrLancamento] = useState('');
  const [nrLote, setNrLote] = useState('');
  const [nrDocumento, setNrDocumento] = useState('');
  const [cdConta, setCdConta] = useState('');
  const [cdCencus, setCdCencus] = useState('');
  const [cdOrigem, setCdOrigem] = useState('');
  const [cdTransacao, setCdTransacao] = useState('');
  const [dsHistorico, setDsHistorico] = useState('');
  const [valor, setValor] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDestino(DEFAULT_DESTINO);
    setMotivo('');
    setNrLancamento(String(lancamento.nr_lancamento ?? ''));
    setNrLote(String(lancamento.nr_lote ?? ''));
    setNrDocumento(String(lancamento.nr_documento ?? ''));
    setCdConta(String(lancamento.cd_conta ?? ''));
    setCdCencus(String(lancamento.cd_cencus ?? ''));
    setCdOrigem(String(lancamento.cd_origem ?? ''));
    setCdTransacao(String(lancamento.cd_transacao ?? ''));
    setDsHistorico(String(lancamento.ds_historico ?? ''));
    setValor(lancamento.vl_realizado != null ? String(lancamento.vl_realizado) : '');
  }, [open, lancamento]);

  const opcoesDestino = Array.from(new Set([DEFAULT_DESTINO, ...codigosLinha])).sort();

  const handleSalvar = async () => {
    if (!nrLancamento.trim()) {
      toast.error('Lançamento é obrigatório.');
      return;
    }
    if (!motivo.trim()) {
      toast.error('Informe o motivo da exceção.');
      return;
    }
    if (destino === codigoLinhaOrigem) {
      toast.error('Linha destino deve ser diferente da origem.');
      return;
    }
    const payload: DreExcecaoInput = {
      nr_lancamento: nrLancamento.trim(),
      nr_lote: nrLote.trim() || null,
      nr_documento: nrDocumento.trim() || null,
      cd_conta: cdConta.trim() || null,
      cd_cencus: cdCencus.trim() || null,
      cd_origem: cdOrigem.trim() || null,
      cd_transacao: cdTransacao.trim() || null,
      ds_historico: dsHistorico.trim() || null,
      anomes_referente:
        lancamento.anomes_referente != null
          ? Number(lancamento.anomes_referente) || null
          : null,
      vl_realizado: valor === '' ? null : Number(valor.replace(',', '.')) || null,
      codigo_linha_origem: codigoLinhaOrigem,
      codigo_linha_destino: destino,
      motivo: motivo.trim(),
    };
    setSaving(true);
    try {
      await criarExcecao(payload);
      toast.success('Exceção registrada.');
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.toLowerCase().includes('duplicate')) {
        toast.error('Já existe exceção ativa para este lançamento × linha origem.');
      } else {
        toast.error(`Falha ao salvar exceção: ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Marcar como exceção DRE</DialogTitle>
          <DialogDescription className="text-xs">
            A exceção redireciona apenas este lançamento, sem alterar a regra geral nem outras
            ocorrências da mesma TNS.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="col-span-1">
            <Label className="text-xs">Linha origem</Label>
            <Input value={codigoLinhaOrigem} disabled className="h-8 text-xs" />
          </div>
          <div className="col-span-1">
            <Label className="text-xs">Linha destino</Label>
            <Select value={destino} onValueChange={setDestino}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-64">
                {opcoesDestino.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2">
            <Label className="text-xs">Motivo *</Label>
            <Textarea
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="text-xs"
              placeholder="Explique por que esse lançamento deve ir para outra linha."
            />
          </div>

          <div>
            <Label className="text-xs">Lançamento *</Label>
            <Input value={nrLancamento} onChange={(e) => setNrLancamento(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Lote</Label>
            <Input value={nrLote} onChange={(e) => setNrLote(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Documento</Label>
            <Input value={nrDocumento} onChange={(e) => setNrDocumento(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Máscara / Conta</Label>
            <Input value={cdConta} onChange={(e) => setCdConta(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Centro de custo</Label>
            <Input value={cdCencus} onChange={(e) => setCdCencus(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Origem</Label>
            <Input value={cdOrigem} onChange={(e) => setCdOrigem(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Transação (TNS)</Label>
            <Input value={cdTransacao} onChange={(e) => setCdTransacao(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">Valor</Label>
            <Input value={valor} onChange={(e) => setValor(e.target.value)} className="h-8 text-xs" inputMode="decimal" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Histórico</Label>
            <Textarea
              rows={2}
              value={dsHistorico}
              onChange={(e) => setDsHistorico(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar exceção'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
