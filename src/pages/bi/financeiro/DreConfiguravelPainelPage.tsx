import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ErrorState, LoadingState, NoDataState } from '@/components/bi';
import { DreFiltrosBar } from '@/components/bi/financeiro/DreFiltrosBar';
import { DreDinamicaTable } from '@/components/bi/financeiro/DreDinamicaTable';
import { DreConfigurarLinhaDialog } from '@/components/bi/financeiro/DreConfigurarLinhaDialog';
import { fetchDreModelos } from '@/lib/bi/dreConfiguravelApi';
import { fetchDreDinamica, type DreDinamicaLinha } from '@/lib/bi/dreDinamicaApi';
import { listarLinhas } from '@/lib/bi/dreConfigApi';
import type { DreFiltrosPainel } from '@/lib/bi/dreConfiguravelTypes';

function defaultFiltros(): DreFiltrosPainel {
  const now = new Date();
  const ini = new Date(now.getFullYear(), now.getMonth(), 1);
  const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    empresa: '', filial: '',
    data_ini: iso(ini), data_fim: iso(fim),
    modelo_id: null, tipo: 'MENSAL', comparar_orcamento: false,
  };
}

function dataToAnomes(iso: string): string {
  // YYYY-MM-DD -> YYYYMM
  if (!iso || iso.length < 7) return '';
  return iso.slice(0, 4) + iso.slice(5, 7);
}

export default function DreConfiguravelPainelPage() {
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState<DreFiltrosPainel>(defaultFiltros());
  const [aplicados, setAplicados] = useState<DreFiltrosPainel>(filtros);
  const [linhaConfig, setLinhaConfig] = useState<DreDinamicaLinha | null>(null);

  const modelosQ = useQuery({
    queryKey: ['dre-configuravel', 'modelos'],
    queryFn: fetchDreModelos,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!filtros.modelo_id && modelosQ.data && modelosQ.data.length > 0) {
      const id = modelosQ.data[0].id;
      setFiltros((f) => ({ ...f, modelo_id: id }));
      setAplicados((f) => ({ ...f, modelo_id: id }));
    }
  }, [modelosQ.data, filtros.modelo_id]);

  const anomesIni = dataToAnomes(aplicados.data_ini);
  const anomesFim = dataToAnomes(aplicados.data_fim);
  const modeloId = aplicados.modelo_id ?? null;

  const dreQ = useQuery({
    queryKey: ['dre-dinamica', { modeloId, anomesIni, anomesFim }],
    queryFn: () => fetchDreDinamica({
      ano: Number(anomesIni.slice(0, 4)),
      mes_ini: Number(anomesIni.slice(4, 6)),
      mes_fim: Number(anomesFim.slice(4, 6)),
      modelo_id: modeloId,
    }),
    enabled: !!modeloId && !!anomesIni && !!anomesFim,
  });

  // Estrutura (linhas do modelo) — para resolver codigo_linha → linha_id (UUID)
  const estruturaQ = useQuery({
    queryKey: ['dre-configuravel', 'estrutura', modeloId],
    queryFn: () => listarLinhas(modeloId!),
    enabled: !!modeloId,
    staleTime: 60_000,
  });

  const linhasMap = useMemo(() => {
    const m = new Map<string, string>();
    (estruturaQ.data ?? []).forEach(l => m.set(l.codigo_linha, l.id));
    return m;
  }, [estruturaQ.data]);

  const dados = dreQ.data?.dados ?? [];

  const handleConfigurar = (l: DreDinamicaLinha) => {
    setLinhaConfig(l);
  };

  const linhaParaDialog = useMemo(() => {
    if (!linhaConfig) return null;
    const id = linhasMap.get(linhaConfig.codigo_linha);
    if (!id) return null;
    return { id, codigo_linha: linhaConfig.codigo_linha, descricao: linhaConfig.descricao };
  }, [linhaConfig, linhasMap]);

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">DRE Configurável</h1>
        <p className="text-xs text-muted-foreground">
          Valores apurados via <code>/api/bi/contabilidade/dre-dinamica</code> conforme o modelo selecionado.
        </p>
      </div>

      <DreFiltrosBar
        filtros={filtros}
        modelos={modelosQ.data ?? []}
        loadingModelos={modelosQ.isLoading}
        onChange={(patch) => setFiltros((f) => ({ ...f, ...patch }))}
        onAplicar={() => {
          if (!filtros.modelo_id) return;
          setAplicados(filtros);
        }}
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

      {!modeloId ? (
        <NoDataState message="Selecione um modelo DRE para carregar os dados." />
      ) : dreQ.isError ? (
        (dreQ.error as any)?.statusCode === 401 ? (
          <ErrorState
            title="Sessão expirada"
            message="Sua sessão expirou. Faça login novamente para continuar."
            onRetry={() => window.location.assign('/login')}
          />
        ) : (
          <ErrorState
            title="Não foi possível carregar a DRE"
            message={(dreQ.error as Error)?.message}
            onRetry={() => dreQ.refetch()}
          />
        )
      ) : dreQ.isLoading ? (
        <LoadingState message="Carregando DRE..." />
      ) : dados.length === 0 ? (
        <NoDataState message="Sem lançamentos contábeis carregados em bi_vm_lanc_contabil para o período selecionado." />
      ) : (
        <DreDinamicaTable data={dados} onConfigurarLinha={handleConfigurar} />
      )}

      <DreConfigurarLinhaDialog
        open={!!linhaConfig}
        onOpenChange={(v) => { if (!v) setLinhaConfig(null); }}
        modeloId={modeloId ?? ''}
        anomesIni={anomesIni}
        anomesFim={anomesFim}
        linha={linhaParaDialog}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['dre-dinamica'] });
        }}
      />

      {linhaConfig && !linhaParaDialog && estruturaQ.isFetched && (
        <ErrorState
          title="Linha sem ID no modelo"
          message={`Não foi possível localizar a linha "${linhaConfig.codigo_linha}" no modelo selecionado (bi_dre_estrutura_v2). Verifique se o modelo está sincronizado.`}
          onRetry={() => estruturaQ.refetch()}
        />
      )}
    </div>
  );
}
