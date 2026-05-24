import { DonutCard } from './DonutCard';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

const MOCK = [
  { name: 'A — Aberta', value: 512 },
  { name: 'C — Confirmada', value: 356 },
  { name: 'F — Finalizada', value: 198 },
  { name: 'L — Liberada', value: 118 },
  { name: 'S — Suspensa', value: 64 },
];

export function FilaSituacaoMock() {
  const total = MOCK.reduce((a, b) => a + b.value, 0);
  return (
    <div className="relative">
      <Badge variant="outline" className="absolute top-3 right-3 z-10 text-[10px] flex items-center gap-1">
        <Info className="h-3 w-3" /> Dados de exemplo
      </Badge>
      <DonutCard
        title="Fila de OPs por situação"
        subtitle="Aguardando endpoint /api/producao/carga/situacoes"
        data={MOCK}
        centerLabel="OPs"
        centerValue={total.toLocaleString('pt-BR')}
        totalLabel="Total"
        totalValue={`${total.toLocaleString('pt-BR')} / 100%`}
      />
    </div>
  );
}
