import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { fetchHistoricoTela, type HistoricoTelaRow, type TelemetriaOrigem } from '@/lib/navegacaoTelemetriaApi';
import { formatDateTimeBR } from '@/lib/format';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  origem: TelemetriaOrigem;
  codTela: string | null;
  nomeTela: string | null;
  dias: number;
}

export function HistoricoTelaModal({ open, onOpenChange, origem, codTela, nomeTela, dias }: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<HistoricoTelaRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !codTela) return;
    setLoading(true); setErr(null); setRows([]);
    fetchHistoricoTela({ origem, cod_tela: codTela, dias })
      .then(setRows)
      .catch((e: any) => setErr(e?.message ?? 'Erro ao carregar histórico'))
      .finally(() => setLoading(false));
  }, [open, origem, codTela, dias]);

  const isNativo = origem === 'nativo';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Histórico da Tela — {nomeTela ?? codTela ?? '-'}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : err ? (
            <div className="p-4 text-sm text-destructive">{err}</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Sem registros no período.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>{isNativo ? 'Observação' : 'Sistema'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{formatDateTimeBR(r.data_hora)}</TableCell>
                    <TableCell className="text-xs">{(isNativo ? r.nomusu : r.usuario) ?? '-'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.acao ?? '-'}</Badge></TableCell>
                    <TableCell className="text-xs">{r.modulo ?? '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{(isNativo ? r.observacao : r.sistema) ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
