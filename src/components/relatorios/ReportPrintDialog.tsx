import { useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, FileText, Loader2 } from 'lucide-react';
import { PrintRenderer, genericReportToPrintDocument, exportPrintDocumentToPdf } from '@/lib/relatorios/print';
import type {
  Relatorio,
  RelatorioColuna,
  RelatorioLayout,
} from '@/lib/relatorios/types';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type ColDraft = Omit<RelatorioColuna, 'id' | 'relatorio_id'>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relatorio: Partial<Relatorio>;
  layout?: Partial<RelatorioLayout> | null;
  colunas: ColDraft[];
  linhas: Record<string, unknown>[];
  parametros?: Record<string, unknown>;
}

/**
 * Preview de impressão genérico. Renderiza o relatório com o
 * RelatorioPrintEngine e dispara window.print() / exportação PDF client-side.
 */
export function ReportPrintDialog({
  open, onOpenChange, relatorio, layout, colunas, linhas, parametros,
}: Props) {
  const { displayName, erpUser } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const doc = useMemo(
    () =>
      genericReportToPrintDocument({
        relatorio,
        layout,
        colunas,
        linhas,
        parametros,
        usuario: displayName ?? erpUser ?? null,
      }),
    [relatorio, layout, colunas, linhas, parametros, displayName, erpUser],
  );

  function imprimir() {
    const originalTitle = document.title;
    document.title = doc.title;
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 500);
  }

  async function exportarPdf() {
    setExporting(true);
    try {
      const base = (relatorio.codigo || relatorio.nome || 'relatorio')
        .toString()
        .replace(/[^a-zA-Z0-9_-]+/g, '_');
      await exportPrintDocumentToPdf(doc, { filename: `${base}.pdf` });
      toast.success('PDF gerado com sucesso');
    } catch (e: any) {
      toast.error(`Falha ao gerar PDF: ${e?.message ?? e}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b border-border flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-sm">Pré-visualização de impressão — {doc.title}</DialogTitle>
          <div className="flex items-center gap-2 no-print">
            <Button size="sm" onClick={imprimir}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
            <Button size="sm" variant="outline" onClick={exportarPdf} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
              PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div ref={containerRef} className="flex-1 overflow-auto bg-muted/20">
          <PrintRenderer doc={doc} preview />
        </div>
      </DialogContent>
    </Dialog>
  );
}

