import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertOctagon, AlarmClock, Clock, CalendarClock, Users, Palmtree, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { fetchProgramacaoFeriasDashboard } from "@/lib/rh/api";

const formatDateBR = (s?: string | null) => {
  if (!s) return "-";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};


const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const M_KEYS = ["m1","m2","m3","m4","m5","m6","m7","m8","m9","m10","m11","m12"] as const;

function fmtQtd(v: any): string {
  if (v == null || v === "") return "-";
  const n = Number(v);
  if (!isFinite(n)) return "-";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPivot(v: number): string {
  if (!v) return "-";
  return v.toLocaleString("pt-BR");
}

export default function ProgramacaoFeriasPage() {
  const codemp = 1;
  const { data, isLoading, error } = useQuery({
    queryKey: ["rh", "programacao-ferias", "dashboard", codemp],
    queryFn: () => fetchProgramacaoFeriasDashboard(codemp),
  });

  useEffect(() => {
    if (!error) return;
    const err = error as any;
    const status = err?.statusCode ?? err?.status ?? err?.response?.status;
    if (status === 401) toast.error("Sessão expirada. Faça login novamente.");
    else toast.error(err?.message || "Falha ao carregar Programação de Férias.");
  }, [error]);

  const kpis = data?.kpis;
  const pivot = data?.limite_ferias_pivot ?? [];
  const prox90 = data?.programacao_proximos_90_dias ?? [];
  const sem = data?.primeiro_vencimento_sem_programacao ?? [];

  return (
    <div className="container mx-auto py-6 space-y-4">
      <RhPageHeader title="RH - 04 - Programação de Férias" />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          title="Férias Vencidas"
          value={kpis?.ferias_vencidas ?? 0}
          format="number"
          variant="danger"
          icon={<AlertOctagon className="h-4 w-4" />}
          loading={isLoading}
        />
        <KpiCard
          title="A Vencer 30 Dias"
          value={kpis?.a_vencer_30 ?? 0}
          format="number"
          variant="warning"
          icon={<AlarmClock className="h-4 w-4" />}
          loading={isLoading}
        />
        <KpiCard
          title="A Vencer 60 Dias"
          value={kpis?.a_vencer_60 ?? 0}
          format="number"
          icon={<Clock className="h-4 w-4" />}
          loading={isLoading}
          className="border-l-4 border-l-lime-500"
        />
        <KpiCard
          title="A Vencer 90 Dias"
          value={kpis?.a_vencer_90 ?? 0}
          format="number"
          icon={<CalendarClock className="h-4 w-4" />}
          loading={isLoading}
          className="border-l-4 border-l-green-700"
        />
        <KpiCard
          title="Férias Total"
          value={kpis?.ferias_total ?? 0}
          format="number"
          variant="info"
          icon={<Users className="h-4 w-4" />}
          loading={isLoading}
        />
        <KpiCard
          title="De Férias"
          value={kpis?.de_ferias ?? 0}
          format="number"
          icon={<Palmtree className="h-4 w-4" />}
          loading={isLoading}
          className="border-l-4 border-l-blue-900"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
            Limite Férias
          </h2>
          <div className="max-h-[40vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Ano</TableHead>
                  {MESES.map((m) => (
                    <TableHead key={m} className="text-right">{m}</TableHead>
                  ))}
                  <TableHead className="text-right">TOTAL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={14}><Skeleton className="h-6" /></TableCell></TableRow>
                ))}
                {!isLoading && pivot.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center text-muted-foreground py-6">
                      Sem dados
                    </TableCell>
                  </TableRow>
                )}
                {pivot.map((r) => (
                  <TableRow key={r.ano}>
                    <TableCell className="font-medium">{r.ano}</TableCell>
                    {M_KEYS.map((k) => (
                      <TableCell key={k} className="text-right tabular-nums">
                        {fmtPivot((r as any)[k])}
                      </TableCell>
                    ))}
                    <TableCell className="text-right tabular-nums font-semibold">
                      {fmtPivot(r.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Programação Próximos 90 Dias
            </h2>
            <div className="max-h-[55vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Data Início Período</TableHead>
                    <TableHead>Data Fim Período</TableHead>
                    <TableHead>Data Limite Saída</TableHead>
                    <TableHead>Data Programação</TableHead>
                    <TableHead className="text-right">Q. Dias Direito</TableHead>
                    <TableHead className="text-right">Q. Dias Programado</TableHead>
                    <TableHead className="text-right">Q. Dias Abono</TableHead>
                    <TableHead className="text-right">Q. Dias Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-6" /></TableCell></TableRow>
                  ))}
                  {!isLoading && prox90.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                        Sem dados
                      </TableCell>
                    </TableRow>
                  )}
                  {prox90.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.colaborador}</TableCell>
                      <TableCell>{formatDateBR(r.dt_inicio_periodo)}</TableCell>
                      <TableCell>{formatDateBR(r.dt_fim_periodo)}</TableCell>
                      <TableCell>{formatDateBR(r.dt_limite_saida)}</TableCell>
                      <TableCell>{formatDateBR(r.dt_programacao)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtQtd(r.qtd_dias_direito)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtQtd(r.qtd_dias_programado)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtQtd(r.qtd_dias_abono)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtQtd(r.qtd_dias_saldo)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              1º Vencimento e Sem Programação
            </h2>
            <div className="max-h-[55vh] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Filial</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Data Limite Saída</TableHead>
                    <TableHead className="text-right">Q. Dias Direito</TableHead>
                    <TableHead className="text-right">Q. Dias Saldo</TableHead>
                    <TableHead className="text-right">Q. Dias Programado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-6" /></TableCell></TableRow>
                  ))}
                  {!isLoading && sem.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        Sem dados
                      </TableCell>
                    </TableRow>
                  )}
                  {sem.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.empresa}</TableCell>
                      <TableCell>{r.filial}</TableCell>
                      <TableCell>{r.colaborador}</TableCell>
                      <TableCell>{formatDateBR(r.dt_limite_saida)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtQtd(r.qtd_dias_direito)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtQtd(r.qtd_dias_saldo)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtQtd(r.qtd_dias_programado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
