import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { setApiBaseUrl } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  currentUrl: string;
  /** Called after URL was saved + setApiBaseUrl applied. Should return true if /health passes. */
  onSavedAndTest: (newUrl: string) => Promise<boolean>;
}

export function UpdateApiUrlDialog({ open, onOpenChange, currentUrl, onSavedAndTest }: Props) {
  const { toast } = useToast();
  const [url, setUrl] = useState(currentUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUrl(currentUrl);
      setError(null);
    }
  }, [open, currentUrl]);

  const isValid = /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url.trim());

  const handleSave = async () => {
    setError(null);
    const trimmed = url.trim().replace(/\/+$/, '');
    if (!isValid) {
      setError('URL inválida. Use o formato https://...');
      return;
    }
    setSaving(true);
    try {
      const { error: dbErr } = await supabase
        .from('app_settings')
        .upsert({ key: 'erp_api_url', value: trimmed }, { onConflict: 'key' });
      if (dbErr) throw dbErr;
      setApiBaseUrl(trimmed);
      toast({ title: 'URL atualizada', description: 'Testando /health…' });
      const ok = await onSavedAndTest(trimmed);
      if (ok) {
        toast({ title: 'Backend online', description: 'Conexão estabelecida com sucesso.' });
        onOpenChange(false);
      } else {
        setError('URL salva, mas /health não respondeu OK. Verifique se o backend está rodando.');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Falha ao salvar URL');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar URL da API ERP</DialogTitle>
          <DialogDescription>
            Informe a nova URL pública do backend FastAPI (geralmente um túnel ngrok).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="api-url" className="text-xs">URL completa</Label>
          <Input
            id="api-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://xxxx-xxxx.ngrok-free.dev"
            autoFocus
            disabled={saving}
          />
          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
              {error}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Atual: <span className="font-mono break-all">{currentUrl || '(não configurada)'}</span>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !isValid}>
            {saving && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Salvar e testar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
