import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, LinkIcon, Trash2, Loader2 } from 'lucide-react';
import {
  usePlanoContas, useContasLinha, useVincularConta, useDesvincularConta,
} from '@/hooks/contabil/useDreStudio';
import type { DrePlanoConta, DreLinha, TipoModelo } from '@/lib/contabil/dreStudioTypes';
import { toast } from 'sonner';

interface Props {
  modeloId: string;
  linha: DreLinha | null;
  codemp: number;
  tipoModelo: TipoModelo;
  canEdit?: boolean;
}

export function DreAccountSelector({ modeloId, linha, codemp, tipoModelo, canEdit = true }: Props) {
  const [busca, setBusca] = useState('');
  const [somenteAtivas, setSomenteAtivas] = useState(true);
  const [somenteAnaliticas, setSomenteAnaliticas] = useState(true);
  const [sinal, setSinal] = useState<1 | -1>(1);
  const [incluirSubcontas, setIncluirSubcontas] = useState(false);
  const [buscaAtiva, setBuscaAtiva] = useState('');

  const planoQ = usePlanoContas(
    { codemp, tipo: tipoModelo, somente_ativas: somenteAtivas, somente_analiticas: somenteAnaliticas, busca: buscaAtiva },
    !!codemp && !!buscaAtiva,
  );
  const contasQ = useContasLinha(modeloId, linha?.id);
  const vincular = useVincularConta(modeloId, linha?.id ?? '');
  const desvincular = useDesvincularConta(modeloId, linha?.id ?? '');

  const contas = contasQ.data ?? [];

  const handleVincular = async (c: DrePlanoConta) => {
    if (!linha) return;
    try {
      await vincular.mutateAsync({
        codemp,
        ctared: Number(c.ctared),
        clacta: String(c.clacta),
        descta: String(c.descta),
        nivcta: Number(c.nivcta),
        anasin: (c.anasin ?? 'A') as 'A' | 'S',
        incluir_subcontas: incluirSubcontas,
        sinal,
      });
      toast.success(`Conta ${c.ctared} vinculada.`);
    } catch (e: any) {
      const msg = e?.dreKind === 'conflito'
        ? 'Esta conta já está vinculada a outra linha deste modelo.'
        : (e?.message ?? 'Falha ao vincular conta.');
      toast.error(msg);
    }
  };

  const handleDesvincular = async (vinculoId: string) => {
    if (!confirm('Desvincular esta conta da linha?')) return;
    try { await desvincular.mutateAsync(vinculoId); toast.success('Conta desvinculada.'); }
    catch (e: any) { toast.error(e?.message ?? 'Falha ao desvincular.'); }
  };

  const resultados = useMemo(() => (planoQ.data ?? []).slice(0, 100), [planoQ.data]);

  if (!linha) {
    return <div className="p-6 text-sm text-muted-foreground">Selecione uma linha para gerenciar as contas vinculadas.</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar conta (código, clacta, descrição)…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setBuscaAtiva(busca)}
            className="h-8"
          />
          <Button size="sm" onClick={() => setBuscaAtiva(busca)} disabled={!codemp}>
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <label className="flex items-center gap-1"><Switch checked={somenteAtivas} onCheckedChange={setSomenteAtivas} /> Só ativas</label>
          <label className="flex items-center gap-1"><Switch checked={somenteAnaliticas} onCheckedChange={setSomenteAnaliticas} /> Só analíticas</label>
          <div className="flex items-center gap-1">
            <Label className="text-xs">Sinal</Label>
            <Select value={String(sinal)} onValueChange={(v) => setSinal(Number(v) as 1 | -1)}>
              <SelectTrigger className="h-7 w-20"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="1">+1</SelectItem><SelectItem value="-1">−1</SelectItem></SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-1"><Switch checked={incluirSubcontas} onCheckedChange={setIncluirSubcontas} /> Subcontas</label>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto divide-y text-sm">
        {planoQ.isFetching && <div className="p-3 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Buscando…</div>}
        {!planoQ.isFetching && buscaAtiva && resultados.length === 0 && (
          <div className="p-3 text-xs text-muted-foreground">Nenhuma conta encontrada.</div>
        )}
        {resultados.map((c) => (
          <div key={`${c.codemp}-${c.ctared}`} className="p-2 flex items-center gap-2 hover:bg-muted/40">
            <div className="flex-1 min-w-0">
              <div className="font-mono text-xs">{c.ctared} · {c.clacta}</div>
              <div className="truncate">{c.descta}</div>
            </div>
            <Badge variant="outline" className="text-[10px]">nv {c.nivcta}</Badge>
            <Badge variant={c.anasin === 'A' ? 'default' : 'secondary'} className="text-[10px]">{c.anasin}</Badge>
            {canEdit && (
              <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => handleVincular(c)} disabled={vincular.isPending}>
                <LinkIcon className="h-3 w-3" /> Vincular
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="border-t bg-muted/30">
        <div className="px-3 py-2 text-xs font-semibold flex items-center justify-between">
          <span>Contas vinculadas ({contas.length})</span>
        </div>
        <div className="max-h-56 overflow-y-auto divide-y">
          {contas.length === 0 && <p className="p-3 text-xs text-muted-foreground">Nenhuma conta vinculada.</p>}
          {contas.map((c) => (
            <div key={c.id} className="p-2 flex items-center gap-2 text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs">{c.ctared} · {c.clacta}</div>
                <div className="truncate text-xs text-muted-foreground">{c.descta}</div>
              </div>
              <Badge variant={c.sinal === 1 ? 'default' : 'destructive'} className="text-[10px]">{c.sinal === 1 ? '+' : '−'}</Badge>
              {c.incluir_subcontas && <Badge variant="outline" className="text-[10px]">sub</Badge>}
              {canEdit && (
                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => handleDesvincular(c.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
