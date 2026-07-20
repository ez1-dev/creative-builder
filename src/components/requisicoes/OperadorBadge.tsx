import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, UserCircle2 } from 'lucide-react';

export interface OperadorInfo {
  portalNome: string | null;
  portalLogin: string | null;
  erpUser: string | null;
  /** Pronto para operar (login portal + erp_user preenchidos). */
  ready: boolean;
  motivo?: string;
}

export function useOperadorInfo(): OperadorInfo {
  const { displayName, user, erpUser } = useAuth();
  const portalLogin = user?.email ?? null;
  const portalNome = displayName ?? portalLogin;
  if (!portalLogin) {
    return { portalNome, portalLogin, erpUser, ready: false, motivo: 'Você precisa estar autenticado no portal para operar.' };
  }
  if (!erpUser) {
    return {
      portalNome, portalLogin, erpUser,
      ready: false,
      motivo: 'Seu login do portal não está vinculado a um usuário do ERP. Solicite o vínculo antes de operar.',
    };
  }
  return { portalNome, portalLogin, erpUser, ready: true };
}

/**
 * Bloco visível de identificação do operador — deve aparecer antes de qualquer
 * confirmação/movimento de estoque. Mostra o usuário autenticado no portal e o
 * login espelhado no ERP (quando existe).
 *
 * O código numérico do usuário no ERP (codusu) não é exposto por nenhum
 * endpoint atual — quando o backend publicar um `usuario-erp` lookup podemos
 * enriquecer o badge sem mudar seus consumidores.
 */
export function OperadorBadge({ compact = false }: { compact?: boolean }) {
  const info = useOperadorInfo();
  const critical = !info.ready;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className="gap-1">
          <UserCircle2 className="h-3.5 w-3.5" />
          Operando como <strong>{info.portalNome ?? '—'}</strong>
          {info.portalLogin && <span className="text-muted-foreground">· {info.portalLogin}</span>}
        </Badge>
        <Badge variant={critical ? 'destructive' : 'secondary'} className="gap-1">
          Usuário ERP: <strong>{info.erpUser ?? 'não vinculado'}</strong>
        </Badge>
        {critical && info.motivo && (
          <span className="text-destructive">{info.motivo}</span>
        )}
      </div>
    );
  }

  return (
    <Card className={`flex flex-wrap items-center gap-3 border p-3 text-sm ${critical ? 'border-destructive/60 bg-destructive/5' : 'bg-muted/30'}`}>
      <UserCircle2 className={`h-5 w-5 shrink-0 ${critical ? 'text-destructive' : 'text-primary'}`} />
      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Operando como</div>
          <div className="font-medium">
            {info.portalNome ?? '—'}
            {info.portalLogin && <span className="ml-1 text-xs text-muted-foreground">· {info.portalLogin}</span>}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Usuário ERP</div>
          <div className={`font-medium ${critical ? 'text-destructive' : ''}`}>
            {info.erpUser ?? 'não vinculado'}
          </div>
        </div>
      </div>
      {critical && (
        <div className="flex items-start gap-2 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <span className="max-w-xs">{info.motivo}</span>
        </div>
      )}
    </Card>
  );
}
