import { useQueries, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getContabilBaseUrl,
  pingContabilHealth,
  contabilApi,
  type ContabilHealthResult,
} from '@/lib/contabil/contabilApi';

type ProbeResult = { ok: boolean; status: number | 'network' | 'timeout'; details?: string };

async function probeRoute(path: string): Promise<ProbeResult> {
  try {
    await contabilApi.get(path);
    return { ok: true, status: 200 };
  } catch (e: any) {
    const status =
      e?.dreKind === 'timeout' ? 'timeout'
      : e?.statusCode === 0 ? 'network'
      : (e?.statusCode ?? 'network');
    return { ok: false, status, details: e?.bodyText ?? e?.message };
  }
}

const PROBED_ROUTES = ['/api/contabil/agendamentos', '/api/contabil/snapshots'];

type Tone = 'ok' | 'warn' | 'error' | 'idle';

function looksLikeDbError(text?: string): boolean {
  if (!text) return false;
  return /(sql\s?server|1433|pymssql|pyodbc|senior|vpn|172\.16\.137\.100)/i.test(text);
}

function classify(
  health: ContabilHealthResult | undefined,
  probes: ProbeResult[],
): { tone: Tone; message: string } {
  if (!health) return { tone: 'idle', message: 'Verificando conexão…' };

  // Health falhou: só aqui podemos falar em "API offline" / auth / health não publicado.
  if (!health.ok) {
    const s = health.status;
    if (s === 401) return { tone: 'warn', message: 'Sessão expirada — refaça o login.' };
    if (s === 404) {
      return {
        tone: 'warn',
        message: 'Rota /api/contabil/health não encontrada nesta versão do backend.',
      };
    }
    if (s === 'network' || s === 'timeout' || s === 0) {
      return { tone: 'error', message: 'API contábil indisponível.' };
    }
    return { tone: 'error', message: `API contábil retornou HTTP ${s}.` };
  }

  // Health OK — a partir daqui NUNCA dizemos "API offline".
  const anyNotFound = probes.some((p) => p.status === 404);
  const dbFailure = probes.find(
    (p) => !p.ok && typeof p.status === 'number' && p.status >= 500 && looksLikeDbError(p.details),
  );

  if (dbFailure) {
    return { tone: 'warn', message: 'API online, mas sem conexão com o banco ERP.' };
  }
  if (anyNotFound) {
    return {
      tone: 'warn',
      message: 'API conectada, mas o recurso solicitado ainda não foi publicado no backend.',
    };
  }
  return { tone: 'ok', message: 'API contábil conectada.' };
}

export function DreApiDiagnostico() {
  const baseUrl = getContabilBaseUrl();
  const qc = useQueryClient();

  const results = useQueries({
    queries: [
      {
        queryKey: ['contabil-api-health', baseUrl],
        queryFn: pingContabilHealth,
        staleTime: 60_000,
        refetchOnWindowFocus: false,
      },
      ...PROBED_ROUTES.map((path) => ({
        queryKey: ['contabil-api-probe', baseUrl, path],
        queryFn: () => probeRoute(path),
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: false,
      })),
    ],
  });

  const [healthQ, ...probeQs] = results;
  const health = healthQ.data as ContabilHealthResult | undefined;
  const probes = probeQs.map((q) => q.data).filter(Boolean) as ProbeResult[];
  const isFetching = results.some((r) => r.isFetching);

  const { tone, message } = classify(health, probes);
  const Icon =
    tone === 'ok' ? CheckCircle2
    : tone === 'warn' ? AlertTriangle
    : tone === 'error' ? WifiOff
    : RefreshCw;

  const iconClass =
    tone === 'ok' ? 'text-emerald-600'
    : tone === 'warn' ? 'text-amber-600'
    : tone === 'error' ? 'text-destructive'
    : 'text-muted-foreground';

  const handleTest = async () => {
    await Promise.all(results.map((r) => r.refetch()));
    qc.invalidateQueries({ queryKey: ['dre-matriz'] });
  };

  return (
    <Card>
      <CardContent className="py-2.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">API contábil:</span>
            <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">{baseUrl}</code>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon className={cn('h-3.5 w-3.5', iconClass, isFetching && 'animate-spin')} />
            <span className={cn(tone === 'error' && 'text-destructive font-medium')}>{message}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs ml-auto"
            onClick={handleTest}
            disabled={isFetching}
          >
            <RefreshCw className={cn('h-3 w-3 mr-1', isFetching && 'animate-spin')} />
            Testar conexão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
