import type React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, ChevronRight } from "lucide-react";
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

/** Wrapper opcional que torna o Card clicável com foco/hover e chevron. */
function Drillable({
  drillable,
  onClick,
  ariaLabel,
  children,
}: {
  drillable?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  if (!drillable || !onClick) return <>{children}</>;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="relative cursor-pointer rounded-lg outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ChevronRight className="pointer-events-none absolute right-2 top-2 h-3 w-3 text-muted-foreground/60" />
      {children}
    </div>
  );
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
  onClick,
  drillable,
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
  /** Se `drillable`, o card fica clicável e chama `onClick`. */
  onClick?: () => void;
  drillable?: boolean;
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

  const ariaLabel = `Abrir drill de ${title}`;

  // Campo tecnicamente ausente do payload → aviso técnico (não é drillable).
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

  // Valor oficialmente nulo/pendente → badge "Pendente" (nunca R$ 0,00). Pode ser drillable.
  if (value === null || value === undefined) {
    return (
      <Drillable drillable={drillable} onClick={onClick} ariaLabel={ariaLabel}>
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
      </Drillable>
    );
  }

  // Se há tooltip, usamos wrapper custom para exibir o ícone junto ao título.
  if (tooltip) {
    const valueColor =
      variant === "danger"
        ? "text-destructive"
        : variant === "warning"
        ? "text-warning"
        : "text-foreground";
    return (
      <Drillable drillable={drillable} onClick={onClick} ariaLabel={ariaLabel}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{titleNode}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tabular-nums ${valueColor}`}>
              {formatCurrency(Number(value))}
            </div>
            {footer && (
              <div className="text-[10px] text-muted-foreground italic mt-1">{footer}</div>
            )}
          </CardContent>
        </Card>
      </Drillable>
    );
  }

  if (footer) {
    return (
      <Drillable drillable={drillable} onClick={onClick} ariaLabel={ariaLabel}>
        <div className="relative">
          <KpiCard title={title} value={value} format="currency" variant={variant} loading={loading} />
          <div className="absolute bottom-1.5 right-2 text-[10px] text-muted-foreground italic pointer-events-none">
            {footer}
          </div>
        </div>
      </Drillable>
    );
  }
  return (
    <Drillable drillable={drillable} onClick={onClick} ariaLabel={ariaLabel}>
      <KpiCard title={title} value={value} format="currency" variant={variant} loading={loading} />
    </Drillable>
  );
}
