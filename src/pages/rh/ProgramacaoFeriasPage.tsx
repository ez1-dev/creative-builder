import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertOctagon, AlarmClock, Clock, CalendarClock, Users, Palmtree, RefreshCw, Download, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { ProgramacaoFeriasDrillModal, DrillMode } from "@/components/rh/ProgramacaoFeriasDrillModal";
import { fetchProgramacaoFeriasDashboard, exportarProgramacaoFeriasExcel } from "@/lib/rh/api";
import type { ProgramacaoFeriasDetalheItem, DeFeriasDetalheItem } from "@/lib/rh/types";

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

interface DrillState {
  title: string;
  mode: DrillMode;
  rows: ProgramacaoFeriasDetalheItem[] | DeFeriasDetalheItem[];
  headerNote?: string;
}

export default function ProgramacaoFeriasPage() {
  const codemp = 1;
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["rh", "programacao-ferias", "dashboard", codemp],
    queryFn: () => fetchProgramacaoFeriasDashboard(codemp),
  });

  const [drill, setDrill] = useState<DrillState | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { blob, filename } = await exportarProgramacaoFeriasExcel(codemp);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      if (e?.statusCode === 401) toast.error("Sessão expirada. Faça login novamente.");
      else toast.error(e?.message || "Falha ao exportar Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (!error) return;
    const err = error as any;
    const status = err?.statusCode ?? err?.status ?? err?.response?.status;
    if (status === 401) toast.error("Sessão expirada. Faça login novamente.");
    else toast.error(err?.message || "Falha ao carregar Programação de Férias.");
  }, [error]);

  const kpis = data?.kpis;
  const ativosTotal = data?.ativos_total ?? 0;
  const detalhe = useMemo(() => data?.detalhe ?? [], [data?.detalhe]);
  const deFeriasDetalhe = useMemo(() => data?.de_ferias_detalhe ?? [], [data?.de_ferias_detalhe]);
  const pivot = useMemo(() => {
    const arr = [...(data?.limite_ferias_pivot ?? [])];
    arr.sort((a, b) => String(a.ano).localeCompare(String(b.ano)));
    return arr;
  }, [data?.limite_ferias_pivot]);
  const prox90 = data?.programacao_proximos_90_dias ?? [];
  const sem = useMemo(() => {
    const arr = [...(data?.primeiro_vencimento_sem_programacao ?? [])];
    arr.sort((a, b) => String(a.dt_limite_saida ?? "").localeCompare(String(b.dt_limite_saida ?? "")));
    return arr;
  }, [data?.primeiro_vencimento_sem_programacao]);

  const vencidas = useMemo(
    () => detalhe.filter((x) => x.status === "VENCIDA"),
    [detalhe],
  );

  const openByStatus = (status: string, title: string) => {
    setDrill({
      title,
      mode: "periodo",
      rows: detalhe.filter((x) => x.status === status),
    });
  };

  const openFeriasTotal = () => {
    setDrill({
      title: "Férias Total",
      mode: "periodo",
      rows: vencidas,
      headerNote: `Férias Total = ${ativosTotal} colaboradores ativos + ${kpis?.ferias_vencidas ?? 0} períodos vencidos.`,
    });
  };

  const openDeFerias = () => {
    setDrill({
      title: "De Férias",
      mode: "de_ferias",
      rows: deFeriasDetalhe,
    });
  };

  const openPivotCell = (ano: string, mesIdx: number) => {
    const mm = String(mesIdx).padStart(2, "0");
    setDrill({
      title: `Limite de Férias — ${mm}/${ano}`,
      mode: "periodo",
      rows: detalhe.filter((x) => String(x.ano_limite) === String(ano) && Number(x.mes_limite) === mesIdx),
    });
  };

  const openPivotTotal = (ano: string) => {
    setDrill({
      title: `Limite de Férias — Ano ${ano}`,
      mode: "periodo",
      rows: detalhe.filter((x) => String(x.ano_limite) === String(ano)),
    });
  };

  const openSemProgLinha = (r: any) => {
    const found = detalhe.find(
      (d) => d.matricula === r.matricula && d.dt_limite_saida === r.dt_limite_saida,
    );
    const row: ProgramacaoFeriasDetalheItem = found ?? {
      empresa: r.empresa,
      filial: r.filial,
      colaborador: r.colaborador,
      matricula: r.matricula,
      dt_limite_saida: r.dt_limite_saida,
      qtd_dias_direito: r.qtd_dias_direito,
      qtd_dias_saldo: r.qtd_dias_saldo,
      qtd_dias_programado: r.qtd_dias_programado,
    };
    setDrill({
      title: `Detalhes — ${r.colaborador ?? ""}`,
      mode: "periodo",
      rows: [row],
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-4">
      <RhPageHeader
        title="RH - 04 - Programação de Férias"
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div className="cursor-pointer" onClick={() => openByStatus("VENCIDA", "Férias Vencidas")}>
          <KpiCard
            title="Férias Vencidas"
            value={kpis?.ferias_vencidas ?? 0}
            format="number"
            variant="danger"
            icon={<AlertOctagon className="h-4 w-4" />}
            loading={isLoading}
          />
        </div>
        <div className="cursor-pointer" onClick={() => openByStatus("A VENCER 30 DIAS", "A Vencer 30 Dias")}>
          <KpiCard
            title="A Vencer 30 Dias"
            value={kpis?.a_vencer_30 ?? 0}
            format="number"
            variant="warning"
            icon={<AlarmClock className="h-4 w-4" />}
            loading={isLoading}
          />
        </div>
        <div className="cursor-pointer" onClick={() => openByStatus("A VENCER 60 DIAS", "A Vencer 60 Dias")}>
          <KpiCard
            title="A Vencer 60 Dias"
            value={kpis?.a_vencer_60 ?? 0}
            format="number"
            icon={<Clock className="h-4 w-4" />}
            loading={isLoading}
            className="border-l-4 border-l-lime-500"
          />
        </div>
        <div className="cursor-pointer" onClick={() => openByStatus("A VENCER 90 DIAS", "A Vencer 90 Dias")}>
          <KpiCard
            title="A Vencer 90 Dias"
            value={kpis?.a_vencer_90 ?? 0}
            format="number"
            icon={<CalendarClock className="h-4 w-4" />}
            loading={isLoading}
            className="border-l-4 border-l-green-700"
          />
        </div>
        <div className="cursor-pointer" onClick={openFeriasTotal}>
          <KpiCard
            title="Férias Total"
            value={kpis?.ferias_total ?? 0}
            format="number"
            variant="info"
            icon={<Users className="h-4 w-4" />}
            loading={isLoading}
          />
        </div>
        <div className="cursor-pointer" onClick={openDeFerias}>
          <KpiCard
            title="De Férias"
            value={kpis?.de_ferias ?? 0}
            format="number"
            icon={<Palmtree className="h-4 w-4" />}
            loading={isLoading}
            className="border-l-4 border-l-blue-900"
          />
        </div>
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
                    {M_KEYS.map((k, idx) => {
                      const v = (r as any)[k] as number;
                      const clickable = Number(v) > 0;
                      return (
                        <TableCell
                          key={k}
                          className={`text-right tabular-nums ${clickable ? "cursor-pointer hover:underline text-primary" : ""}`}
                          onClick={clickable ? () => openPivotCell(r.ano, idx + 1) : undefined}
                        >
                          {fmtPivot(v)}
                        </TableCell>
                      );
                    })}
                    <TableCell
                      className={`text-right tabular-nums font-semibold ${Number(r.total) > 0 ? "cursor-pointer hover:underline text-primary" : ""}`}
                      onClick={Number(r.total) > 0 ? () => openPivotTotal(r.ano) : undefined}
                    >
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
                    <TableRow
                      key={i}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openSemProgLinha(r)}
                    >
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

      <ProgramacaoFeriasDrillModal
        open={!!drill}
        onOpenChange={(o) => { if (!o) setDrill(null); }}
        title={drill?.title ?? ""}
        mode={drill?.mode ?? "periodo"}
        rows={drill?.rows ?? []}
        headerNote={drill?.headerNote}
      />
    </div>
  );
}
