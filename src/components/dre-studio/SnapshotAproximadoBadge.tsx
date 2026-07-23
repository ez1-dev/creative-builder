import { useState } from "react";
import { AlertTriangle, ChevronDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ResultadoProntoAvisoParametros } from "@/types/contabil";
import { resolveDiferencas } from "@/lib/contabil/resultadoProntoState";

interface Props {
  aviso?: ResultadoProntoAvisoParametros | null;
  onRegerar?: () => void;
  regenerando?: boolean;
  /** Mensagem alternativa (ex.: após regeneração continuar aproximada). */
  mensagemOverride?: string;
  className?: string;
  compact?: boolean;
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function SnapshotAproximadoBadge({
  aviso,
  onRegerar,
  regenerando,
  mensagemOverride,
  className,
  compact,
}: Props) {
  const [open, setOpen] = useState(false);
  const diferencas = resolveDiferencas(aviso);
  const mensagem =
    mensagemOverride ??
    aviso?.mensagem ??
    "Existe um resultado materializado para este modelo e período, mas alguns parâmetros são diferentes dos filtros atuais.";

  return (
    <div
      role="status"
      aria-label="Snapshot aproximado — valor obtido de um snapshot com parâmetros diferentes dos filtros atuais"
      className={
        "flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 " +
        (className ?? "")
      }
    >
      <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-amber-200/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
            Snapshot aproximado
          </span>
          {!compact && <span className="text-sm">{mensagem}</span>}
        </div>
        {compact && <p className="text-xs">{mensagem}</p>}

        {diferencas.length > 0 && (
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2 hover:text-amber-950"
              >
                <ChevronDown
                  className={"h-3 w-3 transition-transform " + (open ? "rotate-180" : "")}
                />
                {open ? "Ocultar diferenças" : `Ver diferenças (${diferencas.length})`}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <ul className="space-y-1.5 rounded-md border border-amber-200 bg-white/60 p-2 text-xs">
                {diferencas.map((d, i) => (
                  <li key={`${d.parametro}-${i}`} className="grid grid-cols-[minmax(140px,auto)_1fr] gap-x-3">
                    <span className="font-semibold text-amber-950">{d.parametro || "—"}</span>
                    <span className="text-amber-900">
                      <span className="mr-2">
                        <em className="not-italic text-amber-800">Solicitado:</em> {formatVal(d.solicitado)}
                      </span>
                      <span>
                        <em className="not-italic text-amber-800">Snapshot:</em> {formatVal(d.snapshot)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        {onRegerar && (
          <div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 border-amber-400 bg-white text-amber-900 hover:bg-amber-100"
              onClick={onRegerar}
              disabled={!!regenerando}
            >
              <RefreshCw
                className={"mr-1 h-3.5 w-3.5 " + (regenerando ? "animate-spin" : "")}
                aria-hidden="true"
              />
              {regenerando ? "Gerando resultado com os parâmetros atuais..." : "Regerar com parâmetros atuais"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
