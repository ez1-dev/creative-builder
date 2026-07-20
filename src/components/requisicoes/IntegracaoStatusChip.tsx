import { useState } from 'react';
import { AlertTriangle, Info, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSidStatus, useSidWriteEnabled } from '@/hooks/requisicoes';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface Props {
  /** Detalhe adicional vindo de respostas 503 tratadas. */
  detail?: string;
}

/**
 * Faixa compacta de status da integração SID.
 * Diferencia "backend inalcançável" (rede/URL) de "SID desabilitado" (backend online).
 * Detalhes técnicos só aparecem para administradores.
 */
export function IntegracaoStatusChip({ detail }: Props) {
  const { data, isLoading } = useSidStatus();
  const sw = useSidWriteEnabled();
  const { isAdmin } = useUserPermissions();
  const [openTech, setOpenTech] = useState(false);

  if (isLoading) return null;
  const inalcancavel = sw.kind === 'inalcancavel';
  const habilitado = data?.sid_habilitado ?? true;
  const wsdlOk = data?.ger_sid?.wsdl_ok ?? true;
  const chaOk = data?.cha_separacao?.wsdl_ok ?? true;
  const offline = inalcancavel || !habilitado || !wsdlOk || !chaOk || Boolean(detail);
  if (!offline) return null;

  const Icon = inalcancavel ? WifiOff : AlertTriangle;
  const texto = inalcancavel
    ? 'Backend do ERP inalcançável. Verifique a URL da API ou o túnel/serviço. Rascunhos ficam salvos localmente.'
    : 'Integração com o Senior temporariamente desabilitada. Consultas continuam disponíveis e a requisição pode ser salva como rascunho.';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
        <Icon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="flex-1 min-w-0">{texto}</span>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setOpenTech(true)} className="h-7">
            <Info className="mr-1 h-3.5 w-3.5" /> Ver detalhes técnicos
          </Button>
        )}
      </div>


      {isAdmin && (
        <Dialog open={openTech} onOpenChange={setOpenTech}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalhes técnicos da integração SID</DialogTitle>
              <DialogDescription>Informações reservadas ao administrador.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <Row label="SID_HABILITADO" value={String(habilitado)} />
              <Row label="co_ger_sid — WSDL" value={wsdlOk ? 'OK' : 'FALHA'} />
              {data.ger_sid?.url && <Row label="co_ger_sid — URL" value={data.ger_sid.url} mono />}
              {data.ger_sid?.operacao && <Row label="co_ger_sid — Operação" value={data.ger_sid.operacao} mono />}
              <Row label="cha_separacao — WSDL" value={chaOk ? 'OK' : 'FALHA'} />
              {data.cha_separacao?.url && <Row label="cha_separacao — URL" value={data.cha_separacao.url} mono />}
              {data.cha_separacao?.operacao && <Row label="cha_separacao — Operação" value={data.cha_separacao.operacao} mono />}
              {data.proximo_passo && <Row label="Próximo passo" value={data.proximo_passo} />}
              {detail && <Row label="Último erro" value={detail} />}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={mono ? 'break-all font-mono text-xs' : 'text-sm'}>{value}</div>
    </div>
  );
}
