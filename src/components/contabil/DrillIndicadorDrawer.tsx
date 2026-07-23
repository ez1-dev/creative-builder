import { useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DrillAglutinadorTree } from './DrillAglutinadorTree';
import { DrillDrawer, type DrillArgs } from '@/components/dre-studio/DrillDrawer';
import type { Indicador } from '@/lib/contabil/indicadoresApi';
import { formatCurrency, formatNumberBR } from '@/lib/format';

export interface DrillIndicadorDrawerProps {
  indicador: Indicador | null;
  anomesIni: number;
  anomesFim: number;
  codemp?: number;
  codfil?: number;
  onClose: () => void;
}

function fmtValor(v: number | null, unidade: Indicador['unidade']): string {
  if (v == null) return '—';
  switch (unidade) {
    case 'R$':     return formatCurrency(v);
    case '%':      return `${formatNumberBR(v, 2)}%`;
    case 'dias':   return `${formatNumberBR(v, 0)} dias`;
    case 'índice': return formatNumberBR(v, 2);
    default:       return String(v);
  }
}

export function DrillIndicadorDrawer({
  indicador, anomesIni, anomesFim, codemp = 1, codfil, onClose,
}: DrillIndicadorDrawerProps) {
  const [razaoArgs, setRazaoArgs] = useState<DrillArgs | null>(null);

  const drill = indicador?.drill;
  const aglutinadores = drill?.aglutinadores ?? [];
  const contas = drill?.contas ?? [];
  const temDrill = aglutinadores.length > 0 || contas.length > 0;

  const paramsAgl = {
    anomes_ini: anomesIni,
    anomes_fim: anomesFim,
    codemp,
    codfil,
  };

  const abrirRazao = (args: {
    ctared: number;
    clacta?: string | null;
    descricao?: string | null;
  }) => {
    setRazaoArgs({
      modeloId: '',
      linhaId: '',
      linhaDescricao: args.descricao ?? `Conta ${args.ctared}`,
      ctared: args.ctared,
      clacta: args.clacta ?? null,
      contaDescricao: args.descricao ?? null,
      anomes_ini: anomesIni,
      anomes_fim: anomesFim,
      codemp,
      codfil,
      tipoModelo: 'DRE',
    });
  };

  return (
    <>
      <Sheet open={!!indicador} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          {indicador && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between gap-2">
                  <span>{indicador.indicador}</span>
                  <span className="text-xl font-bold tabular-nums">
                    {fmtValor(indicador.valor, indicador.unidade)}
                  </span>
                </SheetTitle>
                <SheetDescription className="text-xs">{indicador.formula}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6 text-sm">
                <div className="grid grid-cols-2 gap-3 rounded border bg-muted/30 p-3 text-xs">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Numerador</p>
                    <p className="tabular-nums">{indicador.numerador == null ? '—' : formatCurrency(indicador.numerador)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Denominador</p>
                    <p className="tabular-nums">{indicador.denominador == null ? '—' : formatCurrency(indicador.denominador)}</p>
                  </div>
                </div>

                {!temDrill && (
                  <p className="rounded border bg-muted/40 p-4 text-xs text-muted-foreground">
                    Este indicador não expõe drill-down (backend não retornou aglutinadores nem contas).
                  </p>
                )}

                {aglutinadores.map((a, i) => (
                  <div key={`${a.codagl}-${i}`} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{a.codagl}</Badge>
                      <h3 className="text-sm font-semibold">{a.descricao}</h3>
                    </div>
                    <DrillAglutinadorTree
                      codagl={a.codagl}
                      descricao={a.descricao}
                      params={{ ...paramsAgl, ...(a.params || {}) }}
                      onOpenRazao={abrirRazao}
                    />
                  </div>
                ))}

                {contas.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Contas diretas</h3>
                    <div className="rounded-md border bg-card">
                      {contas.map((c) => (
                        <div key={c.ctared} className="flex items-center justify-between border-b px-3 py-2 text-xs last:border-b-0">
                          <span>ctared {c.ctared}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px]"
                            onClick={() =>
                              abrirRazao({ ctared: c.ctared, descricao: `Conta ${c.ctared}` })
                            }
                          >
                            Ver razão →
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <DrillDrawer
        open={!!razaoArgs}
        onOpenChange={(o) => !o && setRazaoArgs(null)}
        args={razaoArgs}
      />
    </>
  );
}
