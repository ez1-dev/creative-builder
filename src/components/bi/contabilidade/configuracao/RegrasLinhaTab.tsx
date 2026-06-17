import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { OPERADORES, TIPOS_REGRA, type DreLinhaRegra, type DreOperador, type DreTipoRegra } from '@/lib/bi/dreConfigTypes';
import { excluirRegra, listarRegras, upsertRegra } from '@/lib/bi/dreConfigApi';

interface Props {
  modeloId: string;
  codigoLinha: string | null;
}

const regraVazia = (modeloId: string, codigoLinha: string): Partial<DreLinhaRegra> => ({
  modelo_id: modeloId,
  codigo_linha: codigoLinha,
  tipo_regra: 'CONTA_CONTABIL',
  operador: '=',
  valor: '',
  sinal: 1,
  prioridade: 100,
  ativo: true,
});

export function RegrasLinhaTab({ modeloId, codigoLinha }: Props) {
  const [regras, setRegras] = useState<DreLinhaRegra[]>([]);
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<Partial<DreLinhaRegra> | null>(null);

  const carregar = async () => {
    if (!codigoLinha) { setRegras([]); return; }
    setLoading(true);
    try { setRegras(await listarRegras(modeloId, codigoLinha)); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [modeloId, codigoLinha]);

  const salvar = async () => {
    if (!editando) return;
    try {
      await upsertRegra(editando as any);
      toast({ title: 'Regra salva' });
      setEditando(null);
      carregar();
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message, variant: 'destructive' });
    }
  };

  const remover = async (r: DreLinhaRegra) => {
    if (!confirm('Excluir regra?')) return;
    await excluirRegra(r.id);
    carregar();
  };

  if (!codigoLinha) {
    return <div className="text-sm text-muted-foreground p-8 text-center">Selecione uma linha na aba "Estrutura da DRE" para ver/editar suas regras.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm">Regras de: <span className="font-mono font-medium">{codigoLinha}</span></div>
        <Button size="sm" onClick={() => setEditando(regraVazia(modeloId, codigoLinha))}>
          <Plus className="mr-1 h-4 w-4" />Nova regra
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="p-2">Prio</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Operador</th>
              <th className="p-2">Valor / Critérios</th>
              <th className="p-2 w-16">Sinal</th>
              <th className="p-2 w-16">Ativo</th>
              <th className="p-2 w-24 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-4 text-center">Carregando…</td></tr>}
            {!loading && regras.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Sem regras. Use "Nova regra" ou vincule contas na aba "Contas do ERP".</td></tr>
            )}
            {regras.map(r => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.prioridade}</td>
                <td className="p-2"><Badge variant="outline" className="text-[10px]">{r.tipo_regra}</Badge></td>
                <td className="p-2 font-mono">{r.operador}</td>
                <td className="p-2 font-mono text-[11px]">
                  {r.valor || [r.cd_conta_contabil, r.cd_mascara, r.cd_centro_custos, r.cd_centro_custos_3, r.cd_origem_lcto, r.cd_tns, r.ds_historico].filter(Boolean).join(' · ')}
                </td>
                <td className="p-2">{r.sinal}</td>
                <td className="p-2">{r.ativo ? 'sim' : 'não'}</td>
                <td className="p-2 text-right space-x-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditando({ ...r })}><Pencil className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remover(r)}><Trash2 className="h-3 w-3" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{editando?.id ? 'Editar regra' : 'Nova regra'} — {codigoLinha}</DialogTitle></DialogHeader>
          {editando && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Tipo de regra</Label>
                <Select value={editando.tipo_regra} onValueChange={(v) => setEditando({ ...editando, tipo_regra: v as DreTipoRegra })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_REGRA.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Operador</Label>
                <Select value={editando.operador} onValueChange={(v) => setEditando({ ...editando, operador: v as DreOperador })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{OPERADORES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Input type="number" value={editando.prioridade ?? 100} onChange={(e) => setEditando({ ...editando, prioridade: Number(e.target.value) })} />
              </div>
              <div className="col-span-3">
                <Label>Valor (livre)</Label>
                <Input value={editando.valor ?? ''} onChange={(e) => setEditando({ ...editando, valor: e.target.value })} />
              </div>
              {([
                ['cd_empresa', 'Empresa'], ['cd_filial', 'Filial'],
                ['cd_conta_contabil', 'Conta contábil'], ['cd_mascara', 'Máscara'],
                ['cd_centro_custos', 'Centro de custos'], ['cd_centro_custos_3', 'CC nível 3'],
                ['cd_origem_lcto', 'Origem'], ['cd_tns', 'TNS / Transação'],
              ] as const).map(([k, label]) => (
                <div key={k}>
                  <Label>{label}</Label>
                  <Input
                    value={(editando as any)[k] ?? ''}
                    onChange={(e) => setEditando({ ...editando, [k]: e.target.value || null } as any)}
                    className="font-mono"
                  />
                </div>
              ))}
              <div className="col-span-3">
                <Label>Histórico (texto)</Label>
                <Input value={editando.ds_historico ?? ''} onChange={(e) => setEditando({ ...editando, ds_historico: e.target.value || null })} />
              </div>
              <div>
                <Label>Sinal</Label>
                <Select value={String(editando.sinal ?? 1)} onValueChange={(v) => setEditando({ ...editando, sinal: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="1">+1</SelectItem><SelectItem value="-1">-1</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={editando.ativo ?? true} onCheckedChange={(c) => setEditando({ ...editando, ativo: !!c })} />
                  Ativo
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
