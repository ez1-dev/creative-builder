import { useMemo } from 'react';
import { useCargaDetalhe } from '@/hooks/useCargaProducao';
import type { CargaFiltros } from '@/lib/producao/cargaApi';
import { DonutCard } from './DonutCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

const SIT_LABELS: Record<string, string> = {
  A: 'A — Aberta',
  L: 'L — Liberada',
  C: 'C — Confirmada',
  F: 'F — Finalizada',
  S: 'S — Suspensa',
  E: 'E — Encerrada',
  P: 'P — Planejada',
};

const PAGE_SIZE = 5000;

export function FilaSituacaoCard({ filtros, onSelect }: { filtros: CargaFiltros; onSelect?: (sit: string) => void }) {
  const { data, isLoading, isError } = useCargaDetalhe({
    ...filtros,
    situacoes: undefined,
    pagina: 1,
    tamanho_pagina: PAGE_SIZE,
  });

  const { items, total, parcial } = useMemo(() => {
    const rows = data?.dados ?? [];
    const seen = new Set<string>();
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = `${r.codori}|${r.numop}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const sit = (r.sitop || '?').toString().trim().toUpperCase();
      counts.set(sit, (counts.get(sit) ?? 0) + 1);
    }
    const items = Array.from(counts.entries())
      .map(([sit, value]) => ({ name: SIT_LABELS[sit] ?? sit, value }))
      .sort((a, b) => b.value - a.value);
    const total = items.reduce((a, b) => a + b.value, 0);
    const parcial = (data?.total_registros ?? 0) > PAGE_SIZE;
    return { items, total, parcial };
  }, [data]);

  if (isLoading) {
    return <Skeleton className="h-[280px] rounded-2xl" />;
  }
  if (isError || items.length === 0) {
    return (
      <Card className="p-4 rounded-2xl shadow-sm border h-full flex flex-col items-center justify-center text-xs text-muted-foreground gap-2 min-h-[280px]">
        <AlertTriangle className="h-5 w-5" />
        Sem dados de situação para os filtros atuais
      </Card>
    );
  }

  return (
    <DonutCard
      title="Fila de OPs por situação"
      subtitle={
        parcial
          ? 'Amostra parcial — solicitar endpoint agregado /carga/situacoes'
          : 'Distribuição respeitando filtros (exceto situação)'
      }
      data={items}
      centerLabel="OPs"
      centerValue={total.toLocaleString('pt-BR')}
      totalLabel="Total"
      totalValue={`${total.toLocaleString('pt-BR')} / 100%`}
    />
  );
}
