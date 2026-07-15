/**
 * Dashboard Geral — central executiva consolidada.
 * Estrutura: aba "Visão geral" + 1 aba por módulo (Comercial, Compras,
 * Financeiro, Contabilidade, RH, Produção, Estoque, Manutenção).
 * Cada aba é lazy (hooks só disparam quando a aba está ativa).
 */
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useDashboardGeral } from '@/hooks/useDashboardGeral';
import type { Periodo } from '@/lib/dashboardGeral/aggregator';
import { VisaoGeralTab } from './dashboard-geral/tabs/VisaoGeralTab';
import { ComercialTab } from './dashboard-geral/tabs/ComercialTab';
import { ComprasTab } from './dashboard-geral/tabs/ComprasTab';
import { FinanceiroTab } from './dashboard-geral/tabs/FinanceiroTab';
import { ContabilidadeTab } from './dashboard-geral/tabs/ContabilidadeTab';
import { RhTab } from './dashboard-geral/tabs/RhTab';
import { ProducaoTab } from './dashboard-geral/tabs/ProducaoTab';
import { EstoqueTab } from './dashboard-geral/tabs/EstoqueTab';
import { ManutencaoTab } from './dashboard-geral/tabs/ManutencaoTab';

const PERIODOS: Array<{ value: Periodo; label: string }> = [
  { value: 'mes_atual', label: 'Mês atual' },
  { value: 'mes_anterior', label: 'Mês anterior' },
  { value: 'ytd', label: 'YTD' },
  { value: 'ult_12m', label: 'Últimos 12 meses' },
];

type Modulo = 'geral' | 'comercial' | 'compras' | 'financeiro' | 'contabilidade' | 'rh' | 'producao' | 'estoque' | 'manutencao';

export default function DashboardGeralPage() {
  const [periodo, setPeriodo] = useState<Periodo>('ytd');
  const [modulo, setModulo] = useState<Modulo>('geral');
  const { loading, refetch, range } = useDashboardGeral(periodo);

  return (
    <div className="container mx-auto px-3 md:px-6 py-4 md:py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard Geral</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão consolidada por módulo · {range.label}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <TabsList>
              {PERIODOS.map((p) => (
                <TabsTrigger key={p.value} value={p.value}>{p.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Tabs de módulo */}
      <Tabs value={modulo} onValueChange={(v) => setModulo(v as Modulo)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="geral">Visão geral</TabsTrigger>
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="compras">Compras</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="contabilidade">Contabilidade</TabsTrigger>
          <TabsTrigger value="rh">RH</TabsTrigger>
          <TabsTrigger value="producao">Produção</TabsTrigger>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="manutencao">Manutenção</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-4"><VisaoGeralTab periodo={periodo} enabled={modulo === 'geral'} /></TabsContent>
        <TabsContent value="comercial" className="mt-4"><ComercialTab periodo={periodo} enabled={modulo === 'comercial'} /></TabsContent>
        <TabsContent value="compras" className="mt-4"><ComprasTab periodo={periodo} enabled={modulo === 'compras'} /></TabsContent>
        <TabsContent value="financeiro" className="mt-4"><FinanceiroTab periodo={periodo} enabled={modulo === 'financeiro'} /></TabsContent>
        <TabsContent value="contabilidade" className="mt-4"><ContabilidadeTab periodo={periodo} enabled={modulo === 'contabilidade'} /></TabsContent>
        <TabsContent value="rh" className="mt-4"><RhTab periodo={periodo} enabled={modulo === 'rh'} /></TabsContent>
        <TabsContent value="producao" className="mt-4"><ProducaoTab periodo={periodo} enabled={modulo === 'producao'} /></TabsContent>
        <TabsContent value="estoque" className="mt-4"><EstoqueTab enabled={modulo === 'estoque'} /></TabsContent>
        <TabsContent value="manutencao" className="mt-4"><ManutencaoTab periodo={periodo} enabled={modulo === 'manutencao'} /></TabsContent>
      </Tabs>
    </div>
  );
}
