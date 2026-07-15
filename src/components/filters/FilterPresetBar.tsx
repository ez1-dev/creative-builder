import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Star, Save, Trash2, RefreshCw, StarOff, Bookmark } from 'lucide-react';
import { useFilterPresets } from '@/hooks/useFilterPresets';
import { toast } from 'sonner';

interface Props<T> {
  pageKey: string;
  currentFilters: T;
  onApply: (filtros: T) => void;
  className?: string;
}

export function FilterPresetBar<T>({ pageKey, currentFilters, onApply, className }: Props<T>) {
  const {
    presets, loading, defaultPreset,
    savePreset, updatePreset, deletePreset, setDefault,
  } = useFilterPresets<T>(pageKey);
  const [selectedId, setSelectedId] = useState<string>('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [asDefault, setAsDefault] = useState(false);

  const selected = presets.find((p) => p.id === selectedId) ?? null;

  const handleApply = (id: string) => {
    setSelectedId(id);
    const p = presets.find((x) => x.id === id);
    if (p) { onApply(p.filtros); toast.success(`Filtros "${p.nome}" aplicados`); }
  };

  const handleSaveAs = async () => {
    const nome = newName.trim();
    if (!nome) { toast.error('Informe um nome'); return; }
    try {
      const p = await savePreset(nome, currentFilters, { asDefault });
      setSelectedId(p.id);
      setSaveOpen(false); setNewName(''); setAsDefault(false);
      toast.success('Filtro salvo');
    } catch (e: any) { toast.error(e?.message || 'Erro ao salvar'); }
  };

  const handleUpdateCurrent = async () => {
    if (!selected) return;
    try {
      await updatePreset(selected.id, { filtros: currentFilters as any });
      toast.success(`Filtros de "${selected.nome}" atualizados`);
    } catch (e: any) { toast.error(e?.message || 'Erro ao atualizar'); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Excluir o preset "${selected.nome}"?`)) return;
    try {
      await deletePreset(selected.id);
      setSelectedId('');
      toast.success('Preset excluído');
    } catch (e: any) { toast.error(e?.message || 'Erro ao excluir'); }
  };

  const handleToggleDefault = async () => {
    if (!selected) return;
    try {
      await setDefault(selected.is_default ? null : selected.id);
      toast.success(selected.is_default ? 'Padrão removido' : 'Definido como padrão');
    } catch (e: any) { toast.error(e?.message || 'Erro'); }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 ${className ?? ''}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Bookmark className="h-3.5 w-3.5" /> Filtros salvos:
      </div>
      <Select value={selectedId} onValueChange={handleApply} disabled={loading}>
        <SelectTrigger className="h-8 min-w-[240px] text-xs">
          <SelectValue placeholder={loading ? 'Carregando…' : (presets.length ? 'Selecionar preset' : 'Nenhum salvo')} />
        </SelectTrigger>
        <SelectContent>
          {presets.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              <span className="flex items-center gap-1.5">
                {p.is_default && <Star className="h-3 w-3 fill-yellow-400 text-yellow-500" />}
                {p.nome}
              </span>
            </SelectItem>
          ))}
          {presets.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum preset salvo ainda.</div>
          )}
        </SelectContent>
      </Select>

      <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setSaveOpen(true)}>
        <Save className="h-3.5 w-3.5" /> Salvar como…
      </Button>

      {selected && (
        <>
          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={handleUpdateCurrent} title="Sobrescrever o preset com os filtros atuais">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={handleToggleDefault}>
            {selected.is_default ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
            {selected.is_default ? 'Remover padrão' : 'Definir padrão'}
          </Button>
          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs text-destructive" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </Button>
        </>
      )}

      {defaultPreset && !selected && (
        <span className="ml-auto text-[11px] text-muted-foreground">
          Padrão ao abrir: <strong>{defaultPreset.nome}</strong>
        </span>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar filtros</DialogTitle>
            <DialogDescription>
              Dê um nome para este conjunto de filtros. Você poderá reaplicá-lo depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Filial SP — 2026" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={asDefault} onCheckedChange={(v) => setAsDefault(!!v)} />
              Aplicar automaticamente ao abrir esta tela
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAs}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
