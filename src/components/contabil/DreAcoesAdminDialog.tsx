import { useState } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Database, Calculator, RefreshCw } from 'lucide-react';
import { postDreSincronizarErp, postDreRecalcular } from '@/lib/contabil/dreMatrizApi';

export interface DreAcoesAdminProps {
  ano: number;
  mesIni: string;
  mesFim: string;
  modeloId?: string | null;
  isAdmin: boolean;
  onAtualizarTela: () => void;
  loading?: boolean;
}

type PendingAction = 'sync' | 'recalc' | null;

export function DreAcoesAdmin({ ano, mesIni, mesFim, modeloId, isAdmin, onAtualizarTela, loading }: DreAcoesAdminProps) {
  const [pending, setPending] = useState<PendingAction>(null);
  const [running, setRunning] = useState(false);

  const executar = async () => {
    if (!pending) return;
    setRunning(true);
    try {
      if (pending === 'sync') {
        await postDreSincronizarErp({ ano, mes_ini: mesIni, mes_fim: mesFim });
        toast.success('Sincronização com o ERP disparada.');
      } else {
        await postDreRecalcular({ ano, mes_ini: mesIni, mes_fim: mesFim, modelo_id: modeloId ?? undefined });
        toast.success('Recálculo da DRE disparado.');
      }
      onAtualizarTela();
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao executar ação.');
    } finally {
      setRunning(false);
      setPending(null);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="h-8" onClick={onAtualizarTela} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Atualizar tela
        </Button>

        <AdminButton
          disabled={!isAdmin}
          icon={<Database className="h-3.5 w-3.5 mr-1" />}
          label="Sincronizar ERP"
          onClick={() => setPending('sync')}
        />
        <AdminButton
          disabled={!isAdmin}
          icon={<Calculator className="h-3.5 w-3.5 mr-1" />}
          label="Recalcular DRE"
          onClick={() => setPending('recalc')}
        />
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && !running && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending === 'sync' ? 'Sincronizar ERP?' : 'Recalcular DRE?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending === 'sync'
                ? 'Esta ação chamará o ERP para atualizar os saldos contábeis do período selecionado. Pode levar alguns minutos.'
                : 'Esta ação recalculará a materialização da DRE usando os últimos saldos sincronizados.'}
              <br />
              Período: <strong>{mesIni}/{ano} a {mesFim}/{ano}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={running}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executar} disabled={running}>
              {running ? 'Executando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function AdminButton({
  disabled, icon, label, onClick,
}: { disabled: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  const btn = (
    <Button size="sm" variant="outline" className="h-8" onClick={onClick} disabled={disabled}>
      {icon}
      {label}
    </Button>
  );
  if (!disabled) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild><span>{btn}</span></TooltipTrigger>
      <TooltipContent>Requer permissão administrativa contábil.</TooltipContent>
    </Tooltip>
  );
}
