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
  F: 'F — Finalizada',
  C: 'C — Cancelada/Encerrada',
  S: 'S — Suspensa',
  '': 'Sem situação',
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
      const key = r.op_chave ?? `${r.codori}-${r.numorp ?? r.numop ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const raw = (r.sitorp ?? r.sitop ?? '').toString().trim().toUpperCase();
      counts.set(raw, (counts.get(raw) ?? 0) + 1);
    }
    const items = Array.from(counts.entries())
      .map(([sit, value]) => ({ name: SIT_LABELS[sit] ?? sit, value, _sit: sit }))
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
      title="6. Fila de OPs por situação"
      subtitle={
        parcial
          ? 'Amostra parcial (5k linhas) — agrupado por sitorp · deduplicado por op_chave'
          : 'Agrupado por sitorp · deduplicado por op_chave (exceto filtro de situação)'
      }

      data={items}
      centerLabel="OPs"
      centerValue={total.toLocaleString('pt-BR')}
      totalLabel="Total"
      totalValue={`${total.toLocaleString('pt-BR')} / 100%`}
      onSelect={
        onSelect
          ? (label) => {
              const found = items.find((i) => i.name === label);
              if (found) onSelect(found._sit);
            }
          : undefined
      }
    />
  );
}
