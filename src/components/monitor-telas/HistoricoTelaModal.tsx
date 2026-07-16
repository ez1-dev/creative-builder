import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  fetchHistoricoTela,
  getUsuarioLabel,
  type HistoricoTelaRow,
  type TelemetriaOrigem,
} from '@/lib/navegacaoTelemetriaApi';
import { formatDateTimeBR } from '@/lib/format';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  origem: TelemetriaOrigem;
  codTela: string | null;
  nomeTela: string | null;
  dias: number;
}

const telaLabel = (r: HistoricoTelaRow, codTelaFallback: string | null) =>
  r.nome_tela || r.descricao_tela || r.sig_processo || codTelaFallback || 'Tela não identificada';

export function HistoricoTelaModal({ open, onOpenChange, origem, codTela, nomeTela, dias }: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<HistoricoTelaRow[]>([]);
  const [err, setErr] = useState<any>(null);

  useEffect(() => {
    if (!open || !codTela) return;
    setLoading(true); setErr(null); setRows([]);
    fetchHistoricoTela({ origem, cod_tela: codTela, dias })
      .then(setRows)
      .catch((e: any) => setErr(e))
      .finally(() => setLoading(false));
  }, [open, origem, codTela, dias]);

  const isNativo = origem === 'nativo';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Histórico da Tela — {nomeTela ?? codTela ?? '-'}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {isNativo ? 'Carregando telemetria do ERP...' : 'Carregando histórico...'}
            </div>
          ) : err ? (
            <div className="space-y-2 p-4">
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {isNativo
                  ? 'Não foi possível carregar a telemetria nativa.'
                  : 'Não foi possível carregar o histórico.'}
              </div>
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Detalhes técnicos</summary>
                <pre className="mt-2 whitespace-pre-wrap break-all">
                  {err?.message ?? String(err)}
                </pre>
              </details>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {isNativo
                ? 'Nenhum evento nativo encontrado para os filtros selecionados.'
                : 'Sem registros no período.'}
            </div>
          ) : isNativo ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Tela/Processo</TableHead>
                  <TableHead>Sigla</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const login = r.nomusu?.trim();
                  const detalhes = r.observacao ?? '';
                  return (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{formatDateTimeBR(r.data_hora)}</TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium" title={getUsuarioLabel(r)}>
                          {login || 'Não identificado'}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {r.codusu != null && String(r.codusu).trim() !== '' ? r.codusu : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{telaLabel(r, codTela)}</TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {r.sig_processo ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {r.evento ?? r.acao ?? '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.codemp != null && String(r.codemp).trim() !== '' ? r.codemp : '—'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.codfil != null && String(r.codfil).trim() !== '' ? r.codfil : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.origem ?? '-'}</TableCell>
                      <TableCell
                        className="max-w-[240px] truncate text-xs text-muted-foreground"
                        title={detalhes}
                      >
                        {detalhes || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Sistema</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{formatDateTimeBR(r.data_hora)}</TableCell>
                    <TableCell className="text-xs">{r.usuario ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{r.acao ?? '-'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.modulo ?? '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.sistema ?? '-'}</TableCell>
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
