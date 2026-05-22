import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, FileSpreadsheet, FileDown, AlertCircle, Info, Printer } from 'lucide-react';
import { previewSql, exportarRelatorio, gravarExecucao } from '@/lib/relatorios/api';
import { genericReportToPrintDocument, exportPrintDocumentToPdf } from '@/lib/relatorios/print';
import { useAuth } from '@/contexts/AuthContext';
import { checkSqlSafe } from '@/lib/relatorios/parseSqlParams';
import type { PreviewResult, Relatorio, RelatorioColuna, RelatorioLayout, RelatorioParametro } from '@/lib/relatorios/types';
import { alignClass, formatCellValue, toNumberSafe } from '@/lib/relatorios/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ReportPrintDialog } from './ReportPrintDialog';

type ColDraft = Omit<RelatorioColuna, 'id' | 'relatorio_id'>;

interface Props {
  relatorio: Partial<Relatorio>;
  parametros: Omit<RelatorioParametro, 'id' | 'relatorio_id'>[];
  colunasConfig?: ColDraft[];
  layout?: Partial<RelatorioLayout> | null;
  onColumnsDetected?: (cols: string[], sample?: Record<string, unknown>) => void;
  onExecucaoGravada?: () => void;
}

export function ReportPreview({ relatorio, parametros, colunasConfig, layout, onColumnsDetected, onExecucaoGravada }: Props) {
  const { displayName, erpUser } = useAuth();
  const [paramValues, setParamValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(parametros.map((p) => [p.nome, p.valor_padrao ?? ''])),
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  async function executar() {
    if (!(relatorio.sql_query ?? '').trim()) {
      const msg = 'Informe o SQL do relatório antes de continuar.';
      setErro(msg);
      toast.error(msg);
      return;
    }
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
      onColumnsDetected?.(cols, res.linhas[0]);
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
        onExecucaoGravada?.();
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
        onExecucaoGravada?.();
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
    const t0 = performance.now();
    try {
      const { blob, filename } = await exportarRelatorio(relatorio.id, formato, paramValues, relatorio.codigo ?? 'relatorio');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      await gravarExecucao({
        relatorio_id: relatorio.id,
        parametros: paramValues,
        qtd_linhas: result?.qtd_linhas ?? null,
        tempo_ms: Math.round(performance.now() - t0),
        status: 'ok',
        erro: null,
        formato,
        arquivo: filename,
      }).catch(() => {});
      onExecucaoGravada?.();
      toast.success(`Arquivo ${filename} baixado`);
    } catch (e: any) {
      toast.error(`Falha ao exportar: ${e.message}`);
      if (relatorio.id) {
        await gravarExecucao({
          relatorio_id: relatorio.id,
          parametros: paramValues,
          qtd_linhas: null,
          tempo_ms: Math.round(performance.now() - t0),
          status: 'erro',
          erro: e.message ?? String(e),
          formato,
        }).catch(() => {});
        onExecucaoGravada?.();
      }
    }
  }

  const podeExportar = relatorio.status === 'publicado';

  // Colunas a exibir: usa config se houver, senão pega da resposta
  const colunasExibir: ColDraft[] = useMemo(() => {
    if (colunasConfig && colunasConfig.length > 0) {
      return [...colunasConfig].filter((c) => c.visivel).sort((a, b) => a.ordem - b.ordem);
    }
    const cols = result?.colunas?.map((c) => c.nome) ?? (result?.linhas[0] ? Object.keys(result.linhas[0]) : []);
    return cols.map((c, i) => ({
      campo: c,
      titulo: c,
      visivel: true,
      ordem: i,
      tipo: 'texto',
      formato: null,
      alinhamento: 'esquerda' as const,
      largura: null,
      totalizar: false,
      agrupar: false,
      visivel_excel: true,
      visivel_pdf: true,
      permite_ordenar: true,
      permite_filtrar: true,
      regra_condicional_json: [],
    }));

  }, [colunasConfig, result]);

  const totais = useMemo(() => {
    if (!result) return {} as Record<string, number>;
    const t: Record<string, number> = {};
    for (const c of colunasExibir) {
      if (!c.totalizar) continue;
      let acc = 0;
      for (const row of result.linhas) {
        const n = toNumberSafe(row[c.campo]);
        if (n !== null) acc += n;
      }
      t[c.campo] = acc;
    }
    return t;
  }, [result, colunasExibir]);

  const temTotalizadores = colunasExibir.some((c) => c.totalizar);
  const linhasLimitadas = !!result && (result.linhas?.length ?? 0) >= 100;

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
          <FileSpreadsheet className="h-4 w-4 mr-1" /> Exportar Excel
        </Button>
        <Button onClick={() => exportar('csv')} disabled={!podeExportar || !result} size="sm" variant="outline">
          <FileDown className="h-4 w-4 mr-1" /> Exportar CSV
        </Button>
        <Button
          onClick={() => setPrintOpen(true)}
          disabled={!result || !result.linhas.length}
          size="sm"
          variant="outline"
          title="Pré-visualizar / imprimir / exportar PDF via RelatorioPrintEngine"
        >
          <Printer className="h-4 w-4 mr-1" /> Imprimir / PDF
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs text-muted-foreground">
              {result.qtd_linhas ?? result.linhas.length} linha(s) • {result.tempo_ms} ms
            </div>
            {linhasLimitadas && (
              <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <Info className="h-3 w-3" /> Preview limitado a 100 linhas. Use a execução completa para o conjunto inteiro.
              </div>
            )}
          </div>
          <div className="rounded-md border border-border overflow-auto max-h-[520px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_hsl(var(--border))]">
                <TableRow>
                  {colunasExibir.map((c) => (
                    <TableHead
                      key={c.campo}
                      className={cn('whitespace-nowrap', alignClass(c.alinhamento))}
                      style={c.largura ? { width: `${c.largura}px`, minWidth: `${c.largura}px` } : undefined}
                    >
                      {c.titulo || c.campo}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.linhas.slice(0, 100).map((row, i) => (
                  <TableRow key={i}>
                    {colunasExibir.map((c) => (
                      <TableCell
                        key={c.campo}
                        className={cn('text-xs', alignClass(c.alinhamento))}
                        style={c.largura ? { width: `${c.largura}px`, minWidth: `${c.largura}px` } : undefined}
                      >
                        {formatCellValue(row[c.campo], c.tipo)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
              {temTotalizadores && (
                <TableFooter className="sticky bottom-0 bg-muted">
                  <TableRow>
                    {colunasExibir.map((c, i) => (
                      <TableCell
                        key={c.campo}
                        className={cn('text-xs font-bold', alignClass(c.alinhamento))}
                      >
                        {c.totalizar
                          ? formatCellValue(totais[c.campo] ?? 0, c.tipo)
                          : i === 0
                            ? 'TOTAL'
                            : ''}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </>
      )}

      <ReportPrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        relatorio={relatorio}
        layout={layout}
        colunas={colunasExibir}
        linhas={result?.linhas ?? []}
        parametros={paramValues}
      />
    </div>
  );
}
