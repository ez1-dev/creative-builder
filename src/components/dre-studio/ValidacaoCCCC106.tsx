import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import type { ComparativoLinhaV2, ModoBalanco } from "@/types/contabil";
import { fmtBRL } from "@/components/contabil/MoneyCell";

interface Props {
  linhas: ComparativoLinhaV2[];
  anomesFim: number;
  metodoCalculoLinhas?: Record<string, string>;
  modoBalanco?: ModoBalanco;
}


const LS_OCULTAR_REF = "contabil.ocultarRefSenior";

const ESPERADOS_DEFAULT: Record<string, { descricao: string; valor: number }> = {
  "1":        { descricao: "ATIVO",                                  valor:  130351994.65 },
  "2":        { descricao: "PASSIVO",                                valor: -121927293.83 },
  "98":       { descricao: "TOTAL DO ATIVO",                         valor:  130351994.65 },
  "99":       { descricao: "TOTAL DO PASSIVO + PATRIMÔNIO LÍQUIDO",  valor: -121927293.83 },
  "VINCULAR": { descricao: "Resultado em Curso",                     valor:   -8424700.82 },
  "999":      { descricao: "TOTAL GERAL",                            valor:          0.00 },
};

const LINHAS_PRINCIPAIS_METODO = ["1", "11", "112", "11250", "2", "21", "211", "21104"];

function getValorLinha(linha: ComparativoLinhaV2 | undefined, anomesFim: number): number | null {
  if (!linha) return null;
  const key = String(anomesFim);
  const v = linha.realizado?.[key];
  return v == null ? null : Number(v);
}

function findLinha(linhas: ComparativoLinhaV2[], codigo: string): ComparativoLinhaV2 | undefined {
  const up = codigo.toUpperCase();
  return linhas.find(
    (l) =>
      String(l.codigo ?? "").trim().toUpperCase() === up ||
      (up === "VINCULAR" && String(l.natureza ?? "").toUpperCase() === "VINCULAR") ||
      (up === "999" && String(l.descricao ?? "").trim().toUpperCase() === "TOTAL GERAL"),
  );
}

export function ValidacaoCCCC106({ linhas, anomesFim, metodoCalculoLinhas, modoBalanco }: Props) {
  if (modoBalanco === "MENSAL_E650SAL") return null;

  const [esperados, setEsperados] = useState(ESPERADOS_DEFAULT);
  const [aberto, setAberto] = useState(true);
  const [ocultarRef, setOcultarRef] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(LS_OCULTAR_REF) === "1";
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_OCULTAR_REF, ocultarRef ? "1" : "0");
    }
  }, [ocultarRef]);


  const rows = useMemo(() => {
    return Object.entries(esperados).map(([codigo, { descricao, valor }]) => {
      const linha = findLinha(linhas, codigo);
      const valorApi = getValorLinha(linha, anomesFim);
      const diff = valorApi == null ? null : valorApi - valor;
      const status = diff == null ? "SEM DADO" : Math.abs(diff) <= 0.05 ? "OK" : "DIVERGENTE";
      return { codigo, descricao, valorEsperado: valor, valorApi, diff, status };
    });
  }, [esperados, linhas, anomesFim]);

  const valor999 = rows.find((r) => r.codigo === "999")?.valorApi;
  const fechado999 = valor999 != null && Math.abs(valor999) <= 0.05;
  const todasOk = rows.every((r) => r.status === "OK");
  const statusGeral = fechado999 && todasOk ? "OK" : "DIVERGENTE";

  const metodosPrincipais = LINHAS_PRINCIPAIS_METODO.map((cod) => ({
    codigo: cod,
    metodo: metodoCalculoLinhas?.[cod] ?? "—",
  }));
  const alertaMetodo =
    metodoCalculoLinhas &&
    (metodoCalculoLinhas["1"] === "SOMA_FILHOS" || metodoCalculoLinhas["2"] === "SOMA_FILHOS");

  const statusLabel =
    statusGeral === "OK" ? "BATE COM REFERÊNCIA" : "DIVERGE DA REFERÊNCIA";

  return (
    <div className="mb-4 rounded-lg border bg-white">
      <button
        type="button"
        onClick={() => setAberto((s) => !s)}
        className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <div className="flex flex-col">
            <h3 className="font-semibold text-sm">
              Conferência contra Referência Senior informada
            </h3>
            <span className="text-[11px] text-slate-500">
              Fonte do sistema: E650SAL.SALMES (Balanço Mensal Fechado)
            </span>
          </div>
          <span
            className={
              "ml-2 inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold " +
              (statusGeral === "OK"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-800")
            }
          >
            {statusLabel}
          </span>
        </div>
        <span className="text-xs text-slate-500">
          Mês comparado: <strong>{anomesFim}</strong> · tolerância 0,05
        </span>
      </button>

      {aberto && (
        <div className="border-t p-4 space-y-4">
          <div className="flex items-start justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <div className="flex gap-2">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                A visão atual usa <strong>E650SAL.SALMES</strong>. A coluna
                {" "}<strong>Referência Senior informada</strong> pode vir de outro relatório/regra do Senior
                (ex.: relatório ajustado/reclassificado); diferenças podem existir e
                <strong> não indicam erro no saldo E650SAL.SALMES</strong>.
              </span>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] text-amber-900 shrink-0">
              <input
                type="checkbox"
                checked={ocultarRef}
                onChange={(e) => setOcultarRef(e.target.checked)}
              />
              Ocultar comparação com Referência Senior
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-2 py-1.5 text-left">Código</th>
                  <th className="px-2 py-1.5 text-left">Descrição</th>
                  {!ocultarRef && (
                    <th className="px-2 py-1.5 text-right">Referência Senior informada</th>
                  )}
                  <th className="px-2 py-1.5 text-right">Sistema (E650SAL.SALMES)</th>
                  {!ocultarRef && (
                    <th className="px-2 py-1.5 text-right">Diferença vs Referência Senior</th>
                  )}
                  <th className="px-2 py-1.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.codigo} className="border-t">
                    <td className="px-2 py-1.5 font-mono">{r.codigo}</td>
                    <td className="px-2 py-1.5">{r.descricao}</td>
                    {!ocultarRef && (
                      <td className="px-2 py-1.5 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={r.valorEsperado}
                          onChange={(e) =>
                            setEsperados((s) => ({
                              ...s,
                              [r.codigo]: { ...s[r.codigo], valor: Number(e.target.value) },
                            }))
                          }
                          className="h-7 w-36 text-right tabular-nums"
                        />
                      </td>
                    )}
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {r.valorApi == null ? "—" : fmtBRL(r.valorApi)}
                    </td>
                    {!ocultarRef && (
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {r.diff == null ? "—" : fmtBRL(r.diff)}
                      </td>
                    )}
                    <td className="px-2 py-1.5 text-center">
                      <span
                        className={
                          "inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold " +
                          (r.status === "OK"
                            ? "bg-emerald-100 text-emerald-700"
                            : r.status === "DIVERGENTE"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600")
                        }
                      >
                        {r.status === "OK"
                          ? "BATE"
                          : r.status === "DIVERGENTE"
                            ? "DIVERGE"
                            : r.status}
                      </span>
                    </td>
                  </tr>

                ))}
              </tbody>
            </table>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase text-slate-600">
                Método de cálculo (debug)
              </h4>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEsperados(ESPERADOS_DEFAULT)}
              >
                Restaurar esperados
              </Button>
            </div>
            {!metodoCalculoLinhas && (
              <p className="text-xs text-slate-500">
                A API não retornou <code>metodo_calculo_linhas</code> nesta resposta.
              </p>
            )}
            {metodoCalculoLinhas && (
              <>
                {alertaMetodo && (
                  <div className="mb-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Atenção: cálculo ainda não está usando saldo oficial direto da E650SAL para os grupos principais.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs md:grid-cols-4">
                  {metodosPrincipais.map((m) => (
                    <div key={m.codigo} className="flex items-center justify-between border-b py-1">
                      <span className="font-mono">{m.codigo}</span>
                      <span
                        className={
                          m.metodo === "SOMA_FILHOS"
                            ? "text-amber-700 font-medium"
                            : m.metodo === "SALDO_DIRETO_E650SAL"
                              ? "text-emerald-700 font-medium"
                              : "text-slate-600"
                        }
                      >
                        {m.metodo}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <p className="text-[11px] text-slate-500 italic">
            Para bater exatamente com o relatório Senior ajustado, será criado futuramente o modo
            {" "}<code>SENIOR_RELATORIO_AJUSTADO</code>, após identificarmos a fonte/regra exata.
          </p>
        </div>
      )}

    </div>
  );
}
