import { useNavigate } from "react-router-dom";
import { Landmark, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DreStudioVisualizacaoPage from "@/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage";
import {
  useContabilConfiguracao,
  resolverPendencia,
} from "@/hooks/contabil/useContabilConfiguracao";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ModeloOficialPendenciaCard } from "@/components/contabil/ModeloOficialPendenciaCard";
import { CODEMP } from "@/lib/contabilConfig";

export default function BalancoPadraoPage() {
  const navigate = useNavigate();
  const { isAdmin } = useUserPermissions();
  const { data: cfg, isLoading } = useContabilConfiguracao(CODEMP);
  const pendencia = resolverPendencia(cfg, "BALANCO");
  const modeloId = !pendencia ? cfg?.balanco_modelo_padrao_id ?? null : null;
  const modeloNome = cfg?.balanco_modelo_padrao?.nome ?? null;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" />
            Balanço Patrimonial Padrão
          </h1>
          <p className="text-sm text-slate-500">
            Demonstração patrimonial oficial da empresa
            {modeloNome && (
              <>
                {" "}·{" "}
                <span className="text-slate-700">
                  Modelo utilizado: <strong>{modeloNome}</strong>
                </span>{" "}
                <span className="text-slate-400">(Configuração oficial da empresa)</span>
              </>
            )}
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/contabilidade/dre-studio/configuracoes")}
          >
            <Settings2 className="h-4 w-4 mr-1.5" />
            Alterar modelo oficial
          </Button>
        )}
      </header>

      {isLoading && (
        <div className="space-y-3">
          <div className="text-xs text-slate-500">Carregando configuração contábil...</div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!isLoading && pendencia && (
        <ModeloOficialPendenciaCard tipo="BALANCO" pendencia={pendencia} isAdmin={isAdmin} />
      )}

      {!isLoading && modeloId && (
        <DreStudioVisualizacaoPage
          modeloIdProp={modeloId}
          modoBloqueado
          permiteConfigurar={isAdmin}
          onConfigurar={() => navigate("/contabilidade/dre-studio/configuracoes")}
        />
      )}
    </div>
  );
}
