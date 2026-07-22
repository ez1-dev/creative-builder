import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Sparkles, Plug, Palette } from 'lucide-react';
import { LiberacoesFeaturePanel } from './LiberacoesFeaturePanel';
import { PermissoesPorTelaPanel, type ProfileItem, type ProfileScreenItem, type ScreenItem } from './PermissoesPorTelaPanel';

interface Props {
  screens: ScreenItem[];
  profiles: ProfileItem[];
  profileScreens: ProfileScreenItem[];
  onToggle: (profileId: string, screenPath: string, screenName: string, field: 'can_view' | 'can_edit' | 'can_delete') => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
}

/** Central de Liberações: telas, funcionalidades, integrações e visual/demo. */
export function LiberacoesPanel(props: Props) {
  const [tab, setTab] = useState('telas');
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5"><Shield className="h-5 w-5 text-primary" /></div>
          <div>
            <h2 className="text-lg font-semibold leading-tight">Liberações</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Controle o que cada perfil vê e faz. Também é possível abrir exceções por usuário.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="telas" className="gap-1.5"><Shield className="h-3.5 w-3.5" />Telas & Menus</TabsTrigger>
          <TabsTrigger value="funcionalidades" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" />Funcionalidades</TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-1.5"><Plug className="h-3.5 w-3.5" />Integrações</TabsTrigger>
          <TabsTrigger value="visual" className="gap-1.5"><Palette className="h-3.5 w-3.5" />Visual & Demo</TabsTrigger>
        </TabsList>

        <TabsContent value="telas" className="mt-3">
          <PermissoesPorTelaPanel {...props} />
        </TabsContent>
        <TabsContent value="funcionalidades" className="mt-3">
          <LiberacoesFeaturePanel
            area="funcionalidade"
            title="Funcionalidades dentro das telas"
            description="Ligue/desligue ações finas (exportar, aprovar, editar) por perfil, com exceções por usuário."
          />
        </TabsContent>
        <TabsContent value="integracoes" className="mt-3">
          <LiberacoesFeaturePanel
            area="integracao"
            title="Integrações"
            description="Habilite integrações externas (SID, ETL, IA) por perfil ou usuário."
          />
        </TabsContent>
        <TabsContent value="visual" className="mt-3">
          <LiberacoesFeaturePanel
            area="visual_demo"
            title="Visual & Demonstração"
            description="Padrões visuais e modo demonstração — pode ser habilitado por perfil ou apenas para usuários específicos."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
