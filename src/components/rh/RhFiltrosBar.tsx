import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnomesSelect } from "@/components/bi/comercial/AnomesSelect";

export interface RhFiltrosBarProps {
  /** Mês inicial (AAAAMM) */
  anomesIni?: string;
  onAnomesIniChange?: (v: string) => void;
  /** Mês final (AAAAMM) */
  anomesFim?: string;
  onAnomesFimChange?: (v: string) => void;
  /** Empresa (codemp) */
  codemp?: number | string;
  onCodempChange?: (v: number) => void;
  /** Mostra período (padrão true) */
  mostrarPeriodo?: boolean;
  /** Mostra empresa (padrão true) */
  mostrarEmpresa?: boolean;
  /** Slot para campos adicionais */
  extras?: React.ReactNode;
  disabled?: boolean;
  /** Debounce em ms do campo empresa (default 400ms) */
  debounceCodempMs?: number;
}

/**
 * Barra de filtros compartilhada das páginas de RH.
 * Aplica alterações automaticamente ao mudar — sem botão "Atualizar".
 * O campo de empresa é debounced (texto livre).
 */
export function RhFiltrosBar({
  anomesIni,
  onAnomesIniChange,
  anomesFim,
  onAnomesFimChange,
  codemp,
  onCodempChange,
  mostrarPeriodo = true,
  mostrarEmpresa = true,
  extras,
  disabled,
  debounceCodempMs = 400,
}: RhFiltrosBarProps) {
  const [codempLocal, setCodempLocal] = useState<string>(codemp != null ? String(codemp) : "1");
  const debounceRef = useRef<number | null>(null);

  // Sincroniza quando pai muda por fora
  useEffect(() => {
    if (codemp != null && String(codemp) !== codempLocal) {
      setCodempLocal(String(codemp));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codemp]);

  function handleCodempChange(v: string) {
    setCodempLocal(v);
    if (!onCodempChange) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) onCodempChange(n);
    }, debounceCodempMs);
  }

  return (
    <Card>
      <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-end gap-3">
        {mostrarPeriodo && anomesIni != null && onAnomesIniChange && (
          <AnomesSelect
            label="Mês inicial"
            value={anomesIni}
            onChange={onAnomesIniChange}
            disabled={disabled}
            className="w-full md:w-52"
          />
        )}
        {mostrarPeriodo && anomesFim != null && onAnomesFimChange && (
          <AnomesSelect
            label="Mês final"
            value={anomesFim}
            onChange={onAnomesFimChange}
            disabled={disabled}
            className="w-full md:w-52"
          />
        )}
        {mostrarEmpresa && (
          <div className="w-full md:w-32">
            <Label className="text-xs font-medium">Empresa (codemp)</Label>
            <Input
              className="h-8 text-xs mt-1"
              inputMode="numeric"
              value={codempLocal}
              onChange={(e) => handleCodempChange(e.target.value.replace(/\D/g, ""))}
              placeholder="1"
              disabled={disabled}
            />
          </div>
        )}
        {extras}
      </CardContent>
    </Card>
  );
}
