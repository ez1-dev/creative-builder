import { createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ---- Display options (context) ----
type MoneyDisplayCtx = { noCents: boolean };
const MoneyDisplayContext = createContext<MoneyDisplayCtx>({ noCents: false });

export function MoneyDisplayProvider({
  noCents,
  children,
}: {
  noCents: boolean;
  children: ReactNode;
}) {
  return (
    <MoneyDisplayContext.Provider value={{ noCents }}>
      {children}
    </MoneyDisplayContext.Provider>
  );
}

export function useMoneyDisplay() {
  return useContext(MoneyDisplayContext);
}

// Arredondamento comercial: |v| + 0.5 floor, preservando sinal.
export function arredondarComercial(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  const sinal = valor < 0 ? -1 : 1;
  return sinal * Math.floor(Math.abs(valor) + 0.5);
}

export function fmtBRL(
  n: number | null | undefined,
  emptyAs: "dash" | "zero" = "dash",
  opts?: { noCents?: boolean },
) {
  const noCents = opts?.noCents ?? false;
  if (n === null || n === undefined || isNaN(n as number)) {
    return emptyAs === "zero" ? (noCents ? "0" : "0,00") : "—";
  }
  if (noCents) {
    return arredondarComercial(n as number).toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return (n as number).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmtPct(n: number | null | undefined, emptyAs: "dash" | "zero" = "dash") {
  if (n === null || n === undefined || isNaN(n)) {
    return emptyAs === "zero" ? "0,00%" : "—";
  }
  return `${n.toFixed(2).replace(".", ",")}%`;
}

export function MoneyCell({
  value,
  className,
  variant = "money",
  emptyAs = "dash",
  onClick,
  noCents,
}: {
  value: number | null | undefined;
  className?: string;
  variant?: "money" | "pct";
  emptyAs?: "dash" | "zero";
  onClick?: () => void;
  noCents?: boolean;
}) {
  const ctx = useMoneyDisplay();
  const effectiveNoCents = noCents ?? ctx.noCents;
  const text =
    variant === "pct"
      ? fmtPct(value, emptyAs)
      : fmtBRL(value, emptyAs, { noCents: effectiveNoCents });
  const negative = typeof value === "number" && value < 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-right tabular-nums px-2 py-1 hover:bg-sky-50 rounded",
        negative ? "text-red-600" : "text-slate-800",
        onClick ? "cursor-pointer" : "cursor-default",
        className,
      )}
    >
      {text}
    </button>
  );
}
