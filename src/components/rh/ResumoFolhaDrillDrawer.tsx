import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import {
  fetchResumoFolhaDrill,
  ResumoFolhaDrillError,
} from "@/lib/rh/api";
import type { ResumoFolhaDrillsMenuItem } from "@/lib/rh/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  drillItem: ResumoFolhaDrillsMenuItem | null;
  /** Valor do card correspondente para comparação visual com o total do drill. */
  cardValue: number | null | undefined;
  anomes_ini: string; // YYYYMM
  anomes_fim: string; // YYYYMM
  cd_filial?: string;
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function ResumoFolhaDrillDrawer({
  open,
  onOpenChange,
  drillItem,
  cardValue,
  anomes_ini,
  anomes_fim,
  cd_filial,
}: Props) {
  const agrupamentos = drillItem?.agrupamentos ?? [];
  const [tab, setTab] = useState<string>("");

  // Ao abrir/trocar de card, garantir que o primeiro agrupamento é o ativo.
  useEffect(() => {
    if (open && drillItem) {
      const first = agrupamentos[0]?.key ?? "";
      setTab(first);
    }
  }, [open, drillItem, agrupamentos]);

  const query = useQuery({
    queryKey: [
      "rh",
      "resumo-folha-drill",
      drillItem?.card,
      tab,
      anomes_ini,
      anomes_fim,
      cd_filial ?? null,
    ],
    queryFn: () =>
      fetchResumoFolhaDrill({
        card: drillItem!.card,
        agrupar_por: tab,
        anomes_ini,
        anomes_fim,
        cd_filial,
      }),
    enabled: open && !!drillItem && !!tab,
    retry: (count, err) => (err instanceof ResumoFolhaDrillError ? false : count < 1),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const data = query.data;
  const err = query.error as any;
  const is422 = err instanceof ResumoFolhaDrillError && err.status === 422;

  const hasAnyQtd = useMemo(
    () => (data?.itens ?? []).some((i) => isNumber(i.qtd as any) && (i.qtd as any) !== null),
    [data?.itens],
  );

  const total = data?.total ?? null;
  const delta =
    total != null && cardValue != null && isNumber(cardValue) ? total - cardValue : null;
  const deltaAbs = delta == null ? 0 : Math.abs(delta);
  const cardAbs = cardValue != null && isNumber(cardValue) ? Math.abs(cardValue) : 0;
  const fechou = delta == null ? null : cardAbs === 0 ? deltaAbs < 0.01 : deltaAbs / cardAbs < 0.005;

  const meta = data?.meta ?? null;
  const pecasPendentes = meta?.pecas_pendentes;
  const mesesSemPlanilha = meta?.meses_sem_planilha;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {drillItem?.label ?? "Drill"}
            <Badge variant="outline" className="text-[10px] font-mono">
              {drillItem?.card ?? ""}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Período {anomes_ini} → {anomes_fim}
            {cd_filial ? ` · filial ${cd_filial}` : ""}
            {cardValue != null && isNumber(cardValue) ? (
              <> · valor do card: <span className="font-medium">{formatCurrency(cardValue)}</span></>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        {agrupamentos.length === 0 ? (
          <div className="mt-6 text-sm text-muted-foreground">
            Este card não expõe agrupamentos de drill no backend.
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="mt-4">
            <TabsList className="flex flex-wrap h-auto">
              {agrupamentos.map((a) => (
                <TabsTrigger key={a.key} value={a.key} className="text-xs">
                  {a.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="mt-4 space-y-3">
              {query.isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando drill...
                </div>
              )}

              {is422 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  <div className="flex items-center gap-1 font-medium mb-1">
                    <AlertTriangle className="h-3 w-3" /> Requisição inválida (422)
                  </div>
                  <pre className="whitespace-pre-wrap break-words font-mono text-[11px]">
                    {typeof (err as any).detail === "string"
                      ? (err as any).detail
                      : JSON.stringify((err as any).detail, null, 2)}
                  </pre>
                </div>
              )}

              {!query.isLoading && !is422 && query.isError && (
                <div className="text-xs text-destructive">
                  {err?.message ?? "Falha ao carregar o drill."}
                </div>
              )}

              {!query.isLoading && !query.isError && data && (
                <>
                  {meta?.aviso && (
                    <div className="rounded-md border border-warning/40 bg-warning/5 p-2 text-[11px] text-warning-foreground">
                      {meta.aviso}
                    </div>
                  )}
                  {pecasPendentes && (
                    <div className="text-[11px] text-muted-foreground">
                      Peças pendentes:{" "}
                      <span className="font-mono">
                        {typeof pecasPendentes === "string"
                          ? pecasPendentes
                          : JSON.stringify(pecasPendentes)}
                      </span>
                    </div>
                  )}
                  {mesesSemPlanilha && (
                    <div className="text-[11px] text-muted-foreground">
                      Meses sem planilha:{" "}
                      <span className="font-mono">
                        {Array.isArray(mesesSemPlanilha)
                          ? mesesSemPlanilha.join(", ")
                          : typeof mesesSemPlanilha === "string"
                          ? mesesSemPlanilha
                          : JSON.stringify(mesesSemPlanilha)}
                      </span>
                    </div>
                  )}

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Label</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          {hasAnyQtd && <TableHead className="text-right w-24">Qtd</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data.itens ?? []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={hasAnyQtd ? 3 : 2} className="text-center text-xs text-muted-foreground py-6">
                              Sem itens neste agrupamento.
                            </TableCell>
                          </TableRow>
                        ) : (
                          (data.itens ?? []).map((it, i) => (
                            <TableRow key={`${it.label}-${i}`}>
                              <TableCell className="text-xs">{it.label || "—"}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {it.valor == null ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : (
                                  formatCurrency(Number(it.valor))
                                )}
                              </TableCell>
                              {hasAnyQtd && (
                                <TableCell className="text-right tabular-nums text-xs">
                                  {it.qtd == null ? "—" : it.qtd}
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between border-t pt-2 text-sm">
                    <div className="text-xs text-muted-foreground">
                      {data.fonte ? (
                        <>Fonte: <span className="font-mono">{data.fonte}</span></>
                      ) : (
                        "Fonte não informada"
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-muted-foreground">Total</div>
                      <div className="text-lg font-semibold tabular-nums">
                        {total == null ? "—" : formatCurrency(Number(total))}
                      </div>
                      {delta != null && (
                        <div
                          className={`text-[11px] tabular-nums ${
                            fechou ? "text-success" : "text-warning"
                          }`}
                        >
                          {fechou ? "Fecha com o card" : `Δ vs card: ${formatCurrency(delta)}`}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {query.isLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                </div>
              )}
            </div>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
