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
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  fetchResumoFolhaDrill,
  ResumoFolhaDrillError,
} from "@/lib/rh/api";
import type { ResumoFolhaDrillsMenuItem } from "@/lib/rh/types";

export interface ResumoFolhaDrillExtras {
  cd_filial?: string;
  cd_evento?: string;
  cd_tp_evento?: string;
  competencia?: string; // YYYYMM (override do período quando drill vem de barra/linha mensal)
  contextLabel?: string; // texto extra para o cabeçalho
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  drillItem: ResumoFolhaDrillsMenuItem | null;
  /** Valor do card correspondente para comparação visual com o total do drill. */
  cardValue: number | null | undefined;
  anomes_ini: string; // YYYYMM
  anomes_fim: string; // YYYYMM
  extras?: ResumoFolhaDrillExtras;
}

function isNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

const AGRUPAMENTO_LABELS: Record<string, string> = {
  evento: "Por Evento",
  filial: "Por Filial",
  mes: "Por Mês",
  colaborador: "Por Colaborador",
  evento_colaborador: "Evento × Colaborador",
  colaborador_evento: "Colaborador × Evento",
  analitico: "Analítico (linha a linha)",
};

const DEEP_LEVELS = new Set(["evento_colaborador", "colaborador_evento", "analitico"]);
const DEEP_LIMITE = 5000;

// Cards de valor que aceitam agrupamentos padrão (evento/filial/mês) quando o
// backend omite `agrupamentos` no drills_menu.
const VALUE_CARDS_FALLBACK = new Set([
  "provento", "desconto", "total_liquido", "custo_total", "beneficios",
  "inss_total", "inss_patronal", "hora_extra", "provisoes", "custo_ferias",
  "rescisoes", "fgts",
]);
const DEFAULT_AGRUPAMENTOS = [
  { key: "evento", label: AGRUPAMENTO_LABELS.evento },
  { key: "filial", label: AGRUPAMENTO_LABELS.filial },
  { key: "mes", label: AGRUPAMENTO_LABELS.mes },
];

export function ResumoFolhaDrillDrawer({
  open,
  onOpenChange,
  drillItem,
  cardValue,
  anomes_ini,
  anomes_fim,
  extras,
}: Props) {
  const rawAgrupamentos = drillItem?.agrupamentos ?? [];
  const usingFallback =
    rawAgrupamentos.length === 0 &&
    !!drillItem?.card &&
    VALUE_CARDS_FALLBACK.has(drillItem.card);
  const agrupamentos = usingFallback ? DEFAULT_AGRUPAMENTOS : rawAgrupamentos;
  const [tab, setTab] = useState<string>("");
  const cd_filial = extras?.cd_filial;
  const cd_evento = extras?.cd_evento;
  const cd_tp_evento = extras?.cd_tp_evento;
  const competencia = extras?.competencia;
  const contextLabel = extras?.contextLabel;

  useEffect(() => {
    if (open && drillItem) {
      const first = agrupamentos[0]?.key ?? "";
      setTab(first);
      if (rawAgrupamentos.length === 0) {
        // eslint-disable-next-line no-console
        console.debug("[ResumoFolha drill] drills_menu sem agrupamentos", {
          card: drillItem.card,
          drillItem,
          fallbackAplicado: usingFallback,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, drillItem]);

  const isDeep = DEEP_LEVELS.has(tab);
  const limite = isDeep ? DEEP_LIMITE : undefined;

  const query = useQuery({
    queryKey: [
      "rh",
      "resumo-folha-drill",
      drillItem?.card,
      tab,
      anomes_ini,
      anomes_fim,
      cd_filial ?? null,
      cd_evento ?? null,
      cd_tp_evento ?? null,
      competencia ?? null,
      limite ?? null,
    ],
    queryFn: () =>
      fetchResumoFolhaDrill({
        card: drillItem!.card,
        agrupar_por: tab,
        anomes_ini,
        anomes_fim,
        cd_filial,
        cd_evento,
        cd_tp_evento,
        competencia,
        limite,
      }),
    enabled: open && !!drillItem && !!tab,
    retry: (count, err) => (err instanceof ResumoFolhaDrillError ? false : count < 1),
    staleTime: 0,
    gcTime: 5 * 60_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const data = query.data;
  const err = query.error as any;
  const is422 = err instanceof ResumoFolhaDrillError && err.status === 422;

  const itens = data?.itens ?? [];
  const hasAnyQtd = useMemo(
    () => itens.some((i) => isNumber(i.qtd as any) && (i.qtd as any) !== null),
    [itens],
  );

  // Detecta se o backend enviou campos ricos para escolher o layout de colunas.
  const richMode:
    | "analitico"
    | "cruz"
    | "raso"
    | "salario_base_colab"
    | "inss_patronal_colab" = useMemo(() => {
    if (drillItem?.card === "salario_base" && tab === "colaborador") return "salario_base_colab";
    if (drillItem?.card === "inss_patronal" && tab === "colaborador") return "inss_patronal_colab";
    if (!itens.length) {
      if (tab === "analitico") return "analitico";
      if (tab === "evento_colaborador" || tab === "colaborador_evento") return "cruz";
      return "raso";
    }
    const sample = itens.find(
      (i) => (i as any).colaborador != null || (i as any).ds_evento != null || (i as any).qtd_referencia != null,
    ) as any;
    if (!sample) return "raso";
    if (tab === "analitico" || sample.qtd_referencia != null) return "analitico";
    if (sample.colaborador != null || sample.ds_evento != null) return "cruz";
    return "raso";
  }, [itens, tab, drillItem?.card]);


  const total = data?.total ?? null;
  const delta =
    total != null && cardValue != null && isNumber(cardValue) ? total - cardValue : null;
  const deltaAbs = delta == null ? 0 : Math.abs(delta);
  const cardAbs = cardValue != null && isNumber(cardValue) ? Math.abs(cardValue) : 0;
  const fechou = delta == null ? null : cardAbs === 0 ? deltaAbs < 0.01 : deltaAbs / cardAbs < 0.005;

  const meta = data?.meta ?? null;
  const pecasPendentes = meta?.pecas_pendentes;
  const mesesSemPlanilha = meta?.meses_sem_planilha;
  const truncado = isDeep && limite != null && itens.length >= limite;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {drillItem?.label ?? "Drill"}
            <Badge variant="outline" className="text-[10px] font-mono">
              {drillItem?.card ?? ""}
            </Badge>
          </SheetTitle>
          <SheetDescription>
            Período {competencia ?? anomes_ini} → {competencia ?? anomes_fim}
            {cd_filial ? ` · filial ${cd_filial}` : ""}
            {cd_evento ? ` · evento ${cd_evento}` : ""}
            {cd_tp_evento ? ` · tipo ${cd_tp_evento}` : ""}
            {contextLabel ? ` · ${contextLabel}` : ""}
            {cardValue != null && isNumber(cardValue) ? (
              <> · valor do card: <span className="font-medium">{formatCurrency(cardValue)}</span></>
            ) : null}
          </SheetDescription>
        </SheetHeader>

        {agrupamentos.length === 0 ? (
          <div className="mt-6 rounded-md border border-warning/40 bg-warning/5 p-4 text-sm text-foreground/80 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
            <div>
              <p className="font-medium">Este card não expõe agrupamentos de drill no backend.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Card: <span className="font-mono">{drillItem?.card ?? "—"}</span>. Verifique se o
                <span className="font-mono"> drills_menu</span> retorna <span className="font-mono">agrupamentos</span> para este card.
              </p>
            </div>
          </div>
        ) : (
          <>
          {usingFallback && (
            <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-2 text-[11px] text-muted-foreground">
              Agrupamentos padrão aplicados no front (evento/filial/mês) — o backend não enviou
              <span className="font-mono"> agrupamentos</span> para <span className="font-mono">{drillItem?.card}</span>.
            </div>
          )}
          <Tabs value={tab} onValueChange={setTab} className="mt-4">
            <TabsList className="flex flex-wrap h-auto">
              {agrupamentos.map((a) => (
                <TabsTrigger key={a.key} value={a.key} className="text-xs">
                  {a.label || AGRUPAMENTO_LABELS[a.key] || a.key}
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
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
                  <div className="flex items-start gap-2 text-xs text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium">Não foi possível carregar o drill.</p>
                      <p className="text-[11px] text-destructive/80">
                        {err?.isTimeout || err?.code === "CLIENT_TIMEOUT"
                          ? "A consulta demorou mais que 30s. Tente de novo — o backend faz cache de 90s, então a segunda chamada é instantânea."
                          : err?.message ?? "Erro desconhecido ao consultar o drill."}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => query.refetch()}
                    disabled={query.isFetching}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${query.isFetching ? "animate-spin" : ""}`} />
                    Tentar novamente
                  </Button>
                </div>
              )}

              {!query.isLoading && !query.isError && data && (
                <>
                  {meta?.aviso && (
                    <div className="rounded-md border border-warning/40 bg-warning/5 p-2 text-[11px] text-warning-foreground">
                      {meta.aviso}
                    </div>
                  )}
                  {truncado && (
                    <div className="rounded-md border border-warning/40 bg-warning/5 p-2 text-[11px] text-warning-foreground flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>
                        Lista limitada a <span className="font-semibold">{formatNumber(limite!, 0)}</span> linhas.
                        O total abaixo já considera todos os registros do período.
                      </span>
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

                  <div className="rounded-md border max-h-[65vh] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        {richMode === "analitico" ? (
                          <TableRow>
                            <TableHead>Colaborador</TableHead>
                            <TableHead>Evento</TableHead>
                            <TableHead className="text-right w-28">Qtd. ref.</TableHead>
                            <TableHead className="text-right w-32">Valor</TableHead>
                          </TableRow>
                        ) : richMode === "cruz" ? (
                          <TableRow>
                            <TableHead>Colaborador</TableHead>
                            <TableHead>Evento</TableHead>
                            <TableHead className="text-right w-32">Valor</TableHead>
                            {hasAnyQtd && <TableHead className="text-right w-24">Qtd</TableHead>}
                          </TableRow>
                        ) : richMode === "salario_base_colab" ? (
                          <TableRow>
                            <TableHead>Colaborador</TableHead>
                            <TableHead className="w-28">Tipo</TableHead>
                            <TableHead className="text-right w-36">Salário cadastral</TableHead>
                            <TableHead className="text-right w-24">Horas/mês</TableHead>
                            <TableHead className="text-right w-32">Nominal</TableHead>
                          </TableRow>
                        ) : richMode === "inss_patronal_colab" ? (
                          <TableRow>
                            <TableHead>Colaborador</TableHead>
                            <TableHead className="text-right w-32">Base INSS</TableHead>
                            <TableHead className="text-right w-20">Alíquota</TableHead>
                            <TableHead className="text-right w-32">Patronal</TableHead>
                          </TableRow>
                        ) : (
                          <TableRow>
                            <TableHead>Label</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            {hasAnyQtd && <TableHead className="text-right w-24">Qtd</TableHead>}
                          </TableRow>
                        )}
                      </TableHeader>
                      <TableBody>
                        {itens.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={
                                richMode === "analitico"
                                  ? 4
                                  : richMode === "cruz"
                                  ? (hasAnyQtd ? 4 : 3)
                                  : richMode === "salario_base_colab"
                                  ? 5
                                  : richMode === "inss_patronal_colab"
                                  ? 4
                                  : (hasAnyQtd ? 3 : 2)
                              }
                              className="text-center text-xs text-muted-foreground py-6"
                            >
                              {(total ?? 0) === 0 ? "Sem lançamentos no período." : "Sem itens neste agrupamento."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          itens.map((it: any, i) => {
                            const colaborador = it.colaborador
                              ? `${it.colaborador}${it.matricula ? ` (${it.matricula})` : ""}`
                              : it.matricula || "";
                            const evento = it.ds_evento
                              ? `${it.cd_evento != null ? `${it.cd_evento} - ` : ""}${it.ds_evento}`
                              : it.cd_evento != null
                              ? String(it.cd_evento)
                              : "";
                            if (richMode === "salario_base_colab") {
                              const isHorista = String(it.tipo_salario || "").toLowerCase() === "horista";
                              return (
                                <TableRow key={`${it.chave ?? it.label}-${i}`}>
                                  <TableCell className="text-xs">{colaborador || it.label || "—"}</TableCell>
                                  <TableCell className="text-xs">{it.tipo_salario || "—"}</TableCell>
                                  <TableCell className="text-right tabular-nums text-xs">
                                    {it.salario_cadastral == null
                                      ? "—"
                                      : isHorista
                                      ? `${formatCurrency(Number(it.salario_cadastral))} /h`
                                      : formatCurrency(Number(it.salario_cadastral))}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-xs">
                                    {it.horas_mes == null ? "—" : formatNumber(Number(it.horas_mes), 1)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {it.valor == null ? (
                                      <span className="text-muted-foreground">—</span>
                                    ) : (
                                      formatCurrency(Number(it.valor))
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            if (richMode === "inss_patronal_colab") {
                              return (
                                <TableRow key={`${it.chave ?? it.label}-${i}`}>
                                  <TableCell className="text-xs">{colaborador || it.label || "—"}</TableCell>
                                  <TableCell className="text-right tabular-nums text-xs">
                                    {it.base_inss == null ? "—" : formatCurrency(Number(it.base_inss))}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-xs">
                                    {it.aliquota || "20%"}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {it.valor == null ? (
                                      <span className="text-muted-foreground">—</span>
                                    ) : (
                                      formatCurrency(Number(it.valor))
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            if (richMode === "analitico") {
                              return (
                                <TableRow key={`${it.chave ?? it.label}-${i}`}>
                                  <TableCell className="text-xs">{colaborador || "—"}</TableCell>
                                  <TableCell className="text-xs">{evento || it.label || "—"}</TableCell>
                                  <TableCell className="text-right tabular-nums text-xs">
                                    {it.qtd_referencia == null ? "—" : formatNumber(Number(it.qtd_referencia), 2)}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {it.valor == null ? (
                                      <span className="text-muted-foreground">—</span>
                                    ) : (
                                      formatCurrency(Number(it.valor))
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            if (richMode === "cruz") {
                              return (
                                <TableRow key={`${it.chave ?? it.label}-${i}`}>
                                  <TableCell className="text-xs">{colaborador || (it.label && !evento ? it.label : "—")}</TableCell>
                                  <TableCell className="text-xs">{evento || (colaborador ? "—" : it.label) || "—"}</TableCell>
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
                              );
                            }
                            return (
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
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex items-center justify-between border-t pt-2 text-sm">
                    <div className="text-xs text-muted-foreground">
                      {itens.length > 0 && (
                        <>
                          {formatNumber(itens.length, 0)} {itens.length === 1 ? "linha" : "linhas"}
                          {data.fonte ? " · " : ""}
                        </>
                      )}
                      {data.fonte ? (
                        <>Fonte: <span className="font-mono">{data.fonte}</span></>
                      ) : (
                        itens.length === 0 ? "Fonte não informada" : ""
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
                  {richMode === "analitico" && (
                    <div className="rounded-md border border-primary/20 bg-primary/5 p-2 text-[11px] text-muted-foreground leading-relaxed">
                      Este drill reproduz a mesma classificação do relatório oficial Senior{" "}
                      <span className="font-semibold text-foreground">FPRF001 (Relação de Cálculo)</span>:
                      cada evento é agrupado pela sua classe (<span className="font-mono">codclc</span>/
                      <span className="font-mono">tipeve</span>) configurada no cadastro. O total acima
                      é somado <span className="font-semibold">antes</span> do corte da lista, então fecha com o card
                      mesmo quando a exibição é truncada em {formatNumber(DEEP_LIMITE, 0)} linhas.
                    </div>
                  )}
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
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
