import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function ErpConnectionAlert() {
  const { erpUser, erpConnected } = useAuth();

  if (erpConnected) return null;

  if (!erpUser) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Usuário ERP não configurado</AlertTitle>
        <AlertDescription>
          Seu usuário ERP não está vinculado. Solicite a um administrador que configure seu usuário nas Configurações → Aprovações.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Conexão ERP indisponível</AlertTitle>
      <AlertDescription>
        Não foi possível conectar à API ERP com o usuário "{erpUser}". Verifique se o usuário ERP está correto nas Configurações.
      </AlertDescription>
    </Alert>
  );
}

export function useErpReady() {
  const { erpConnected } = useAuth();
  return erpConnected;
}
