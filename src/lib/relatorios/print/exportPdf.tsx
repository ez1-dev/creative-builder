import { createRoot } from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PrintRenderer } from './PrintRenderer';
import type { PrintDocument } from './types';

interface ExportPdfOptions {
  filename?: string;
  /** Escala de captura — maior = mais nitidez, arquivo maior. */
  scale?: number;
}

const SIZE_MM: Record<string, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  Letter: { w: 216, h: 279 },
};

/**
 * Renderiza o PrintDocument em um container off-screen, captura cada
 * `.rp-page` com html2canvas e monta um PDF multi-página com jsPDF.
 *
 * Retorna o Blob do PDF; se `filename` for informado, também dispara o download.
 */
export async function exportPrintDocumentToPdf(
  doc: PrintDocument,
  opts: ExportPdfOptions = {},
): Promise<Blob> {
  const { filename, scale = 2 } = opts;
  const orientation = doc.page.orientation === 'landscape' ? 'landscape' : 'portrait';
  const sizeKey = (doc.page.size ?? 'A4') as keyof typeof SIZE_MM;
  const size = SIZE_MM[sizeKey] ?? SIZE_MM.A4;
  const pageW = orientation === 'landscape' ? size.h : size.w;
  const pageH = orientation === 'landscape' ? size.w : size.h;

  // Container off-screen visível para o layout (display:none quebra html2canvas).
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-10000px';
  host.style.top = '0';
  host.style.zIndex = '-1';
  host.style.background = '#fff';
  host.setAttribute('data-print-export', 'true');
  document.body.appendChild(host);

  const root = createRoot(host);
  root.render(<PrintRenderer doc={doc} preview />);

  // Aguarda render + imagens
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  const imgs = Array.from(host.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          }),
    ),
  );

  const pages = Array.from(host.querySelectorAll<HTMLElement>('.rp-page'));
  if (pages.length === 0) {
    root.unmount();
    host.remove();
    throw new Error('Nenhuma página renderizada para exportar.');
  }

  const pdf = new jsPDF({ orientation, unit: 'mm', format: sizeKey.toLowerCase() });

  try {
    for (let i = 0; i < pages.length; i++) {
      const el = pages[i];
      const canvas = await html2canvas(el, {
        scale,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      if (i > 0) pdf.addPage(sizeKey.toLowerCase(), orientation);
      pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
    }
  } finally {
    root.unmount();
    host.remove();
  }

  const blob = pdf.output('blob');
  if (filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return blob;
}
