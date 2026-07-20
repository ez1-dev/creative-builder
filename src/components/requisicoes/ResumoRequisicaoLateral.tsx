import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Save, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ResumoStats {
  opLabel: string;
  qtdItens: number;
  qtdTotal: number;
  comSaldo: number;
  semSaldo: number;
  acimaNecessidade: number;
  tipoAtendimentoLabel: string;
  depositoDestino?: string;
  integracaoOnline: boolean;
}

interface Props {
  stats: ResumoStats;
  step: number;
  canContinue: boolean;
  canEnviar: boolean;
  enviando: boolean;
  onContinue: () => void;
  onBack: () => void;
  onCancel: () => void;
  onSalvarRascunho: () => void;
  onEnviar: () => void;
  className?: string;
}

export function ResumoRequisicaoLateral(props: Props) {
  const { stats, step, canContinue, canEnviar, enviando, className } = props;
  return (
    <Card className={cn('shadow-sm', className)}>
      <CardContent className="space-y-4 p-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Resumo da requisição</div>
          <div className="mt-1 truncate text-sm font-semibold">{stats.opLabel || '—'}</div>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <Item label="Itens" value={stats.qtdItens} />
          <Item label="Qtd. total" value={stats.qtdTotal} />
          <Item label="Com saldo" value={stats.comSaldo} tone="success" />
          <Item label="Sem saldo" value={stats.semSaldo} tone={stats.semSaldo > 0 ? 'destructive' : undefined} />
          <Item label="Acima do necessário" value={stats.acimaNecessidade} tone={stats.acimaNecessidade > 0 ? 'warning' : undefined} />
          <Item label="Atendimento" value={stats.tipoAtendimentoLabel} />
          {stats.depositoDestino && <Item label="Dep. destino" value={stats.depositoDestino} />}
        </dl>

        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Integração</div>
          <Badge
            variant="outline"
            className={cn(
              'mt-1',
              stats.integracaoOnline
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
            )}
          >
            {stats.integracaoOnline ? 'Online' : 'Desabilitada'}
          </Badge>
        </div>

        <div className="space-y-2 border-t pt-3">
          {step < 4 ? (
            <>
              <Button className="w-full" onClick={props.onContinue} disabled={!canContinue}>
                Continuar
              </Button>
              <Button className="w-full" variant="outline" onClick={props.onSalvarRascunho} disabled={stats.qtdItens === 0 || enviando} title="Salva apenas neste navegador. O ERP não é notificado.">
                <Save className="mr-1 h-4 w-4" /> Salvar rascunho (local)
              </Button>
              <Button className="w-full" variant="ghost" onClick={props.onCancel}>
                <X className="mr-1 h-4 w-4" /> Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button className="w-full" onClick={props.onEnviar} disabled={!canEnviar || enviando}>
                <Send className="mr-1 h-4 w-4" /> {enviando ? 'Enviando…' : 'Enviar requisição'}
              </Button>
              <Button className="w-full" variant="outline" onClick={props.onSalvarRascunho} disabled={enviando} title="Salva apenas neste navegador. O ERP não é notificado.">
                <Save className="mr-1 h-4 w-4" /> Salvar rascunho (local)
              </Button>
              <Button className="w-full" variant="ghost" onClick={props.onBack}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Item({ label, value, tone }: { label: string; value: string | number; tone?: 'success' | 'warning' | 'destructive' }) {
  const toneCls =
    tone === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
    tone === 'warning' ? 'text-amber-600 dark:text-amber-400' :
    tone === 'destructive' ? 'text-destructive' : 'text-foreground';
  return (
    <>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('text-sm font-medium tabular-nums text-right', toneCls)}>{value}</dd>
    </>
  );
}
