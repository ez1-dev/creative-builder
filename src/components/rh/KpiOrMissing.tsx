import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { formatCurrency } from "@/lib/format";

function fmtHoras(v: string | number | undefined | null): string {
  if (v == null || v === "") return "-";
  return String(v);
}

/** Renderiza valor numérico OU badge "Campo pendente na API" / "Pendente". */
export function ValueOrMissing({
  value,
  missing,
  field,
  format = "currency",
}: {
  value: number | string | null | undefined;
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
  if (value === null || value === undefined || value === "") {
    return (
      <Badge variant="outline" className="text-[10px] font-medium">
        Pendente
      </Badge>
    );
  }
  return <>{formatCurrency(Number(value))}</>;
}

export function KpiOrMissing({
  title,
  value,
  missing,
  field,
  variant,
  loading,
  footer,
  tooltip,
}: {
  title: string;
  value: number | null | undefined;
  missing: boolean;
  field: string;
  variant?: "danger" | "warning";
  loading?: boolean;
  footer?: React.ReactNode;
  /** Texto auxiliar exibido como tooltip no ícone ao lado do título. */
  tooltip?: string;
}) {
  const titleNode = tooltip ? (
    <span className="inline-flex items-center gap-1">
      {title}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3 w-3 text-muted-foreground/70" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  ) : (
    title
  );

  // Campo tecnicamente ausente do payload → aviso técnico (mantém comportamento antigo).
  if (missing) {
    return (
      <Card className="border-warning/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">{titleNode}</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="text-[11px] text-warning font-medium"
            title={`Campo pendente na API: ${field}`}
          >
            Campo pendente na API
          </div>
        </CardContent>
      </Card>
    );
  }

  // Valor oficialmente nulo/pendente → badge "Pendente" (nunca R$ 0,00).
  if (value === null || value === undefined) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">{titleNode}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Pendente
          </Badge>
          {footer && (
            <span className="text-[10px] text-muted-foreground italic">{footer}</span>
          )}
        </CardContent>
      </Card>
    );
  }

  if (footer) {
    return (
      <div className="relative">
        <KpiCard title={titleNode as any} value={value} format="currency" variant={variant} loading={loading} />
        <div className="absolute bottom-1.5 right-2 text-[10px] text-muted-foreground italic pointer-events-none">
          {footer}
        </div>
      </div>
    );
  }
  return <KpiCard title={titleNode as any} value={value} format="currency" variant={variant} loading={loading} />;
}
