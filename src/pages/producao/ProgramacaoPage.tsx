import { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProgramacaoFiltersBar } from '@/components/producao/programacao/ProgramacaoFiltersBar';
import { ProgramacaoKpis } from '@/components/producao/programacao/ProgramacaoKpis';
import { FilaOpsTab } from '@/components/producao/programacao/FilaOpsTab';
import { GerarProgramacaoTab } from '@/components/producao/programacao/GerarProgramacaoTab';
import { AgendaRecursoTab } from '@/components/producao/programacao/AgendaRecursoTab';
import { MapaGargalosTab } from '@/components/producao/programacao/MapaGargalosTab';
import { CapacidadesTab } from '@/components/producao/programacao/CapacidadesTab';
import { useAgenda, useFilaOps, useGargalos } from '@/hooks/useProgramacao';
import type { ProgramacaoFiltros } from '@/lib/producao/programacaoApi';
import { useQueryClient } from '@tanstack/react-query';

export default function ProgramacaoPage() {
  const [filtros, setFiltros] = useState<ProgramacaoFiltros>({ situacoes: 'A,L' });
  const qc = useQueryClient();

  const fila = useFilaOps(filtros);
  const agenda = useAgenda(filtros);
  const gargalos = useGargalos(filtros);

  const kpis = useMemo(() => {
    const filaRows = fila.data?.dados ?? [];
    const agendaRows = agenda.data?.dados ?? [];
    const gargaloRows = gargalos.data?.dados ?? [];
    const tempoPrevisto = filaRows.reduce((a, b) => a + (b.tempo_previsto_horas ?? 0), 0);
    const tempoProgramado = agendaRows.reduce((a, b) => a + (b.tempo_alocado_min ?? 0), 0) / 60;
    const cap = gargaloRows.reduce((a, b) => a + (b.capacidade_disponivel_horas ?? 0), 0);
    const cargaProg = gargaloRows.reduce((a, b) => a + (b.carga_programada_horas ?? 0), 0);
    const ocup = cap > 0 ? (cargaProg / cap) * 100 : 0;
    return {
      opsNaFila: filaRows.length,
      tempoPrevistoHoras: tempoPrevisto,
      tempoProgramadoHoras: tempoProgramado,
      capacidadeDisponivelHoras: cap,
      ocupacaoMediaPerc: ocup,
      qtdGargalos: gargaloRows.filter((r) => r.status === 'GARGALO').length,
      recursosSemCapacidade: gargaloRows.filter((r) => r.status === 'SEM_PARAMETRO').length,
    };
  }, [fila.data, agenda.data, gargalos.data]);

  const onRefresh = () => qc.invalidateQueries({ queryKey: ['programacao'] });
  const loading = fila.isLoading || agenda.isLoading || gargalos.isLoading;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Programação e Sequenciamento</h1>
        <p className="text-xs text-muted-foreground">
          Fila de OPs, geração automática, agenda e mapa de gargalos. Todo cálculo é feito no backend.
        </p>
      </header>

      <ProgramacaoFiltersBar filtros={filtros} onChange={setFiltros} onRefresh={onRefresh} loading={loading} showStatus />
      <ProgramacaoKpis {...kpis} loading={loading} />

      <Tabs defaultValue="fila" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fila" className="text-xs">Fila de OPs</TabsTrigger>
          <TabsTrigger value="gerar" className="text-xs">Gerar Programação</TabsTrigger>
          <TabsTrigger value="agenda" className="text-xs">Agenda por Recurso</TabsTrigger>
          <TabsTrigger value="gargalos" className="text-xs">Mapa de Gargalos</TabsTrigger>
          <TabsTrigger value="capacidades" className="text-xs">Capacidade dos Recursos</TabsTrigger>
        </TabsList>
        <TabsContent value="fila"><FilaOpsTab filtros={filtros} /></TabsContent>
        <TabsContent value="gerar"><GerarProgramacaoTab /></TabsContent>
        <TabsContent value="agenda"><AgendaRecursoTab filtros={filtros} /></TabsContent>
        <TabsContent value="gargalos"><MapaGargalosTab filtros={filtros} /></TabsContent>
        <TabsContent value="capacidades"><CapacidadesTab codemp={filtros.codemp} /></TabsContent>
      </Tabs>
    </div>
  );
}
