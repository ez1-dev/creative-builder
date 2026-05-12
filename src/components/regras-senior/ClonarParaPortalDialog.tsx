import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { seniorApi } from '@/lib/senior/api';
import type { RegraLSP } from '@/lib/senior/types';
import { useNavigate } from 'react-router-dom';

export function ClonarParaPortalDialog({ regra, onClose, onDone }: {
  regra: RegraLSP; onClose: () => void; onDone?: () => void;
}) {
  const navigate = useNavigate();
  const [nome, setNome] = useState(regra.nome_regra ?? '');
  const [descricao, setDescricao] = useState(regra.descricao ?? '');
  const [ticket, setTicket] = useState(regra.ticket ?? '');
  const [motivo, setMotivo] = useState('');
  const [fonteLsp, setFonteLsp] = useState('');
  const [saving, setSaving] = useState(false);

  const disabled = !nome.trim() || !motivo.trim() || saving;

  const submit = async () => {
    setSaving(true);
    try {
      const nova = await seniorApi.criarRegra({
        nome_regra: nome.trim(),
        codreg_erp: regra.codreg_erp ?? null,
        modsis: regra.modsis ?? null,
        idereg: regra.idereg ?? null,
        codtns: regra.codtns ?? null,
        descricao: descricao.trim() || null,
        ambiente: 'homologacao',
        ticket: ticket.trim() || null,
        motivo: motivo.trim(),
        fonte_lsp: fonteLsp || null,
      } as Partial<RegraLSP>);
      toast.success('Regra clonada para o portal.');
      onDone?.();
      onClose();
      const novoId = (nova as any)?.id_regra ?? (nova as any)?.id;
      if (novoId) navigate(`/regras-senior/regras/${novoId}?edit=1`);
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao clonar regra');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Clonar para portal</DialogTitle>
          <DialogDescription>
            Cria uma cópia editável desta regra no portal. O fonte LSP pode ser colado agora ou editado depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-3 text-xs grid grid-cols-2 gap-y-1">
            <div className="text-muted-foreground">Empresa</div>
            <div className="font-medium">{regra.codemp ?? '—'}</div>
            <div className="text-muted-foreground">Módulo</div>
            <div className="font-medium">{regra.modsis ?? '—'}</div>
            <div className="text-muted-foreground">Identificador</div>
            <div className="font-medium">{regra.idereg ?? '—'}</div>
            <div className="text-muted-foreground">Transação</div>
            <div className="font-medium">{regra.codtns ?? '—'}</div>
            <div className="text-muted-foreground">Código ERP</div>
            <div className="font-medium">{regra.codreg_erp ?? '—'}</div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Nome da regra *</label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Descrição</label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Ticket</label>
              <Input value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="ex.: JIRA-1234" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Motivo *</label>
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Fonte LSP (opcional)</label>
            <Textarea
              value={fonteLsp}
              onChange={(e) => setFonteLsp(e.target.value)}
              rows={10}
              className="font-mono text-xs"
              placeholder="Cole aqui o fonte LSP exportado do ERP Senior, ou deixe vazio para editar depois."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={disabled}>{saving ? 'Clonando…' : 'Clonar para portal'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
