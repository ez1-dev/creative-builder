import { useState } from 'react';
import { AlertTriangle, Info, WifiOff, LogIn, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSidStatus, useSidWriteEnabled, SID_PING_QUERY_KEY } from '@/hooks/requisicoes';
import { useUserPermissions } from '@/hooks/useUserPermissions';

interface Props {
  /** Detalhe adicional vindo de respostas 503 tratadas. */
  detail?: string;
}

/**
 * Faixa compacta de status da integração SID.
 * Diferencia: sessão expirada (401), backend inalcançável (rede/URL) e SID desabilitado (backend online).
 * Detalhes técnicos só aparecem para administradores.
 */
export function IntegracaoStatusChip({ detail }: Props) {
  const { data, isLoading, isFetching } = useSidStatus();
  const sw = useSidWriteEnabled();
  const { isAdmin } = useUserPermissions();
  const qc = useQueryClient();
  const nav = useNavigate();
  const loc = useLocation();
  const [openTech, setOpenTech] = useState(false);

  if (isLoading) return null;

  const isSessao = sw.kind === 'sessao_expirada';
  const inalcancavel = sw.kind === 'inalcancavel';
  const habilitado = data?.sid_habilitado ?? true;
  const wsdlOk = data?.ger_sid?.wsdl_ok ?? true;
  const chaOk = data?.cha_separacao?.wsdl_ok ?? true;
  const offline = isSessao || inalcancavel || !habilitado || !wsdlOk || !chaOk || Boolean(detail);
  if (!offline) return null;

  const retry = () => qc.invalidateQueries({ queryKey: SID_PING_QUERY_KEY });
  const login = () => nav(`/login?redirect=${encodeURIComponent(loc.pathname + loc.search)}`);

  const Icon = isSessao ? LogIn : inalcancavel ? WifiOff : AlertTriangle;
  const texto = isSessao
    ? 'Sua sessão expirou. Faça login novamente para enviar requisições.'
    : inalcancavel
    ? 'Não foi possível falar com o servidor. Verifique a URL da API ou o serviço/túnel. Rascunhos ficam salvos localmente.'
    : 'Integração com o Senior temporariamente desabilitada. Consultas continuam disponíveis e a requisição pode ser salva como rascunho.';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
        <Icon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="min-w-0 flex-1">{texto}</span>
        {isSessao && (
          <Button size="sm" variant="default" onClick={login} className="h-7">
            <LogIn className="mr-1 h-3.5 w-3.5" /> Fazer login
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={retry} disabled={isFetching} className="h-7">
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Tentar de novo
        </Button>
        {isAdmin && data && (
          <Button variant="outline" size="sm" onClick={() => setOpenTech(true)} className="h-7">
            <Info className="mr-1 h-3.5 w-3.5" /> Detalhes técnicos
          </Button>
        )}
      </div>

      {isAdmin && data && (
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
