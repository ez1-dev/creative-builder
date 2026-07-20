import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { requisicoesApi, IntegracaoDesabilitadaError, SessaoExpiradaError } from '@/services/requisicoesApi';
import type { RequisicaoFiltros, Requisicao, ConfigRequisicoes } from '@/types/requisicoes';
import { toast } from '@/hooks/use-toast';

const KEY = 'requisicoes';

/* ============================== Queries ============================== */

export function useRequisicoes(filtros: RequisicaoFiltros = {}) {
  return useQuery({
    queryKey: [KEY, 'lista', filtros],
    queryFn: () => requisicoesApi.listar(filtros),
    staleTime: 30_000,
  });
}

export function useRequisicoesKpis(filtros: RequisicaoFiltros = {}) {
  return useQuery({
    queryKey: [KEY, 'kpis', filtros],
    queryFn: () => requisicoesApi.kpis(filtros),
    staleTime: 30_000,
  });
}

export function useRequisicao(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'detalhe', id],
    queryFn: () => requisicoesApi.detalhe(id!),
    enabled: !!id,
  });
}

export function useOpConsulta(codori: string | undefined, numorp: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'op', codori, numorp],
    queryFn: () => requisicoesApi.consultarOp(codori!, numorp!),
    enabled: !!codori && !!numorp,
  });
}

export function useHistoricoRequisicao(id: string | undefined) {
  return useQuery({
    queryKey: [KEY, 'historico', id],
    queryFn: () => requisicoesApi.historico(id!),
    enabled: !!id,
  });
}

export function useFilaAlmox(filtros: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: [KEY, 'fila-almox', filtros],
    queryFn: () => requisicoesApi.filaAlmox(filtros),
    staleTime: 15_000,
  });
}

export function useAgrupadas(filtros: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: [KEY, 'agrupadas', filtros],
    queryFn: () => requisicoesApi.agrupadas(filtros),
    staleTime: 15_000,
  });
}

export function useConfigRequisicoes() {
  return useQuery({
    queryKey: [KEY, 'config'],
    queryFn: () => requisicoesApi.configuracoes(),
    staleTime: 300_000,
  });
}

/** Status da integração SID (endpoint de diagnóstico — não grava nada). */
export function useSidStatus() {
  return useQuery({
    queryKey: [KEY, 'sid', 'ping'],
    queryFn: () => requisicoesApi.pingSid(),
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/** true quando escrita SID está liberada (habilitada + WSDL do co_ger_sid acessível). */
export type SidWriteKind = 'ok' | 'loading' | 'desabilitado' | 'inalcancavel' | 'desconhecido';
export function useSidWriteEnabled(): { enabled: boolean; loading: boolean; reason?: string; kind: SidWriteKind } {
  const q = useSidStatus();
  if (q.isLoading) return { enabled: false, loading: true, kind: 'loading' };
  if (q.error) {
    if (q.error instanceof IntegracaoDesabilitadaError) {
      return { enabled: false, loading: false, kind: 'desabilitado', reason: q.error.detail ?? 'Integração de escrita SID desabilitada no backend.' };
    }
    return {
      enabled: false,
      loading: false,
      kind: 'inalcancavel',
      reason: 'Backend do ERP inalcançável — verifique se VITE_API_BASE_URL aponta para a FastAPI e se o serviço está online.',
    };
  }
  const s = q.data;
  if (!s) return { enabled: false, loading: false, kind: 'desconhecido', reason: 'Não foi possível verificar a integração SID.' };
  if (!s.sid_habilitado) return { enabled: false, loading: false, kind: 'desabilitado', reason: 'Integração de escrita SID desabilitada no backend.' };
  if (!s.ger_sid?.wsdl_ok) return { enabled: false, loading: false, kind: 'desabilitado', reason: 'Serviço co_ger_sid indisponível.' };
  return { enabled: true, loading: false, kind: 'ok' };
}

/* ============================== Mutations ============================== */

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: [KEY] });
  };
}

function handleMutationError(err: unknown, ctx: string) {
  if (err instanceof IntegracaoDesabilitadaError) {
    toast({
      title: 'Integração de escrita desabilitada',
      description: err.detail ?? 'A ação ficou pendente. Assim que a integração for liberada, o processamento segue automaticamente.',
    });
    return;
  }
  const msg = (err as Error)?.message ?? 'Erro desconhecido';
  toast({ title: `Falha ao ${ctx}`, description: msg, variant: 'destructive' });
}

/** Enviar requisição para aprovação/almoxarifado. */
export function useEnviarRequisicao() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => requisicoesApi.enviar(id),
    onSuccess: () => { invalidate(); toast({ title: 'Requisição enviada' }); },
    onError: (e) => handleMutationError(e, 'enviar requisição'),
  });
}

export function useAprovarRequisicao() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: unknown }) => requisicoesApi.aprovar(id, payload),
    onSuccess: () => { invalidate(); toast({ title: 'Requisição aprovada' }); },
    onError: (e) => handleMutationError(e, 'aprovar'),
  });
}

export function useRejeitarRequisicao() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, justificativa }: { id: string; justificativa: string }) =>
      requisicoesApi.rejeitar(id, { justificativa }),
    onSuccess: () => { invalidate(); toast({ title: 'Requisição rejeitada' }); },
    onError: (e) => handleMutationError(e, 'rejeitar'),
  });
}

export function useCancelarRequisicao() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, justificativa }: { id: string; justificativa: string }) =>
      requisicoesApi.cancelar(id, { justificativa }),
    onSuccess: () => { invalidate(); toast({ title: 'Requisição cancelada' }); },
    onError: (e) => handleMutationError(e, 'cancelar'),
  });
}

export function useEstornarRequisicao() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => requisicoesApi.estornar(id),
    onSuccess: () => { invalidate(); toast({ title: 'Requisição estornada' }); },
    onError: (e) => handleMutationError(e, 'estornar'),
  });
}

export function useReprocessarIntegracao() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => requisicoesApi.reprocessarIntegracao(id),
    onSuccess: () => { invalidate(); toast({ title: 'Reprocessamento solicitado' }); },
    onError: (e) => handleMutationError(e, 'reprocessar integração'),
  });
}

/* ---- Ações por item (almoxarifado) ---- */

type ItemAction = keyof Pick<typeof requisicoesApi,
  'iniciarSeparacao' | 'reservar' | 'separar' | 'atender' | 'transferir' | 'baixarOp'
  | 'registrarFalta' | 'enviarCompras' | 'estornarItem'>;

interface ItemArgs { id: string; seq: number; payload?: any }

function useItemAction(action: ItemAction, successMsg: string, ctx: string) {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, seq, payload }: ItemArgs) => {
      const fn = requisicoesApi[action] as any;
      return payload === undefined ? fn(id, seq) : fn(id, seq, payload);
    },
    onSuccess: () => { invalidate(); toast({ title: successMsg }); },
    onError: (e) => handleMutationError(e, ctx),
  });
}

export const useIniciarSeparacao = () => useItemAction('iniciarSeparacao', 'Separação assumida', 'assumir separação');
export const useReservarItem = () => useItemAction('reservar', 'Reserva registrada', 'reservar');
export const useSepararItem = () => useItemAction('separar', 'Item separado', 'separar');
export const useAtenderItem = () => useItemAction('atender', 'Atendimento registrado', 'atender');
export const useTransferirItem = () => useItemAction('transferir', 'Transferência registrada', 'transferir');
export const useBaixarOpItem = () => useItemAction('baixarOp', 'Baixa em OP registrada', 'baixar OP');
export const useRegistrarFaltaItem = () => useItemAction('registrarFalta', 'Falta registrada', 'registrar falta');
export const useEnviarComprasItem = () => useItemAction('enviarCompras', 'Encaminhado a compras', 'enviar a compras');
export const useEstornarItem = () => useItemAction('estornarItem', 'Item estornado', 'estornar item');

/* ---- Configurações ---- */

export function useAtualizarConfiguracoes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ConfigRequisicoes) => requisicoesApi.atualizarConfiguracoes(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [KEY, 'config'] });
      toast({ title: 'Configurações salvas' });
    },
    onError: (e) => handleMutationError(e, 'salvar configurações'),
  });
}

/* ---- Criar (rascunho / avulsa) ---- */

export function useCriarRequisicao() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (payload: Partial<Requisicao>) => requisicoesApi.criar(payload),
    onSuccess: () => { invalidate(); },
    onError: (e) => handleMutationError(e, 'criar requisição'),
  });
}

/* ---- SID (portal) ---- */

function useSidMutation<T = any>(
  fn: (payload: any, key?: string) => Promise<T>,
  successMsg: string,
  ctx: string,
) {
  return useMutation({
    mutationFn: (payload: any) => fn(payload, requisicoesApi.newIdempotencyKey()),
    onSuccess: () => { toast({ title: successMsg }); },
    onError: (e) => handleMutationError(e, ctx),
  });
}

export const useSidRequisitar = () =>
  useSidMutation(requisicoesApi.sidRequisitar, 'Requisição enviada ao ERP', 'requisitar no SID');
export const useSidRateio = () =>
  useSidMutation(requisicoesApi.sidRateio, 'Rateio registrado', 'registrar rateio');
export const useSidAtender = () =>
  useSidMutation(requisicoesApi.sidAtender, 'Atendimento registrado', 'atender no SID');
export const useSidReservarComponente = () =>
  useSidMutation(requisicoesApi.sidReservarComponente, 'Reserva de componente registrada', 'reservar componente');
export const useSidBaixarComponentes = () =>
  useSidMutation(requisicoesApi.sidBaixarComponentes, 'Baixa de componente registrada', 'baixar componente');
export const useSidExcluir = () =>
  useSidMutation(requisicoesApi.sidExcluir, 'Requisição excluída no ERP', 'excluir no SID');

