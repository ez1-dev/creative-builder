import { ArrowLeft, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DrillContexto, DrillResponse } from '@/lib/bi/comercialDrillApi';
import { CTX_LABELS } from '@/lib/bi/comercialDrillCatalog';
import type { ComercialDrillStack } from '@/hooks/useComercialDrillStack';
import { cn } from '@/lib/utils';

interface Props {
  stack: ComercialDrillStack;
  response?: DrillResponse;
}

interface Step {
  key: string;
  label: string;
  value?: number;
  removeKey?: keyof DrillContexto;
}

export function DrillEmptyDiagnostico({ stack, response }: Props) {
  const cur = stack.current;
  const ctx = cur?.contexto ?? {};
  const diag = response?.diagnostico;

  const steps: Step[] = [
    { key: 'qtd_linhas_base', label: 'Base' },
    { key: 'qtd_linhas_apos_unidade', label: 'Após unidade' },
    { key: 'qtd_linhas_apos_mes', label: 'Após mês', removeKey: 'anomes_emissao' },
    { key: 'qtd_linhas_apos_uf', label: 'Após UF', removeKey: 'cd_estado' },
    { key: 'qtd_linhas_apos_cliente', label: 'Após cliente', removeKey: 'cd_cliente' },
    { key: 'qtd_linhas_apos_revenda', label: 'Após revenda', removeKey: 'cd_rev_pedido' },
    { key: 'qtd_linhas_apos_produto', label: 'Após produto', removeKey: 'cd_produto' },
  ].map((s) => ({ ...s, value: (diag as any)?.[s.key] }));

  // Primeiro passo em que zerou (depois de já existir base > 0).
  let zeroIndex = -1;
  if (diag) {
    let prev: number | undefined;
    for (let i = 0; i < steps.length; i++) {
      const v = steps[i].value;
      if (typeof v === 'number') {
        if (v === 0 && (prev === undefined || prev > 0)) {
          zeroIndex = i;
          break;
        }
        prev = v;
      }
    }
  }

  const removable: { key: keyof DrillContexto; label: string }[] = [];
  (['cd_cliente', 'cd_produto', 'cd_rev_pedido', 'cd_estado', 'cd_nf', 'anomes_emissao'] as (keyof DrillContexto)[])
    .forEach((k) => {
      if (ctx[k]) removable.push({ key: k, label: `Remover ${CTX_LABELS[k] ?? k}` });
    });

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">
          Não existem registros para esta combinação de filtros.
        </div>
        <div className="text-xs text-muted-foreground">
          Use o diagnóstico abaixo ou remova um filtro para ampliar o resultado.
        </div>
      </div>

      {diag && (
        <div className="w-full max-w-md rounded-md border bg-muted/30">
          <table className="w-full text-xs">
            <tbody>
              {steps.map((s, i) => {
                const has = typeof s.value === 'number';
                const isCulprit = i === zeroIndex;
                return (
                  <tr
                    key={s.key}
                    className={cn(
                      'border-b last:border-b-0',
                      isCulprit && 'bg-destructive/10',
                    )}
                  >
                    <td className="px-3 py-1.5 text-left text-muted-foreground">{s.label}</td>
                    <td className={cn('px-3 py-1.5 text-right font-mono', isCulprit && 'font-semibold text-destructive')}>
                      {has ? s.value!.toLocaleString('pt-BR') : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {s.removeKey && ctx[s.removeKey] && (
                        <button
                          type="button"
                          onClick={() => stack.removeContextKey(s.removeKey!)}
                          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
                          title={`Remover ${CTX_LABELS[s.removeKey] ?? s.removeKey}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {removable.map((r) => (
          <Button
            key={r.key}
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => stack.removeContextKey(r.key)}
          >
            <X className="h-3 w-3 mr-1" /> {r.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant="secondary"
          className="h-7 text-xs"
          onClick={() => stack.pop()}
          disabled={stack.levels.length <= 1}
        >
          <ArrowLeft className="h-3 w-3 mr-1" /> Voltar nível anterior
        </Button>
      </div>
    </div>
  );
}
