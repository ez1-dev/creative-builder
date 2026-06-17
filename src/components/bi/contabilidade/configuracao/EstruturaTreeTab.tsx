import { useMemo, useState } from 'react';
import { Plus, Pencil, Copy, EyeOff, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { TIPOS_LINHA, validarCodigoLinha, type DreLinhaConfig, type DreTipoLinha } from '@/lib/bi/dreConfigTypes';
import { duplicarLinha, inativarLinha, reordenarLinhas, upsertLinha } from '@/lib/bi/dreConfigApi';

interface Props {
  modeloId: string;
  linhas: DreLinhaConfig[];
  onChange: () => void;
  onSelect: (codigo_linha: string) => void;
  selecionadoCodigo?: string;
}

const linhaVazia = (modeloId: string, ordem: number): Partial<DreLinhaConfig> => ({
  modelo_id: modeloId,
  ordem,
  codigo_linha: '',
  descricao: '',
  nivel: 1,
  linha_pai_codigo: null,
  tipo_linha: 'ANALITICA',
  formula: null,
  ativo: true,
  flag_soma: true,
  flag_inverte_sinal: false,
  flag_exibe_dre: true,
  flag_permite_drill: true,
  flag_negrito: false,
  flag_totalizadora: false,
});

export function EstruturaTreeTab({ modeloId, linhas, onChange, onSelect, selecionadoCodigo }: Props) {
  const [editando, setEditando] = useState<Partial<DreLinhaConfig> | null>(null);
  const proximoOrdem = useMemo(() => (linhas.length ? Math.max(...linhas.map(l => l.ordem)) + 1 : 0), [linhas]);

  const abrirNovo = () => setEditando(linhaVazia(modeloId, proximoOrdem));
  const abrirEdit = (l: DreLinhaConfig) => setEditando({ ...l });

  const salvar = async () => {
    if (!editando) return;
    const v = validarCodigoLinha(editando.codigo_linha ?? '');
    if (!v.ok) { toast({ title: 'Código inválido', description: v.motivo, variant: 'destructive' }); return; }
    if (!editando.descricao?.trim()) { toast({ title: 'Descrição obrigatória', variant: 'destructive' }); return; }
    try {
      await upsertLinha(editando as any);
      toast({ title: 'Linha salva' });
      setEditando(null);
      onChange();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message, variant: 'destructive' });
    }
  };

  const mover = async (l: DreLinhaConfig, dir: -1 | 1) => {
    const idx = linhas.findIndex(x => x.id === l.id);
    const alvo = linhas[idx + dir];
    if (!alvo) return;
    await reordenarLinhas([{ id: l.id, ordem: alvo.ordem }, { id: alvo.id, ordem: l.ordem }]);
    onChange();
  };

  const inativar = async (l: DreLinhaConfig) => {
    if (!confirm(`Inativar linha "${l.codigo_linha}"?`)) return;
    await inativarLinha(l.id);
    onChange();
  };

  const duplicar = async (l: DreLinhaConfig) => {
    await duplicarLinha(l.id);
    toast({ title: 'Linha duplicada' });
    onChange();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{linhas.length} linhas no modelo</div>
        <Button size="sm" onClick={abrirNovo}><Plus className="mr-1 h-4 w-4" />Nova linha</Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="p-2 w-16">Ordem</th>
              <th className="p-2">Código</th>
              <th className="p-2">Descrição</th>
              <th className="p-2 w-24">Tipo</th>
              <th className="p-2 w-16">Nível</th>
              <th className="p-2">Flags</th>
              <th className="p-2 w-40 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr
                key={l.id}
                className={`border-t hover:bg-accent/40 cursor-pointer ${selecionadoCodigo === l.codigo_linha ? 'bg-accent/60' : ''} ${!l.ativo ? 'opacity-50' : ''}`}
                onClick={() => onSelect(l.codigo_linha)}
              >
                <td className="p-2 font-mono">{l.ordem}</td>
                <td className="p-2 font-mono">{l.codigo_linha}</td>
                <td className="p-2" style={{ paddingLeft: 8 + (l.nivel - 1) * 16 }}>
                  <span className={l.flag_negrito ? 'font-bold' : ''}>{l.descricao}</span>
                </td>
                <td className="p-2"><Badge variant="outline" className="text-[10px]">{l.tipo_linha}</Badge></td>
                <td className="p-2">{l.nivel}</td>
                <td className="p-2 text-[10px] space-x-1">
                  {l.flag_totalizadora && <Badge variant="secondary" className="text-[9px]">TOTAL</Badge>}
                  {l.flag_inverte_sinal && <Badge variant="secondary" className="text-[9px]">−</Badge>}
                  {!l.flag_exibe_dre && <Badge variant="outline" className="text-[9px]">oculta</Badge>}
                  {!l.flag_permite_drill && <Badge variant="outline" className="text-[9px]">sem drill</Badge>}
                </td>
                <td className="p-2 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => mover(l, -1)}><ArrowUp className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => mover(l, 1)}><ArrowDown className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => abrirEdit(l)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicar(l)}><Copy className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => inativar(l)}><EyeOff className="h-3 w-3" /></Button>
                </td>
              </tr>
            ))}
            {linhas.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Sem linhas. Clique em "Nova linha" para começar.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editando?.id ? 'Editar linha' : 'Nova linha'}</DialogTitle></DialogHeader>
          {editando && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-1">
                <Label>Código (técnico)</Label>
                <Input
                  value={editando.codigo_linha ?? ''}
                  onChange={(e) => setEditando({ ...editando, codigo_linha: e.target.value.toUpperCase() })}
                  placeholder="RECEITA_BRUTA"
                  className="font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-1">UPPER_SNAKE, sem espaços. Nunca é a descrição.</p>
              </div>
              <div className="col-span-1">
                <Label>Ordem</Label>
                <Input type="number" value={editando.ordem ?? 0} onChange={(e) => setEditando({ ...editando, ordem: Number(e.target.value) })} />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Input value={editando.descricao ?? ''} onChange={(e) => setEditando({ ...editando, descricao: e.target.value })} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={editando.tipo_linha ?? 'ANALITICA'} onValueChange={(v) => setEditando({ ...editando, tipo_linha: v as DreTipoLinha })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS_LINHA.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nível</Label>
                <Input type="number" min={1} max={9} value={editando.nivel ?? 1} onChange={(e) => setEditando({ ...editando, nivel: Number(e.target.value) })} />
              </div>
              <div className="col-span-2">
                <Label>Linha pai (código)</Label>
                <Input value={editando.linha_pai_codigo ?? ''} onChange={(e) => setEditando({ ...editando, linha_pai_codigo: e.target.value || null })} className="font-mono" />
              </div>
              <div className="col-span-2">
                <Label>Fórmula (para tipo CALCULO)</Label>
                <Textarea rows={2} value={editando.formula ?? ''} onChange={(e) => setEditando({ ...editando, formula: e.target.value || null })} placeholder="Ex.: RECEITA_BRUTA - DEDUCOES" />
              </div>
              <div className="col-span-2 grid grid-cols-3 gap-2 pt-2 border-t">
                {([
                  ['flag_soma', 'Soma'],
                  ['flag_inverte_sinal', 'Inverte sinal'],
                  ['flag_exibe_dre', 'Exibe na DRE'],
                  ['flag_permite_drill', 'Permite drill'],
                  ['flag_negrito', 'Negrito'],
                  ['flag_totalizadora', 'Totalizadora'],
                  ['ativo', 'Ativo'],
                ] as const).map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={(editando as any)[k] ?? false}
                      onCheckedChange={(c) => setEditando({ ...editando, [k]: !!c } as any)}
                    />
                    {label}
                  </label>
                ))}
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
