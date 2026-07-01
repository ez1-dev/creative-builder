import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { formatCurrency } from "@/lib/format";

function fmtHoras(v: string | number | undefined): string {
  if (v == null || v === "") return "-";
  return String(v);
}

/** Renderiza valor numérico OU badge "Campo pendente na API" */
export function ValueOrMissing({
  value,
  missing,
  field,
  format = "currency",
}: {
  value: number | string | undefined;
  missing: boolean;
  field: string;
  format?: "currency" | "horas";
}) {
  if (missing) {
    return (
      <span className="text-[11px] text-warning font-medium" title={`Campo pendente na API: ${field}`}>
        Campo pendente na API
      </span>
    );
  }
  if (format === "horas") return <>{fmtHoras(value as any)}</>;
  return <>{formatCurrency(Number(value ?? 0))}</>;
}

export function KpiOrMissing({
  title, value, missing, field, variant, loading, footer,
}: {
  title: string; value: number | undefined; missing: boolean; field: string;
  variant?: "danger" | "warning"; loading?: boolean; footer?: React.ReactNode;
}) {
  if (missing) {
    return (
      <Card className="border-warning/40">
        <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{title}</CardTitle></CardHeader>
        <CardContent><div className="text-[11px] text-warning font-medium" title={`Campo pendente na API: ${field}`}>Campo pendente na API</div></CardContent>
      </Card>
    );
  }
  if (footer) {
    return (
      <div className="relative">
        <KpiCard title={title} value={value ?? 0} format="currency" variant={variant} loading={loading} />
        <div className="absolute bottom-1.5 right-2 text-[10px] text-muted-foreground italic pointer-events-none">
          {footer}
        </div>
      </div>
    );
  }
  return <KpiCard title={title} value={value ?? 0} format="currency" variant={variant} loading={loading} />;
}
