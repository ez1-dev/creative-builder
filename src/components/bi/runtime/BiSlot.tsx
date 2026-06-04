/**
 * BiSlot — envelope ao redor de um bloco de visualização que permite
 * ao usuário trocar a variante built-in ou substituir por qualquer
 * componente da Biblioteca BI.
 *
 * Comportamento:
 *  - sem override → renderiza defaultRender()
 *  - override builtin → escolhe entre variantes mapeadas por dataKind
 *  - override library → delega para componentRegistry.getComponent(id).render(...)
 */
import { ReactNode, useState } from 'react';
import { MoreVertical, RotateCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChartCard, HorizontalBarChartCard, LineChartCard, AreaChartCard,
  DonutChartCard, PieChartCard, RankingChartCard, TreemapChartCard,
  ComboChartCard, DataTableBI, ChartCardShell, formatCurrency,
  type Column,
} from '@/components/bi';
import { getComponent } from '@/lib/bi/componentRegistry';
import { usePageData } from '@/lib/bi/PageDataContext';
import type { SlotDef } from '@/lib/bi/comercialSlots';
import { useSlotOverrides, type SlotOverrideRow } from '@/hooks/useSlotOverrides';
import { ReplaceSlotDialog } from './ReplaceSlotDialog';

const n = (v: any) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

interface BiSlotProps {
  slot: SlotDef;
  /** Render padrão (gráfico original da página) — usado quando não há override. */
  defaultRender: () => ReactNode;
  /** Cor opcional aplicada às variantes built-in. */
  color?: string;
  /** Callback de clique encaminhado às variantes built-in que suportam. */
  onItemClick?: (d: any) => void;
}

export function BiSlot({ slot, defaultRender, color, onItemClick }: BiSlotProps) {
  const ctx = usePageData();
  const { getOverride, setOverride, clearOverride } = useSlotOverrides(ctx?.pageKey ?? '__none__');
  const [openReplace, setOpenReplace] = useState(false);

  const override = ctx ? getOverride(slot.slotKey) : undefined;

  const onPickBuiltin = async (variant: string) => {
    await setOverride(slot.slotKey, { mode: 'builtin', variant });
  };
  const onReset = async () => { await clearOverride(slot.slotKey); };

  return (
    <div className="relative">
      {/* menu flutuante */}
      <div className="absolute right-2 top-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 bg-background/60 backdrop-blur hover:bg-background"
              title="Trocar gráfico"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">{slot.title}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="text-xs">Trocar tipo</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                {slot.builtinVariants.map((v) => (
                  <DropdownMenuItem
                    key={v.value}
                    className="text-xs"
                    onClick={() => onPickBuiltin(v.value)}
                  >
                    {v.label}
                    {(override?.mode === 'builtin' && override.variant === v.value) ||
                    (!override && v.value === slot.defaultVariant)
                      ? <span className="ml-auto text-[10px] text-muted-foreground">atual</span>
                      : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem className="text-xs" onClick={() => setOpenReplace(true)}>
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Substituir por componente…
            </DropdownMenuItem>
            {override && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-xs" onClick={onReset}>
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Restaurar padrão
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {renderContent({ slot, override, defaultRender, ctx, color, onItemClick })}

      <ReplaceSlotDialog
        open={openReplace}
        onOpenChange={setOpenReplace}
        slot={slot}
        currentOverride={override}
        onSaved={() => setOpenReplace(false)}
      />
    </div>
  );
}

function renderContent({
  slot, override, defaultRender, ctx, color, onItemClick,
}: {
  slot: SlotDef;
  override: SlotOverrideRow | undefined;
  defaultRender: () => ReactNode;
  ctx: ReturnType<typeof usePageData>;
  color?: string;
  onItemClick?: (d: any) => void;
}) {
  if (!override) return <>{defaultRender()}</>;

  if (override.mode === 'library' && override.component_id && ctx) {
    const def = getComponent(override.component_id);
    if (!def) return <>{defaultRender()}</>;
    return (
      <>
        {def.render({
          title: slot.title,
          mapping: override.mapping ?? {},
          options: override.options ?? {},
          ctx: { kpis: ctx.kpis, series: ctx.series, rows: ctx.rows },
        })}
      </>
    );
  }

  // builtin variant
  const serie = ctx?.series?.[slot.seriesKey];
  return (
    <BuiltinVariant
      slot={slot}
      variant={override.variant ?? slot.defaultVariant}
      data={serie}
      color={color}
      onItemClick={onItemClick}
    />
  );
}

function BuiltinVariant({
  slot, variant, data, color, onItemClick,
}: {
  slot: SlotDef;
  variant: string;
  data: any;
  color?: string;
  onItemClick?: (d: any) => void;
}) {
  const arr: any[] = Array.isArray(data) ? data : [];
  const simple = arr.map((p) => ({
    label: String(p.label ?? p.name ?? p.categoria ?? ''),
    valor: n(p.valor ?? p.value ?? p.faturamento ?? 0),
  }));
  const title = slot.title;

  if (slot.dataKind === 'serie-mensal') {
    switch (variant) {
      case 'bar':
        return (
          <BarChartCard
            title={title}
            data={arr.map((p) => ({ label: p.label, valor: n(p.faturamento ?? p.valor) }))}
            color={color}
            onItemClick={onItemClick}
          />
        );
      case 'line':
        return (
          <LineChartCard
            title={title}
            data={arr.map((p) => ({ label: p.label, valor: n(p.faturamento ?? p.valor) }))}
            color={color}
          />
        );
      case 'area':
        return (
          <AreaChartCard
            title={title}
            data={arr.map((p) => ({ label: p.label, valor: n(p.faturamento ?? p.valor) }))}
            color={color}
          />
        );
      case 'table':
        return <MensalTable rows={arr} />;
      case 'combo':
      default:
        return (
          <ComboChartCard
            title={title}
            data={arr}
            barKey="faturamento"
            barLabel="Faturamento"
            lineKey="meta"
            lineLabel="Meta"
            barColor={color}
            onItemClick={onItemClick}
          />
        );
    }
  }

  // serie / ranking
  switch (variant) {
    case 'horizontal-bar':
      return <HorizontalBarChartCard title={title} data={simple} color={color} onItemClick={onItemClick} />;
    case 'line':
      return <LineChartCard title={title} data={simple} color={color} />;
    case 'area':
      return <AreaChartCard title={title} data={simple} color={color} />;
    case 'donut':
      return <DonutChartCard title={title} data={simple} onItemClick={onItemClick} />;
    case 'pie':
      return <PieChartCard title={title} data={simple} onItemClick={onItemClick} />;
    case 'ranking':
      return <RankingChartCard title={title} data={simple} topN={10} onItemClick={onItemClick} />;
    case 'treemap':
      return (
        <TreemapChartCard
          title={title}
          data={simple.map((p) => ({ name: p.label, value: p.valor }))}
          onItemClick={(d) => onItemClick?.({ label: d.name, valor: d.value })}
        />
      );
    case 'table': {
      const cols: Column<{ label: string; valor: number }>[] = [
        { key: 'label', header: 'Item' },
        { key: 'valor', header: 'Valor', align: 'right', render: (_v, r) => formatCurrency(r.valor) },
      ];
      return (
        <ChartCardShell title={title}>
          <DataTableBI columns={cols} data={simple} />
        </ChartCardShell>
      );
    }
    case 'bar':
    default:
      return <BarChartCard title={title} data={simple} color={color} onItemClick={onItemClick} />;
  }
}

function MensalTable({ rows }: { rows: any[] }) {
  const cols: Column<any>[] = [
    { key: 'label', header: 'Ano/Mês' },
    { key: 'faturamento', header: 'Faturamento', align: 'right', render: (_v, r) => formatCurrency(n(r.faturamento ?? r.valor)) },
    { key: 'meta', header: 'Meta', align: 'right', render: (_v, r) => formatCurrency(n(r.meta)) },
  ];
  return (
    <ChartCardShell title="Faturamento mensal x Meta">
      <DataTableBI columns={cols} data={rows} />
    </ChartCardShell>
  );
}
