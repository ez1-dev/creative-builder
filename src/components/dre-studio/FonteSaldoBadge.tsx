import type { ModoBalanco } from "@/types/contabil";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  modo: ModoBalanco;
  className?: string;
}

export function FonteSaldoBadge({ modo, className }: Props) {
  if (modo === "MENSAL_E650SAL") {
    return (
      <Badge
        variant="outline"
        title="Coluna gerada a partir de E650SAL.SALMES. Não representa o relatório Senior CCCC106 nem DEBMES."
        className={cn(
          "border-emerald-300 bg-emerald-50 text-emerald-800",
          className,
        )}
      >
        Fonte do saldo: Sistema (E650SAL.SALMES)
      </Badge>
    );
  }
  if (modo === "CONCILIACAO_SENIOR_MENSAL") {
    return (
      <Badge
        variant="outline"
        title="Comparação: Sistema (E650SAL.SALMES) × Referência Senior oficial (view v_bi_contabil_conciliacao_senior_mensal)."
        className={cn(
          "border-violet-300 bg-violet-50 text-violet-900",
          className,
        )}
      >
        Fonte do saldo: Conciliação Senior × Sistema (E650SAL.SALMES)
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      title="Saldo acumulado contábil a partir de E640LCT (mesma base do relatório CCCC106). Não comparar com E650SAL.SALMES."
      className={cn(
        "border-sky-300 bg-sky-50 text-sky-900",
        className,
      )}
    >
      Fonte do saldo: Sistema (CCCC106 / E640LCT acumulado)
    </Badge>
  );
}
