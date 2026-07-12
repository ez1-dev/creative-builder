import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorState, LoadingState, NoDataState } from '@/components/bi';
import { DreFiltrosBar } from '@/components/bi/financeiro/DreFiltrosBar';
import { DreDinamicaTable } from '@/components/bi/financeiro/DreDinamicaTable';
import { DreConfigurarLinhaDialog } from '@/components/bi/financeiro/DreConfigurarLinhaDialog';
import ModeloFormDialog from '@/components/bi/contabilidade/ModeloFormDialog';
import LinhaFormDialog from '@/components/bi/contabilidade/LinhaFormDialog';
import { fetchDreDinamica, type DreDinamicaLinha } from '@/lib/bi/dreDinamicaApi';
import {
  listarModelosFastApi,
  listarLinhasFastApi,
  desativarLinha,
  type MontadorModelo,
  type MontadorLinha,
} from '@/lib/bi/dreMontadorModelosApi';
import type { DreFiltrosPainel } from '@/lib/bi/dreConfiguravelTypes';
import { useDreApiHealth } from '@/lib/bi/dreErrors';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

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
  if (!iso || iso.length < 7) return '';
  return iso.slice(0, 4) + iso.slice(5, 7);
}

export default function DreConfiguravelPainelPage() {
  const qc = useQueryClient();
  const [filtros, setFiltros] = useState<DreFiltrosPainel>(defaultFiltros());
  const [aplicados, setAplicados] = useState<DreFiltrosPainel>(filtros);
  const [linhaConfig, setLinhaConfig] = useState<DreDinamicaLinha | null>(null);
  const [modeloDialogOpen, setModeloDialogOpen] = useState(false);
  const [modeloEdit, setModeloEdit] = useState<MontadorModelo | null>(null);
  const [linhaDialogOpen, setLinhaDialogOpen] = useState(false);
  const [linhaEdit, setLinhaEdit] = useState<MontadorLinha | null>(null);
  const [linhaParaExcluir, setLinhaParaExcluir] = useState<MontadorLinha | null>(null);

  const modelosQ = useQuery({
    queryKey: ['dre-configuravel', 'modelos'],
    queryFn: listarModelosFastApi,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!filtros.modelo_id && modelosQ.data && modelosQ.data.length > 0) {
      const padrao = modelosQ.data.find((m) => m.padrao) ?? modelosQ.data[0];
      setFiltros((f) => ({ ...f, modelo_id: padrao.id }));
      setAplicados((f) => ({ ...f, modelo_id: padrao.id }));
    }
  }, [modelosQ.data, filtros.modelo_id]);

  const anomesIni = dataToAnomes(aplicados.data_ini);
  const anomesFim = dataToAnomes(aplicados.data_fim);
  const modeloId = aplicados.modelo_id ?? null;
  const modeloAtual = useMemo(
    () => (modelosQ.data ?? []).find((m) => m.id === modeloId) ?? null,
    [modelosQ.data, modeloId],
  );

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

  const estruturaQ = useQuery({
    queryKey: ['dre-configuravel', 'estrutura', modeloId],
    queryFn: () => listarLinhasFastApi(modeloId!),
    enabled: !!modeloId,
    staleTime: 60_000,
  });

  const linhasMap = useMemo(() => {
    const m = new Map<string, MontadorLinha>();
    (estruturaQ.data ?? []).forEach((l) => m.set(l.codigo_linha, l));
    return m;
  }, [estruturaQ.data]);

  const dados = dreQ.data?.dados ?? [];

  const handleConfigurar = (l: DreDinamicaLinha) => setLinhaConfig(l);

  const handleEditar = (l: DreDinamicaLinha) => {
    const linha = linhasMap.get(l.codigo_linha);
    if (!linha) {
      toast.error(`Linha "${l.codigo_linha}" não encontrada no modelo.`);
      return;
    }
    setLinhaEdit(linha);
    setLinhaDialogOpen(true);
  };

  const handleExcluir = (l: DreDinamicaLinha) => {
    const linha = linhasMap.get(l.codigo_linha);
    if (!linha) {
      toast.error(`Linha "${l.codigo_linha}" não encontrada no modelo.`);
      return;
    }
    setLinhaParaExcluir(linha);
  };

  const confirmarExclusao = async () => {
    if (!linhaParaExcluir) return;
    try {
      await desativarLinha(linhaParaExcluir.id);
      toast.success('Linha excluída.');
      qc.invalidateQueries({ queryKey: ['dre-configuravel', 'estrutura', modeloId] });
      qc.invalidateQueries({ queryKey: ['dre-dinamica'] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao excluir linha.');
    } finally {
      setLinhaParaExcluir(null);
    }
  };

  const linhaParaConfigDialog = useMemo(() => {
    if (!linhaConfig) return null;
    const l = linhasMap.get(linhaConfig.codigo_linha);
    if (!l) return null;
    return { id: l.id, codigo_linha: l.codigo_linha, descricao: l.descricao };
  }, [linhaConfig, linhasMap]);

  return (
    <div className="space-y-4 p-4">
      <DreApiHealthBanner />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">DRE Configurável</h1>
          <p className="text-xs text-muted-foreground">
            Modelo e linhas mantidos via <code>/api/contabil/modelos</code> e <code>/api/contabil/linhas</code>; valores apurados via <code>/api/contabil/realizado/resumo</code> (API principal do ERP).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setModeloEdit(null); setModeloDialogOpen(true); }}
          >
            <Plus className="mr-1 h-4 w-4" /> Novo modelo
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!modeloAtual}
            onClick={() => { setModeloEdit(modeloAtual); setModeloDialogOpen(true); }}
          >
            <Pencil className="mr-1 h-4 w-4" /> Editar modelo
          </Button>
          <Button
            size="sm"
            disabled={!modeloId}
            onClick={() => { setLinhaEdit(null); setLinhaDialogOpen(true); }}
          >
            <Plus className="mr-1 h-4 w-4" /> Nova linha
          </Button>
        </div>
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
        <DreDinamicaTable
          data={dados}
          onConfigurarLinha={handleConfigurar}
          onEditarLinha={handleEditar}
          onExcluirLinha={handleExcluir}
        />
      )}

      <DreConfigurarLinhaDialog
        open={!!linhaConfig}
        onOpenChange={(v) => { if (!v) setLinhaConfig(null); }}
        modeloId={modeloId ?? ''}
        anomesIni={anomesIni}
        anomesFim={anomesFim}
        linha={linhaParaConfigDialog}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['dre-dinamica'] });
        }}
      />

      {linhaConfig && !linhaParaConfigDialog && estruturaQ.isFetched && (
        <ErrorState
          title="Linha sem ID no modelo"
          message={`Não foi possível localizar a linha "${linhaConfig.codigo_linha}" no modelo selecionado. Verifique se o modelo está sincronizado.`}
          onRetry={() => estruturaQ.refetch()}
        />
      )}

      <ModeloFormDialog
        open={modeloDialogOpen}
        onOpenChange={setModeloDialogOpen}
        modelo={modeloEdit}
        onSaved={(m) => {
          qc.invalidateQueries({ queryKey: ['dre-configuravel', 'modelos'] });
          setFiltros((f) => ({ ...f, modelo_id: m.id }));
          setAplicados((f) => ({ ...f, modelo_id: m.id }));
        }}
      />

      {modeloId && (
        <LinhaFormDialog
          open={linhaDialogOpen}
          onOpenChange={setLinhaDialogOpen}
          modeloId={modeloId}
          linha={linhaEdit}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['dre-configuravel', 'estrutura', modeloId] });
            qc.invalidateQueries({ queryKey: ['dre-dinamica'] });
          }}
        />
      )}

      <AlertDialog open={!!linhaParaExcluir} onOpenChange={(v) => { if (!v) setLinhaParaExcluir(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir linha?</AlertDialogTitle>
            <AlertDialogDescription>
              A linha <strong>{linhaParaExcluir?.codigo_linha}</strong> — {linhaParaExcluir?.descricao} será desativada no modelo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarExclusao}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
