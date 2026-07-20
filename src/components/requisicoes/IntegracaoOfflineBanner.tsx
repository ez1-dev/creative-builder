import { AlertTriangle, WifiOff, LogIn, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useSidStatus, useSidWriteEnabled, SID_PING_QUERY_KEY } from '@/hooks/requisicoes';

interface Props {
  /** Detalhe adicional (ex.: mensagem tratada vinda de uma resposta 503). */
  detail?: string;
  /** Quando true, exibe o banner mesmo que o ping ainda esteja carregando (útil após capturar 503 local). */
  force?: boolean;
}

/**
 * Aviso global do status da integração de escrita SID.
 * Diferencia:
 * - sessao_expirada (401) → orienta re-login
 * - desabilitado (503 / sid_habilitado=false / WSDL fora) → aguardar backend
 * - inalcancavel (rede / 5xx / 404) → checar API/URL
 */
export function IntegracaoOfflineBanner({ detail, force = false }: Props) {
  const { isLoading, isFetching } = useSidStatus();
  const sw = useSidWriteEnabled();
  const qc = useQueryClient();
  const nav = useNavigate();
  const loc = useLocation();

  const mostrar = force || (!isLoading && !sw.enabled);
  if (!mostrar) return null;

  const retry = () => qc.invalidateQueries({ queryKey: SID_PING_QUERY_KEY });
  const login = () => nav(`/login?redirect=${encodeURIComponent(loc.pathname + loc.search)}`);

  const isSessao = sw.kind === 'sessao_expirada';
  const isInalcancavel = sw.kind === 'inalcancavel';
  const Icon = isSessao ? LogIn : isInalcancavel ? WifiOff : AlertTriangle;

  const titulo = isSessao
    ? 'Sua sessão expirou.'
    : isInalcancavel
    ? 'Não foi possível falar com o servidor.'
    : 'A integração de escrita com o ERP está temporariamente desabilitada.';

  const corpo = isSessao
    ? 'Faça login novamente para voltar a enviar requisições ao ERP.'
    : isInalcancavel
    ? 'O portal não conseguiu falar com a FastAPI. Verifique a URL da API nas Configurações ou se o serviço/túnel está online. Rascunhos permanecem salvos localmente.'
    : 'Consultas continuam disponíveis, mas novas requisições e movimentações não serão enviadas ao Senior até que o backend libere a integração. Rascunhos ficam salvos e podem ser reprocessados depois.';

  return (
    <div className="flex flex-wrap items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="font-medium">{titulo}</div>
        <div className="text-amber-800">{corpo}</div>
        {sw.reason && !isInalcancavel && !isSessao && (
          <div className="text-xs text-amber-800">Motivo: {sw.reason}</div>
        )}
        {detail && <div className="text-xs text-amber-700">Detalhe: {detail}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isSessao && (
          <Button size="sm" variant="default" onClick={login} className="h-7">
            <LogIn className="mr-1 h-3.5 w-3.5" /> Fazer login
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={retry} disabled={isFetching} className="h-7">
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Tentar de novo
        </Button>
      </div>
    </div>
  );
}
