import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MoneyCell } from "@/components/contabil/MoneyCell";
import { useResultadoExercicioDiagnostico } from "@/hooks/contabil/api";
import { AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modeloId: string;
  codemp?: number;
  codfil?: number;
  anomesIni: number;
  anomesFim: number;
  /** Linhas já carregadas do endpoint /resultado-cache. */
  linhasResultadoCache?: any[];
  /** Períodos retornados pela API (response.periodos). */
  periodos?: string[];
  /** anomes inicialmente selecionado (ex.: coluna clicada). */
  anomesInicial?: number | string | null;
}

const HIERARQUIA_FALLBACK = [
  { codigo: "2", descricao: "PASSIVO" },
  { codigo: "23", descricao: "PATRIMÔNIO LÍQUIDO" },
  { codigo: "235", descricao: "LUCROS OU (-) PREJUÍZOS ACUMULADOS" },
  { codigo: "23502", descricao: "RESULTADO DO EXERCICIO EM CURSO" },
  { codigo: "235020001", descricao: "Resultado do Exercício em Curso" },
];

const CONTA_OFICIAL_FALLBACK = {
  ctared: 1481 as number | string,
  clacta: "235020001",
  descta: "Resultado do Exercício em Curso",
};

function anoDoAnomes(anomes: number): number {
  return Math.trunc(anomes / 100);
}

function formatAnomesLabel(anomes: string | number): string {
  const s = String(anomes);
  if (s.length !== 6) return s;
  const ano = s.slice(0, 4);
  const mes = s.slice(4, 6);
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const i = Number(mes) - 1;
  return `${meses[i] ?? mes}/${ano}`;
}

function getLinhaPorCodigo(linhas: any[] | undefined, codigo: string) {
  if (!linhas) return undefined;
  return linhas.find((l) => String(l.codigo).toUpperCase() === codigo.toUpperCase());
}

function getValorPeriodo(linha: any, anomes: string | number | null | undefined): number | null {
  if (!linha || anomes === null || anomes === undefined) return null;
  const sKey = String(anomes);
  const nKey = Number(anomes);
  // Formato normalizado pelo hook (linha.realizado[anomes]).
  const fromRealizado =
    linha.realizado?.[sKey] ??
    linha.realizado?.[nKey];
  if (fromRealizado !== undefined && fromRealizado !== null) {
    const n = Number(fromRealizado);
    return Number.isFinite(n) ? n : null;
  }
  // Fallback ao formato cru da API.
  const item = linha.valores?.[sKey] ?? linha.valores?.[nKey];
  if (!item) return null;
  const v = item.realizado;
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function ResultadoExercicioDialog({
  open,
  onOpenChange,
  modeloId,
  codemp,
  codfil,
  anomesIni,
  anomesFim,
  linhasResultadoCache,
  periodos,
  anomesInicial,
}: Props) {
  const q = useResultadoExercicioDiagnostico(modeloId, {
    enabled: open,
    codemp,
    codfil,
    anomes_ini: anomesIni,
    anomes_fim: anomesFim,
  });

  const periodosDisponiveis = useMemo(
    () => (periodos ?? []).map(String).filter((p) => p !== "TOTAL_ANO"),
    [periodos],
  );

  const [anomesSelecionado, setAnomesSelecionado] = useState<string>(() => {
    if (anomesInicial) return String(anomesInicial);
    if (periodosDisponiveis.length) return periodosDisponiveis[periodosDisponiveis.length - 1];
    return String(anomesFim || anomesIni || "");
  });

  useEffect(() => {
    if (!open) return;
    if (anomesInicial) {
      setAnomesSelecionado(String(anomesInicial));
    } else if (periodosDisponiveis.length) {
      setAnomesSelecionado((prev) =>
        periodosDisponiveis.includes(prev)
          ? prev
          : periodosDisponiveis[periodosDisponiveis.length - 1],
      );
    }
  }, [open, anomesInicial, periodosDisponiveis]);

  const linhaAtivo = getLinhaPorCodigo(linhasResultadoCache, "1");
  const linhaPassivo = getLinhaPorCodigo(linhasResultadoCache, "2");
  const linhaResultado = getLinhaPorCodigo(linhasResultadoCache, "VINCULAR");
  const linhaFechamento = getLinhaPorCodigo(linhasResultadoCache, "999");

  const ativo = getValorPeriodo(linhaAtivo, anomesSelecionado);
  const passivo = getValorPeriodo(linhaPassivo, anomesSelecionado);
  const resultado = getValorPeriodo(linhaResultado, anomesSelecionado);
  const diferenca = ativo !== null && passivo !== null ? ativo + passivo : null;
  const totalGeralApi = getValorPeriodo(linhaFechamento, anomesSelecionado);
  const fechamento =
    ativo !== null && passivo !== null && resultado !== null
      ? ativo + passivo + resultado
      : totalGeralApi;

  const data = q.data;
  const conta = data?.conta_oficial ?? CONTA_OFICIAL_FALLBACK;
  const hierarquia =
    data?.hierarquia && data.hierarquia.length > 0
      ? data.hierarquia
      : HIERARQUIA_FALLBACK;
  const ano = anoDoAnomes(Number(anomesSelecionado) || anomesFim || anomesIni);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Composição do Resultado do Exercício</DialogTitle>
          <DialogDescription>
            Diagnóstico da linha apresentada no Balanço.
          </DialogDescription>
        </DialogHeader>

        {q.isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {q.isError && !q.isLoading && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">
                Não foi possível carregar os metadados.
              </div>
              <div className="text-xs mt-1">
                {(q.error as Error)?.message ??
                  "Tente novamente em alguns instantes."}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => q.refetch()}
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {!q.isLoading && (
          <div className="space-y-4 text-sm">
            {/* Conta oficial */}
            <section>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Conta oficial Senior
              </div>
              <div className="rounded-md border bg-slate-50 px-3 py-2 font-mono text-sm">
                {String(conta.ctared ?? "—")} - {conta.clacta ?? "—"} -{" "}
                {conta.descta ?? "—"}
              </div>
            </section>

            {/* Hierarquia */}
            <section>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Hierarquia
              </div>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-600">
                    <tr>
                      <th className="text-left px-3 py-1.5 w-40">Código</th>
                      <th className="text-left px-3 py-1.5">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hierarquia.map((h, idx) => (
                      <tr key={`${h.codigo}-${idx}`} className="border-t">
                        <td className="px-3 py-1.5 font-mono text-xs">
                          {h.codigo}
                        </td>
                        <td
                          className="px-3 py-1.5"
                          style={{ paddingLeft: 12 + idx * 14 }}
                        >
                          {h.descricao}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Fórmula */}
            <section>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                Fórmula
              </div>
              <div className="rounded-md border border-slate-300 bg-slate-900 text-slate-50 px-3 py-2 font-mono text-sm">
                Resultado do Exercício = -(ATIVO + PASSIVO)
              </div>
            </section>

            {/* Demonstrativo numérico */}
            <section>
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  Demonstrativo numérico
                </div>
                {periodosDisponiveis.length > 0 && (
                  <label className="text-xs text-slate-600 flex items-center gap-2">
                    Período:
                    <select
                      className="border rounded px-2 py-1 text-xs bg-white"
                      value={anomesSelecionado}
                      onChange={(e) => setAnomesSelecionado(e.target.value)}
                    >
                      {periodosDisponiveis.map((p) => (
                        <option key={p} value={p}>
                          {formatAnomesLabel(p)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              {!periodosDisponiveis.includes(anomesSelecionado) ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                  Sem cache calculado para este período.
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b">
                        <td className="px-3 py-1.5">ATIVO</td>
                        <td className="px-3 py-1.5 text-right">
                          <MoneyCell value={ativo} emptyAs="dash" />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-1.5">PASSIVO + PL</td>
                        <td className="px-3 py-1.5 text-right">
                          <MoneyCell value={passivo} emptyAs="dash" />
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-3 py-1.5">Diferença</td>
                        <td className="px-3 py-1.5 text-right">
                          <MoneyCell value={diferenca} emptyAs="dash" />
                        </td>
                      </tr>
                      <tr className="border-b bg-amber-50">
                        <td className="px-3 py-1.5 font-medium">
                          Resultado exibido
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium">
                          <MoneyCell value={resultado} emptyAs="dash" />
                        </td>
                      </tr>
                      <tr className="bg-emerald-50">
                        <td className="px-3 py-1.5 font-medium">Fechamento</td>
                        <td className="px-3 py-1.5 text-right font-medium">
                          <MoneyCell value={fechamento} emptyAs="dash" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

            </section>

            {/* Texto explicativo */}
            <section className="space-y-2 text-sm text-slate-700">
              <p>
                A conta{" "}
                <span className="font-mono">
                  {conta.clacta ?? "235020001"} -{" "}
                  {conta.descta ?? "Resultado do Exercício em Curso"}
                </span>{" "}
                existe na Senior, porém está zerada no saldo mensal da E650SAL
                para o período. Por isso, o valor exibido nesta linha é
                calculado por diferença para fechamento do Balanço.
              </p>
              <p className="text-slate-500 text-xs">
                Observação: movimentos em{" "}
                <span className="font-mono">01/01/{ano}</span> na conta{" "}
                <span className="font-mono">
                  {String(conta.ctared ?? "1481")}
                </span>{" "}
                costumam representar a transferência do resultado do ano
                anterior para Lucros ou Prejuízos Acumulados, não o resultado
                do exercício atual.
              </p>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
