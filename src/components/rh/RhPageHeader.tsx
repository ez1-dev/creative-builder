import { ReactNode } from "react";
import { SincronizarRhDialog } from "./SincronizarRhDialog";

export function RhPageHeader({ title, subtitle, actions, hideSync }: { title: string; subtitle?: string; actions?: ReactNode; hideSync?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {!hideSync && <SincronizarRhDialog />}
      </div>
    </div>
  );
}

export function statusContratoBadgeCls(status?: string): string {
  const s = (status || "").toUpperCase();
  if (s.includes("VENCIDO")) return "bg-destructive text-destructive-foreground";
  if (s.includes("10 DIAS")) return "bg-orange-500 text-white";
  if (s.includes("30 DIAS")) return "bg-yellow-400 text-yellow-950";
  if (s.includes("NO PRAZO")) return "bg-green-600 text-white";
  return "bg-muted text-muted-foreground";
}

export function statusFeriasBadgeCls(status?: string): string {
  const s = (status || "").toUpperCase();
  if (s.includes("LIMITE VENCIDO")) return "bg-destructive text-destructive-foreground";
  if (s.includes("LIMITE ATE 30")) return "bg-yellow-400 text-yellow-950";
  if (s.includes("SEM PROGRAMACAO")) return "bg-orange-500 text-white";
  if (s === "OK") return "bg-green-600 text-white";
  return "bg-muted text-muted-foreground";
}
