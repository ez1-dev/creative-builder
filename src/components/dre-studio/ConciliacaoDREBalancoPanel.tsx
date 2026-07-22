import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

import { useResultadoCache } from "@/hooks/contabil/api";
import { useContabilConfiguracao } from "@/hooks/contabil/useContabilConfiguracao";
import { formatAnomes } from "@/lib/anomes";
import { MoneyCell } from "@/components/contabil/MoneyCell";
import type { ComparativoLinhaV2, ComparativoResponseV2 } from "@/types/contabil";

function findResultadoLiquido(linhas: ComparativoLinhaV2[]): ComparativoLinhaV2 | undefined {
  // Preferência: linha TOTAL raiz retornada pela API. Fallback: última TOTAL.
  const totais = linhas.filter(
    (l) => String((l as any).tipo_linha ?? (l as any).tipo_registro ?? "").toUpperCase() === "TOTAL",
  );
  const raiz = totais.find((l) => !(l as any).linha_pai_id);
  return raiz ?? totais[totais.length - 1];
}

function findVincular(linhas: ComparativoLinhaV2[]): ComparativoLinhaV2 | undefined {
  return linhas.find(
    (l) =>
      String(l.codigo ?? "").toUpperCase() === "VINCULAR" ||
      String(l.natureza ?? "").toUpperCase() === "VINCULAR",
  );
}

export function ConciliacaoDREBalancoPanel({
  dreModeloId,
  dreResultado,
  dreLoading,
  codfil,
  anomesIni,
  anomesFim,
}: {
  dreModeloId: string;
  dreResultado?: ComparativoResponseV2;
  dreLoading?: boolean;
  codfil: number;
  anomesIni: number;
  anomesFim: number;
}) {
  void dreModeloId;
  const { data: cfg } = useContabilConfiguracao();
  const balancoModeloId = cfg?.balanco_modelo_padrao_id ?? "";
  const balQ = useResultadoCache(
    balancoModeloId,
    {
      codfil,
      anomes_ini: anomesIni,
      anomes_fim: anomesFim,
      modo_balanco: "MENSAL_E650SAL",
      aplicar_referencia_senior: true,
    },
    Boolean(balancoModeloId),
  );

  const linhas = useMemo(() => {
    const periodos = dreResultado?.periodos ?? [];
    const dreRL = dreResultado ? findResultadoLiquido(dreResultado.linhas) : undefined;
    const balVinc = balQ.data ? findVincular(balQ.data.linhas) : undefined;
    const origemBalanco = balVinc?.origem_valor ?? null;

    let acumDre = 0;
    return periodos.map((p) => {
      const dreMes = dreRL?.realizado?.[p] ?? null;
      if (dreMes != null) acumDre += dreMes;
      const balRaw = balVinc?.realizado?.[p] ?? null;
      const balAcum = balRaw == null ? null : -1 * balRaw;
      const diferenca =
        balAcum == null || dreMes == null ? null : acumDre - balAcum;
      return {
        anomes: p,
        dreMes,
        dreAcum: dreMes == null && balAcum == null ? null : acumDre,
        balAcum,
        diferenca,
        origemBalanco,
      };
    });
  }, [dreResultado, balQ.data]);

  const carregando = !!dreLoading || balQ.isLoading;
  const semDados =
    !carregando && (linhas.length === 0 || (!dreResultado && !balQ.data));
  if (!balancoModeloId) {
    return (
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Nenhum modelo padrão de Balanço Patrimonial foi definido para esta empresa — conciliação
          indisponível. Configure em <strong>Contabilidade → Configurações</strong>.
        </span>
      </div>
    );
  }


  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem("dre-vis:conciliacao-open") === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("dre-vis:conciliacao-open", open ? "1" : "0"); } catch {}
  }, [open]);

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between border-b border-slate-200 px-4 py-2 text-left hover:bg-slate-50 rounded-t-lg"
      >
        <div>
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Conciliação DRE × Balanço Senior
          </h3>
          {open && (
            <p className="text-xs text-slate-500 ml-5">
              Resultado DRE (linha total do modelo) acumulado vs Balanço (linha VINCULAR, sinal invertido).
            </p>
          )}
        </div>
        {carregando && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
      </button>

      {open && (
        <>
          {balQ.isError && (
            <div className="flex items-start gap-2 px-4 py-3 text-sm text-amber-800 bg-amber-50">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <span>
                Não foi possível carregar o Balanço oficial para conciliação:{" "}
                {(balQ.error as Error)?.message ?? "erro desconhecido"}.
              </span>
            </div>
          )}

          {semDados ? (
            <div className="px-4 py-6 text-sm text-slate-500 text-center">
              Sem dados para conciliar neste período.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Período</th>
                    <th className="px-3 py-2 text-right font-medium">Resultado DRE mensal</th>
                    <th className="px-3 py-2 text-right font-medium">Resultado DRE acumulado</th>
                    <th className="px-3 py-2 text-right font-medium">Resultado Balanço acumulado</th>
                    <th className="px-3 py-2 text-right font-medium">Diferença</th>
                    <th className="px-3 py-2 text-left font-medium">Origem Balanço</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => {
                    const ok = l.diferenca != null && Math.abs(l.diferenca) < 0.01;
                    return (
                      <tr key={l.anomes} className="border-t border-slate-100">
                        <td className="px-3 py-1.5 text-slate-700">
                          {formatAnomes(l.anomes)}
                        </td>
                        <td className="px-3 py-1.5">
                          <MoneyCell value={l.dreMes} />
                        </td>
                        <td className="px-3 py-1.5">
                          <MoneyCell value={l.dreAcum} />
                        </td>
                        <td className="px-3 py-1.5">
                          <MoneyCell value={l.balAcum} />
                        </td>
                        <td
                          className={
                            "px-3 py-1.5 " + (l.diferenca == null ? "" : ok ? "" : "bg-red-50")
                          }
                        >
                          <MoneyCell
                            value={l.diferenca}
                            className={ok ? "text-emerald-700" : "text-red-700"}
                          />
                        </td>
                        <td className="px-3 py-1.5 text-xs text-slate-500">
                          {l.origemBalanco ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
