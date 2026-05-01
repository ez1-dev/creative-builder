import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle, CheckCircle2, KeyRound, Link2Off, RefreshCw, Server, ServerCrash, Settings2, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type BackendStatusKind =
  | 'idle'
  | 'loading'
  | 'online'
  | 'offline'
  | 'unauthorized'
  | 'not_found'
  | 'server_error';

export interface BackendStatus {
  kind: BackendStatusKind;
  message?: string;
  statusCode?: number;
  timestamp?: string; // ISO
}

interface Props {
  status: BackendStatus;
  apiUrl: string;
  onTest: () => void;
  onChangeUrl: () => void;
  onRetry: () => void;
  testing?: boolean;
  retrying?: boolean;
}

const fmtTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(d);
};

function classify(status: BackendStatus) {
  switch (status.kind) {
    case 'online':
      return {
        title: 'Backend ERP online',
        description: 'Conexão com a API ERP funcionando normalmente.',
        icon: <CheckCircle2 className="h-4 w-4" />,
        variant: 'default' as const,
        tone: 'success' as const,
      };
    case 'offline': {
      const isNgrok = /ERR_NGROK_3200|ngrok/i.test(status.message ?? '');
      return {
        title: isNgrok ? 'Túnel ngrok offline' : 'Backend ERP offline ou indisponível',
        description: isNgrok
          ? 'Reinicie o ngrok no servidor do backend e atualize a URL se necessário.'
          : 'Não foi possível conectar na API ERP. Verifique se o FastAPI e o túnel ngrok estão ativos.',
        icon: <Link2Off className="h-4 w-4" />,
        variant: 'destructive' as const,
        tone: 'destructive' as const,
      };
    }
    case 'unauthorized':
      return {
        title: 'Token expirado ou inválido',
        description: 'Sua sessão da API ERP expirou. Faça login novamente para continuar.',
        icon: <KeyRound className="h-4 w-4" />,
        variant: 'default' as const,
        tone: 'warning' as const,
      };
    case 'not_found':
      return {
        title: 'Rota não publicada',
        description: 'Backend online, mas a rota /api/senior/sessoes ainda não foi publicada no FastAPI.',
        icon: <AlertTriangle className="h-4 w-4" />,
        variant: 'default' as const,
        tone: 'warning' as const,
      };
    case 'server_error':
      return {
        title: `Erro do backend${status.statusCode ? ` (${status.statusCode})` : ''}`,
        description: 'O servidor respondeu com erro. Verifique os logs do FastAPI.',
        icon: <ServerCrash className="h-4 w-4" />,
        variant: 'destructive' as const,
        tone: 'destructive' as const,
      };
    case 'loading':
      return {
        title: 'Verificando conexão…',
        description: 'Consultando o backend ERP.',
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        variant: 'default' as const,
        tone: 'muted' as const,
      };
    default:
      return {
        title: 'Status do backend',
        description: 'Aguardando primeira verificação.',
        icon: <Server className="h-4 w-4" />,
        variant: 'default' as const,
        tone: 'muted' as const,
      };
  }
}

export function BackendStatusCard({
  status, apiUrl, onTest, onChangeUrl, onRetry, testing, retrying,
}: Props) {
  const meta = classify(status);

  // wrapper border tone via classes (semantic tokens only)
  const toneRing =
    meta.tone === 'success'
      ? 'border-l-4 border-l-primary'
      : meta.tone === 'warning'
      ? 'border-l-4 border-l-amber-500'
      : meta.tone === 'destructive'
      ? 'border-l-4 border-l-destructive'
      : 'border-l-4 border-l-muted-foreground/40';

  return (
    <Alert variant={meta.variant} className={cn('relative', toneRing)}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{meta.icon}</div>
        <div className="flex-1 min-w-0">
          <AlertTitle className="flex flex-wrap items-center gap-2">
            <span>{meta.title}</span>
            {status.kind === 'online' && <Badge variant="outline" className="text-[10px]">OK</Badge>}
            {status.statusCode != null && status.kind !== 'online' && (
              <Badge variant="outline" className="text-[10px]">HTTP {status.statusCode}</Badge>
            )}
          </AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p>{meta.description}</p>
              {status.message && status.kind !== 'online' && (
                <p className="rounded-md bg-muted/60 px-2 py-1 font-mono text-[11px] text-muted-foreground break-all">
                  {status.message}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Server className="h-3 w-3" />
                  <span className="font-mono break-all">{apiUrl || '(não configurada)'}</span>
                </span>
                <span>Última verificação: {fmtTime(status.timestamp)}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={onTest} disabled={testing} className="h-8 gap-1">
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Testar conexão
                </Button>
                <Button size="sm" variant="outline" onClick={onChangeUrl} className="h-8 gap-1">
                  <Settings2 className="h-3.5 w-3.5" />
                  Atualizar API URL
                </Button>
                <Button size="sm" variant="outline" onClick={onRetry} disabled={retrying} className="h-8 gap-1">
                  <RefreshCw className={cn('h-3.5 w-3.5', retrying && 'animate-spin')} />
                  Tentar novamente
                </Button>
              </div>
            </div>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
