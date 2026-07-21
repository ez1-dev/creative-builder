import { useEffect, useMemo, useRef, useState } from "react";
import { FloatingHScrollbar } from "./FloatingHScrollbar";
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
import * as XLSX from "xlsx";
import { Download, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Rótulos oficiais das ORIGENS (módulos) — sobrescrevem descrição vinda do backend. */
const ORIGEM_LABELS: Record<string, string> = {
  EST: "Estoque",
  PAT: "Patrimônio/Ativo Fixo",
  CPR: "Contas a Pagar",
  PAG: "Pagamentos",
  VRB: "Verbas",
  TES: "Tesouraria",
  VEN: "Faturamento/Vendas",
  REC: "Contas a Receber",
  IOD: "Integração",
  IMP: "Importação",
  MAN: "Manual (contabilidade)",
};

function labelOrigem(codigo?: string | null, descricaoFallback?: string | null): string {
  const key = String(codigo ?? "").trim().toUpperCase();
  if (key && ORIGEM_LABELS[key]) return ORIGEM_LABELS[key];
  return descricaoFallback ?? "";
}

/** Converte qualquer valor em texto legível. Evita "[object Object]" quando o
 *  backend envia campos estruturados (ex.: conta_debito como { ctared, descta }). */
function toDisplay(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, any>;
    const codigo = o.ctared ?? o.codigo ?? o.clacta ?? o.code ?? o.id;
    const desc = o.descta ?? o.descricao ?? o.nome ?? o.name ?? o.label;
    const parts = [codigo, desc].filter((p) => p !== undefined && p !== null && String(p).trim() !== "");
    if (parts.length) return parts.map(String).join(" - ");
    try { return JSON.stringify(v); } catch { return ""; }
  }
  return String(v);
}

function hasDisplayValue(v: unknown): boolean {
  return v !== null && v !== undefined && String(v).trim() !== "";
}

function usuarioOrigemValue(r: Pick<RazaoItem, "usuario_origem">, fallback = ""): string {
  return hasDisplayValue(r.usuario_origem) ? String(r.usuario_origem).trim() : fallback;
}

function usuarioLancamentoValue(
  r: Pick<RazaoItem, "usuario_lancamento" | "usuario">,
  fallback = "",
): string {
  if (hasDisplayValue(r.usuario_lancamento)) return String(r.usuario_lancamento).trim();
  return hasDisplayValue(r.usuario) ? String(r.usuario).trim() : fallback;
}




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
  /** Tipo do modelo de origem. Quando "DRE", oculta colunas/linhas de Saldo Anterior. */
  tipoModelo?: "DRE" | "BALANCO";
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

interface DocumentoOrigem {
  tipo?: string | null;
  descricao?: string | null;
  numero?: string | number | null;
  serie?: string | null;
  parceiro_tipo?: string | null;
  parceiro_codigo?: string | number | null;
  parceiro_nome?: string | null;
  ambiguo?: boolean | null;
  fonte_tabela?: string | null;
  produto?: string | null;
  derivacao?: string | null;
  deposito?: string | null;
  bem?: string | null;
  data_movimento?: string | null;
  sequencia_movimento?: number | string | null;
}

function numeroDocumentoValido(numero: string | number | null | undefined): boolean {
  if (numero === null || numero === undefined) return false;
  const s = String(numero).trim();
  return s !== "" && s !== "0";
}

function transacaoOrigemLabel(r: Pick<RazaoItem, "transacao_origem" | "transacao_origem_codigo" | "transacao_origem_descricao">): string | null {
  if (hasDisplayValue(r.transacao_origem)) return String(r.transacao_origem).trim();
  const parts = [r.transacao_origem_codigo, r.transacao_origem_descricao]
    .filter((p) => p !== null && p !== undefined && String(p).trim() !== "")
    .map((p) => String(p).trim());
  return parts.length ? parts.join(" - ") : null;
}

const FONTE_CC_LABEL: Record<string, string> = {
  RATEIO_PROPRIA_CONTA: "Rateio da própria conta",
  RATEIO_CONTRAPARTIDA: "Rateio da contrapartida",
  DOCUMENTO_ORIGEM: "Documento de origem",
};

interface CentroCustoInfo {
  codigo: string | null;
  descricao: string | null;
  fonte: string | null;
  fonteLabel: string | null;
  multiplos: Array<{ codccu?: string | null; descricao?: string | null }>;
  temMultiplos: boolean;
  label: string;
  itemsFormatted: string[];
}

function getCentroCustoInfo(item: RazaoItem): CentroCustoInfo {
  const raw = item.centro_custo ?? null;
  const fallback = !raw && item.ccu
    ? { codccu: String(item.ccu), descricao: null, fonte: null, multiplos: null }
    : null;
  const cc = raw ?? fallback;
  const codigo = cc?.codccu != null && String(cc.codccu).trim() !== "" ? String(cc.codccu).trim() : null;
  const descricao = cc?.descricao != null && String(cc.descricao).trim() !== "" ? String(cc.descricao).trim() : null;
  const fonte = cc?.fonte != null && String(cc.fonte).trim() !== "" ? String(cc.fonte).trim() : null;
  const fonteLabel = fonte ? (FONTE_CC_LABEL[fonte] ?? fonte) : null;
  const multiplos = Array.isArray(cc?.multiplos) ? cc!.multiplos! : [];
  const temMultiplos = multiplos.length > 1;
  const itemsFormatted = multiplos
    .map((m) => {
      const c = m?.codccu != null ? String(m.codccu).trim() : "";
      const d = m?.descricao != null ? String(m.descricao).trim() : "";
      return [c, d].filter(Boolean).join(" - ");
    })
    .filter(Boolean);
  const singleLabel = [codigo, descricao].filter(Boolean).join(" - ");
  const label = temMultiplos
    ? `Vários (${multiplos.length})`
    : (singleLabel || "—");
  return { codigo, descricao, fonte, fonteLabel, multiplos, temMultiplos, label, itemsFormatted };
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
  usuario_origem_codigo?: string | number | null;
  usuario?: string | null;
  usuario_lancamento?: string | null;
  usuario_lancamento_codigo?: string | number | null;
  usuario_origem_difere?: boolean;
  usuario_origem_fonte?: "documento" | "lote" | string | null;
  usuario_origem_fonte_tabela?: string | null;
  usuario_origem_status?: string | null;
  transacao_origem?: string | null;
  transacao_origem_codigo?: string | number | null;
  transacao_origem_descricao?: string | null;
  documento_origem?: DocumentoOrigem | null;
  saldo_anterior?: number | null;
  mov_debito?: number | null;
  mov_credito?: number | null;
  saldo?: number | null;
  // detalhe
  codemp?: number | null;
  codfil?: number | null;
  numero?: number | string | null;
  conta_debito?: string | number | Record<string, any> | null;
  conta_credito?: string | number | Record<string, any> | null;
  codccu?: string | null;
  desccu?: string | null;
  ccu?: string | null;
  centro_custo?: {
    codccu?: string | null;
    descricao?: string | null;
    fonte?: string | null;
    multiplos?: Array<{ codccu?: string | null; descricao?: string | null }> | null;
  } | null;
  documento?: string | null;
  valor_integral?: number | null;
  valor_rateado?: number | null;
  debcre?: string | null;
  lado?: string | null;
  [k: string]: any;
}

interface ContaOpcao {
  ctared: number | string;
  clacta?: string | null;
  descricao?: string | null;
  mov_debito?: number | null;
  mov_credito?: number | null;
  qtd_lancamentos?: number | null;
}

/** Formata `documento_origem` como "NFE 20568 — RIZZI & CIA LTDA". Ignora número 0/vazio. */
function labelDocumentoOrigem(doc?: DocumentoOrigem | null): string {
  if (!doc) return "";
  const head = String(doc.serie ?? doc.tipo ?? "").trim();
  const num = numeroDocumentoValido(doc.numero) ? String(doc.numero) : "";
  const parceiro = String(doc.parceiro_nome ?? "").trim();
  const esq = [head, num].filter(Boolean).join(" ");
  const parts = [esq, parceiro].filter(Boolean);
  return parts.join(" — ");
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
  const [contaEscolhida, setContaEscolhida] = useState<ContaOpcao | null>(null);

  useEffect(() => {
    if (open) {
      setLimite(500);
      setDetalhe(null);
      setContaEscolhida(null);
    }
  }, [open, args?.linhaId, args?.ctared]);

  const hasCtared =
    args != null &&
    args.ctared != null &&
    String(args.ctared).trim() !== "" &&
    Number.isFinite(Number(args.ctared));
  const hasLinhaContext = Boolean(args?.modeloId && args?.linhaId);
  const hasClacta = args?.clacta != null && String(args.clacta).trim() !== "";
  const hasDrillContext = hasLinhaContext || hasCtared || hasClacta;

  const usaRange =
    args?.anomes == null &&
    args?.anomes_ini != null &&
    args?.anomes_fim != null;
  const usaMes = args?.anomes != null;

  // Prioridade do ctared enviado ao backend: conta escolhida no picker > args.ctared.
  const ctaredEfetivo =
    contaEscolhida?.ctared != null
      ? contaEscolhida.ctared
      : hasCtared
        ? args?.ctared
        : undefined;

  const q = useDrillLancamentos(
    args && hasDrillContext && (usaMes || usaRange)
      ? {
          modelo_id: args.modeloId,
          linha_id: args.linhaId,
          codemp: args.codemp,
          codfil: args.codfil,
          anomes: usaMes ? args.anomes : undefined,
          anomes_ini: usaRange ? args.anomes_ini : undefined,
          anomes_fim: usaRange ? args.anomes_fim : undefined,
          ctared: ctaredEfetivo,
          // NÃO enviar `clacta`: o backend resolve as contas via modelo_id+linha_id
          // e, após seleção do usuário, via `ctared`. Enviar clacta junto quebra o
          // contrato novo do endpoint (spec 19/07/2026).
          codccu: args.codccu ?? null,
          limite,
        }
      : null,
    open,
  );



  const itens: RazaoItem[] = useMemo(() => {
    const data = q.data as (typeof q.data & {
      rows?: RazaoItem[] | null;
      lancamentos?: RazaoItem[] | null;
    }) | undefined;
    const src = data?.itens ?? data?.dados ?? data?.rows ?? data?.lancamentos ?? [];
    return Array.isArray(src) ? src : [];
  }, [q.data]);

  const isDRE = args?.tipoModelo === "DRE";
  const saldoInicial = q.data?.saldo_inicial ?? null;
  const saldoFinal = q.data?.saldo_final ?? null;
  const totalDebito = q.data?.total_debito ?? null;
  const totalCredito = q.data?.total_credito ?? null;
  const meta = q.data?.meta ?? null;
  const truncado = q.data?.truncado === true;
  const qtdTotal = q.data?.qtd_total ?? null;
  const qtdExib = q.data?.qtd_exibida ?? itens.length;

  // Contrato do Razão: exige saldo_inicial / saldo_final no topo.
  // Se houver itens, valida ainda que ao menos um traga mov_*/saldo_anterior/saldo.
  // Se não houver itens (período sem lançamentos), aceita o contrato mesmo assim.
  const temContratoRazao =
    saldoInicial != null &&
    saldoFinal != null &&
    (itens.length === 0 ||
      itens.some(
        (i) =>
          i?.saldo_anterior !== undefined ||
          i?.mov_debito !== undefined ||
          i?.mov_credito !== undefined ||
          i?.saldo !== undefined,
      ));

  const dataIniISO =
    meta?.data_ini ??
    (usaMes ? anomesToISO(args?.anomes, false) : anomesToISO(args?.anomes_ini, false));
  const dataFimISO =
    meta?.data_fim ??
    (usaMes ? anomesToISO(args?.anomes, true) : anomesToISO(args?.anomes_fim, true));

  const contaDescricao =
    meta?.descricao_conta ??
    contaEscolhida?.descricao ??
    args?.contaDescricao ??
    args?.linhaDescricao ??
    "";
  const clacta = meta?.clacta ?? contaEscolhida?.clacta ?? (args?.clacta ?? null);
  const ctaredNum =
    meta?.ctared ??
    (contaEscolhida?.ctared != null ? Number(contaEscolhida.ctared) : null) ??
    (hasCtared ? Number(args?.ctared) : null);

  // Novo passo: backend pediu para o usuário escolher a conta (linha da DRE tem várias).
  const precisaSelecionarConta =
    q.data?.precisa_selecionar_conta === true &&
    Array.isArray(q.data?.contas) &&
    (q.data?.contas?.length ?? 0) > 0 &&
    contaEscolhida == null;
  const contasCandidatas: ContaOpcao[] = Array.isArray(q.data?.contas)
    ? (q.data!.contas as ContaOpcao[])
    : [];

  const proximoLimite = LIMITE_STEPS.find((n) => n > limite) ?? null;

  const razaoScrollRef = useRef<HTMLDivElement>(null);

  const cellNum = (v: number | null | undefined, opts?: { zeroBlank?: boolean }) => {
    if (v == null) return "";
    const n = Number(v);
    if (!Number.isFinite(n)) return "";
    if (opts?.zeroBlank && n === 0) return "";
    return fmtBRL(n);
  };

  const podeExportar = temContratoRazao && itens.length > 0;

  const exportarExcel = () => {
    const num = (v: any) => {
      if (v == null || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const header = [
      "Lançamento", "Data", "Ctared", "Classificação", "Conta", "Observação",
      "Origem Cód.", "Origem", "Usuário Origem", "Usuário Lcto.",
      ...(!isDRE ? ["Saldo Anterior"] : []),
      "Mov. Débito", "Mov. Crédito", "Saldo",
    ];
    const rows: any[][] = [];
    if (!isDRE) {
      rows.push([
        "", fmtDataBR(dataIniISO), "", "", "SALDO INICIAL", "", "", "", "", "",
        num(saldoInicial), null, null, num(saldoInicial),
      ]);
    }
    for (const r of itens) {
      rows.push([
        r.lancamento ?? "",
        fmtDataBR(r.data),
        r.ctared ?? "",
        r.clacta ?? "",
        r.conta_descricao ?? "",
        r.observacao ?? r.historico ?? "",
        r.origem_codigo ?? "",
        labelOrigem(r.origem_codigo, r.origem_descricao),
        usuarioOrigemValue(r),
        usuarioLancamentoValue(r),
        ...(!isDRE ? [num(r.saldo_anterior)] : []),
        num(r.mov_debito),
        num(r.mov_credito),
        num(r.saldo),
      ]);
    }
    rows.push([
      "", fmtDataBR(dataFimISO), "", "", "SALDO FINAL", "", "", "", "", "",
      ...(!isDRE ? [null] : []),
      num(totalDebito), num(totalCredito), num(saldoFinal),
    ]);

    const meta_aoa = [
      [isDRE ? "DRE — Lançamentos" : "Balanço — Razão"],
      [`Conta: ${ctaredNum ?? ""}${contaDescricao ? " — " + contaDescricao : ""}`],
      [`Classificação: ${clacta ?? ""}`],
      [`Período: ${fmtPeriodoBR(dataIniISO, dataFimISO)}`],
      [],
    ];
    const aoa = [...meta_aoa, header, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const money = "#,##0.00;(#,##0.00);-";
    const moneyStart = header.indexOf("Mov. Débito");
    const dataStartRow = meta_aoa.length + 1; // após header
    for (let R = dataStartRow; R < dataStartRow + rows.length; R++) {
      for (let C = moneyStart; C < header.length; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (cell && typeof cell.v === "number") cell.z = money;
      }
      if (!isDRE) {
        const addr = XLSX.utils.encode_cell({ r: R, c: header.indexOf("Saldo Anterior") });
        const cell = ws[addr];
        if (cell && typeof cell.v === "number") cell.z = money;
      }
    }
    ws["!cols"] = header.map((h) =>
      ["Observação", "Conta", "Origem"].includes(h) ? { wch: 32 } :
      ["Usuário Origem", "Usuário Lcto.", "Classificação"].includes(h) ? { wch: 18 } :
      h.startsWith("Mov.") || h === "Saldo" || h === "Saldo Anterior" ? { wch: 16 } :
      { wch: 12 }
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Razão");
    const periodo = `${(args?.anomes ?? args?.anomes_ini ?? "")}${args?.anomes_fim ? "-" + args.anomes_fim : ""}`;
    const fname = `${isDRE ? "dre" : "balanco"}_drill_${ctaredNum ?? "conta"}_${periodo || "periodo"}.xlsx`;
    XLSX.writeFile(wb, fname);
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
            <div className="flex items-center gap-2">
              {contaEscolhida && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setContaEscolhida(null)}
                  className="h-7 px-2 text-xs"
                  title="Voltar para a lista de contas da linha"
                >
                  Trocar conta
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={exportarExcel}
                disabled={!podeExportar}
                className="h-7 px-2 text-xs gap-1"
                title="Exportar lançamentos exibidos para Excel"
              >
                <Download className="h-3.5 w-3.5" />
                Excel
              </Button>
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

          </div>
          <SheetDescription asChild>
            <div className="text-primary-foreground/80 space-y-0.5">
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
            </div>
          </SheetDescription>

          {/* Resumo */}
          {temContratoRazao && !precisaSelecionarConta && (
            <div className={cn("mt-3 grid gap-3 text-xs", isDRE ? "grid-cols-3" : "grid-cols-4")}>
              {!isDRE && <ResumoCard label="Saldo Anterior" value={saldoInicial} />}
              <ResumoCard label="Total Débito" value={totalDebito} />
              <ResumoCard label="Total Crédito" value={totalCredito} />
              <ResumoCard label="Saldo Final" value={saldoFinal} strong />
            </div>
          )}
        </SheetHeader>

        {/* Subfaixa fixa: contador + ação de aumentar limite */}
        {temContratoRazao && !precisaSelecionarConta && (
          <div className="shrink-0 border-b bg-background px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
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
        )}


        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 pb-6">

          {!hasDrillContext ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-medium mb-1">Contexto do Razão indisponível</div>
              Não foi possível identificar a linha/modelo ou a conta contábil para consultar os lançamentos.
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
          ) : precisaSelecionarConta ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                <div className="font-medium">Escolha a conta contábil</div>
                <div className="text-xs text-muted-foreground">
                  Esta linha tem {contasCandidatas.length} contas vinculadas. Selecione uma para abrir o razão.
                </div>
              </div>
              <div className="overflow-x-auto rounded border">
                <Table className="text-xs">
                  <TableHeader className="bg-primary sticky top-0 z-10">
                    <TableRow className="hover:bg-primary">
                      <TableHead className="text-primary-foreground">Conta reduzida</TableHead>
                      <TableHead className="text-primary-foreground">Classificação</TableHead>
                      <TableHead className="text-primary-foreground">Descrição</TableHead>
                      <TableHead className="text-primary-foreground text-right">Mov. Débito</TableHead>
                      <TableHead className="text-primary-foreground text-right">Mov. Crédito</TableHead>
                      <TableHead className="text-primary-foreground text-right">Nº lçtos</TableHead>
                      <TableHead className="text-primary-foreground"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contasCandidatas.map((c, i) => (
                      <TableRow
                        key={`${c.ctared}-${i}`}
                        className={cn(i % 2 === 1 && "bg-muted/20", "cursor-pointer hover:bg-accent/40")}
                        onClick={() => setContaEscolhida(c)}
                      >
                        <TableCell className="tabular-nums">{String(c.ctared)}</TableCell>
                        <TableCell className="whitespace-nowrap">{c.clacta ?? ""}</TableCell>
                        <TableCell className="max-w-[320px] truncate" title={c.descricao ?? ""}>
                          {c.descricao ?? ""}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {cellNum(c.mov_debito, { zeroBlank: true })}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {cellNum(c.mov_credito, { zeroBlank: true })}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.qtd_lancamentos ?? ""}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setContaEscolhida(c);
                            }}
                          >
                            Abrir razão
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
              <div ref={razaoScrollRef} className="overflow-x-auto rounded border">

                <Table className="min-w-[1600px] text-xs">
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
                      <TableHead className="text-primary-foreground">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline decoration-dotted underline-offset-2">Usuário Origem</span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Preenchido quando o ERP identifica o usuário do subsistema de origem (VEN, REC, EST, MAN, PAT). Vazio ("—") para lançamentos automáticos ou quando o ERP não devolve esse dado.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableHead>
                      <TableHead className="text-primary-foreground">Usuário Lcto.</TableHead>
                      {!isDRE && <TableHead className="text-primary-foreground text-right">Saldo Anterior</TableHead>}
                      <TableHead className="text-primary-foreground text-right">Mov. Débito</TableHead>
                      <TableHead className="text-primary-foreground text-right">Mov. Crédito</TableHead>
                      <TableHead className="text-primary-foreground text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Linha SALDO INICIAL (só faz sentido em Balanço) */}
                    {!isDRE && (
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
                    )}

                    {itens.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={isDRE ? 13 : 14}
                          className="text-center italic text-muted-foreground py-6"
                        >
                          Sem lançamentos no período.
                        </TableCell>
                      </TableRow>
                    )}

                    {itens.map((r, i) => {
                      const usuarioOrigemDisplay = usuarioOrigemValue(r, "—");
                      const usuarioLancamentoDisplay = usuarioLancamentoValue(r, "—");
                      const temUsuarioOrigem = hasDisplayValue(r.usuario_origem);
                      const temUsuarioLancamento = hasDisplayValue(r.usuario_lancamento) || hasDisplayValue(r.usuario);
                      const fonteOrigem = (r.usuario_origem_fonte ?? null) as null | string;
                      const docOrigem = (r as any).documento_origem as DocumentoOrigem | null | undefined;
                      const docLabel = labelDocumentoOrigem(docOrigem);
                      const temDocOrigem = Boolean(docOrigem && (docOrigem.numero != null || docOrigem.parceiro_nome));
                      const divergeUsuario = r.usuario_origem_difere === true && temUsuarioOrigem && temUsuarioLancamento;
                      const divergeDocumento = divergeUsuario && fonteOrigem === "documento";
                      // Divergência via "lote" existe (raríssimo); destaca de forma discreta.
                      const divergeLote = divergeUsuario && fonteOrigem === "lote";
                      // Compat: quando o backend antigo não manda `fonte`, mantém realce âmbar como antes.
                      const divergeGenerico = divergeUsuario && !fonteOrigem;
                      const destacarAmbar = divergeDocumento || divergeGenerico;
                      const tooltipUsuario = divergeDocumento
                        ? `Documento emitido por ${usuarioOrigemDisplay} · Lançamento por ${usuarioLancamentoDisplay}`
                        : divergeLote
                          ? `Lote aberto por ${usuarioOrigemDisplay} · Lançado por ${usuarioLancamentoDisplay}`
                          : divergeGenerico
                            ? `Lote aberto por ${usuarioOrigemDisplay}, lançado por ${usuarioLancamentoDisplay}`
                            : "";
                      const docTooltipExtra = temDocOrigem
                        ? `${docLabel}${docOrigem?.ambiguo ? "  (número casou com múltiplos documentos — usuário caiu no dono do lote)" : ""}`
                        : "";
                      return (
                      <TableRow
                        key={i}
                        className={cn(
                          i % 2 === 1 && "bg-muted/20",
                          "cursor-pointer hover:bg-accent/40",
                          destacarAmbar && "!bg-amber-100/60 hover:!bg-amber-100 border-l-4 border-l-amber-500",
                          divergeLote && "border-l-4 border-l-sky-400",
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
                        <TableCell className="whitespace-nowrap">{labelOrigem(r.origem_codigo, r.origem_descricao)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-wrap items-center gap-1">
                            {(destacarAmbar || divergeLote || temDocOrigem) ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className={cn(
                                        "underline decoration-dotted underline-offset-2",
                                        destacarAmbar
                                          ? "decoration-amber-600"
                                          : divergeLote
                                            ? "decoration-sky-500"
                                            : "decoration-muted-foreground",
                                      )}
                                    >
                                      {usuarioOrigemDisplay}
                                      {docOrigem?.ambiguo ? " (?)" : ""}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs space-y-1">
                                    {tooltipUsuario && <div>{tooltipUsuario}</div>}
                                    {docTooltipExtra && (
                                      <div className="text-[11px]">
                                        {docLabel}
                                        {docOrigem?.parceiro_nome && usuarioOrigemDisplay !== "—" && (
                                          <div className="text-muted-foreground">
                                            Emitida por {usuarioOrigemDisplay}
                                          </div>
                                        )}
                                        {docOrigem?.ambiguo && (
                                          <div className="text-amber-700">
                                            Número casou com múltiplos documentos — usuário caiu no dono do lote.
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {fonteOrigem && (
                                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                        Fonte: {fonteOrigem === "documento" ? "Documento (USUGER)" : "Lote (E640LOT)"}
                                      </div>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span>{usuarioOrigemDisplay}</span>
                            )}
                            {temUsuarioOrigem && fonteOrigem === "documento" && (
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide font-medium",
                                  destacarAmbar
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                Documento
                              </span>
                            )}
                            {temUsuarioOrigem && fonteOrigem === "lote" && (
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide font-medium",
                                  divergeLote
                                    ? "bg-sky-100 text-sky-800"
                                    : "bg-muted text-muted-foreground",
                                )}
                              >
                                Lote
                              </span>
                            )}
                            {divergeDocumento && (
                              <span className="rounded border border-amber-500 bg-amber-50 px-1.5 py-0.5 text-[9px] uppercase tracking-wide font-medium text-amber-800">
                                Diferente do lançamento
                              </span>
                            )}
                            {docOrigem?.ambiguo === true && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="rounded border border-amber-400 bg-amber-50 px-1.5 py-0.5 text-[9px] uppercase tracking-wide font-medium text-amber-800 cursor-help">
                                      Vários documentos
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    Este lançamento está ligado a mais de um documento ou título. O backend não escolheu arbitrariamente um usuário de origem.
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {(destacarAmbar || divergeLote) ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1 underline decoration-dotted",
                                      destacarAmbar ? "decoration-amber-600" : "decoration-sky-500",
                                    )}
                                  >
                                    {usuarioLancamentoDisplay}
                                    {destacarAmbar && (
                                      <AlertTriangle
                                        className="h-3.5 w-3.5 text-amber-600"
                                        aria-label="Usuário do documento difere do lançamento"
                                      />
                                    )}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{tooltipUsuario}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            usuarioLancamentoDisplay
                          )}
                        </TableCell>


                        {!isDRE && (
                          <TableCell className="text-right tabular-nums">
                            {r.saldo_anterior != null ? fmtBRL(Number(r.saldo_anterior)) : ""}
                          </TableCell>
                        )}
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
                      );
                    })}

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
                      {!isDRE && <TableCell></TableCell>}
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

        {/* Barra de rolagem horizontal flutuante — sempre visível acima do rodapé */}
        {temContratoRazao && (
          <div className="shrink-0 z-20">
            <FloatingHScrollbar targetRef={razaoScrollRef} />
          </div>
        )}



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
            {truncado && qtdTotal != null && (
              <div className="flex items-center gap-2 rounded bg-amber-500/20 border border-amber-300/40 px-2 py-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-200" />
                <span>
                  Exibindo <strong className="tabular-nums">{qtdExib}</strong> de{" "}
                  <strong className="tabular-nums">{qtdTotal}</strong> lançamentos.
                </span>
                {proximoLimite && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => setLimite(proximoLimite)}
                  >
                    Aumentar para {proximoLimite}
                  </Button>
                )}
              </div>
            )}
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
            {detalhe && (() => {
              const doc = (detalhe as any).documento_origem as DocumentoOrigem | null | undefined;
              const fonte = detalhe.usuario_origem_fonte as string | null | undefined;
              const fonteLabel =
                fonte === "documento"
                  ? "Documento"
                  : fonte === "lote"
                    ? "Lote"
                    : "—";
              const numValido = numeroDocumentoValido(doc?.numero);
              const docNumero = numValido ? String(doc!.numero) : "";
              const documentoTxt =
                hasDisplayValue(detalhe.documento)
                  ? String(detalhe.documento)
                  : doc && (numValido || doc.serie)
                    ? [doc.serie ?? doc.tipo, docNumero].filter(Boolean).join(" ")
                    : "";
              const usuarioOrigemTxt = usuarioOrigemValue(detalhe, "—");
              const usuarioLctoTxt = usuarioLancamentoValue(detalhe, "—");
              const usuarioOrigemCod = detalhe.usuario_origem_codigo;
              const usuarioLctoCod = detalhe.usuario_lancamento_codigo;
              const transacao = transacaoOrigemLabel(detalhe);
              // Documento/movimento é exibido quando há número válido OU quaisquer campos de movimento.
              const temMovimento = Boolean(
                doc &&
                  (numValido ||
                    doc.parceiro_nome ||
                    doc.produto ||
                    doc.derivacao ||
                    doc.deposito ||
                    doc.bem ||
                    doc.data_movimento ||
                    doc.sequencia_movimento != null),
              );
              return (
              <div className="space-y-3">
                {detalhe.usuario_origem_difere === true && hasDisplayValue(detalhe.usuario_origem) && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium">Divergência de usuário</div>
                      <div>
                        {fonte === "documento" ? (
                          <>
                            Documento emitido por <strong>{usuarioOrigemTxt}</strong>,
                            lançado por <strong>{usuarioLctoTxt}</strong>.
                          </>
                        ) : (
                          <>
                            Lote aberto por <strong>{usuarioOrigemTxt}</strong>,
                            lançado por <strong>{usuarioLctoTxt}</strong>.
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {/* Rastreabilidade da origem */}
                <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="font-medium">Rastreabilidade da origem</div>
                    {doc?.ambiguo === true && (
                      <span className="rounded bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-medium">
                        Vários documentos
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <Info
                      label="Origem"
                      value={
                        detalhe.origem_codigo
                          ? `${toDisplay(detalhe.origem_codigo)} — ${labelOrigem(detalhe.origem_codigo as string, detalhe.origem_descricao)}`
                          : ""
                      }
                    />
                    {transacao && <Info label="Transação" value={transacao} />}
                    <Info
                      label="Usuário Origem"
                      value={
                        hasDisplayValue(detalhe.usuario_origem)
                          ? `${usuarioOrigemTxt}${usuarioOrigemCod != null && String(usuarioOrigemCod).trim() !== "" ? ` (${usuarioOrigemCod})` : ""}`
                          : "—"
                      }
                    />
                    <Info label="Fonte do usuário" value={fonteLabel} />
                    <Info
                      label="Usuário Lcto."
                      value={
                        hasDisplayValue(detalhe.usuario_lancamento) || hasDisplayValue(detalhe.usuario)
                          ? `${usuarioLctoTxt}${usuarioLctoCod != null && String(usuarioLctoCod).trim() !== "" ? ` (${usuarioLctoCod})` : ""}`
                          : "—"
                      }
                    />
                    {hasDisplayValue(detalhe.usuario_origem_status) && (
                      <Info label="Status da resolução" value={detalhe.usuario_origem_status} />
                    )}
                    {hasDisplayValue(detalhe.usuario_origem_fonte_tabela) && (
                      <div className="col-span-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {detalhe.usuario_origem_fonte_tabela}
                      </div>
                    )}
                  </div>
                  {temMovimento && (
                    <div className="mt-2 border-t pt-2">
                      <div className="text-muted-foreground mb-1">Documento/Movimento</div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        {documentoTxt && <Info label="Documento" value={documentoTxt} />}
                        {(doc?.descricao || doc?.tipo) && <Info label="Tipo" value={doc?.descricao ?? doc?.tipo ?? ""} />}
                        {numValido && <Info label="Número" value={docNumero} />}
                        {doc?.serie && <Info label="Série" value={doc.serie} />}
                        {doc?.parceiro_nome && (
                          <Info
                            label={doc.parceiro_tipo === "fornecedor" ? "Fornecedor" : doc.parceiro_tipo === "cliente" ? "Cliente" : "Parceiro"}
                            value={`${doc.parceiro_codigo ?? ""} ${doc.parceiro_nome}`.trim()}
                          />
                        )}
                        {doc?.produto && <Info label="Produto" value={doc.produto} />}
                        {doc?.derivacao && <Info label="Derivação" value={doc.derivacao} />}
                        {doc?.deposito && <Info label="Depósito" value={doc.deposito} />}
                        {doc?.bem && <Info label="Bem" value={doc.bem} />}
                        {doc?.data_movimento && <Info label="Data do movimento" value={fmtDataBR(doc.data_movimento)} />}
                        {doc?.sequencia_movimento != null && String(doc.sequencia_movimento).trim() !== "" && (
                          <Info label="Sequência" value={doc.sequencia_movimento} />
                        )}
                        {doc?.fonte_tabela && (
                          <div className="col-span-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {doc.fonte_tabela}
                          </div>
                        )}
                      </div>
                      {doc?.ambiguo && (
                        <div className="mt-2 text-[11px] text-amber-800">
                          Este lançamento está ligado a mais de um documento — o backend não escolheu arbitrariamente um usuário de origem.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                <Info label="Empresa" value={detalhe.codemp} />
                <Info label="Filial" value={detalhe.codfil} />
                <Info label="Lote" value={detalhe.lote} />
                <Info label="Número" value={detalhe.numero ?? detalhe.lancamento} />
                <Info label="Data" value={fmtDataBR(detalhe.data)} />
                <Info label="Lado (D/C)" value={detalhe.lado ?? detalhe.debcre} />
                <Info
                  label="Conta Débito"
                  value={toDisplay(detalhe.conta_debito)}
                  strong={String(detalhe.lado ?? detalhe.debcre ?? '').toUpperCase() === 'D'}
                />
                <Info
                  label="Conta Crédito"
                  value={toDisplay(detalhe.conta_credito)}
                  strong={String(detalhe.lado ?? detalhe.debcre ?? '').toUpperCase() === 'C'}
                />
                <Info
                  label="Conta selecionada"
                  value={`${toDisplay(detalhe.ctared)} ${toDisplay(detalhe.conta_descricao)}`.trim()}
                />
                <Info
                  label="Centro de custo"
                  value={detalhe.codccu ? `${toDisplay(detalhe.codccu)} ${toDisplay(detalhe.desccu)}`.trim() : ""}
                />
                {Array.isArray(detalhe.multiplos) && detalhe.multiplos.length > 1 && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Centros de custo da contrapartida</div>
                    <ul className="mt-0.5 space-y-0.5">
                      {detalhe.multiplos.map((m: any, idx: number) => (
                        <li key={idx} className="tabular-nums">
                          {toDisplay(m?.codccu)}{m?.desccu ? ` — ${toDisplay(m.desccu)}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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

              </div>
              );
            })()}
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
