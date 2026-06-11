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

const MODES: NumberRoundingMode[] = ['full', 'no-decimals', 'abbreviated', 'millions'];

interface Props {
  /**
   * Se informado (e sem `value`), o toggle controla o override por página
   * persistindo direto em `user_preferences` (modo "auto-save" — usado
   * fora do fluxo de edição com rascunho).
   */
  pageKey?: string;
  className?: string;
  /**
   * Modo controlado: quando `value` está definido, o toggle não persiste
   * sozinho. Apenas chama `onChange`/`onResetToGlobal` e sincroniza o
   * singleton para refletir a escolha no preview ao vivo.
   */
  value?: NumberRoundingMode;
  onChange?: (mode: NumberRoundingMode) => void;
  onResetToGlobal?: () => void;
  /** Força exibir "Usar padrão" mesmo sem override salvo (útil no draft). */
  showResetButton?: boolean;
}

/**
 * Toggle compacto de modo de arredondamento dos números do BI.
 *
 * - Sem `pageKey` e sem `value`: controla o padrão global do usuário.
 * - Com `pageKey` e sem `value`: persiste override por página direto.
 * - Com `value`+`onChange`: modo controlado (rascunho); o pai decide
 *   quando persistir (ex.: ao clicar em Salvar do dashboard).
 */
export function NumberRoundingToggle({
  pageKey, className, value, onChange, onResetToGlobal, showResetButton,
}: Props) {
  const { prefs, loading, setGlobalRounding, setPageRounding, effectiveRoundingFor } =
    useBiDisplayPrefs();

  const isControlled = value !== undefined;
  const effective = isControlled ? (value as NumberRoundingMode) : effectiveRoundingFor(pageKey);
  const hasPageOverride = !!pageKey && !!prefs.numberRounding.pages[pageKey];
  const showReset = showResetButton ?? (hasPageOverride && !!pageKey);

  // Mantém o singleton sincronizado enquanto o componente está montado.
  useEffect(() => {
    setNumberRoundingMode(effective);
  }, [effective]);

  const handleChange = (v: string) => {
    if (!v) return;
    const mode = v as NumberRoundingMode;
    if (isControlled) {
      onChange?.(mode);
      return;
    }
    if (pageKey) setPageRounding(pageKey, mode);
    else setGlobalRounding(mode);
  };

  const handleReset = () => {
    if (isControlled) {
      onResetToGlobal?.();
      return;
    }
    if (pageKey) setPageRounding(pageKey, null);
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
            onValueChange={handleChange}
            disabled={loading && !isControlled}
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

          {showReset && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px] text-muted-foreground"
                  disabled={loading && !isControlled}
                  onClick={handleReset}
                >
                  Usar padrão
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Voltar ao padrão global ({NUMBER_ROUNDING_LABEL[prefs.numberRounding.global]}).
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
