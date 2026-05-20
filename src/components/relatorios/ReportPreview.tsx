import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, FileSpreadsheet, FileText, FileDown, AlertCircle } from 'lucide-react';
import { previewSql, exportarRelatorio, gravarExecucao } from '@/lib/relatorios/api';
import { checkSqlSafe } from '@/lib/relatorios/parseSqlParams';
import type { PreviewResult, Relatorio, RelatorioParametro } from '@/lib/relatorios/types';
import { toast } from 'sonner';

interface Props {
  relatorio: Partial<Relatorio>;
  parametros: Omit<RelatorioParametro, 'id' | 'relatorio_id'>[];
  onColumnsDetected?: (cols: string[]) => void;
}

export function ReportPreview({ relatorio, parametros, onColumnsDetected }: Props) {
  const [paramValues, setParamValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(parametros.map((p) => [p.nome, p.valor_padrao ?? ''])),
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function executar() {
    const safe = checkSqlSafe(relatorio.sql_query ?? '');
    if (safe) {
      setErro(safe);
      return;
    }
    setErro(null);
    setLoading(true);
    const t0 = performance.now();
    try {
      const typed: Record<string, unknown> = {};
      for (const p of parametros) {
        const raw = paramValues[p.nome] ?? '';
        if (p.tipo === 'numero') typed[p.nome] = raw === '' ? null : Number(raw);
        else if (p.tipo === 'booleano') typed[p.nome] = raw === 'true';
        else typed[p.nome] = raw === '' ? null : raw;
      }
      const res = await previewSql(relatorio.sql_query ?? '', typed);
      setResult(res);
      const cols = res.colunas?.map((c) => c.nome) ?? Object.keys(res.linhas[0] ?? {});
      onColumnsDetected?.(cols);
      if (relatorio.id) {
        await gravarExecucao({
          relatorio_id: relatorio.id,
          parametros: typed,
          qtd_linhas: res.qtd_linhas ?? res.linhas.length,
          tempo_ms: Math.round(performance.now() - t0),
          status: 'ok',
          erro: null,
          formato: 'grid',
        }).catch(() => {});
      }
    } catch (e: any) {
      setErro(e.message ?? String(e));
      if (relatorio.id) {
        await gravarExecucao({
          relatorio_id: relatorio.id,
          parametros: paramValues,
          qtd_linhas: 0,
          tempo_ms: Math.round(performance.now() - t0),
          status: 'erro',
          erro: e.message ?? String(e),
          formato: 'grid',
        }).catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  }

  async function exportar(formato: 'excel' | 'csv' | 'pdf') {
    if (!relatorio.id) {
      toast.error('Salve o relatório antes de exportar');
      return;
    }
    try {
      const blob = await exportarRelatorio(relatorio.id, formato, paramValues);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${relatorio.codigo ?? 'relatorio'}.${formato === 'excel' ? 'xlsx' : formato}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(`Falha ao exportar: ${e.message}`);
    }
  }

  const podeExportar = relatorio.status === 'publicado';
  const colunas = result?.colunas?.map((c) => c.nome) ?? (result?.linhas[0] ? Object.keys(result.linhas[0]) : []);

  return (
    <div className="space-y-4">
      {parametros.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-md border border-border">
          {parametros.map((p) => (
            <div key={p.nome}>
              <Label className="text-xs">{p.label || p.nome}{p.obrigatorio && ' *'}</Label>
              <Input
                type={p.tipo === 'data' ? 'date' : p.tipo === 'numero' ? 'number' : 'text'}
                value={paramValues[p.nome] ?? ''}
                onChange={(e) => setParamValues((s) => ({ ...s, [p.nome]: e.target.value }))}
                className="h-8"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={executar} disabled={loading} size="sm">
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
          Executar preview
        </Button>
        <div className="flex-1" />
        <Button onClick={() => exportar('excel')} disabled={!podeExportar || !result} size="sm" variant="outline">
          <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
        </Button>
        <Button onClick={() => exportar('csv')} disabled={!podeExportar || !result} size="sm" variant="outline">
          <FileDown className="h-4 w-4 mr-1" /> CSV
        </Button>
        <Button onClick={() => exportar('pdf')} disabled={!podeExportar || !result} size="sm" variant="outline">
          <FileText className="h-4 w-4 mr-1" /> PDF
        </Button>
      </div>

      {!podeExportar && result && (
        <p className="text-xs text-muted-foreground">Publique o relatório para habilitar a exportação.</p>
      )}

      {erro && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-mono text-xs whitespace-pre-wrap">{erro}</AlertDescription>
        </Alert>
      )}

      {result && (
        <>
          <div className="text-xs text-muted-foreground">
            {result.qtd_linhas ?? result.linhas.length} linha(s) • {result.tempo_ms} ms
          </div>
          <div className="rounded-md border border-border overflow-auto max-h-[480px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {colunas.map((c) => <TableHead key={c}>{c}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.linhas.slice(0, 100).map((row, i) => (
                  <TableRow key={i}>
                    {colunas.map((c) => (
                      <TableCell key={c} className="text-xs font-mono">
                        {row[c] === null || row[c] === undefined ? '—' : String(row[c])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
