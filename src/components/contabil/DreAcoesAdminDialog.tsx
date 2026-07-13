import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Database, Calculator, RefreshCw } from 'lucide-react';
import {
  postDreSincronizarErp,
  postDreMaterializar,
  FONTE_VALIDACAO_DRE,
} from '@/lib/contabil/dreMatrizApi';

export interface DreAcoesAdminProps {
  ano: number;
  mesIni: string;   // "01".."12"
  mesFim: string;
  modeloId?: string | null;
  fonteSaldo?: string | null;
  isAdmin: boolean;
  onAtualizarTela: () => void;
  loading?: boolean;
}

type PendingAction = 'sync' | 'recalc' | null;

export function DreAcoesAdmin({
  ano, mesIni, mesFim, modeloId, fonteSaldo, isAdmin, onAtualizarTela, loading,
}: DreAcoesAdminProps) {
  const [pending, setPending] = useState<PendingAction>(null);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState<string>('');
  const queryClient = useQueryClient();

  const anomes_ini = `${ano}${mesIni}`;
  const anomes_fim = `${ano}${mesFim}`;
  const fonte = fonteSaldo || FONTE_VALIDACAO_DRE;

  const executar = async () => {
    if (!pending) return;
    setRunning(true);
    try {
      if (pending === 'sync') {
        setStep('Sincronizando saldos…');
        toast.info('Sincronizando saldos com o ERP…');
        await postDreSincronizarErp({ anomes_ini, anomes_fim, fonte_saldo: fonte, limpar_periodo: true });

        setStep('Recalculando DRE…');
        toast.info('Sincronização concluída. Recalculando DRE…');
        await postDreMaterializar({ anomes_ini, anomes_fim, modelo_id: modeloId ?? undefined });

        setStep('Atualizando tela…');
        queryClient.removeQueries({ queryKey: ['dre-conciliacao-bi'] });
        queryClient.invalidateQueries({ queryKey: ['dre-api-health'] });
        onAtualizarTela();
        toast.success('Sincronização + recálculo concluídos.');
      } else {
        setStep('Recalculando DRE…');
        await postDreMaterializar({ anomes_ini, anomes_fim, modelo_id: modeloId ?? undefined });
        queryClient.removeQueries({ queryKey: ['dre-conciliacao-bi'] });
        onAtualizarTela();
        toast.success('Recálculo da DRE concluído.');
      }
    } catch (e: any) {
      toast.error(`Falha em "${step || 'ação'}": ${e?.message ?? e}`);
    } finally {
      setRunning(false);
      setStep('');
      setPending(null);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="h-8" onClick={onAtualizarTela} disabled={loading || running}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Atualizar tela
        </Button>

        <AdminButton
          disabled={!isAdmin || running}
          icon={<Database className="h-3.5 w-3.5 mr-1" />}
          label="Sincronizar saldos"
          onClick={() => setPending('sync')}
        />
        <AdminButton
          disabled={!isAdmin || running}
          icon={<Calculator className="h-3.5 w-3.5 mr-1" />}
          label="Recalcular DRE"
          onClick={() => setPending('recalc')}
        />
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && !running && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending === 'sync' ? 'Sincronizar saldos com o ERP?' : 'Recalcular DRE?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {pending === 'sync' ? (
                  <>
                    Esta ação chamará o ERP para atualizar os saldos e, em seguida, recalculará
                    a materialização da DRE. Pode levar alguns minutos.
                    <ul className="mt-2 text-xs list-disc list-inside">
                      <li>Período: <strong>{anomes_ini} a {anomes_fim}</strong></li>
                      <li>Fonte de saldo: <strong>{fonte}</strong></li>
                      <li>Limpar período antes de sincronizar: <strong>sim</strong></li>
                    </ul>
                  </>
                ) : (
                  <>
                    Recalcular a materialização da DRE usando os últimos saldos sincronizados
                    do período <strong>{anomes_ini} a {anomes_fim}</strong>.
                  </>
                )}
                {running && step && (
                  <div className="mt-3 text-xs text-muted-foreground">→ {step}</div>
                )}
              </div>
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
