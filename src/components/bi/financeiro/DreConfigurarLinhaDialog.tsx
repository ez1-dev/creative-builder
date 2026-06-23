import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';
import {
  fetchDreDinamicaPlanoContas,
  postDreDinamicaVincularContas,
  type DreDinamicaPlanoContasItem,
  type DreDinamicaOperador,
} from '@/lib/bi/dreDinamicaConfigApi';

export interface DreConfigurarLinhaDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  modeloId: string;
  anomesIni: string;
  anomesFim: string;
  linha: { id: string; codigo_linha: string; descricao: string } | null;
  onSuccess?: () => void;
}

export function DreConfigurarLinhaDialog({
  open, onOpenChange, modeloId, anomesIni, anomesFim, linha, onSuccess,
}: DreConfigurarLinhaDialogProps) {
  const [busca, setBusca] = useState('');
  const [selecionadas, setSelecionadas] = useState<Record<string, DreDinamicaPlanoContasItem>>({});
  const [operador, setOperador] = useState<DreDinamicaOperador>('COMECA_COM');
  const [sinal, setSinal] = useState(1);
  const [prioridade, setPrioridade] = useState(100);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) {
      setBusca('');
      setSelecionadas({});
      setOperador('COMECA_COM');
      setSinal(1);
      setPrioridade(100);
    }
  }, [open, linha?.id]);

  const planoQ = useQuery({
    queryKey: ['dre-dinamica', 'plano-contas', { modeloId, anomesIni, anomesFim }],
    queryFn: () => fetchDreDinamicaPlanoContas({
      modelo_id: modeloId, anomes_ini: anomesIni, anomes_fim: anomesFim, limit: 10000,
    }),
    enabled: open && !!modeloId && !!anomesIni && !!anomesFim,
    staleTime: 60_000,
  });

  const filtradas = useMemo(() => {
    const itens = planoQ.data ?? [];
    const q = busca.trim().toLowerCase();
    if (!q) return itens.slice(0, 500);
    return itens.filter(i =>
      i.cd_mascara.toLowerCase().includes(q) ||
      i.cd_conta_contabil.toLowerCase().includes(q) ||
      (i.ds_conta ?? '').toLowerCase().includes(q),
    ).slice(0, 500);
  }, [planoQ.data, busca]);

  const selList = Object.values(selecionadas);

  const toggle = (item: DreDinamicaPlanoContasItem) => {
    setSelecionadas(prev => {
      const next = { ...prev };
      if (next[item.cd_mascara]) delete next[item.cd_mascara];
      else next[item.cd_mascara] = item;
      return next;
    });
  };

  const handleVincular = async () => {
    if (!linha) return;
    if (selList.length === 0) {
      toast({ title: 'Selecione ao menos uma máscara', variant: 'destructive' });
      return;
    }
    setSalvando(true);
    try {
      const r = await postDreDinamicaVincularContas({
        modelo_id: modeloId,
        linha_id: linha.id,
        tipo_regra: 'MASCARA_CONTA',
        operador,
        sinal,
        prioridade,
        contas: selList.map(s => ({ cd_mascara: s.cd_mascara })),
      });
      toast({ title: 'Contas vinculadas', description: `${r.vinculadas} máscara(s) vinculada(s) à linha.` });
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Falha ao vincular', description: e?.message, variant: 'destructive' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Configurar linha da DRE</DialogTitle>
          {linha && (
            <div className="text-xs text-muted-foreground">
              <Badge variant="outline" className="mr-2">{linha.codigo_linha}</Badge>
              {linha.descricao}
            </div>
          )}
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Lista de contas */}
          <div className="space-y-2">
            <Label className="text-xs">Plano de contas (período: {anomesIni}–{anomesFim})</Label>
            <Input
              placeholder="Buscar por máscara, conta ou descrição"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-8 text-xs"
            />
            <div className="rounded-md border h-72 overflow-hidden">
              {planoQ.isLoading ? (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" /> Carregando…
                </div>
              ) : planoQ.isError ? (
                <div className="p-3 text-xs text-destructive">
                  {(planoQ.error as Error)?.message}
                </div>
              ) : filtradas.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  Nenhuma conta encontrada
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <ul className="text-xs divide-y">
                    {filtradas.map((c) => {
                      const checked = !!selecionadas[c.cd_mascara];
                      return (
                        <li key={`${c.cd_mascara}-${c.cd_conta_contabil}`} className="flex items-start gap-2 px-2 py-1.5 hover:bg-muted/30">
                          <Checkbox checked={checked} onCheckedChange={() => toggle(c)} className="mt-0.5" />
                          <button onClick={() => toggle(c)} className="text-left flex-1">
                            <div className="font-mono text-[11px]">{c.cd_mascara} <span className="text-muted-foreground">• {c.cd_conta_contabil}</span></div>
                            {c.ds_conta && <div className="text-muted-foreground">{c.ds_conta}</div>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Mostrando até 500 itens; refine a busca para filtrar.</p>
          </div>

          {/* Selecionadas */}
          <div className="space-y-2">
            <Label className="text-xs">Selecionadas ({selList.length})</Label>
            <div className="rounded-md border h-72 overflow-hidden">
              {selList.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  Nenhuma conta selecionada
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <ul className="text-xs divide-y">
                    {selList.map((c) => (
                      <li key={c.cd_mascara} className="flex items-center gap-2 px-2 py-1.5">
                        <div className="flex-1">
                          <div className="font-mono text-[11px]">{c.cd_mascara}</div>
                          {c.ds_conta && <div className="text-muted-foreground">{c.ds_conta}</div>}
                        </div>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => toggle(c)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px]">Operador</Label>
                <select
                  value={operador}
                  onChange={(e) => setOperador(e.target.value as DreDinamicaOperador)}
                  className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                >
                  <option value="COMECA_COM">COMECA_COM</option>
                  <option value="IGUAL">IGUAL</option>
                  <option value="LIKE">LIKE</option>
                  <option value="IN">IN</option>
                </select>
              </div>
              <div>
                <Label className="text-[10px]">Sinal</Label>
                <select
                  value={sinal}
                  onChange={(e) => setSinal(Number(e.target.value))}
                  className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                >
                  <option value={1}>+1</option>
                  <option value={-1}>-1</option>
                </select>
              </div>
              <div>
                <Label className="text-[10px]">Prioridade</Label>
                <Input
                  type="number"
                  value={prioridade}
                  onChange={(e) => setPrioridade(Number(e.target.value) || 0)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleVincular} disabled={salvando || !linha || selList.length === 0}>
            {salvando && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Vincular contas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
