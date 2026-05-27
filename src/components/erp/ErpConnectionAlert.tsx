import { Wrench, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function ErpConnectionAlert() {
  const { erpUser, erpConnected } = useAuth();

  if (erpConnected) return null;

  if (!erpUser) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Usuário ERP não configurado</p>
          <p className="text-xs text-muted-foreground">
            Seu usuário ERP ainda não foi vinculado. Solicite a um administrador que configure seu acesso em Configurações → Aprovações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
      <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Sistema em manutenção</p>
        <p className="text-xs text-muted-foreground">
          Estamos realizando uma manutenção na conexão com o ERP. Alguns dados podem aparecer
          desatualizados ou indisponíveis por alguns instantes. Já estamos trabalhando para
          normalizar — tente novamente em breve.
        </p>
      </div>
    </div>
  );
}

export function useErpReady() {
  const { erpConnected } = useAuth();
  return erpConnected;
}
