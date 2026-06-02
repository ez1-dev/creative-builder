import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Play } from 'lucide-react';
import { executarTarefa, executarAcao, type ExecucaoParams } from '@/lib/etl/api';
import { api } from '@/lib/api';

interface ExecutarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alvo: { tipo: 'tarefa'; nome: string } | { tipo: 'acao'; idAcao: string; nomeTarefa?: string } | null;
  onExecutado?: (resp: { execucao_id: string }) => void;
}

const anomesAtual = () => {
  const d = new Date();
  return d.getFullYear() * 100 + (d.getMonth() + 1);
};

export function ExecutarModal({ open, onOpenChange, alvo, onExecutado }: ExecutarModalProps) {
  const [anomesIni, setAnomesIni] = useState<number>(anomesAtual());
  const [anomesFim, setAnomesFim] = useState<number>(anomesAtual());
  const [loading, setLoading] = useState(false);

  const titulo = !alvo
    ? 'Executar'
    : alvo.tipo === 'tarefa'
    ? `Executar tarefa: ${alvo.nome}`
    : `Executar ação: ${alvo.idAcao}`;

  const handleConfirmar = async () => {
    if (!alvo) return;
    if (!anomesIni || !anomesFim) {
      toast.error('Informe anomes_ini e anomes_fim');
      return;
    }
    if (anomesFim < anomesIni) {
      toast.error('anomes_fim deve ser maior ou igual a anomes_ini');
      return;
    }
    setLoading(true);
    try {
      const payload: ExecucaoParams = {
        anomes_ini: Number(anomesIni),
        anomes_fim: Number(anomesFim),
        acionado_por: api.getUser() ?? 'MANUAL',
      };
      const resp =
        alvo.tipo === 'tarefa'
          ? await executarTarefa(alvo.nome, payload)
          : await executarAcao(alvo.idAcao, payload);
      toast.success(`Execução iniciada: ${resp.execucao_id ?? resp.status}`);
      onExecutado?.(resp);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao executar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>anomes_ini</Label>
            <Input
              type="number"
              value={anomesIni}
              onChange={(e) => setAnomesIni(Number(e.target.value))}
              placeholder="202601"
            />
          </div>
          <div>
            <Label>anomes_fim</Label>
            <Input
              type="number"
              value={anomesFim}
              onChange={(e) => setAnomesFim(Number(e.target.value))}
              placeholder="202601"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={loading}>
            <Play className="h-4 w-4 mr-1" />
            {loading ? 'Executando…' : 'Confirmar execução'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
