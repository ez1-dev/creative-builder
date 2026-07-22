import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ErpConnectionAlert } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { ConsultaTab } from './estoque/tabs/ConsultaTab';
import { CurvaAbcTab } from './estoque/tabs/CurvaAbcTab';
import { BaixoGiroTab } from './estoque/tabs/BaixoGiroTab';

type Aba = 'consulta' | 'curva-abc' | 'baixo-giro';
const VALID: Aba[] = ['consulta', 'curva-abc', 'baixo-giro'];

export default function EstoquePage() {
  const [params, setParams] = useSearchParams();
  const abaParam = params.get('aba') as Aba | null;
  const aba: Aba = abaParam && VALID.includes(abaParam) ? abaParam : 'consulta';

  const setAba = (v: string) => {
    const next = new URLSearchParams(params);
    next.set('aba', v);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Estoque"
        description="Consulta operacional, Curva ABC e análise de baixo giro em um único motor de análise."
      />
      <Tabs value={aba} onValueChange={setAba}>
        <TabsList>
          <TabsTrigger value="consulta">Consulta</TabsTrigger>
          <TabsTrigger value="curva-abc">Curva ABC</TabsTrigger>
          <TabsTrigger value="baixo-giro">Baixo Giro</TabsTrigger>
        </TabsList>
        <TabsContent value="consulta" className="mt-4"><ConsultaTab /></TabsContent>
        <TabsContent value="curva-abc" className="mt-4"><CurvaAbcTab /></TabsContent>
        <TabsContent value="baixo-giro" className="mt-4"><BaixoGiroTab /></TabsContent>
      </Tabs>
    </div>
  );
}
