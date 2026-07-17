import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Pencil, Save } from 'lucide-react';
import { upsertDeParaMonitorErp } from '@/lib/monitorErpNativoDeparaApi';

interface Props {
  tela: string;
  initial?: {
    nome_tela?: string | null;
    atalho?: string | null;
    modulo?: string | null;
    ativo?: boolean;
    obs?: string | null;
  };
  onSaved?: () => void;
}

export function EdicaoTelaPopover({ tela, initial, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState('');
  const [atalho, setAtalho] = useState('');
  const [modulo, setModulo] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [obs, setObs] = useState('');

  useEffect(() => {
    if (open) {
      setNome(initial?.nome_tela ?? '');
      setAtalho(initial?.atalho ?? '');
      setModulo(initial?.modulo ?? '');
      setAtivo(initial?.ativo ?? true);
      setObs(initial?.obs ?? '');
    }
  }, [open, initial]);

  const canSave = !!nome.trim() && !!modulo.trim() && !saving;

  const salvar = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await upsertDeParaMonitorErp({
        tela,
        nome_tela: nome.trim(),
        atalho: atalho.trim(),
        modulo: modulo.trim(),
        ativo,
        obs: obs.trim() || undefined,
      });
      toast.success(`Tela ${tela} atualizada.`);
      setOpen(false);
      onSaved?.();
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao salvar mapeamento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Editar de-para da tela ${tela}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 space-y-3"
        onClick={(e) => e.stopPropagation()}
        align="end"
      >
        <div className="text-xs text-muted-foreground">
          Tela: <span className="font-mono text-foreground">{tela}</span>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nome amigável *</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-8" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Atalho</Label>
            <Input value={atalho} onChange={(e) => setAtalho(e.target.value)} className="h-8" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Módulo *</Label>
            <Input value={modulo} onChange={(e) => setModulo(e.target.value)} className="h-8" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Observação</Label>
          <Input value={obs} onChange={(e) => setObs(e.target.value)} className="h-8" />
        </div>
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs">
            <Switch checked={ativo} onCheckedChange={setAtivo} />
            Ativo
          </Label>
          <Button size="sm" onClick={salvar} disabled={!canSave} className="gap-1">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
