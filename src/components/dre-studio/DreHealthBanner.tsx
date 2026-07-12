import { AlertCircle, Server, Database as DbIcon, CheckCircle2 } from 'lucide-react';
import { useDreStudioHealth } from '@/hooks/contabil/useDreStudio';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

/**
 * Banner de saúde da API contábil. Faz distinção entre:
 * - API principal offline
 * - API online mas ERP SQL Server inacessível
 * - Armazenamento Supabase da DRE indisponível
 */
export function DreHealthBanner({ className }: { className?: string }) {
  const { data, error, isFetching } = useDreStudioHealth();

  if (isFetching && !data && !error) return null;

  if (error) {
    const status = (error as any)?.statusCode ?? (error as any)?.status;
    const isNotFound = status === 404 || (error as any)?.dreKind === 'not_found';
    return (
      <Alert className={cn('mb-3 border-amber-500/50 bg-amber-500/5', className)}>
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle>
          {isNotFound ? 'Módulo aguardando backend' : 'API contábil indisponível'}
        </AlertTitle>
        <AlertDescription>
          {isNotFound
            ? 'Os endpoints /api/contabil/* ainda não foram publicados na API principal do ERP. As telas do DRE Studio ficam disponíveis para pré-visualização, mas dados reais só carregarão após a integração no backend. Contrato esperado documentado em docs/backend-dre-studio-endpoints.md.'
            : 'Não foi possível acessar a API principal do ERP. Verifique se o backend FastAPI está em execução e se a URL configurada em Configurações está correta.'}
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
          A API está online, mas não conseguiu acessar o banco do ERP Senior. Verifique a VPN ou o servidor SQL.
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
