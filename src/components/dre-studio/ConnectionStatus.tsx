import { useHealth } from "@/hooks/contabil/api";
import { cn } from "@/lib/utils";

export function ConnectionStatus() {
  const q = useHealth();
  const banco = q.data?.erp?.banco;
  const sbOk = q.data?.supabase_configurado;
  const loading = q.isLoading;
  const ok = !q.isError && !!q.data?.ok;
  const color = loading ? "bg-slate-300" : ok ? "bg-emerald-500" : "bg-red-500";
  const label = loading
    ? "API…"
    : ok
      ? `API ERP${banco ? ` · ${banco}` : ""}${sbOk ? " · Supabase ok" : ""}`
      : "API offline";
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-600" title={label}>
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </div>
  );
}
