/**
 * Templates visuais aplicáveis a qualquer PrintDocument.
 *
 * Um template ajusta margens da página, presença/altura de header/footer
 * e configurações cosméticas (densidade de tabela). É um "tema" de
 * impressão — não altera os dados nem a ordem dos blocos.
 *
 * Uso:
 *   const doc = opToPrintDocument(...);
 *   const final = applyPrintTemplate(doc, 'compacto');
 */
import type { Block, PageSetup, PrintDocument, PrintHeaderFooter } from './types';

export type PrintTemplateId = 'padrao' | 'compacto' | 'destacado' | 'minimalista';

export interface PrintTemplate {
  id: PrintTemplateId;
  label: string;
  description: string;
  /** Sobrescreve campos do PageSetup. */
  page?: Partial<PageSetup>;
  /** Patch aplicado ao header (mesclado por chave). */
  header?: Partial<PrintHeaderFooter>;
  /** Patch aplicado ao footer (mesclado por chave). */
  footer?: Partial<PrintHeaderFooter>;
  /** Fonte base das tabelas em pt. */
  tableFontSizePt?: number;
}

export const PRINT_TEMPLATES: Record<PrintTemplateId, PrintTemplate> = {
  padrao: {
    id: 'padrao',
    label: 'Padrão',
    description: 'Layout corporativo equilibrado, margens 8mm, cabeçalho/rodapé com borda.',
    page: { margins: { top: 8, right: 8, bottom: 8, left: 8 } },
    header: { border: true, heightMm: 12 },
    footer: { border: true, heightMm: 8 },
    tableFontSizePt: 9,
  },
  compacto: {
    id: 'compacto',
    label: 'Compacto',
    description: 'Margens reduzidas e fonte menor para listas extensas.',
    page: { margins: { top: 5, right: 5, bottom: 5, left: 5 } },
    header: { border: true, heightMm: 9 },
    footer: { border: false, heightMm: 6 },
    tableFontSizePt: 7.5,
  },
  destacado: {
    id: 'destacado',
    label: 'Destacado',
    description: 'Mais espaço em branco e fontes maiores — bom para apresentação.',
    page: { margins: { top: 14, right: 14, bottom: 14, left: 14 } },
    header: { border: true, heightMm: 16 },
    footer: { border: true, heightMm: 10 },
    tableFontSizePt: 10.5,
  },
  minimalista: {
    id: 'minimalista',
    label: 'Minimalista',
    description: 'Sem bordas no cabeçalho/rodapé, ideal para PDFs enviados ao cliente.',
    page: { margins: { top: 10, right: 10, bottom: 10, left: 10 } },
    header: { border: false, heightMm: 10 },
    footer: { border: false, heightMm: 8 },
    tableFontSizePt: 9,
  },
};

export const PRINT_TEMPLATE_LIST: PrintTemplate[] = Object.values(PRINT_TEMPLATES);

function patchTableFontSize(blocks: Block[], pt: number): Block[] {
  return blocks.map((b) => {
    if (b.type === 'group') {
      return { ...b, children: patchTableFontSize(b.children, pt) };
    }
    if (b.type === 'table' && b.fontSizePt == null) {
      return { ...b, fontSizePt: pt };
    }
    return b;
  });
}

/**
 * Aplica um template a um PrintDocument, retornando uma cópia ajustada.
 * Não muta o documento original.
 */
export function applyPrintTemplate(
  doc: PrintDocument,
  templateId: PrintTemplateId,
): PrintDocument {
  const tpl = PRINT_TEMPLATES[templateId];
  if (!tpl) return doc;

  const page: PageSetup = {
    ...doc.page,
    ...tpl.page,
    margins: { ...doc.page.margins, ...(tpl.page?.margins ?? {}) },
  };

  const header = doc.header || tpl.header
    ? { ...(doc.header ?? {}), ...(tpl.header ?? {}) }
    : undefined;
  const footer = doc.footer || tpl.footer
    ? { ...(doc.footer ?? {}), ...(tpl.footer ?? {}) }
    : undefined;

  const blocks = tpl.tableFontSizePt
    ? patchTableFontSize(doc.blocks, tpl.tableFontSizePt)
    : doc.blocks;

  return {
    ...doc,
    page,
    header,
    footer,
    blocks,
    meta: { ...(doc.meta ?? {}), template: templateId },
  };
}
