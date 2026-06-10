/**
 * BrazilHeatMapWidget
 *
 * Wrapper do BrazilHeatMap plugado em dados reais do BI Comercial
 * (`fetchComercialEstado`). Mantém a mesma assinatura de filtros do
 * `BrazilStateMapWidget` (cartograma), mas renderiza o mapa geográfico real.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BrazilHeatMap, type BrazilHeatMapDatum } from '@/components/bi/maps/BrazilHeatMap';
import { HeatPaletteEditor } from '@/components/bi/maps/HeatPaletteEditor';
import { HEAT_COLOR_STOPS } from '@/lib/bi/mapUtils';
import { fetchComercialEstado } from '@/lib/bi/comercialApi';
import type { BiComercialFilters } from '@/lib/bi/comercialFilters';
import { ufName } from '@/lib/bi/ufLabels';

export interface BrazilHeatMapWidgetDrill {
  dimensao: 'estado';
  campo: 'cd_estado';
  valor: string;
  label: string;
}

export interface BrazilHeatMapWidgetProps {
  title?: string;
  subtitle?: string;
  filters: BiComercialFilters;
  height?: number;
  onDrill?: (payload: BrazilHeatMapWidgetDrill) => void;
}

function normalizeRow(row: any): BrazilHeatMapDatum | null {
  const rawUf = row?.uf ?? row?.cd_estado ?? row?.estado ?? '';
  const m = String(rawUf).trim().toUpperCase().match(/[A-Z]{2}/);
  const uf = m ? m[0] : '';
  if (!uf) return null;
  const valor = Number(
    row?.valor ?? row?.faturamento ?? row?.vl_faturamento ?? row?.valor_faturamento ?? 0,
  );
  return {
    uf,
    valor: Number.isFinite(valor) ? valor : 0,
    label: row?.nm_estado ?? row?.estado_nome ?? row?.estado_label ?? ufName(uf) ?? uf,
  };
}

export function BrazilHeatMapWidget({
  title = 'Faturamento por UF',
  subtitle = 'Mapa de calor por estado',
  filters,
  height = 380,
  onDrill,
}: BrazilHeatMapWidgetProps) {
  const [colorStops, setColorStops] = useState<string[]>(HEAT_COLOR_STOPS);

  const query = useQuery({
    queryKey: ['bi-comercial-estado-heatmap', filters],
    queryFn: () => fetchComercialEstado(filters),
    staleTime: 60_000,
  });

  const data = useMemo<BrazilHeatMapDatum[]>(() => {
    return (query.data ?? [])
      .map(normalizeRow)
      .filter((r): r is BrazilHeatMapDatum => r != null);
  }, [query.data]);

  return (
    <BrazilHeatMap
      title={title}
      subtitle={subtitle}
      height={height}
      data={data}
      colorStops={colorStops}
      onColorStopsChange={setColorStops}
      legendExtras={<HeatPaletteEditor value={colorStops} onChange={setColorStops} />}
      loading={query.isLoading}
      error={query.isError ? (query.error as Error)?.message ?? 'Erro ao carregar' : null}
      onStateClick={
        onDrill
          ? (uf, d) =>
              onDrill({
                dimensao: 'estado',
                campo: 'cd_estado',
                valor: uf,
                label: d?.label ? `${uf} - ${d.label}` : uf,
              })
          : undefined
      }
    />
  );
}

export default BrazilHeatMapWidget;
