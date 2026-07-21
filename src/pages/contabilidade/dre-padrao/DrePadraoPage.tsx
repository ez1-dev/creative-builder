import { useNavigate } from "react-router-dom";
import { Landmark, Settings2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DreStudioVisualizacaoPage from "@/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage";
import { useDreModeloPadrao } from "@/hooks/contabil/useDreModeloPadrao";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useModelo } from "@/hooks/contabil/api";

export default function DrePadraoPage() {
  const navigate = useNavigate();
  const { data: cfg, isLoading } = useDreModeloPadrao();
  const { isAdmin } = useUserPermissions();
  const modeloId = cfg?.modeloId ?? null;
  const { data: modeloResp } = useModelo(modeloId || "");
  const modelo = modeloResp?.modelo;
  const modeloAtivo = modelo ? (modelo as any).ativo !== false : true;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" />
            DRE Padrão
          </h1>
          <p className="text-sm text-slate-500">Demonstração do Resultado do Exercício</p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/contabilidade/dre-studio/configuracoes")}
          >
            <Settings2 className="h-4 w-4 mr-1.5" />
            Definir modelo padrão
          </Button>
        )}
      </header>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!isLoading && !modeloId && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold">Nenhum modelo DRE padrão foi definido para esta empresa.</div>
            {isAdmin && (
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={() => navigate("/contabilidade/dre-studio/configuracoes")}>
                  Definir modelo padrão
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {!isLoading && modeloId && !modeloAtivo && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>O modelo DRE padrão está inativo.</div>
        </div>
      )}

      {!isLoading && modeloId && (
        <DreStudioVisualizacaoPage
          modeloIdProp={modeloId}
          modoBloqueado
          permiteConfigurar={isAdmin}
          onConfigurar={() =>
            navigate(`/contabilidade/dre-studio/${modeloId}/visualizacao`)
          }
        />
      )}
    </div>
  );
}
