import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { DataTable, Column } from '@/components/erp/DataTable';
import { formatNumber } from '@/lib/format';
import {
  getOpsJatoPesoComponentes,
  OpJatoComponente,
  OpJatoComponentesResponse,
} from '@/lib/api';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  origem?: string | number;
  numero_op?: string | number;
  descricao_produto?: string;
}

const fmt = (n?: number, d = 3) =>
  n == null || isNaN(Number(n)) ? '—' : formatNumber(Number(n), d);

const fmtKg = (n?: number) =>
  n == null || isNaN(Number(n)) ? '—' : `${formatNumber(Number(n), 3)} kg`;

export function OpsJatoComponentesSheet({
  open, onOpenChange, origem, numero_op, descricao_produto,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OpJatoComponentesResponse | null>(null);

  useEffect(() => {
    if (!open || origem == null || numero_op == null) return;
    let cancelado = false;
    setLoading(true);
    setData(null);
    getOpsJatoPesoComponentes(origem, numero_op)
      .then((r) => { if (!cancelado) setData(r); })
      .catch((e: any) => {
        if (!cancelado) toast.error(e?.message ?? 'Falha ao carregar componentes');
      })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [open, origem, numero_op]);

  const columns: Column<OpJatoComponente>[] = [
    {
      key: 'nivel', header: 'Nível', align: 'center',
      render: (v) => <span className="font-mono text-xs">{v ?? '—'}</span>,
    },
    {
      key: 'codigo_pai', header: 'Cód. Pai',
      render: (v) => <span className="font-mono text-xs">{v ?? '—'}</span>,
    },
    {
      key: 'codigo_componente', header: 'Cód. Componente',
      render: (v, r) => (
        <div style={{ paddingLeft: Math.max(0, (Number(r.nivel) || 0) * 12) }}>
          <span className="font-mono text-xs font-medium">{v ?? '—'}</span>
        </div>
      ),
    },
    { key: 'descricao_componente', header: 'Descrição' },
    { key: 'derivacao', header: 'Deriv.', render: (v) => v ?? '—' },
    { key: 'origem_componente', header: 'Origem', render: (v) => v ?? '—' },
    { key: 'tipo_produto', header: 'Tipo' },
    { key: 'quantidade_nivel', header: 'Qtd. Nível', align: 'right', render: (v) => fmt(v, 4) },
    { key: 'quantidade_acumulada', header: 'Qtd. Acumulada', align: 'right', render: (v) => fmt(v, 4) },
    { key: 'unidade', header: 'Un.' },
    { key: 'peso_unitario', header: 'Peso Unit.', align: 'right', render: (v) => fmt(v, 4) },
    { key: 'peso_calculado', header: 'Peso Calc.', align: 'right', render: (v) => fmt(v, 3) },
    {
      key: 'foi_expandido', header: 'Expandido', align: 'center',
      render: (v) => (
        <Badge variant={v ? 'default' : 'outline'} className="text-[10px]">
          {v ? 'Sim' : 'Não'}
        </Badge>
      ),
    },
    {
      key: 'componente_final', header: 'Final', align: 'center',
      render: (v) => (
        <Badge variant={v ? 'secondary' : 'outline'} className="text-[10px]">
          {v ? 'Sim' : 'Não'}
        </Badge>
      ),
    },
    {
      key: 'ciclo_detectado', header: 'Ciclo', align: 'center',
      render: (v) => v
        ? <Badge variant="destructive" className="text-[10px]">Ciclo</Badge>
        : <span className="text-xs text-muted-foreground">—</span>,
    },
    {
      key: 'caminho', header: 'Caminho',
      render: (v) => <span className="font-mono text-[10px] text-muted-foreground">{v ?? '—'}</span>,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[1200px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            Componentes — Origem {origem} · OP {numero_op}
          </SheetTitle>
          <SheetDescription>
            {descricao_produto ?? '—'}
          </SheetDescription>
        </SheetHeader>

        {data && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <KpiBox label="Peso Multinível" value={fmtKg(data.peso_kg_multinivel)} />
            <KpiBox label="Peso Direto" value={fmtKg(data.peso_kg_direto)} />
            <KpiBox label="Componentes Finais" value={String(data.qtd_componentes_finais ?? 0)} />
            <KpiBox label="Nível Máximo" value={String(data.nivel_maximo ?? 0)} />
          </div>
        )}

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando explosão multinível…
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={data?.componentes ?? []}
              emptyMessage="Sem componentes para esta OP."
              enableSearch
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function KpiBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
