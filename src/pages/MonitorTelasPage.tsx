import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonitorSmartphone, RefreshCw } from 'lucide-react';
import { MonitorTelasTab } from '@/components/monitor-telas/MonitorTelasTab';
import type { TelemetriaOrigem } from '@/lib/navegacaoTelemetriaApi';

const OPCOES_DIAS = [7, 30, 60, 90] as const;

export default function MonitorTelasPage() {
  const [dias, setDias] = useState<number>(30);
  const [modulo, setModulo] = useState('');
  const [usuario, setUsuario] = useState('');
  const [applied, setApplied] = useState({ dias: 30, modulo: '', usuario_filtro: '' });
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<TelemetriaOrigem>('web');

  const aplicar = () => {
    setApplied({ dias, modulo, usuario_filtro: usuario });
    setReloadKey((k) => k + 1);
  };

  const onTabChange = (v: string) => {
    setTab(v as TelemetriaOrigem);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <MonitorSmartphone className="h-6 w-6 text-primary" />
          Monitor de Telas
        </h1>
        <p className="text-sm text-muted-foreground">
          Telemetria de uso das telas do Portal Web e dos processos nativos do ERP Senior.
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-6">
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">Período</Label>
            <div className="flex flex-wrap gap-1">
              {OPCOES_DIAS.map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={dias === d ? 'default' : 'outline'}
                  onClick={() => setDias(d)}
                  className="h-9"
                >
                  {d} dias
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">Módulo</Label>
            <Input value={modulo} onChange={(e) => setModulo(e.target.value)} placeholder="Ex.: RH, BI, COMPRAS..." className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Usuário</Label>
            <Input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Login ou email" className="h-9" />
          </div>
          <div className="flex items-end">
            <Button onClick={aplicar} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="web">Portal Web</TabsTrigger>
          <TabsTrigger value="nativo">ERP Nativo</TabsTrigger>
        </TabsList>
        <TabsContent value="web" className="mt-3">
          <MonitorTelasTab origem="web" filtros={applied} reloadKey={reloadKey} />
        </TabsContent>
        <TabsContent value="nativo" className="mt-3">
          <MonitorTelasTab origem="nativo" filtros={applied} reloadKey={reloadKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
