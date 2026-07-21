import { AlertTriangle, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { ContabilPendencia } from "@/hooks/contabil/useContabilConfiguracao";

interface Props {
  tipo: "DRE" | "BALANCO";
  pendencia: ContabilPendencia | null;
  isAdmin?: boolean;
}

const NOMES = {
  DRE: "DRE",
  BALANCO: "Balanço Patrimonial",
} as const;

function mensagemFor(tipo: "DRE" | "BALANCO", pend: ContabilPendencia): { titulo: string; cta: string } {
  const nome = NOMES[tipo];
  switch (pend.codigo) {
    case "NAO_DEFINIDO":
      return {
        titulo: `Nenhum modelo padrão de ${nome} foi definido para esta empresa.`,
        cta: "Definir modelo padrão",
      };
    case "MODELO_INEXISTENTE":
      return {
        titulo: "O modelo configurado não foi encontrado. Selecione outro modelo oficial.",
        cta: "Abrir configurações",
      };
    case "MODELO_INATIVO":
      return {
        titulo: "O modelo padrão está inativo.",
        cta: "Abrir configurações",
      };
    case "MODELO_SEM_VINCULOS":
      return {
        titulo:
          "O modelo selecionado não possui contas contábeis vinculadas e produziria uma demonstração zerada.",
        cta: "Selecionar outro modelo",
      };
    default:
      return {
        titulo: pend.mensagem ?? `Configuração de ${nome} incompleta.`,
        cta: "Abrir configurações",
      };
  }
}

export function ModeloOficialPendenciaCard({ tipo, pendencia, isAdmin }: Props) {
  const navigate = useNavigate();
  if (!pendencia) return null;
  const { titulo, cta } = mensagemFor(tipo, pendencia);

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
      <div className="flex-1">
        <div className="font-semibold">{titulo}</div>
        {pendencia.mensagem && pendencia.codigo !== "NAO_DEFINIDO" && (
          <div className="mt-1 text-xs text-amber-800">{pendencia.mensagem}</div>
        )}
        {isAdmin && (
          <div className="mt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/contabilidade/dre-studio/configuracoes")}
            >
              <Settings2 className="h-4 w-4 mr-1.5" />
              {cta}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
