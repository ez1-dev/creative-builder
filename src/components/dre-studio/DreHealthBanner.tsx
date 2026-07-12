import { AlertCircle, Database as DbIcon, CheckCircle2 } from 'lucide-react';
import { useDreStudioHealth } from '@/hooks/contabil/useDreStudio';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { getContabilBaseUrl } from '@/lib/contabil/contabilApi';

/**
 * Banner de saúde da API contábil. Faz distinção entre:
 * - API contábil offline / timeout / rede
 * - Endpoint não encontrado (404)
 * - API online mas ERP SQL Server inacessível
 * - Armazenamento Supabase da DRE indisponível
 */
export function DreHealthBanner({ className }: { className?: string }) {
  const { data, error, isFetching } = useDreStudioHealth();

  if (isFetching && !data && !error) return null;

  if (error) {
    const status = (error as any)?.statusCode ?? (error as any)?.status;
    const kind = (error as any)?.dreKind;
    const urlTested = (error as any)?.urlTested ?? `${getContabilBaseUrl()}/api/contabil/health`;
    const bodyText = (error as any)?.bodyText ?? (error as any)?.message ?? '';
    const isNotFound = status === 404 || kind === 'not_found';
    const isTimeout = kind === 'timeout';
    const isOffline = status === 0 || kind === 'api_offline';

    const title = isNotFound
      ? 'Endpoint /api/contabil/health não encontrado'
      : isTimeout
      ? 'API contábil não respondeu (timeout)'
      : isOffline
      ? 'API contábil indisponível'
      : `API contábil retornou erro ${status ?? ''}`.trim();

    const httpLabel =
      isTimeout ? 'timeout (15s)'
      : isOffline ? 'erro de rede'
      : String(status ?? '—');

    return (
      <Alert
        variant={isNotFound || isTimeout || isOffline ? 'destructive' : 'default'}
        className={cn('mb-3', className)}
      >
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>
          <div className="space-y-1 text-xs">
            <div>
              <span className="font-medium">URL testada:</span>{' '}
              <span className="font-mono break-all">{urlTested}</span>
            </div>
            <div>
              <span className="font-medium">Status HTTP:</span>{' '}
              <span className="font-mono">{httpLabel}</span>
            </div>
            {bodyText && (
              <div>
                <span className="font-medium">Detalhes:</span>{' '}
                <span className="font-mono break-all">{String(bodyText).slice(0, 400)}</span>
              </div>
            )}
            {isNotFound && (
              <div className="pt-1 text-muted-foreground">
                Verifique se o backend contábil está publicado nesse domínio. Contrato esperado em <code>docs/backend-dre-studio-endpoints.md</code>.
              </div>
            )}
            {(isOffline || isTimeout) && (
              <div className="pt-1 text-muted-foreground">
                A API principal do ERP não é afetada. Ajuste a URL da API contábil em <strong>Configurações → API</strong>.
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }


  if (!data) return null;

  const erpOk = isOk(data.erp);
  const supabaseOk = isOk(data.supabase);

  if (!erpOk) {
    return (
      <Alert variant="destructive" className={cn('mb-3', className)}>
        <DbIcon className="h-4 w-4" />
        <AlertTitle>Banco do ERP inacessível</AlertTitle>
        <AlertDescription>
          A API contábil está online, mas não conseguiu acessar o banco do ERP Senior. Verifique a VPN ou o servidor SQL.
        </AlertDescription>
      </Alert>
    );
  }

  if (!supabaseOk) {
    return (
      <Alert className={cn('mb-3 border-amber-500/50 bg-amber-500/5', className)}>
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle>Configuração da DRE indisponível</AlertTitle>
        <AlertDescription>
          O armazenamento de configuração da DRE não está disponível no momento.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn('mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      API contábil online.
    </div>
  );
}

function isOk(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return /^(ok|up|online|conectado|true)$/i.test(v);
  if (typeof v === 'object' && v && 'status' in (v as any)) {
    const s = String((v as any).status ?? '');
    return /^(ok|up|online|conectado)$/i.test(s);
  }
  return true;
}
