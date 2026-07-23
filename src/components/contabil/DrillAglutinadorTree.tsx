import { useState } from 'react';
import { ChevronRight, ChevronDown, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { useAglutinadorDrill } from '@/hooks/contabil/useAglutinadorDrill';
import type {
  AglutinadorComponente,
  AglutinadorDrillParams,
} from '@/lib/contabil/drillAglutinadorApi';

const MAX_DEPTH = 8;

export interface DrillAglutinadorTreeProps {
  codagl: number;
  descricao?: string;
  totalEsperado?: number | null;
  params: AglutinadorDrillParams;
  onOpenRazao: (args: { ctared: number; clacta?: string | null; descricao?: string | null }) => void;
}

export function DrillAglutinadorTree(props: DrillAglutinadorTreeProps) {
  return (
    <div className="rounded-md border bg-card">
      <NodeAglutinador
        codagl={props.codagl}
        descricao={props.descricao || `Aglutinador ${props.codagl}`}
        depth={0}
        operador="+"
        valor={props.totalEsperado ?? undefined}
        params={props.params}
        onOpenRazao={props.onOpenRazao}
        defaultOpen
      />
    </div>
  );
}

function OperadorBadge({ op }: { op: '+' | '-' }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'h-5 w-5 shrink-0 justify-center px-0 text-[10px] font-bold',
        op === '+' ? 'border-emerald-600 text-emerald-600' : 'border-destructive text-destructive',
      )}
    >
      {op}
    </Badge>
  );
}

function NodeAglutinador({
  codagl,
  descricao,
  depth,
  operador,
  valor,
  params,
  onOpenRazao,
  defaultOpen = false,
}: {
  codagl: number;
  descricao: string;
  depth: number;
  operador: '+' | '-';
  valor?: number;
  params: AglutinadorDrillParams;
  onOpenRazao: DrillAglutinadorTreeProps['onOpenRazao'];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bloqueado = depth >= MAX_DEPTH;
  const q = useAglutinadorDrill(codagl, params, open && !bloqueado);

  const somaFilhos =
    q.data?.componentes?.reduce((s, c) => s + Number(c.valor || 0), 0) ?? null;
  const total = q.data?.total;
  const divergente =
    somaFilhos != null && total != null && Math.abs(somaFilhos - total) > 0.01;

  return (
    <>
      <Row
        depth={depth}
        head
        onClick={() => setOpen((o) => !o)}
        operador={operador}
        chevron={open ? 'down' : 'right'}
        label={descricao}
        valor={valor}
        rightSlot={
          divergente ? (
            <Badge variant="outline" className="border-amber-500 text-amber-600 gap-1">
              <AlertTriangle className="h-3 w-3" />
              dif. {formatCurrency((somaFilhos as number) - (total as number))}
            </Badge>
          ) : null
        }
      />
      {open && (
        <>
          {q.isLoading && (
            <div className="flex items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground"
                 style={{ paddingLeft: 16 + (depth + 1) * 16 }}>
              <Loader2 className="h-3 w-3 animate-spin" /> Carregando componentes...
            </div>
          )}
          {q.isError && (
            <div className="border-t px-3 py-2 text-xs text-destructive"
                 style={{ paddingLeft: 16 + (depth + 1) * 16 }}>
              Falha ao carregar: {q.error.message}
            </div>
          )}
          {bloqueado && (
            <div className="border-t px-3 py-2 text-xs text-amber-600"
                 style={{ paddingLeft: 16 + (depth + 1) * 16 }}>
              Profundidade máxima atingida.
            </div>
          )}
          {q.data?.componentes?.map((c, i) => (
            <ComponenteRow
              key={`${c.tipo}-${c.codagl ?? c.ctared ?? i}`}
              comp={c}
              depth={depth + 1}
              params={params}
              onOpenRazao={onOpenRazao}
            />
          ))}
        </>
      )}
    </>
  );
}

function ComponenteRow({
  comp,
  depth,
  params,
  onOpenRazao,
}: {
  comp: AglutinadorComponente;
  depth: number;
  params: AglutinadorDrillParams;
  onOpenRazao: DrillAglutinadorTreeProps['onOpenRazao'];
}) {
  if (comp.tipo === 'aglutinador' && comp.codagl) {
    return (
      <NodeAglutinador
        codagl={comp.codagl}
        descricao={comp.descricao}
        depth={depth}
        operador={comp.operador}
        valor={comp.valor}
        params={params}
        onOpenRazao={onOpenRazao}
      />
    );
  }
  // Conta (folha)
  const label =
    comp.clacta ? `${comp.clacta} — ${comp.descricao}` : comp.descricao;
  return (
    <Row
      depth={depth}
      operador={comp.operador}
      label={label}
      valor={comp.valor}
      rightSlot={
        comp.ctared ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[11px]"
            onClick={() =>
              onOpenRazao({
                ctared: Number(comp.ctared),
                clacta: comp.clacta,
                descricao: comp.descricao,
              })
            }
          >
            Ver razão →
          </Button>
        ) : null
      }
    />
  );
}

function Row({
  depth,
  operador,
  label,
  valor,
  head = false,
  chevron,
  rightSlot,
  onClick,
}: {
  depth: number;
  operador: '+' | '-';
  label: string;
  valor?: number;
  head?: boolean;
  chevron?: 'right' | 'down';
  rightSlot?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b px-2 py-1.5 text-xs',
        head && 'bg-muted/40 font-semibold',
        onClick && 'cursor-pointer hover:bg-accent/40',
      )}
      style={{ paddingLeft: 8 + depth * 16 }}
      onClick={onClick}
    >
      {chevron === 'down' ? (
        <ChevronDown className="h-3 w-3 shrink-0" />
      ) : chevron === 'right' ? (
        <ChevronRight className="h-3 w-3 shrink-0" />
      ) : (
        <span className="w-3 shrink-0" />
      )}
      <OperadorBadge op={operador} />
      <span className="flex-1 truncate" title={label}>{label}</span>
      {rightSlot}
      <span className={cn('w-32 shrink-0 text-right tabular-nums', head && 'font-bold')}>
        {typeof valor === 'number' ? formatCurrency(valor) : '—'}
      </span>
    </div>
  );
}
