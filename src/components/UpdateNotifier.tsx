import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const CURRENT_VERSION = (import.meta.env.VITE_APP_VERSION as string) || '0.0.0';
const POLL_INTERVAL_MS = 60_000;

export function UpdateNotifier() {
  const [show, setShow] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const lastBundleRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkVersion = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'app_version')
          .maybeSingle();
        if (cancelled || error || !data?.value) return;
        const remote = String(data.value).trim();
        if (remote && remote !== CURRENT_VERSION) {
          setLatestVersion(remote);
          setShow(true);
        }
      } catch {
        // silencioso
      }
    };

    const checkBundleHash = async () => {
      try {
        const res = await fetch('/index.html', { cache: 'no-store' });
        if (!res.ok) return;
        const html = await res.text();
        // Procura o bundle principal: <script type="module" src="/assets/index-XXXX.js">
        const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
        if (!match) return; // em dev (sem hash) não casa — ok
        const currentBundle = match[1];
        if (cancelled) return;
        if (lastBundleRef.current === null) {
          lastBundleRef.current = currentBundle;
          return;
        }
        if (lastBundleRef.current !== currentBundle) {
          setLatestVersion((prev) => prev ?? 'novo build');
          setShow(true);
        }
      } catch {
        // silencioso
      }
    };

    const runChecks = () => {
      checkVersion();
      checkBundleHash();
    };

    runChecks();
    intervalRef.current = window.setInterval(runChecks, POLL_INTERVAL_MS);

    // Listener inerte de Service Worker — só ativa se algum SW for registrado no futuro.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg || cancelled) return;
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setLatestVersion((prev) => prev ?? 'novo build');
              setShow(true);
            }
          });
        });
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      }).catch(() => {
        // silencioso
      });
    }

    return () => {
      cancelled = true;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch {
      // ignora
    }
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {
      // ignora falha de cache
    }
    window.location.reload();
  };

  return (
    <Dialog open={show}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Nova versão disponível</DialogTitle>
          <DialogDescription className="text-center">
            Uma atualização do EZ ERP IA foi publicada. Clique em <strong>Atualizar agora</strong> para carregar a nova versão.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-3 py-2">
          <Badge variant="outline" className="text-xs">
            Atual: v{CURRENT_VERSION}
          </Badge>
          <span className="text-muted-foreground">→</span>
          <Badge className="text-xs">Nova: {latestVersion?.startsWith('novo') ? latestVersion : `v${latestVersion}`}</Badge>
        </div>

        <Button onClick={handleRefresh} disabled={refreshing} className="w-full gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Atualizando...' : 'Atualizar agora'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
