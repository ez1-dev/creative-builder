import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fmtBRL } from "@/components/contabil/MoneyCell";
import type { ConciliacaoLinha } from "@/hooks/contabil/useCCCC106";

const CODIGOS_SINTETICOS = new Set(["98", "99", "999", "VINCULAR"]);
const COLUNAS_VALIDAS = new Set([
  "saldo_final",
  "saldo_atual",
  "saldo_final_periodo",
  "saldofinal",
  "saldoatual",
]);

export function isColunaValidavel(coluna?: string | null) {
  if (!coluna) return null; // desconhecido
  const n = String(coluna).trim().toLowerCase().replace(/\s+/g, "_");
  return COLUNAS_VALIDAS.has(n);
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    OK: "bg-emerald-100 text-emerald-700",
    DIVERGENTE: "bg-rose-100 text-rose-700",
    SEM_CCCC106: "bg-slate-100 text-slate-600",
    SEM_API: "bg-amber-100 text-amber-800",
    NAO_VALIDAVEL: "bg-slate-200 text-slate-700",
  };
  const label = s === "NAO_VALIDAVEL" ? "Não validável" : s;
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${map[s] ?? "bg-slate-100 text-slate-600"}`}>
      {label}
    </span>
  );
}

export function ConciliacaoCCCC106Table({
  linhas,
  colunaOrigem,
}: {
  linhas: ConciliacaoLinha[];
  colunaOrigem?: string | null;
}) {
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [naturezaFiltro, setNaturezaFiltro] = useState<string>("todas");

  // Se backend não informa coluna_origem, assume válido (compat com versão atual)
  const validavel = colunaOrigem == null ? true : isColunaValidavel(colunaOrigem) === true;

  const linhasNormalizadas = useMemo<ConciliacaoLinha[]>(() => {
    return linhas.map((l) => {
      const cod = String(l.codigo ?? "").toUpperCase();
      const sintetica = CODIGOS_SINTETICOS.has(cod);
      const semConta = l.ctared == null || l.ctared === 0;
      const matchCodigo = sintetica || semConta ? "CODIGO" : l.chave_match;
      if (!validavel) {
        return {
          ...l,
          chave_match: matchCodigo,
          diferenca: null,
          status: "NAO_VALIDAVEL",
        };
      }
      return { ...l, chave_match: matchCodigo };
    });
  }, [linhas, validavel]);

  const naturezas = useMemo(() => {
    const s = new Set<string>();
    linhasNormalizadas.forEach((l) => l.natureza && s.add(l.natureza));
    return Array.from(s).sort();
  }, [linhasNormalizadas]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return linhasNormalizadas.filter((l) => {
      if (statusFiltro !== "todos" && l.status !== statusFiltro) return false;
      if (naturezaFiltro !== "todas" && l.natureza !== naturezaFiltro) return false;
      if (q) {
        const hay = `${l.codigo} ${l.descricao} ${l.ctared ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [linhasNormalizadas, busca, statusFiltro, naturezaFiltro]);

  const totais = useMemo(() => {
    let c = 0, a = 0, d = 0;
    filtradas.forEach((l) => {
      c += Number(l.valor_cccc106 ?? 0);
      a += Number(l.valor_api ?? 0);
      d += Number(l.diferenca ?? 0);
    });
    return { cccc106: c, api: a, diff: d };
  }, [filtradas]);

  const possuiSintetica = linhasNormalizadas.some((l) =>
    CODIGOS_SINTETICOS.has(String(l.codigo).toUpperCase()),
  );
  const sinteticasSemCCCC = linhasNormalizadas.some(
    (l) =>
      CODIGOS_SINTETICOS.has(String(l.codigo).toUpperCase()) &&
      l.status === "SEM_CCCC106",
  );

  const headerDif = validavel ? "Diferença CCCC106 × Sistema" : "Não validável";

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <Input
          placeholder="Buscar código, descrição ou conta..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-8 w-64"
        />
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="OK">OK</SelectItem>
            <SelectItem value="DIVERGENTE">Divergente</SelectItem>
            <SelectItem value="SEM_CCCC106">Sem CCCC106</SelectItem>
            <SelectItem value="SEM_API">Sem API</SelectItem>
            <SelectItem value="NAO_VALIDAVEL">Não validável</SelectItem>
          </SelectContent>
        </Select>
        <Select value={naturezaFiltro} onValueChange={setNaturezaFiltro}>
          <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas naturezas</SelectItem>
            {naturezas.map((n) => (
              <SelectItem key={n} value={n}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-slate-500">
          {filtradas.length} de {linhasNormalizadas.length} linhas
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-2 py-1.5 text-left">Código</th>
              <th className="px-2 py-1.5 text-left">Descrição</th>
              <th className="px-2 py-1.5 text-left">Conta</th>
              <th className="px-2 py-1.5 text-left">Tipo</th>
              <th className="px-2 py-1.5 text-left">Natureza</th>
              <th className="px-2 py-1.5 text-right">Referência CCCC106 (Saldo Final)</th>
              <th className="px-2 py-1.5 text-right">Sistema (CCCC106 / E640LCT acumulado)</th>
              <th className="px-2 py-1.5 text-right">{headerDif}</th>
              <th className="px-2 py-1.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((l, i) => {
              const cod = String(l.codigo).toUpperCase();
              const sintetica = CODIGOS_SINTETICOS.has(cod);
              const matchCodigo = l.chave_match === "CODIGO";
              const mostraConta = !sintetica && l.ctared != null && l.ctared !== 0;
              return (
                <tr key={`${l.codigo}-${i}`} className="border-t hover:bg-slate-50">
                  <td className="px-2 py-1.5 font-mono">
                    {l.codigo}
                    {matchCodigo && (
                      <Badge variant="outline" className="ml-1 text-[10px]">por código</Badge>
                    )}
                  </td>
                  <td className="px-2 py-1.5">{l.descricao}</td>
                  <td className="px-2 py-1.5 tabular-nums">{mostraConta ? l.ctared : "—"}</td>
                  <td className="px-2 py-1.5">{l.tipo ?? "—"}</td>
                  <td className="px-2 py-1.5">{l.natureza ?? "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {l.valor_cccc106 == null ? "—" : fmtBRL(l.valor_cccc106)}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    <div className="flex items-center justify-end gap-1">
                      <span>{l.valor_api == null ? "—" : fmtBRL(l.valor_api)}</span>
                      {l.fonte_sistema === "MENSAL_E650SAL" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-sky-300 text-sky-700"
                          title="Fonte: E650SAL.SALMES (Balanço Mensal Fechado). Linha técnica não vem do cache acumulado CCCC106."
                        >
                          MENSAL E650SAL
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {!validavel || l.diferenca == null ? "—" : fmtBRL(l.diferenca)}
                  </td>
                  <td className="px-2 py-1.5 text-center">{statusBadge(l.status)}</td>
                </tr>
              );
            })}
            {filtradas.length === 0 && (
              <tr><td colSpan={9} className="px-2 py-6 text-center text-sm text-slate-500">
                Nenhuma linha para exibir.
              </td></tr>
            )}
          </tbody>
          <tfoot className="bg-slate-50 font-semibold">
            <tr className="border-t">
              <td className="px-2 py-1.5" colSpan={5}>Total (filtrado)</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{fmtBRL(totais.cccc106)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{fmtBRL(totais.api)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {validavel ? fmtBRL(totais.diff) : "—"}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {possuiSintetica && sinteticasSemCCCC && (
        <div className="border-t bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Linhas sintéticas (98, 99, 999, VINCULAR) conciliam apenas por código —
          verifique se o CCCC106 importado possui essas classificações.
        </div>
      )}
    </div>
  );
}
