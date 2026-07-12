import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function PresentationToggle() {
  const { presentationActive, prefs, loading, togglePresentation, updatePresentation } = useDemoMode();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const s = prefs.presentation_settings;

  const handleToggle = async (next = !presentationActive) => {
    if (loading || saving) return;
    setSaving(true);
    try {
      await togglePresentation(next);
      toast.success(next ? 'Modo Apresentação ativado' : 'Modo Apresentação desativado');
    } catch (error: any) {
      toast.error(`Não foi possível alterar o Modo Apresentação: ${error?.message ?? 'erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (patch: Parameters<typeof updatePresentation>[0]) => {
    try {
      await updatePresentation(patch);
    } catch (error: any) {
      toast.error(`Não foi possível salvar a configuração: ${error?.message ?? 'erro desconhecido'}`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant={presentationActive ? 'default' : 'ghost'}
          disabled={loading || saving}
          onClick={() => void handleToggle()}
          className={cn(
            'h-7 3xl:h-9 text-xs 3xl:text-sm gap-1 shrink-0',
            presentationActive && 'bg-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/90 text-[hsl(var(--warning-foreground))]',
          )}
          title="Modo Apresentação"
        >
          {saving ? <Loader2 className="h-3 w-3 3xl:h-4 3xl:w-4 animate-spin" /> : <Sparkles className="h-3 w-3 3xl:h-4 3xl:w-4" />}
          <span className="hidden sm:inline">{presentationActive ? 'Apresentação ON' : 'Apresentação'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Modo Apresentação</p>
            <p className="text-xs text-muted-foreground">Mascara nomes, valores e documentos.</p>
          </div>
          <Switch checked={presentationActive} disabled={loading || saving} onCheckedChange={(v) => void handleToggle(v)} />
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Fator de valores</Label>
          <Select value={String(s.factor)} onValueChange={(v) => void handleUpdate({ factor: Number(v) })}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">×0,50</SelectItem>
              <SelectItem value="0.73">×0,73 (padrão)</SelectItem>
              <SelectItem value="1">×1,00 (originais)</SelectItem>
              <SelectItem value="1.25">×1,25</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Estilo dos nomes</Label>
          <Select value={s.nameStyle} onValueChange={(v) => void handleUpdate({ nameStyle: v as any })}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alfa">Cliente Alfa 12</SelectItem>
              <SelectItem value="norte">Cliente Norte</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Nome fantasia da empresa</Label>
          <Input
            value={s.companyName}
            onChange={(e) => void handleUpdate({ companyName: e.target.value })}
            className="h-8"
          />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs">Ocultar CNPJ/CPF/placas</Label>
          <Switch checked={s.hideDocs} onCheckedChange={(v) => void handleUpdate({ hideDocs: v })} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
