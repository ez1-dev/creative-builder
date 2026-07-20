import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, AlertTriangle, Copy, RotateCcw, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { SidRequisitarLoteResponse } from '@/types/requisicoes';

interface Props {
  resultado: SidRequisitarLoteResponse;
  onNova: () => void;
  onReenviarFalhas?: (indicesFalhos: number[]) => void;
  onIrParaLista?: () => void;
}

export function ResultadoRequisicaoLote({ resultado, onNova, onReenviarFalhas, onIrParaLista }: Props) {
  const sucessoTotal = resultado.falhas === 0 && resultado.criados > 0;
  const parcial = resultado.falhas > 0 && resultado.criados > 0;
  const falhaTotal = resultado.criados === 0;
  const indicesFalhos = resultado.itens.filter((i) => !i.ok).map((i) => i.indice);

  const copiar = (v: string) => {
    navigator.clipboard.writeText(v).then(
      () => toast({ title: 'Copiado' }),
      () => toast({ title: 'Não foi possível copiar', variant: 'destructive' }),
    );
  };

  return (
    <Card
      className={
        sucessoTotal
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : falhaTotal
            ? 'border-destructive/40 bg-destructive/5'
            : 'border-amber-500/40 bg-amber-500/5'
      }
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {sucessoTotal ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <AlertTriangle className={`h-5 w-5 ${falhaTotal ? 'text-destructive' : 'text-amber-600'}`} />
          )}
          <h3 className="text-base font-semibold">
            {sucessoTotal && resultado.numeme != null
              ? `Requisição ${resultado.numeme} criada com ${resultado.criados} ${resultado.criados === 1 ? 'item' : 'itens'}.`
              : parcial
                ? `Requisição ${resultado.numeme ?? '—'} criada com falhas parciais (${resultado.criados}/${resultado.total_solicitados} itens).`
                : 'Nenhum item foi criado no ERP.'}
          </h3>
          {resultado.numeme != null && (
            <Button size="sm" variant="ghost" onClick={() => copiar(String(resultado.numeme))} className="h-7 gap-1">
              <Copy className="h-3.5 w-3.5" /> Copiar nº
            </Button>
          )}
        </div>

        {!resultado.documento_unico && resultado.numemes.length > 1 && (
          <Alert variant="destructive">
            <AlertTitle>Mais de uma requisição foi criada</AlertTitle>
            <AlertDescription>
              O ERP registrou {resultado.numemes.length} documentos: {resultado.numemes.join(', ')}. Verifique cada um antes de reenviar.
            </AlertDescription>
          </Alert>
        )}

        {parcial && (
          <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
            <AlertTitle>Falha parcial</AlertTitle>
            <AlertDescription>
              Os itens confirmados abaixo <b>já estão no ERP</b> — reenviar tudo duplicaria. Reenvie apenas os que falharam.
            </AlertDescription>
          </Alert>
        )}

        <div className="overflow-auto rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Componente</TableHead>
                <TableHead>numeme / seqeme</TableHead>
                <TableHead>Detalhe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultado.itens.map((it) => (
                <TableRow key={it.indice} className={it.ok ? undefined : 'bg-destructive/5'}>
                  <TableCell>
                    {it.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{it.codpro}</TableCell>
                  <TableCell className="text-xs">
                    {it.ok ? (
                      <Badge variant="secondary">
                        {it.numeme}/{it.seqeme}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {it.ok ? (
                      <span className="text-emerald-700 dark:text-emerald-300">criado</span>
                    ) : (
                      <span className="text-destructive">{it.erro ?? 'Falha não detalhada pelo ERP.'}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <p className="text-[11px] text-muted-foreground">
          O número da requisição pode ser reutilizado pelo ERP após exclusão — não trate como identificador permanente.
        </p>

        <div className="flex flex-wrap justify-end gap-2 border-t pt-3">
          {onIrParaLista && (
            <Button variant="ghost" onClick={onIrParaLista}>
              Ir para lista
            </Button>
          )}
          {parcial && onReenviarFalhas && indicesFalhos.length > 0 && (
            <Button variant="outline" onClick={() => onReenviarFalhas(indicesFalhos)}>
              <RotateCcw className="mr-1 h-4 w-4" />
              Reenviar {indicesFalhos.length} item(ns) que falharam
            </Button>
          )}
          <Button onClick={onNova}>
            <Plus className="mr-1 h-4 w-4" />
            Nova requisição
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
