import { AlertTriangle } from 'lucide-react';

interface Props {
  /** Mensagem opcional adicional (ex.: detail vindo da API). */
  detail?: string;
}

export function IntegracaoOfflineBanner({ detail }: Props) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-medium">
          Integração de escrita com o ERP ainda não está habilitada.
        </div>
        <div className="text-amber-800">
          A requisição foi mantida como pendente de integração. Assim que o backend liberar a escrita,
          o processamento seguirá automaticamente — não é necessário reenviar.
        </div>
        {detail ? <div className="mt-1 text-xs text-amber-700">Detalhe: {detail}</div> : null}
      </div>
    </div>
  );
}
