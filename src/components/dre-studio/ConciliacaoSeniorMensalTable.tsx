import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fmtBRL } from "@/components/contabil/MoneyCell";
import type { LinhaConciliacaoSeniorMensal } from "@/hooks/contabil/useConciliacaoSeniorMensal";

type Status = "OK" | "DIVERGENTE" | "SEM_DADO";

function rotuloMes(anomes: number): string {
  const ano = Math.floor(anomes / 100);
  const mes = anomes % 100;
  const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${nomes[mes - 1] ?? mes}/${ano}`;
}

function computeStatus(dif: number | null | undefined): Status {
  if (dif == null || !Number.isFinite(Number(dif))) return "SEM_DADO";
  return Math.abs(Number(dif)) <= 0.05 ? "OK" : "DIVERGENTE";
}

function statusBadge(s: Status) {
  const map: Record<Status, string> = {
    OK: "bg-emerald-100 text-emerald-700",
    DIVERGENTE: "bg-rose-100 text-rose-700",
    SEM_DADO: "bg-slate-100 text-slate-600",
  };
  const label = s === "SEM_DADO" ? "Sem dado" : s === "OK" ? "OK" : "Divergente";
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${map[s]}`}>
      {label}
    </span>
  );
}

export function ConciliacaoSeniorMensalTable({
  linhas,
  anomes,
}: {
  linhas: LinhaConciliacaoSeniorMensal[];
  anomes: number;
}) {
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");

  const linhasComStatus = useMemo(() => {
    const sorted = [...linhas].sort((a, b) => {
      const oa = (a as any).ordem == null ? Number.POSITIVE_INFINITY : Number((a as any).ordem);
      const ob = (b as any).ordem == null ? Number.POSITIVE_INFINITY : Number((b as any).ordem);
      if (oa !== ob) return oa - ob;
      return String(a.codigo ?? "").localeCompare(String(b.codigo ?? ""));
    });
    return sorted.map((l) => ({ ...l, _status: computeStatus(l.diferenca) }));
  }, [linhas]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return linhasComStatus.filter((l) => {
      if (statusFiltro !== "todos" && l._status !== statusFiltro) return false;
      if (q) {
        const hay = `${l.codigo} ${l.descricao} ${l.conta_contabil ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [linhasComStatus, busca, statusFiltro]);

  const totais = useMemo(() => {
    let sis = 0, sen = 0, dif = 0;
    filtradas.forEach((l) => {
      sis += Number(l.valor_sistema_e650sal ?? 0);
      sen += Number(l.valor_senior ?? 0);
      dif += Number(l.diferenca ?? 0);
    });
    return { sis, sen, dif };
  }, [filtradas]);

  const labelMes = rotuloMes(anomes);

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <Input
          placeholder="Buscar classificação, descrição ou conta..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-8 w-72"
        />
        <Select value={statusFiltro} onValueChange={setStatusFiltro}>
          <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="OK">OK</SelectItem>
            <SelectItem value="DIVERGENTE">Divergente</SelectItem>
            <SelectItem value="SEM_DADO">Sem dado</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-slate-500">
          {filtradas.length} de {linhasComStatus.length} linhas
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-2 py-1.5 text-left">Classificação</th>
              <th className="px-2 py-1.5 text-left">Descrição</th>
              <th className="px-2 py-1.5 text-left">Conta Contábil</th>
              <th className="px-2 py-1.5 text-right">{labelMes} — Sistema (E650SAL.SALMES)</th>
              <th className="px-2 py-1.5 text-right">SENIOR (Referência oficial)</th>
              <th className="px-2 py-1.5 text-right">DIF</th>
              <th className="px-2 py-1.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((l, i) => (
              <tr key={`${l.codigo}-${i}`} className="border-t hover:bg-slate-50">
                <td className="px-2 py-1.5 font-mono">{l.codigo}</td>
                <td className="px-2 py-1.5">{l.descricao}</td>
                <td className="px-2 py-1.5 font-mono tabular-nums">
                  {l.conta_contabil == null || l.conta_contabil === "" ? "—" : l.conta_contabil}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {l.valor_sistema_e650sal == null ? "—" : fmtBRL(l.valor_sistema_e650sal)}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {l.valor_senior == null ? "—" : fmtBRL(l.valor_senior)}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {l.diferenca == null ? "—" : fmtBRL(l.diferenca)}
                </td>
                <td className="px-2 py-1.5 text-center">{statusBadge(l._status)}</td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr><td colSpan={7} className="px-2 py-6 text-center text-sm text-slate-500">
                Nenhuma linha para exibir.
              </td></tr>
            )}
          </tbody>
          <tfoot className="bg-slate-50 font-semibold">
            <tr className="border-t">
              <td className="px-2 py-1.5" colSpan={3}>Total (filtrado)</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{fmtBRL(totais.sis)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{fmtBRL(totais.sen)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{fmtBRL(totais.dif)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
