import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDrillLancamentos } from "@/hooks/contabil/api";
import { cn } from "@/lib/utils";

/** Assinatura preservada — usada por DreStudioVisualizacaoPage. */
export interface DrillArgs {
  modeloId: string;
  linhaId: string;
  linhaDescricao: string;
  anomes?: number;
  anomes_ini?: number;
  anomes_fim?: number;
  codccu?: string;
  codemp?: number;
  codfil?: number;
  ctared?: number | string | null;
  clacta?: string | null;
  /** Opcional: descrição da conta contábil selecionada (mostrada no cabeçalho). */
  contaDescricao?: string | null;
}

const LIMITE_STEPS = [500, 2000, 5000];

const fmtBRL = (v: number | null | undefined): string =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(v ?? 0));

function fmtDataBR(v: unknown): string {
  if (v == null || v === "") return "";
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("pt-BR");
}

function anomesToISO(anomes: number | undefined, endOfMonth = false): string | null {
  if (!anomes) return null;
  const s = String(anomes);
  if (s.length !== 6) return null;
  const y = s.slice(0, 4);
  const m = s.slice(4);
  if (!endOfMonth) return `${y}-${m}-01`;
  const last = new Date(Number(y), Number(m), 0).getDate();
  return `${y}-${m}-${String(last).padStart(2, "0")}`;
}

function fmtPeriodoBR(iniISO?: string | null, fimISO?: string | null): string {
  return `${fmtDataBR(iniISO) || "—"} a ${fmtDataBR(fimISO) || "—"}`;
}

interface RazaoItem {
  lancamento?: number | string | null;
  lote?: number | string | null;
  data?: string | null;
  ctared?: number | string | null;
  clacta?: string | null;
  conta_descricao?: string | null;
  historico?: string | null;
  observacao?: string | null;
  origem_codigo?: string | null;
  origem_descricao?: string | null;
  usuario_origem?: string | null;
  usuario_lancamento?: string | null;
  saldo_anterior?: number | null;
  mov_debito?: number | null;
  mov_credito?: number | null;
  saldo?: number | null;
  // detalhe
  codemp?: number | null;
  codfil?: number | null;
  numero?: number | string | null;
  conta_debito?: string | null;
  conta_credito?: string | null;
  codccu?: string | null;
  desccu?: string | null;
  documento?: string | null;
  valor_integral?: number | null;
  valor_rateado?: number | null;
  debcre?: string | null;
  [k: string]: any;
}

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
  const [detalhe, setDetalhe] = useState<RazaoItem | null>(null);
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    if (open) {
      setLimite(500);
      setDetalhe(null);
    }
  }, [open, args?.linhaId, args?.ctared]);

  const hasCtared =
    args != null &&
    args.ctared != null &&
    String(args.ctared).trim() !== "" &&
    Number.isFinite(Number(args.ctared));

  const usaRange =
    args?.anomes == null &&
    args?.anomes_ini != null &&
    args?.anomes_fim != null;
  const usaMes = args?.anomes != null;

  const q = useDrillLancamentos(
    args && hasCtared && (usaMes || usaRange)
      ? {
          codemp: args.codemp,
          codfil: args.codfil,
          anomes: usaMes ? args.anomes : undefined,
          anomes_ini: usaRange ? args.anomes_ini : undefined,
          anomes_fim: usaRange ? args.anomes_fim : undefined,
          ctared: args.ctared,
          codccu: args.codccu ?? null,
          limite,
        }
      : null,
    open,
  );

  const itens: RazaoItem[] = useMemo(() => {
    const src = (q.data?.itens as RazaoItem[] | null) ?? (q.data?.dados as RazaoItem[] | undefined) ?? [];
    return Array.isArray(src) ? src : [];
  }, [q.data]);

  const saldoInicial = q.data?.saldo_inicial ?? null;
  const saldoFinal = q.data?.saldo_final ?? null;
  const totalDebito = q.data?.total_debito ?? null;
  const totalCredito = q.data?.total_credito ?? null;
  const meta = q.data?.meta ?? null;
  const truncado = q.data?.truncado === true;
  const qtdTotal = q.data?.qtd_total ?? null;
  const qtdExib = q.data?.qtd_exibida ?? itens.length;

  // Contrato do Razão: exige saldo_inicial / saldo_final / mov_* / saldo por linha.
  const temContratoRazao =
    saldoInicial != null &&
    saldoFinal != null &&
    itens.some(
      (i) =>
        i?.saldo_anterior !== undefined ||
        i?.mov_debito !== undefined ||
        i?.mov_credito !== undefined ||
        i?.saldo !== undefined,
    );

  const dataIniISO =
    meta?.data_ini ??
    (usaMes ? anomesToISO(args?.anomes, false) : anomesToISO(args?.anomes_ini, false));
  const dataFimISO =
    meta?.data_fim ??
    (usaMes ? anomesToISO(args?.anomes, true) : anomesToISO(args?.anomes_fim, true));

  const contaDescricao =
    meta?.descricao_conta ?? args?.contaDescricao ?? args?.linhaDescricao ?? "";
  const clacta = meta?.clacta ?? (args?.clacta ?? null);
  const ctaredNum = meta?.ctared ?? (hasCtared ? Number(args?.ctared) : null);

  const proximoLimite = LIMITE_STEPS.find((n) => n > limite) ?? null;

  const cellNum = (v: number | null | undefined, opts?: { zeroBlank?: boolean }) => {
    if (v == null) return "";
    const n = Number(v);
    if (!Number.isFinite(n)) return "";
    if (opts?.zeroBlank && n === 0) return "";
    return fmtBRL(n);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "p-0 flex flex-col transition-[max-width] duration-200",
          expandido
            ? "w-screen sm:!max-w-none"
            : "w-full sm:max-w-[1400px]",
        )}
      >
        {/* Cabeçalho */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-primary text-primary-foreground">
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="text-primary-foreground">Lançamentos</SheetTitle>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setExpandido((v) => !v)}
              className="h-7 px-2 text-xs"
            >
              {expandido ? "Recolher" : "Expandir"}
            </Button>
          </div>
          <SheetDescription className="text-primary-foreground/80 space-y-0.5">
            {ctaredNum != null && (
              <div>
                Conta <strong>{ctaredNum}</strong>
                {contaDescricao ? <> — {contaDescricao}</> : null}
              </div>
            )}
            {clacta && <div className="text-xs">Classificação: {clacta}</div>}
            <div className="text-xs">
              Período: {fmtPeriodoBR(dataIniISO, dataFimISO)}
            </div>
          </SheetDescription>

          {/* Resumo */}
          {temContratoRazao && (
            <div className="mt-3 grid grid-cols-4 gap-3 text-xs">
              <ResumoCard label="Saldo Anterior" value={saldoInicial} />
              <ResumoCard label="Total Débito" value={totalDebito} />
              <ResumoCard label="Total Crédito" value={totalCredito} />
              <ResumoCard label="Saldo Final" value={saldoFinal} strong />
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-auto px-4 py-3">
          {!hasCtared ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-medium mb-1">Selecione uma conta contábil</div>
              O Razão exibe movimentos de uma única conta. Use o drill{" "}
              <strong>Conta Contábil</strong> na linha da DRE e clique em uma
              conta específica para abrir o Razão.
            </div>
          ) : q.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-full" />
              ))}
            </div>
          ) : q.isError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              Erro ao carregar Razão: {(q.error as Error)?.message}
            </div>
          ) : !temContratoRazao ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-2">
              <div className="font-medium text-sm">
                Backend ainda não expõe o contrato do Razão.
              </div>
              <div>
                O endpoint <code>/api/contabil/drill-lancamentos</code>{" "}
                precisa retornar:
                <ul className="list-disc pl-5 mt-1">
                  <li>
                    <code>saldo_inicial</code>, <code>saldo_final</code>,{" "}
                    <code>total_debito</code>, <code>total_credito</code>
                  </li>
                  <li>
                    <code>itens[].saldo_anterior</code>,{" "}
                    <code>itens[].mov_debito</code>,{" "}
                    <code>itens[].mov_credito</code>,{" "}
                    <code>itens[].saldo</code>
                  </li>
                  <li>
                    <code>itens[].origem_codigo</code>,{" "}
                    <code>itens[].origem_descricao</code>,{" "}
                    <code>itens[].usuario_origem</code>,{" "}
                    <code>itens[].usuario_lancamento</code>
                  </li>
                </ul>
                Nenhum valor monetário é calculado no frontend — a UI só renderiza
                o que o backend enviar.
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer">Amostra recebida</summary>
                <pre className="mt-1 max-h-40 overflow-auto rounded bg-background p-2 text-[10px]">
                  {JSON.stringify(q.data, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  Mostrando <strong>{qtdExib}</strong>
                  {qtdTotal != null && qtdTotal !== qtdExib && (
                    <> de <strong>{qtdTotal}</strong></>
                  )}{" "}
                  lançamentos
                  {truncado && (
                    <span className="ml-2 rounded bg-amber-100 text-amber-900 px-2 py-0.5">
                      truncado
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

              <div className="overflow-x-auto rounded border">
                <Table className="text-xs">
                  <TableHeader className="bg-primary sticky top-0 z-10">
                    <TableRow className="hover:bg-primary">
                      <TableHead className="text-primary-foreground w-8"></TableHead>
                      <TableHead className="text-primary-foreground">Lançamento</TableHead>
                      <TableHead className="text-primary-foreground">Data</TableHead>
                      <TableHead className="text-primary-foreground">#</TableHead>
                      <TableHead className="text-primary-foreground">Conta Contábil</TableHead>
                      <TableHead className="text-primary-foreground">Obs.</TableHead>
                      <TableHead className="text-primary-foreground">#</TableHead>
                      <TableHead className="text-primary-foreground">Origem Lcto.</TableHead>
                      <TableHead className="text-primary-foreground">Usuário Origem</TableHead>
                      <TableHead className="text-primary-foreground">Usuário Lcto.</TableHead>
                      <TableHead className="text-primary-foreground text-right">Saldo Anterior</TableHead>
                      <TableHead className="text-primary-foreground text-right">Mov. Débito</TableHead>
                      <TableHead className="text-primary-foreground text-right">Mov. Crédito</TableHead>
                      <TableHead className="text-primary-foreground text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Linha SALDO INICIAL */}
                    <TableRow className="bg-muted/40 font-medium">
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="whitespace-nowrap">{fmtDataBR(dataIniISO)}</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell>SALDO</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right tabular-nums">{cellNum(saldoInicial)}</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right tabular-nums">{cellNum(saldoInicial)}</TableCell>
                    </TableRow>

                    {itens.map((r, i) => (
                      <TableRow
                        key={i}
                        className={cn(
                          i % 2 === 1 && "bg-muted/20",
                          "cursor-pointer hover:bg-accent/40",
                        )}
                        onClick={() => setDetalhe(r)}
                      >
                        <TableCell>
                          <span className="inline-block h-2 w-2 rounded-full bg-primary/70" />
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {r.lancamento ?? ""}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{fmtDataBR(r.data)}</TableCell>
                        <TableCell className="tabular-nums">{r.ctared ?? ""}</TableCell>
                        <TableCell className="max-w-[220px] truncate" title={`${r.clacta ?? ""} ${r.conta_descricao ?? ""}`}>
                          {r.clacta ? <span className="text-muted-foreground mr-1">{r.clacta}</span> : null}
                          {r.conta_descricao ?? ""}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate" title={r.historico ?? r.observacao ?? ""}>
                          {r.observacao ?? r.historico ?? ""}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{r.origem_codigo ?? ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.origem_descricao ?? ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.usuario_origem ?? ""}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.usuario_lancamento ?? ""}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.saldo_anterior != null ? fmtBRL(Number(r.saldo_anterior)) : ""}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {cellNum(r.mov_debito, { zeroBlank: true })}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {cellNum(r.mov_credito, { zeroBlank: true })}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {r.saldo != null ? fmtBRL(Number(r.saldo)) : ""}
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Linha SALDO FINAL */}
                    <TableRow className="bg-muted/40 font-medium">
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="whitespace-nowrap">{fmtDataBR(dataFimISO)}</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell>SALDO</TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right tabular-nums">{cellNum(saldoFinal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        {/* Rodapé fixo com totais */}
        {temContratoRazao && (
          <div className="border-t bg-primary text-primary-foreground px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
            <div>
              Mov. Débito:{" "}
              <strong className="tabular-nums">{fmtBRL(totalDebito)}</strong>
            </div>
            <div>
              Mov. Crédito:{" "}
              <strong className="tabular-nums">{fmtBRL(totalCredito)}</strong>
            </div>
            <div className="ml-auto">
              Saldo Final:{" "}
              <strong className="tabular-nums">{fmtBRL(saldoFinal)}</strong>
            </div>
          </div>
        )}

        {/* Detalhe do lançamento */}
        <Dialog open={!!detalhe} onOpenChange={(v) => !v && setDetalhe(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Lançamento {detalhe?.lancamento ?? ""}
              </DialogTitle>
            </DialogHeader>
            {detalhe && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Info label="Empresa" value={detalhe.codemp} />
                <Info label="Filial" value={detalhe.codfil} />
                <Info label="Lote" value={detalhe.lote} />
                <Info label="Número" value={detalhe.numero ?? detalhe.lancamento} />
                <Info label="Data" value={fmtDataBR(detalhe.data)} />
                <Info label="Lado (D/C)" value={detalhe.debcre} />
                <Info
                  label="Conta Débito"
                  value={detalhe.conta_debito}
                  strong={String(detalhe.debcre ?? '').toUpperCase() === 'D'}
                />
                <Info
                  label="Conta Crédito"
                  value={detalhe.conta_credito}
                  strong={String(detalhe.debcre ?? '').toUpperCase() === 'C'}
                />
                <Info
                  label="Conta selecionada"
                  value={`${detalhe.ctared ?? ""} ${detalhe.conta_descricao ?? ""}`}
                />
                <Info
                  label="Centro de custo"
                  value={detalhe.codccu ? `${detalhe.codccu} ${detalhe.desccu ?? ""}` : ""}
                />
                <Info label="Documento" value={detalhe.documento} />
                <Info label="Origem" value={detalhe.origem_codigo ? `${detalhe.origem_codigo} - ${detalhe.origem_descricao ?? ""}` : ""} />
                <Info label="Usuário origem" value={detalhe.usuario_origem} />
                <Info label="Usuário lançamento" value={detalhe.usuario_lancamento} />
                <Info
                  label="Valor integral"
                  value={detalhe.valor_integral != null ? fmtBRL(Number(detalhe.valor_integral)) : ""}
                />
                <Info
                  label="Valor rateado"
                  value={detalhe.valor_rateado != null ? fmtBRL(Number(detalhe.valor_rateado)) : ""}
                />
                <div className="col-span-2">
                  <div className="text-muted-foreground">Histórico</div>
                  <div className="mt-0.5">{detalhe.historico ?? ""}</div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function ResumoCard({
  label,
  value,
  strong,
}: {
  label: string;
  value: number | null | undefined;
  strong?: boolean;
}) {
  return (
    <div className="rounded bg-primary-foreground/10 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-primary-foreground/70">
        {label}
      </div>
      <div className={cn("tabular-nums", strong ? "text-base font-semibold" : "text-sm")}>
        {value != null ? fmtBRL(Number(value)) : "—"}
      </div>
    </div>
  );
}

function Info({ label, value, strong }: { label: string; value: any; strong?: boolean }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5", strong && "font-semibold")}>
        {value != null && value !== "" ? String(value) : "—"}
      </div>
    </div>
  );
}
