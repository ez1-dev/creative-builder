import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DreHealthBanner } from '@/components/dre-studio/DreHealthBanner';
import { DreFilters, type DreStudioFilters } from '@/components/dre-studio/DreFilters';
import { DreResultTable } from '@/components/dre-studio/DreResultTable';
import { useResultadoCache } from '@/hooks/contabil/useDreStudio';
import { currentAnomes } from '@/lib/contabil/anomes';
import { Landmark, Loader2 } from 'lucide-react';

export default function DreStudioResultadoPage() {
  const ano = Math.floor(currentAnomes() / 100);
  const [filters, setFilters] = useState<DreStudioFilters>({
    codemp: 1, codfil: null, modelo_id: null,
    anomes_ini: ano * 100 + 1, anomes_fim: currentAnomes(), codccu: null,
  });
  const [visao, setVisao] = useState<'resumida' | 'mensal' | 'acumulada'>('resumida');

  const q = useResultadoCache({
    modelo_id: filters.modelo_id ?? '',
    codemp: filters.codemp,
    codfil: filters.codfil ?? undefined,
    anomes_ini: filters.anomes_ini,
    anomes_fim: filters.anomes_fim,
    codccu: filters.codccu,
  }, !!filters.modelo_id);

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-semibold flex items-center gap-2"><Landmark className="h-5 w-5" /> DRE Studio — Resultado</h1>
      <DreHealthBanner />
      <DreFilters value={filters} onChange={setFilters} onApply={() => q.refetch()} right={
        <Tabs value={visao} onValueChange={(v) => setVisao(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="resumida" className="text-xs">Resumida</TabsTrigger>
            <TabsTrigger value="mensal" className="text-xs">Mensal</TabsTrigger>
            <TabsTrigger value="acumulada" className="text-xs">Acumulada</TabsTrigger>
          </TabsList>
        </Tabs>
      } />

      {!filters.modelo_id && (
        <Card className="p-6 text-sm text-muted-foreground">Selecione um modelo para visualizar o resultado.</Card>
      )}
      {filters.modelo_id && q.isFetching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" /> Carregando resultado…</div>
      )}
      {filters.modelo_id && q.error && (
        <Card className="p-6 text-sm text-destructive">{(q.error as any)?.message}</Card>
      )}
      {filters.modelo_id && !q.isFetching && !q.error && (
        <DreResultTable data={q.data} visao={visao} />
      )}
    </div>
  );
}
