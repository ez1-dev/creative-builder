import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getContabilBaseUrl, pingContabilHealth, type ContabilHealthResult } from '@/lib/contabil/contabilApi';

function describe(result: ContabilHealthResult | undefined): {
  tone: 'ok' | 'warn' | 'error' | 'idle';
  message: string;
} {
  if (!result) return { tone: 'idle', message: 'Verificando conexão…' };
  if (result.ok) return { tone: 'ok', message: 'API contábil conectada' };
  const s = result.status;
  if (s === 404) {
    return {
      tone: 'warn',
      message:
        'O domínio está online, mas a rota contábil não foi encontrada. Verifique se o túnel está apontando para a API integrada da porta 8070.',
    };
  }
  if (s === 401) return { tone: 'warn', message: 'Sessão expirada — refaça o login.' };
  if (s === 'network' || s === 'timeout' || s === 0) {
    return {
      tone: 'error',
      message: 'API contábil indisponível. Verifique o túnel ngrok e a execução do backend.',
    };
  }
  return { tone: 'error', message: `HTTP ${s}${result.details ? ` — ${String(result.details).slice(0, 200)}` : ''}` };
}

export function DreApiDiagnostico() {
  const baseUrl = getContabilBaseUrl();
  const qc = useQueryClient();
  const { data, isFetching, refetch } = useQuery({
    queryKey: ['contabil-api-health', baseUrl],
    queryFn: pingContabilHealth,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { tone, message } = describe(data);
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
    await refetch();
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
