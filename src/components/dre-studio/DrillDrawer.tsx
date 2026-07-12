import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useDrillLancamentos } from "@/hooks/contabil/api";
import { fmtBRL } from "./MoneyCell";

export interface DrillArgs {
  modeloId: string;
  linhaId: string;
  linhaDescricao: string;
  /** Mês específico. Use OU anomes OU anomes_ini/anomes_fim. */
  anomes?: number;
  anomes_ini?: number;
  anomes_fim?: number;
  codccu?: string;
  codemp?: number;
  codfil?: number;
  /** Conta contábil analítica (drill de conta). */
  ctared?: number | string | null;
  /** Classificação sintética (drill de grupo). */
  clacta?: string | null;
}

const LIMITE_STEPS = [500, 2000, 5000];

export function DrillDrawer({
  open,
  onOpenChange,
  args,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  args: DrillArgs | null;
}) {
  const [limite, setLimite] = useState<number>(500);
  useEffect(() => {
    if (open) setLimite(500);
  }, [open, args?.linhaId]);

  const hasCtared =
    args != null &&
    args.ctared != null &&
    String(args.ctared).trim() !== "" &&
    Number.isFinite(Number(args.ctared));
  const hasClacta =
    args != null && args.clacta != null && String(args.clacta).trim() !== "";
  const drillOk = hasCtared || hasClacta;

  const usaRange =
    args?.anomes == null &&
    args?.anomes_ini != null &&
    args?.anomes_fim != null;
  const usaMes = args?.anomes != null;

  const q = useDrillLancamentos(
    args && drillOk && (usaMes || usaRange)
      ? {
          codemp: args.codemp,
          codfil: args.codfil,
          anomes: usaMes ? args.anomes : undefined,
          anomes_ini: usaRange ? args.anomes_ini : undefined,
          anomes_fim: usaRange ? args.anomes_fim : undefined,
          ctared: hasCtared ? args.ctared : undefined,
          clacta: hasClacta ? args.clacta : undefined,
          codccu: args.codccu ?? null,
          limite,
        }
      : null,
    open,
  );
  const rows = q.data?.dados ?? [];
  const movimento = q.data?.movimento_liquido ?? null;
  const qtdTotal = q.data?.qtd_total ?? null;
  const qtdExib = q.data?.qtd_exibida ?? rows.length;
  const truncado = q.data?.truncado === true;

  const periodoLabel = usaMes
    ? `${String(args!.anomes).slice(4)}/${String(args!.anomes).slice(0, 4)}`
    : usaRange
      ? `${String(args!.anomes_ini).slice(4)}/${String(args!.anomes_ini).slice(0, 4)} → ${String(args!.anomes_fim).slice(4)}/${String(args!.anomes_fim).slice(0, 4)}`
      : "";

  const proximoLimite = LIMITE_STEPS.find((n) => n > limite) ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Drill — {args?.linhaDescricao}</SheetTitle>
          <SheetDescription>
            {hasCtared ? (
              <>ctared <strong>{String(args!.ctared)}</strong> · {periodoLabel}</>
            ) : hasClacta ? (
              <>clacta <strong>{String(args!.clacta)}</strong> · {periodoLabel}</>
            ) : (
              <>Lançamentos contábeis de {periodoLabel}</>
            )}
            <br />
            <span className="text-[11px] text-slate-500">
              Apenas auditoria — não usado para recalcular o saldo.
            </span>
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          {!drillOk ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Esta linha não expõe uma <strong>conta contábil (ctared)</strong> nem
              uma <strong>classificação (clacta)</strong> para drill.
            </div>
          ) : q.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : q.isError ? (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
              Erro ao carregar drill: {(q.error as Error)?.message}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-slate-500 py-8 text-center">Nenhum lançamento.</div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  {movimento != null && (
                    <span>
                      Movimento líquido:{" "}
                      <strong className="tabular-nums">{fmtBRL(movimento)}</strong>
                    </span>
                  )}
                  <span className="text-slate-600">
                    Mostrando <strong>{qtdExib}</strong>
                    {qtdTotal != null && qtdTotal !== qtdExib ? (
                      <> de <strong>{qtdTotal}</strong></>
                    ) : null}
                  </span>
                  {truncado && (
                    <span className="rounded bg-amber-100 text-amber-900 px-2 py-0.5">
                      Resultado truncado
                    </span>
                  )}
                </div>
                {truncado && proximoLimite && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLimite(proximoLimite)}
                    disabled={q.isFetching}
                  >
                    Aumentar limite para {proximoLimite}
                  </Button>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Lote/Nº</TableHead>
                    <TableHead>Débito</TableHead>
                    <TableHead>Crédito</TableHead>
                    <TableHead>CCU</TableHead>
                    <TableHead>Histórico</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="whitespace-nowrap">{r.data}</TableCell>
                      <TableCell className="text-xs">{r.lote ?? ""} / {r.numero ?? ""}</TableCell>
                      <TableCell className="text-xs">
                        <div>{r.conta_debito}</div>
                        <div className="text-slate-500">{r.desc_debito}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{r.conta_credito}</div>
                        <div className="text-slate-500">{r.desc_credito}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{r.codccu}</div>
                        <div className="text-slate-500">{r.desccu}</div>
                      </TableCell>
                      <TableCell className="text-xs max-w-[260px] truncate" title={r.historico}>
                        {r.historico}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBRL(r.valor)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
