import { AlertTriangle } from 'lucide-react';
import { useSidStatus } from '@/hooks/requisicoes';

interface Props {
  /** Detalhe adicional (ex.: mensagem tratada vinda de uma resposta 503). */
  detail?: string;
  /** Quando true, exibe o banner mesmo que o ping ainda esteja carregando (útil após capturar 503 local). */
  force?: boolean;
}

/**
 * Aviso global de integração de escrita SID desabilitada.
 * Consulta `GET /api/requisicoes/sid/ping` e só aparece quando `sid_habilitado=false`
 * ou quando o co_ger_sid não está acessível. Nunca mostra credenciais, URL ou XML.
 */
export function IntegracaoOfflineBanner({ detail, force = false }: Props) {
  const { data, isLoading } = useSidStatus();

  const habilitado = data?.sid_habilitado ?? true;
  const wsdlOk = data?.ger_sid?.wsdl_ok ?? true;
  const chaOk = data?.cha_separacao?.wsdl_ok ?? true;
  const mostrar = force || (!isLoading && data && (!habilitado || !wsdlOk || !chaOk));
  if (!mostrar) return null;

  const proximo = data?.proximo_passo;

  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        <div className="font-medium">
          A integração de escrita com o ERP está temporariamente desabilitada.
        </div>
        <div className="text-amber-800">
          Consultas continuam disponíveis, mas novas requisições e movimentações não serão enviadas ao Senior
          até que o backend libere a integração. Rascunhos ficam salvos e podem ser reprocessados depois.
        </div>
        {proximo && <div className="text-xs text-amber-800">Próximo passo: {proximo}</div>}
        {detail && <div className="text-xs text-amber-700">Detalhe: {detail}</div>}
      </div>
    </div>
  );
}
