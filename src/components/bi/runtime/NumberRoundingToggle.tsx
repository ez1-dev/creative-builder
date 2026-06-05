import { useEffect } from 'react';
import { Hash } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useBiDisplayPrefs } from '@/hooks/useBiDisplayPrefs';
import {
  NUMBER_ROUNDING_DESC,
  NUMBER_ROUNDING_LABEL,
  setNumberRoundingMode,
  type NumberRoundingMode,
} from '@/lib/bi/numberFormatMode';

const MODES: NumberRoundingMode[] = ['full', 'no-decimals', 'abbreviated'];

interface Props {
  /**
   * Se informado, o toggle controla o override por página (e exibe o botão
   * "Usar padrão"). Se ausente, controla o padrão global do usuário.
   */
  pageKey?: string;
  className?: string;
}

/**
 * Toggle compacto de modo de arredondamento dos números do BI.
 *
 * Sem `pageKey`: controla o padrão global do usuário (usado na Biblioteca BI).
 * Com `pageKey`: controla o override por página (usado em /bi/comercial).
 *
 * Também sincroniza o singleton `numberFormatMode` para que os formatadores
 * em `components/bi/utils/formatters.ts` reflitam o modo efetivo da página atual.
 */
export function NumberRoundingToggle({ pageKey, className }: Props) {
  const { prefs, loading, setGlobalRounding, setPageRounding, effectiveRoundingFor } =
    useBiDisplayPrefs();

  const effective = effectiveRoundingFor(pageKey);
  const hasPageOverride = !!pageKey && !!prefs.numberRounding.pages[pageKey];

  // Mantém o singleton sincronizado enquanto o componente está montado.
  useEffect(() => {
    setNumberRoundingMode(effective);
  }, [effective]);

  const onChange = (value: string) => {
    if (!value) return;
    const mode = value as NumberRoundingMode;
    if (pageKey) setPageRounding(pageKey, mode);
    else setGlobalRounding(mode);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className={className}>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="hidden xl:inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Hash className="h-3 w-3" /> Números:
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              Modo de arredondamento aplicado aos valores deste dashboard
              (KPIs, gráficos e tabelas). Percentuais não são afetados.
            </TooltipContent>
          </Tooltip>

          <ToggleGroup
            type="single"
            size="sm"
            value={effective}
            onValueChange={onChange}
            disabled={loading}
            className="h-8"
          >
            {MODES.map((m) => (
              <Tooltip key={m}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem value={m} className="h-7 px-2 text-[11px]">
                    {NUMBER_ROUNDING_LABEL[m]}
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Ex.: {NUMBER_ROUNDING_DESC[m]}
                </TooltipContent>
              </Tooltip>
            ))}
          </ToggleGroup>

          {hasPageOverride && pageKey && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] text-muted-foreground"
                  onClick={() => setPageRounding(pageKey, null)}
                >
                  Usar padrão
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Remover override desta página e voltar ao padrão global
                ({NUMBER_ROUNDING_LABEL[prefs.numberRounding.global]}).
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
