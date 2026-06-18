import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ErrorState, LoadingState } from '@/components/bi';
import { DreFiltrosBar } from '@/components/bi/financeiro/DreFiltrosBar';
import { DreResumoCards } from '@/components/bi/financeiro/DreResumoCards';
import { DreMensalChart } from '@/components/bi/financeiro/DreMensalChart';
import { DreMensalTable } from '@/components/bi/financeiro/DreMensalTable';
import { fetchDreModelos, fetchDreRealizadoResumo } from '@/lib/bi/dreConfiguravelApi';
import type { DreFiltrosPainel } from '@/lib/bi/dreConfiguravelTypes';

function defaultFiltros(): DreFiltrosPainel {
  const now = new Date();
  const ini = new Date(now.getFullYear(), now.getMonth(), 1);
  const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    empresa: '',
    filial: '',
    data_ini: iso(ini),
    data_fim: iso(fim),
    modelo_id: null,
    tipo: 'MENSAL',
    comparar_orcamento: false,
  };
}

export default function DreConfiguravelPainelPage() {
  const [filtros, setFiltros] = useState<DreFiltrosPainel>(defaultFiltros());
  const [aplicados, setAplicados] = useState<DreFiltrosPainel>(filtros);

  const modelosQ = useQuery({
    queryKey: ['dre-configuravel', 'modelos'],
    queryFn: fetchDreModelos,
    staleTime: 5 * 60_000,
  });

  // Seleciona o primeiro modelo automaticamente quando carregar
  useEffect(() => {
    if (!filtros.modelo_id && modelosQ.data && modelosQ.data.length > 0) {
      const id = modelosQ.data[0].id;
      setFiltros((f) => ({ ...f, modelo_id: id }));
      setAplicados((f) => ({ ...f, modelo_id: id }));
    }
  }, [modelosQ.data, filtros.modelo_id]);

  const resumoQ = useQuery({
    queryKey: ['dre-configuravel', 'resumo', aplicados],
    queryFn: () => fetchDreRealizadoResumo(aplicados),
    enabled: !!aplicados.data_ini && !!aplicados.data_fim,
  });

  const totais = useMemo(
    () =>
      resumoQ.data?.totais ?? {
        receita_operacional: 0,
        custos: 0,
        despesas: 0,
        resultado_dre: 0,
        margem_pct: 0,
      },
    [resumoQ.data],
  );
  const mensal = resumoQ.data?.mensal ?? [];

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Painel DRE Realizada</h1>
        <p className="text-xs text-muted-foreground">
          BI Financeiro · DRE Configurável — valores apurados pela API; o front apenas exibe.
        </p>
      </div>

      <DreFiltrosBar
        filtros={filtros}
        modelos={modelosQ.data ?? []}
        loadingModelos={modelosQ.isLoading}
        onChange={(patch) => setFiltros((f) => ({ ...f, ...patch }))}
        onAplicar={() => setAplicados(filtros)}
        onLimpar={() => {
          const d = defaultFiltros();
          d.modelo_id = modelosQ.data?.[0]?.id ?? null;
          setFiltros(d);
          setAplicados(d);
        }}
      />

      {modelosQ.isError && (modelosQ.error as any)?.statusCode === 401 && (
        <ErrorState
          title="Sessão expirada"
          message="Sua sessão expirou. Faça login novamente para continuar."
          onRetry={() => window.location.assign('/login')}
        />
      )}

      {resumoQ.isError ? (
        (resumoQ.error as any)?.statusCode === 401 ? (
          <ErrorState
            title="Sessão expirada"
            message="Sua sessão expirou. Faça login novamente para continuar."
            onRetry={() => window.location.assign('/login')}
          />
        ) : (
          <ErrorState
            title="Não foi possível carregar a DRE"
            message={(resumoQ.error as Error)?.message}
            onRetry={() => resumoQ.refetch()}
          />
        )
      ) : resumoQ.isLoading ? (
        <LoadingState message="Carregando DRE..." />
      ) : (
        <>
          <DreResumoCards totais={totais} loading={resumoQ.isFetching} />
          <DreMensalChart data={mensal} />
          <DreMensalTable data={mensal} loading={resumoQ.isFetching} />
        </>
      )}
    </div>
  );
}
