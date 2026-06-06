import { ArrowLeft, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DrillContexto, DrillResponse } from '@/lib/bi/comercialDrillApi';
import { CTX_LABELS } from '@/lib/bi/comercialDrillCatalog';
import type { ComercialDrillStack } from '@/hooks/useComercialDrillStack';
import { cn } from '@/lib/utils';

interface Props {
  stack: ComercialDrillStack;
  response?: DrillResponse;
}

interface StepDef {
  key: string;
  label: string;
  removeKey?: keyof DrillContexto;
}

const DIAG_STEPS: StepDef[] = [
  { key: 'qtd_linhas_base', label: 'Base' },
  { key: 'qtd_linhas_apos_unidade', label: 'Após unidade' },
  { key: 'qtd_linhas_apos_mes', label: 'Após mês', removeKey: 'anomes_emissao' },
  { key: 'qtd_linhas_apos_uf', label: 'Após UF', removeKey: 'cd_estado' },
  { key: 'qtd_linhas_apos_cliente', label: 'Após cliente', removeKey: 'cd_cliente' },
  { key: 'qtd_linhas_apos_revenda', label: 'Após revenda', removeKey: 'cd_rev_pedido' },
  { key: 'qtd_linhas_apos_produto', label: 'Após produto', removeKey: 'cd_produto' },
  { key: 'qtd_linhas_apos_origem', label: 'Após origem', removeKey: 'cd_origem' },
  { key: 'qtd_linhas_apos_nf', label: 'Após NF', removeKey: 'cd_nf' },
  { key: 'qtd_linhas_apos_obra', label: 'Após obra', removeKey: 'cd_prj' },
  { key: 'qtd_linhas_apos_categoria', label: 'Após categoria', removeKey: 'categoria_custom' },
];

const ALL_CTX_KEYS: (keyof DrillContexto)[] = [
  'anomes_emissao', 'cd_estado', 'cd_cliente', 'cd_prj', 'cd_rev_pedido',
  'cd_origem', 'cd_tp_movimento', 'cd_tns', 'cd_nf', 'cd_produto',
  'cd_derivacao', 'categoria_custom',
];

export function DrillEmptyDiagnostico({ stack, response }: Props) {
  const cur = stack.current;
  const ctx = cur?.contexto ?? {};
  const diag = response?.diagnostico;

  // Mantém só passos do diagnóstico que existem na resposta.
  const steps = DIAG_STEPS
    .map((s) => ({ ...s, value: (diag as any)?.[s.key] as number | undefined }))
    .filter((s) => typeof s.value === 'number');

  // Primeiro passo em que zerou (depois de já existir base > 0).
  let zeroIndex = -1;
  if (steps.length) {
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

  const filtroZerouLabel = (diag as any)?.filtro_que_zerou
    ?? (zeroIndex >= 0 ? steps[zeroIndex].label : null);

  const aplicados = ALL_CTX_KEYS
    .filter((k) => ctx[k] != null && String(ctx[k]).length > 0)
    .map((k) => ({ key: k, label: CTX_LABELS[k] ?? k, value: String(ctx[k]) }));

  const baseTemDados = typeof (diag as any)?.qtd_linhas_apos_unidade === 'number'
    && (diag as any).qtd_linhas_apos_unidade > 0;

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">
          Não existem registros para esta combinação de filtros.
        </div>
        <div className="text-xs text-muted-foreground">
          Use o diagnóstico abaixo ou remova um filtro para ampliar o resultado.
        </div>
        {baseTemDados && (
          <div className="text-xs text-foreground mt-2 max-w-md">
            Existem dados para unidade/período, mas a combinação de filtros adicionais zerou o resultado.
          </div>
        )}
      </div>

      {filtroZerouLabel && (
        <div className="inline-flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          Filtro que zerou: {filtroZerouLabel}
        </div>
      )}

      {aplicados.length > 0 && (
        <div className="w-full max-w-md rounded-md border bg-muted/20 p-2">
          <div className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Filtros aplicados
          </div>
          <div className="flex flex-wrap gap-1.5 px-2 py-1">
            {aplicados.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => stack.removeContextKey(f.key)}
                className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] hover:bg-muted"
                title={`Remover ${f.label}`}
              >
                <span className="text-muted-foreground">{f.label}:</span>
                <span className="font-medium text-foreground">{f.value}</span>
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {steps.length > 0 && (
        <div className="w-full max-w-md rounded-md border bg-muted/30">
          <table className="w-full text-xs">
            <tbody>
              {steps.map((s, i) => {
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
                      {s.value!.toLocaleString('pt-BR')}
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
