import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Calendar, Info } from 'lucide-react';
import { useEtlAgendamentosMutations } from '@/hooks/useEtlAgendamentos';
import {
  previewAnomes,
  type EtlAgendamento,
  type FrequenciaAgendamento,
  type JanelaTipo,
} from '@/lib/etl/agendamentosApi';
import type { EtlTarefa } from '@/lib/etl/api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefas: EtlTarefa[];
  agendamento?: EtlAgendamento | null;
}

const DIAS = [
  { v: 0, l: 'Dom' },
  { v: 1, l: 'Seg' },
  { v: 2, l: 'Ter' },
  { v: 3, l: 'Qua' },
  { v: 4, l: 'Qui' },
  { v: 5, l: 'Sex' },
  { v: 6, l: 'Sáb' },
];

export function AgendamentoFormDialog({ open, onOpenChange, tarefas, agendamento }: Props) {
  const { criar, atualizar } = useEtlAgendamentosMutations();
  const editing = !!agendamento;

  const [tarefaId, setTarefaId] = useState<string>('');
  const [ativo, setAtivo] = useState(true);
  const [frequencia, setFrequencia] = useState<FrequenciaAgendamento>('diario');
  const [intervaloMin, setIntervaloMin] = useState<number>(30);
  const [hora, setHora] = useState<number>(6);
  const [minuto, setMinuto] = useState<number>(0);
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]);
  const [janelaTipo, setJanelaTipo] = useState<JanelaTipo>('mes_atual');
  const [janelaN, setJanelaN] = useState<number>(2);

  useEffect(() => {
    if (!open) return;
    if (agendamento) {
      setTarefaId(agendamento.tarefa_id);
      setAtivo(agendamento.ativo);
      setFrequencia(agendamento.frequencia);
      setIntervaloMin(agendamento.intervalo_minutos ?? 30);
      setHora(agendamento.hora ?? 6);
      setMinuto(agendamento.minuto ?? 0);
      setDiasSemana(agendamento.dias_semana ?? [1, 2, 3, 4, 5]);
      setJanelaTipo(agendamento.janela_tipo);
      setJanelaN(agendamento.janela_n_meses ?? 1);
    } else {
      setTarefaId(tarefas[0]?.id ?? '');
      setAtivo(true);
      setFrequencia('diario');
      setIntervaloMin(30);
      setHora(6); setMinuto(0);
      setDiasSemana([1, 2, 3, 4, 5]);
      setJanelaTipo('mes_atual');
      setJanelaN(2);
    }
  }, [open, agendamento, tarefas]);

  const preview = useMemo(() => previewAnomes(janelaTipo, janelaN), [janelaTipo, janelaN]);
  const horaStr = `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`;

  const handleSalvar = async () => {
    if (!tarefaId) { toast.error('Selecione uma tarefa'); return; }
    if (frequencia === 'intervalo_minutos' && (!intervaloMin || intervaloMin < 5)) {
      toast.error('Intervalo mínimo: 5 minutos'); return;
    }
    if (frequencia === 'semanal' && diasSemana.length === 0) {
      toast.error('Escolha pelo menos um dia da semana'); return;
    }
    const input = {
      tarefa_id: tarefaId,
      ativo,
      frequencia,
      intervalo_minutos: frequencia === 'intervalo_minutos' ? intervaloMin : null,
      hora: frequencia !== 'intervalo_minutos' ? hora : null,
      minuto: frequencia !== 'intervalo_minutos' ? minuto : null,
      dias_semana: frequencia === 'semanal' ? diasSemana : [],
      janela_tipo: janelaTipo,
      janela_n_meses: janelaTipo === 'ultimos_n_meses' ? Math.max(janelaN, 1) : 1,
      parametros_extras: {},
    };
    try {
      if (editing && agendamento) {
        await atualizar.mutateAsync({ id: agendamento.id, patch: input });
        toast.success('Agendamento atualizado');
      } else {
        await criar.mutateAsync(input as any);
        toast.success('Agendamento criado');
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao salvar');
    }
  };

  const toggleDia = (d: number) =>
    setDiasSemana((arr) => (arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d].sort()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {editing ? 'Editar agendamento' : 'Novo agendamento'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Tarefa</Label>
            <Select value={tarefaId} onValueChange={setTarefaId} disabled={editing}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {tarefas.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome_tarefa} <span className="text-muted-foreground">— {t.grupo}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded border p-2">
            <Label htmlFor="ativo" className="cursor-pointer">Ativo</Label>
            <Switch id="ativo" checked={ativo} onCheckedChange={setAtivo} />
          </div>

          <div>
            <Label>Frequência</Label>
            <Select value={frequencia} onValueChange={(v) => setFrequencia(v as FrequenciaAgendamento)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="intervalo_minutos">A cada X minutos</SelectItem>
                <SelectItem value="diario">Diariamente em horário fixo</SelectItem>
                <SelectItem value="semanal">Em dias específicos da semana</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {frequencia === 'intervalo_minutos' && (
            <div>
              <Label>Intervalo (minutos)</Label>
              <Input type="number" min={5} max={1440}
                value={intervaloMin}
                onChange={(e) => setIntervaloMin(Number(e.target.value))} />
            </div>
          )}

          {(frequencia === 'diario' || frequencia === 'semanal') && (
            <div>
              <Label>Horário (America/Sao_Paulo)</Label>
              <Input type="time" value={horaStr} onChange={(e) => {
                const [h, m] = e.target.value.split(':').map(Number);
                setHora(h ?? 0); setMinuto(m ?? 0);
              }} />
            </div>
          )}

          {frequencia === 'semanal' && (
            <div>
              <Label>Dias da semana</Label>
              <div className="flex flex-wrap gap-3 mt-1">
                {DIAS.map((d) => (
                  <label key={d.v} className="flex items-center gap-1 text-sm cursor-pointer">
                    <Checkbox checked={diasSemana.includes(d.v)} onCheckedChange={() => toggleDia(d.v)} />
                    {d.l}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-3 space-y-2">
            <Label>Janela de período (ANOMES)</Label>
            <Select value={janelaTipo} onValueChange={(v) => setJanelaTipo(v as JanelaTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mes_atual">Mês atual</SelectItem>
                <SelectItem value="mes_anterior">Mês anterior</SelectItem>
                <SelectItem value="ultimos_n_meses">Últimos N meses (até hoje)</SelectItem>
              </SelectContent>
            </Select>
            {janelaTipo === 'ultimos_n_meses' && (
              <Input type="number" min={1} max={24} value={janelaN}
                onChange={(e) => setJanelaN(Number(e.target.value))} />
            )}
            <Alert className="py-2">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Próxima execução usará <code className="font-mono">anomes_ini={preview.ini}</code> e{' '}
                <code className="font-mono">anomes_fim={preview.fim}</code>.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={criar.isPending || atualizar.isPending}>
            {editing ? 'Salvar alterações' : 'Criar agendamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
