import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Landmark, Settings2, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import DreStudioVisualizacaoPage from "@/pages/contabilidade/dre-studio/DreStudioVisualizacaoPage";
import {
  useContabilConfiguracao,
  resolverPendencia,
} from "@/hooks/contabil/useContabilConfiguracao";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { ModeloOficialPendenciaCard } from "@/components/contabil/ModeloOficialPendenciaCard";
import { CODEMP } from "@/lib/contabilConfig";
import {
  UNIDADE_CAPABILITIES_DEFAULT,
  type UnidadeCapabilities,
} from "@/lib/contabil/unidadeCapabilities";

const AVISO_STORAGE_KEY = "dre-padrao:aviso-unidade";

export default function DrePadraoPage() {
  const navigate = useNavigate();
  const { isAdmin } = useUserPermissions();
  const { data: cfg, isLoading } = useContabilConfiguracao(CODEMP);
  const pendencia = resolverPendencia(cfg, "DRE");
  const modeloId = !pendencia ? cfg?.dre_modelo_padrao_id ?? null : null;

  // Capacidade de filtro por Unidade de Negócio (contrato do backend).
  const [unidadeCaps, setUnidadeCaps] = useState<UnidadeCapabilities>(
    UNIDADE_CAPABILITIES_DEFAULT,
  );
  const suportaFiltroUnidade = unidadeCaps.suportaFiltro;

  // Saneamento de URL: quando o backend não suporta o filtro, remover
  // ?unidade= da querystring para não induzir o usuário a achar que o
  // resultado está filtrado.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (!unidadeCaps.carregado) return;
    if (!unidadeCaps.suportaFiltro && searchParams.has("unidade")) {
      const next = new URLSearchParams(searchParams);
      next.delete("unidade");
      setSearchParams(next, { replace: true });
    }
  }, [unidadeCaps.carregado, unidadeCaps.suportaFiltro, searchParams, setSearchParams]);

  const [avisoAberto, setAvisoAberto] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(AVISO_STORAGE_KEY) !== "closed";
  });

  const fecharAviso = () => {
    setAvisoAberto(false);
    try {
      window.localStorage.setItem(AVISO_STORAGE_KEY, "closed");
    } catch {
      /* ignore */
    }
  };

  const motivoIndisponibilidade =
    unidadeCaps.motivo ??
    "O filtro por Unidade de Negócio ainda não está disponível para esta matriz.";

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" />
            DRE Padrão
            {!suportaFiltroUnidade && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="ml-1 font-medium text-[11px] uppercase tracking-wide cursor-help"
                    >
                      Visão consolidada
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs space-y-1">
                    <p>
                      A matriz principal apresenta os valores consolidados. A
                      análise por Unidade de Negócio está disponível nos drills
                      das linhas.
                    </p>
                    {unidadeCaps.regra && (
                      <p className="text-muted-foreground">
                        Regra do backend: {unidadeCaps.regra}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </h1>
          <p className="text-sm text-slate-500">
            Demonstração do Resultado do Exercício
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

      {!suportaFiltroUnidade && avisoAberto && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div>{motivoIndisponibilidade}</div>
            <div className="text-blue-800/80 dark:text-blue-300/80">
              A análise por <strong>Unidade de Negócio</strong> continua
              disponível nos drills das linhas.
            </div>
          </div>
          <button
            type="button"
            onClick={fecharAviso}
            aria-label="Fechar aviso"
            className="shrink-0 rounded p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/40"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          <div className="text-xs text-slate-500">Carregando configuração contábil...</div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {!isLoading && pendencia && (
        <ModeloOficialPendenciaCard tipo="DRE" pendencia={pendencia} isAdmin={isAdmin} />
      )}

      {!isLoading && modeloId && (
        <DreStudioVisualizacaoPage
          modeloIdProp={modeloId}
          modoBloqueado
          permiteConfigurar={isAdmin}
          onConfigurar={() => navigate("/contabilidade/dre-studio/configuracoes")}
          onCapabilitiesChange={setUnidadeCaps}
        />
      )}
    </div>
  );
}
