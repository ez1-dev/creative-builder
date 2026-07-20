import { AlertTriangle, WifiOff } from 'lucide-react';
import { useSidStatus, useSidWriteEnabled } from '@/hooks/requisicoes';

interface Props {
  /** Detalhe adicional (ex.: mensagem tratada vinda de uma resposta 503). */
  detail?: string;
  /** Quando true, exibe o banner mesmo que o ping ainda esteja carregando (útil após capturar 503 local). */
  force?: boolean;
}

/**
 * Aviso global de integração de escrita SID.
 * - kind='desabilitado' → backend respondeu, mas o SID está desligado / WSDL fora.
 * - kind='inalcancavel' → backend FastAPI não respondeu ao ping (rede/URL errada).
 */
export function IntegracaoOfflineBanner({ detail, force = false }: Props) {
  const { isLoading } = useSidStatus();
  const sw = useSidWriteEnabled();

  const mostrar = force || (!isLoading && !sw.enabled);
  if (!mostrar) return null;

  const inalcancavel = sw.kind === 'inalcancavel';
  const Icon = inalcancavel ? WifiOff : AlertTriangle;
  const titulo = inalcancavel
    ? 'Backend do ERP inalcançável.'
    : 'A integração de escrita com o ERP está temporariamente desabilitada.';
  const corpo = inalcancavel
    ? 'O portal não conseguiu falar com a FastAPI (:8070). Verifique a URL da API nas Configurações (VITE_API_BASE_URL) ou se o serviço/túnel está online. Rascunhos permanecem salvos localmente.'
    : 'Consultas continuam disponíveis, mas novas requisições e movimentações não serão enviadas ao Senior até que o backend libere a integração. Rascunhos ficam salvos e podem ser reprocessados depois.';

  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        <div className="font-medium">{titulo}</div>
        <div className="text-amber-800">{corpo}</div>
        {sw.reason && !inalcancavel && (
          <div className="text-xs text-amber-800">Motivo: {sw.reason}</div>
        )}
        {detail && <div className="text-xs text-amber-700">Detalhe: {detail}</div>}
      </div>
    </div>
  );
}
