import { useNavigate } from 'react-router-dom';
import { Loader2, ExternalLink } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useContaRollup } from '@/hooks/contabil/useAglutinadorDrill';

export interface RollupContaPanelProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ctared: number | null;
  codemp?: number | string;
  anomesIni?: number | string;
  anomesFim?: number | string;
}

export function RollupContaPanel({
  open, onOpenChange, ctared, codemp = 1, anomesIni, anomesFim,
}: RollupContaPanelProps) {
  const navigate = useNavigate();
  const q = useContaRollup(ctared, codemp, open);

  const irParaIndicadores = (nome: string) => {
    const sp = new URLSearchParams();
    if (anomesIni) sp.set('anomes_ini', String(anomesIni));
    if (anomesFim) sp.set('anomes_fim', String(anomesFim));
    if (codemp) sp.set('codemp', String(codemp));
    sp.set('highlight', nome);
    onOpenChange(false);
    navigate(`/contabilidade/indicadores?${sp.toString()}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Onde este número entra?</DialogTitle>
          <DialogDescription className="text-xs">
            Cadeia de aglutinadores e indicadores impactados por esta conta.
          </DialogDescription>
        </DialogHeader>

        {q.isLoading && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando rollup...
          </div>
        )}
        {q.isError && (
          <p className="text-sm text-destructive">Falha: {q.error.message}</p>
        )}
        {q.data && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Conta</p>
              <p className="font-medium">
                {q.data.conta?.clacta ? `${q.data.conta.clacta} — ` : ''}
                {q.data.conta?.descricao ?? `ctared ${q.data.ctared}`}
              </p>
            </div>

            <div>
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                Aglutinadores ({q.data.aglutinadores.length})
              </p>
              <div className="space-y-1">
                {q.data.aglutinadores.map((a) => (
                  <div key={a.codagl} className="flex items-center gap-2 rounded border bg-muted/30 px-2 py-1 text-xs">
                    <Badge variant="outline" className="text-[10px]">{a.codagl}</Badge>
                    <span className="flex-1 truncate">{a.descricao}</span>
                    {a.direto && <Badge className="text-[10px]">direto</Badge>}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                Indicadores afetados ({q.data.indicadores_afetados.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {q.data.indicadores_afetados.map((nome) => (
                  <Button
                    key={nome}
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 text-xs"
                    onClick={() => irParaIndicadores(nome)}
                  >
                    {nome}
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
