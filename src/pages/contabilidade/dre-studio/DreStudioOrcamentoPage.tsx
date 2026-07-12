import { useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCentrosCusto, useModelo, useOrcamento, useSalvarOrcamento } from "@/hooks/contabil/api";
import type { OrcamentoItem } from "@/types/contabil";
import { CODEMP, CODFIL } from "@/lib/contabilConfig";
import { cn } from "@/lib/utils";

function OrcamentoView() {
  const { id } = useParams() as any;
  const [ano, setAno] = useState(new Date().getFullYear());
  const [codccu, setCodccu] = useState<string | "todos">("todos");

  const { data: modelo, isLoading: loadingModelo } = useModelo(id);
  const { data: centros } = useCentrosCusto();
  const ini = ano * 100 + 1;
  const fim = ano * 100 + 12;
  const { data: orc, isLoading: loadingOrc } = useOrcamento(id, ini, fim);
  const salvar = useSalvarOrcamento(id);

  const meses = useMemo(() => Array.from({ length: 12 }, (_, i) => ano * 100 + i + 1), [ano]);

  const linhasAnaliticas = useMemo(
    () => (modelo?.linhas ?? []).filter((l) => l.tipo_linha === "ANALITICA"),
    [modelo],
  );

  const orcMap = useMemo(() => {
    const m = new Map<string, OrcamentoItem>();
    for (const o of (orc ?? []) as OrcamentoItem[]) {
      const k = `${o.linha_id}_${o.anomes}_${o.codccu ?? ""}`;
      m.set(k, o);
    }
    return m;
  }, [orc]);

  const [saving, setSaving] = useState<Record<string, "idle" | "saving" | "ok" | "err">>({});

  const save = async (linha_id: string, anomes: number, valor: number) => {
    const key = `${linha_id}_${anomes}_${codccu === "todos" ? "" : codccu}`;
    setSaving((p) => ({ ...p, [key]: "saving" }));
    try {
      await salvar.mutateAsync({
        modelo_id: id,
        linha_id,
        codemp: CODEMP,
        codfil: CODFIL,
        codccu: codccu === "todos" ? null : codccu,
        anomes,
        valor_orcado: valor,
      });
      setSaving((p) => ({ ...p, [key]: "ok" }));
      setTimeout(() => setSaving((p) => ({ ...p, [key]: "idle" })), 1000);
    } catch {
      setSaving((p) => ({ ...p, [key]: "err" }));
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-white mb-4">
        <div>
          <Label className="text-xs">Ano</Label>
          <Input
            type="number"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="h-9 w-[100px]"
          />
        </div>
        <div>
          <Label className="text-xs block">Centro de custo</Label>
          <Select value={codccu} onValueChange={setCodccu}>
            <SelectTrigger className="h-9 w-[240px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">— Sem CCU —</SelectItem>
              {(centros ?? []).map((c) => (
                <SelectItem key={c.codccu} value={c.codccu}>
                  {c.codccu} — {c.desccu}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-slate-500 ml-auto">Filial codfil = {CODFIL}</div>
      </div>

      <div className="rounded-lg border bg-white overflow-auto">
        {loadingModelo || loadingOrc ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : linhasAnaliticas.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Nenhuma linha analítica. Cadastre linhas do tipo <strong>ANALITICA</strong> na estrutura.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 min-w-[260px] sticky left-0 bg-slate-50">Linha</th>
                {meses.map((m) => (
                  <th key={m} className="px-2 py-2 border-l text-center min-w-[110px]">
                    {String(m).slice(4)}/{ano}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhasAnaliticas.map((l) => (
                <tr key={l.id} className="border-b">
                  <td className="px-3 py-1.5 sticky left-0 bg-white">
                    <span className="font-mono text-xs text-slate-400 mr-2">{l.codigo}</span>
                    {l.descricao}
                  </td>
                  {meses.map((m) => {
                    const key = `${l.id}_${m}_${codccu === "todos" ? "" : codccu}`;
                    const cur = orcMap.get(key)?.valor_orcado ?? 0;
                    const status = saving[key] ?? "idle";
                    return (
                      <td key={m} className="border-l p-0">
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={cur || ""}
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v !== cur) save(l.id, m, v);
                          }}
                          className={cn(
                            "w-full h-9 text-right tabular-nums px-2 bg-transparent outline-none",
                            "focus:bg-sky-50 focus:ring-1 focus:ring-sky-500",
                            status === "saving" && "bg-amber-50",
                            status === "ok" && "bg-emerald-50",
                            status === "err" && "bg-red-50",
                          )}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default OrcamentoView;

