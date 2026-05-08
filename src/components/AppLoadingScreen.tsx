import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  timeoutMs?: number;
  label?: string;
}

export default function AppLoadingScreen({ timeoutMs = 12000, label = 'Carregando…' }: Props) {
  const [showStuck, setShowStuck] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowStuck(true), timeoutMs);
    return () => clearTimeout(t);
  }, [timeoutMs]);

  const handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  const handleSair = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    try {
      localStorage.clear();
    } catch {}
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[hsl(215,70%,22%)] to-[hsl(215,60%,35%)] p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-2xl text-center space-y-4">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
        <p className="text-sm text-muted-foreground">{label}</p>
        {showStuck && (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-muted-foreground">
              Estamos demorando mais do que o normal. Verifique sua conexão ou tente novamente.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleReload} variant="default" className="flex-1 gap-2">
                <RefreshCw className="h-4 w-4" /> Recarregar
              </Button>
              <Button onClick={handleSair} variant="outline" className="flex-1 gap-2">
                <LogOut className="h-4 w-4" /> Sair
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
