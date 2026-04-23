import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import packageJson from '../../package.json';

const CURRENT_VERSION = packageJson.version;
const POLL_INTERVAL_MS = 60_000;
const LS_LAST_VERSION = 'app:last_seen_version';
const LS_LAST_BUNDLE = 'app:last_seen_bundle';
const LS_LAST_RELOAD = 'app:last_reload_at';
const RELOAD_COOLDOWN_MS = 30_000;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignora
  }
}

export function UpdateNotifier() {
  const [show, setShow] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;

    // Cooldown pós-reload: evita loops
    const lastReloadStr = safeGet(LS_LAST_RELOAD);
    const lastReload = lastReloadStr ? Number(lastReloadStr) : 0;
    if (lastReload && Date.now() - lastReload < RELOAD_COOLDOWN_MS) {
      cooldownUntilRef.current = lastReload + RELOAD_COOLDOWN_MS;
    }

    const inCooldown = () => Date.now() < cooldownUntilRef.current;

    const checkVersion = async () => {
      if (inCooldown()) return;
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'app_version')
          .maybeSingle();
        if (cancelled || error || !data?.value) return;
        const remote = String(data.value).trim();
        const lastSeen = safeGet(LS_LAST_VERSION);
        if (remote && remote !== CURRENT_VERSION && remote !== lastSeen) {
          // Persiste imediatamente para evitar loop pós-reload
          safeSet(LS_LAST_VERSION, remote);
          setLatestVersion(remote);
          setShow(true);
        }
      } catch {
        // silencioso
      }
    };

    const checkBundleHash = async () => {
      if (inCooldown()) return;
      try {
        const res = await fetch('/index.html', { cache: 'no-store' });
        if (!res.ok) return;
        const html = await res.text();
        const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
        if (!match) return; // dev sem hash
        const currentBundle = match[1];
        if (cancelled) return;

        const stored = safeGet(LS_LAST_BUNDLE);
        if (!stored) {
          // Primeira vez: estabelece baseline e não alerta
          safeSet(LS_LAST_BUNDLE, currentBundle);
          return;
        }
        if (stored !== currentBundle) {
          // Persiste IMEDIATAMENTE o novo hash para que o pós-reload não dispare de novo
          safeSet(LS_LAST_BUNDLE, currentBundle);
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

    // Se em cooldown, agenda primeira execução após o cooldown expirar
    const remainingCooldown = Math.max(0, cooldownUntilRef.current - Date.now());
    const initialTimer = window.setTimeout(() => {
      runChecks();
      intervalRef.current = window.setInterval(runChecks, POLL_INTERVAL_MS);
    }, remainingCooldown);

    // Listener inerte de Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg || cancelled) return;
        reg.addEventListener('updatefound', () => {
          if (inCooldown()) return;
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (inCooldown()) return;
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setLatestVersion((prev) => prev ?? 'novo build');
              setShow(true);
            }
          });
        });
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (inCooldown()) return;
          window.location.reload();
        });
      }).catch(() => {
        // silencioso
      });
    }

    return () => {
      cancelled = true;
      window.clearTimeout(initialTimer);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Marca cooldown pós-reload
    safeSet(LS_LAST_RELOAD, String(Date.now()));
    // Sempre persiste versão atual como baseline para impedir re-disparo
    if (latestVersion && !latestVersion.startsWith('novo')) {
      safeSet(LS_LAST_VERSION, latestVersion);
    } else {
      safeSet(LS_LAST_VERSION, CURRENT_VERSION);
    }
    // Re-lê o bundle atual e persiste (garante baseline correto pós-reload)
    try {
      const res = await fetch('/index.html', { cache: 'no-store' });
      if (res.ok) {
        const html = await res.text();
        const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
        if (match) safeSet(LS_LAST_BUNDLE, match[1]);
      }
    } catch {
      // ignora
    }
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
      // ignora
    }
    window.location.reload();
  };

  return (
    <Dialog open={show}>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] sm:max-w-md [&>button.absolute]:hidden"
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

        <div className="flex flex-wrap items-center justify-center gap-2 py-2">
          <Badge variant="outline" className="text-xs">
            Atual: v{CURRENT_VERSION}
          </Badge>
          <span className="text-muted-foreground">→</span>
          <Badge className="text-xs">Nova: {latestVersion?.startsWith('novo') ? latestVersion : `v${latestVersion}`}</Badge>
        </div>

        <div>
          <Button onClick={handleRefresh} disabled={refreshing} className="w-full gap-2 min-h-11">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar agora'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
