export * from './types';
export { PrintRenderer } from './PrintRenderer';
export { opToPrintDocument } from './adapters/opAdapter';
export { genericReportToPrintDocument, calcularTotais } from './adapters/genericReportAdapter';
export { etiquetasToPrintDocument } from './adapters/etiquetaAdapter';
export { exportPrintDocumentToPdf } from './exportPdf';
export {
  applyPrintTemplate,
  PRINT_TEMPLATES,
  PRINT_TEMPLATE_LIST,
  type PrintTemplate,
  type PrintTemplateId,
} from './templates';



