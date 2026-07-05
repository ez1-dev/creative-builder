import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, UserMinus, Clock, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { fetchContratoExperienciaDashboard } from "@/lib/rh/api";
import type { ContratoExperienciaVencimento } from "@/lib/rh/types";
import { cn } from "@/lib/utils";

function formatDatePt(v?: string): string {
  if (!v) return "-";
  const d = new Date(v.length <= 10 ? `${v}T00:00:00` : v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function normStatus(status?: string): string {
  return (status || "").toUpperCase().trim();
}

function isUrgente(status?: string): boolean {
  const s = normStatus(status);
  return s === "VENCIDO" || s === "A VENCER 5 DIAS";
}

function statusBadgeCls(status?: string): string {
  const s = normStatus(status);
  if (s === "VENCIDO") return "bg-destructive text-destructive-foreground";
  if (s === "A VENCER 5 DIAS") return "bg-destructive text-destructive-foreground";
  if (s === "A VENCER 10 DIAS") return "bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]";
  if (s === "A VENCER") return "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]";
  return "bg-muted text-muted-foreground";
}

export default function ContratoExperienciaPage() {
  const codemp = 1;
  const { data, isLoading, error } = useQuery({
    queryKey: ["rh", "contrato-experiencia", "dashboard", codemp],
    queryFn: () => fetchContratoExperienciaDashboard(codemp),
  });

  useEffect(() => {
    if (!error) return;
    const err = error as any;
    const status = err?.status ?? err?.response?.status;
    if (status === 401) toast.error("Sessão expirada. Faça login novamente.");
    else toast.error(err?.message || "Falha ao carregar contratos de experiência.");
  }, [error]);

  const kpis = data?.kpis;
  const rows = useMemo<ContratoExperienciaVencimento[]>(() => {
    const list = data?.vencimentos ?? [];
    return [...list].sort((a, b) => (a.dt_vencimento || "").localeCompare(b.dt_vencimento || ""));
  }, [data]);

  return (
    <div className="container mx-auto py-6">
      <RhPageHeader title="03 — Contrato Experiência" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KpiCard
          title="Qtde Contratos"
          value={kpis?.qtde_contratos ?? 0}
          format="number"
          icon={<FileText className="h-4 w-4" />}
          loading={isLoading}
        />
        <KpiCard
          title="Demitidos 30 Após Exp."
          value={kpis?.demitidos_30_apos_exp ?? 0}
          format="number"
          variant="warning"
          icon={<UserMinus className="h-4 w-4" />}
          loading={isLoading}
        />
        <KpiCard
          title="A Vencer 5 Dias"
          value={kpis?.a_vencer_5_dias ?? 0}
          format="number"
          variant="danger"
          icon={<Clock className="h-4 w-4" />}
          loading={isLoading}
        />
        <KpiCard
          title="A Vencer 10 Dias"
          value={kpis?.a_vencer_10_dias ?? 0}
          format="number"
          variant="warning"
          icon={<CalendarClock className="h-4 w-4" />}
          loading={isLoading}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Vencimentos
          </h2>
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Data Admissão</TableHead>
                  <TableHead>Segundo Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-6" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                      Nenhum contrato
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r, i) => {
                  const urgente = isUrgente(r.status);
                  return (
                    <TableRow
                      key={`${r.matricula}-${i}`}
                      className={cn(urgente && "animate-row-urgent")}
                    >
                      <TableCell>{r.empresa}</TableCell>
                      <TableCell>{r.filial}</TableCell>
                      <TableCell>{r.cargo}</TableCell>
                      <TableCell>{r.colaborador}</TableCell>
                      <TableCell>{formatDatePt(r.dt_admissao)}</TableCell>
                      <TableCell>{formatDatePt(r.dt_vencimento)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
                            statusBadgeCls(r.status),
                            urgente && "font-bold animate-status-blink",
                          )}
                        >
                          {r.status || "-"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
