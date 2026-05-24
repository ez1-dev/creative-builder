import { useState } from 'react';
import { useGerarProgramacao } from '@/hooks/useProgramacao';
import type { GerarProgramacaoPayload, GerarProgramacaoResponse } from '@/lib/producao/programacaoApi';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';

const UNIDADES = ['TODOS', 'GENIUS', 'ESTRUTURAL', 'APOIO', 'NAO_CLASSIFICADO'];
const SITUACOES = [
  { v: 'A', label: 'A — Aberta' },
  { v: 'L', label: 'L — Liberada' },
  { v: 'I', label: 'I — Iniciada' },
  { v: 'P', label: 'P — Parcial' },
];

export function GerarProgramacaoTab() {
  const [payload, setPayload] = useState<GerarProgramacaoPayload>({
    situacoes: 'A,L',
    permitir_quebra_operacao: true,
    limpar_anterior: false,
  });
  const [result, setResult] = useState<GerarProgramacaoResponse | null>(null);
  const mutation = useGerarProgramacao();

  const set = (patch: Partial<GerarProgramacaoPayload>) => setPayload((p) => ({ ...p, ...patch }));
  const situacoesArr = (payload.situacoes || '').split(',').filter(Boolean);
  const toggleSit = (v: string) => {
    const next = situacoesArr.includes(v) ? situacoesArr.filter((s) => s !== v) : [...situacoesArr, v];
    set({ situacoes: next.join(',') });
  };

  const onSubmit = async () => {
    try {
      const res = await mutation.mutateAsync(payload);
      setResult(res);
      toast.success(`Programação gerada · lote ${res.lote_programacao}`);
    } catch (e: any) {
      toast.error('Erro ao gerar programação', { description: e?.message });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="text-sm font-semibold">Parâmetros da geração</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Data inicial das OPs</Label>
            <Input type="date" className="h-9 text-xs" value={payload.data_ini || ''} onChange={(e) => set({ data_ini: e.target.value || undefined })} />
          </div>
          <div>
            <Label className="text-xs">Data final das OPs</Label>
            <Input type="date" className="h-9 text-xs" value={payload.data_fim || ''} onChange={(e) => set({ data_fim: e.target.value || undefined })} />
          </div>
          <div>
            <Label className="text-xs">Data início da programação</Label>
            <Input type="date" className="h-9 text-xs" value={payload.data_inicio_programacao || ''} onChange={(e) => set({ data_inicio_programacao: e.target.value || undefined })} />
          </div>
          <div>
            <Label className="text-xs">Unidade de negócio</Label>
            <Select value={payload.unidade_negocio || 'TODOS'} onValueChange={(v) => set({ unidade_negocio: v === 'TODOS' ? undefined : v })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Centro de recurso (opcional)</Label>
            <Input className="h-9 text-xs" placeholder="codcre" value={payload.codcre || ''} onChange={(e) => set({ codcre: e.target.value || undefined })} />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Situações</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {SITUACOES.map((s) => {
                const on = situacoesArr.includes(s.v);
                return (
                  <button
                    key={s.v}
                    type="button"
                    onClick={() => toggleSit(s.v)}
                    className={`px-2 py-1 rounded-md border text-[11px] transition-colors ${on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="flex items-center justify-between rounded-md border p-2">
            <div>
              <div className="text-xs font-medium">Permitir quebra de operação</div>
              <div className="text-[10px] text-muted-foreground">Divide operações grandes entre dias.</div>
            </div>
            <Switch checked={!!payload.permitir_quebra_operacao} onCheckedChange={(v) => set({ permitir_quebra_operacao: v })} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-2">
            <div>
              <div className="text-xs font-medium">Limpar programação anterior</div>
              <div className="text-[10px] text-muted-foreground">Apaga lotes anteriores antes de gerar.</div>
            </div>
            <Switch checked={!!payload.limpar_anterior} onCheckedChange={(v) => set({ limpar_anterior: v })} />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onSubmit} disabled={mutation.isPending} className="gap-2">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Gerar Programação
          </Button>
        </div>
      </Card>

      {result && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <div className="text-sm font-semibold">Resultado</div>
            <Badge variant="outline" className="text-xs font-mono">{result.lote_programacao}</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Counter label="OPs na fila" value={result.qtd_operacoes_fila} />
            <Counter label="Linhas programadas" value={result.qtd_linhas_programadas} accent="success" />
            <Counter label="Sem capacidade" value={result.qtd_sem_capacidade} accent={result.qtd_sem_capacidade > 0 ? 'warn' : 'muted'} />
            <Counter label="Sem saldo" value={result.qtd_sem_saldo} accent={result.qtd_sem_saldo > 0 ? 'warn' : 'muted'} />
          </div>
          {result.recursos_sem_capacidade?.length > 0 && (
            <div className="rounded-md border p-3">
              <div className="flex items-center gap-2 text-xs font-medium mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Recursos sem capacidade cadastrada ({result.recursos_sem_capacidade.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.recursos_sem_capacidade.map((r) => (
                  <Badge key={r.codcre} variant="outline" className="text-[10px]">
                    <span className="font-mono">{r.codcre}</span>
                    {r.descre && <span className="text-muted-foreground ml-1">— {r.descre}</span>}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Counter({ label, value, accent = 'primary' }: { label: string; value: number; accent?: 'primary' | 'success' | 'warn' | 'muted' }) {
  const color = accent === 'success' ? 'text-emerald-600' : accent === 'warn' ? 'text-amber-600' : accent === 'muted' ? 'text-muted-foreground' : 'text-primary';
  return (
    <div className="rounded-md border p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${color}`}>{(value ?? 0).toLocaleString('pt-BR')}</div>
    </div>
  );
}
