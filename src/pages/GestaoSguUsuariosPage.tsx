import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, Info } from 'lucide-react';
import { PageHeader } from '@/components/erp/PageHeader';
import { SguProvider } from '@/components/sgu/SguContext';
import { SguUsuariosTab } from '@/components/sgu/SguUsuariosTab';
import { SguCompararTab } from '@/components/sgu/SguCompararTab';
import { SguPreviewCamposTab } from '@/components/sgu/SguPreviewCamposTab';
import { SguAplicarDuplicacaoTab } from '@/components/sgu/SguAplicarDuplicacaoTab';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import GestaoSguUsuariosFallback from './GestaoSguUsuariosFallback';

const PATH = '/gestao-sgu-usuarios';

export default function GestaoSguUsuariosPage() {
  const { isAuthenticated, approved, loading: authLoading } = useAuth();
  const { canView, loading: permsLoading, hasPermissions } = useUserPermissions();

  if (authLoading) return null;

  if (!isAuthenticated || !approved) {
    return <GestaoSguUsuariosFallback variant="unauthenticated" />;
  }

  if (permsLoading) return null;

  if (hasPermissions && !canView(PATH)) {
    return <GestaoSguUsuariosFallback variant="forbidden" />;
  }

  return (
    <SguProvider>
      <div className="space-y-4 p-4">
        <PageHeader
          title="Gestão SGU - Usuários ERP Senior"
          description="Consulte, compare e duplique parâmetros E099* entre usuários SGU com preview campo a campo e dupla confirmação."
        />

        <Tabs defaultValue="usuarios" className="space-y-3">
          <TabsList>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="comparar">Comparar usuários</TabsTrigger>
            <TabsTrigger value="preview">Preview por campo</TabsTrigger>
            <TabsTrigger value="aplicar">
              <ShieldCheck className="h-3.5 w-3.5" /> Aplicar duplicação
            </TabsTrigger>
            <TabsTrigger value="logs">Logs / auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="usuarios"><SguUsuariosTab /></TabsContent>
          <TabsContent value="comparar"><SguCompararTab /></TabsContent>
          <TabsContent value="preview"><SguPreviewCamposTab /></TabsContent>
          <TabsContent value="aplicar"><SguAplicarDuplicacaoTab /></TabsContent>
          <TabsContent value="logs">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Endpoint de auditoria ainda não publicado no backend. Esta aba será habilitada quando o módulo de logs SGU estiver disponível.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </SguProvider>
  );
}
