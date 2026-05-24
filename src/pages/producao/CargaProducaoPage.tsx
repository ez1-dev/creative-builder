import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CargaFiltersBar } from '@/components/producao/carga/CargaFiltersBar';
import { VisaoGeralTab } from '@/components/producao/carga/VisaoGeralTab';
import { CentrosRecursoTab } from '@/components/producao/carga/CentrosRecursoTab';
import { DetalheOpsTab } from '@/components/producao/carga/DetalheOpsTab';
import { ParametrosRecursosTab } from '@/components/producao/carga/ParametrosRecursosTab';
import { cargaApi, CargaFiltros } from '@/lib/producao/cargaApi';
import { Activity } from 'lucide-react';

const primeiroDiaMes = () => {
  const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const ultimoDiaMes = () => {
  const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
};

export default function CargaProducaoPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('visao');
  const [filtros, setFiltros] = useState<CargaFiltros>({
    codemp: 1,
    data_ini: primeiroDiaMes(),
    data_fim: ultimoDiaMes(),
    situacoes: 'A,L',
    considera_carga: true,
  });

  const handleRefresh = () => qc.invalidateQueries({ queryKey: ['carga-producao'] });

  const handleExport = () => {
    const url = cargaApi.urlExportarCentros(filtros);
    window.open(url, '_blank');
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-lg font-semibold">Carga de Produção</h1>
          <p className="text-xs text-muted-foreground">
            Carga prevista por centro de recurso, operação e unidade de negócio — OPs abertas/liberadas do ERP Senior.
          </p>
        </div>
      </div>

      <CargaFiltersBar
        filtros={filtros}
        onChange={setFiltros}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="visao">Visão Geral</TabsTrigger>
          <TabsTrigger value="centros">Centros de Recurso</TabsTrigger>
          <TabsTrigger value="detalhe">Detalhe das OPs</TabsTrigger>
          <TabsTrigger value="parametros">Parâmetros de Recursos</TabsTrigger>
        </TabsList>

        <TabsContent value="visao" className="mt-4">
          <VisaoGeralTab filtros={filtros} />
        </TabsContent>
        <TabsContent value="centros" className="mt-4">
          <CentrosRecursoTab
            filtros={filtros}
            onAbrirDetalhe={(row) => {
              setFiltros((f) => ({ ...f, codcre: row.codcre, codopr: row.codopr }));
              setTab('detalhe');
            }}
          />
        </TabsContent>
        <TabsContent value="detalhe" className="mt-4">
          <DetalheOpsTab filtros={filtros} />
        </TabsContent>
        <TabsContent value="parametros" className="mt-4">
          <ParametrosRecursosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
