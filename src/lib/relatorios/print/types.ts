/**
 * RelatorioPrintEngine — modelo genérico de documento de impressão.
 *
 * Um documento é composto por uma ou mais páginas (Page), cada página com
 * blocos (Block). O engine cuida de margens, cabeçalho, rodapé, paginação
 * e quebras consistentes para qualquer relatório (OP, BOM, Lista, etc.).
 */

export type PageOrientation = 'portrait' | 'landscape';
export type PageSize = 'A4' | 'A3' | 'Letter';

export interface PageMargins {
  /** mm */
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PageSetup {
  size: PageSize;
  orientation: PageOrientation;
  margins: PageMargins;
}

export const DEFAULT_PAGE_SETUP: PageSetup = {
  size: 'A4',
  orientation: 'portrait',
  margins: { top: 8, right: 8, bottom: 8, left: 8 },
};

/** Cabeçalho/rodapé que se repete em todas as páginas do documento. */
export interface PrintHeaderFooter {
  /** Texto / JSX renderizado pelo motor. Use tokens `{page}` / `{pages}` para paginação. */
  left?: PrintNode;
  center?: PrintNode;
  right?: PrintNode;
  /** Altura reservada em mm (necessária para o motor calcular área útil). */
  heightMm?: number;
  /** Se true, mostra borda inferior (cabeçalho) ou superior (rodapé). */
  border?: boolean;
}

export type PrintNode = string | number | React.ReactNode;

/* ----------------------------- Blocos ----------------------------- */

export type Block =
  | TitleBlock
  | KeyValueBlock
  | TableBlock
  | BarcodeBlock
  | ImageBlock
  | TextBlock
  | SpacerBlock
  | PageBreakBlock
  | GroupBlock
  | RawBlock;

interface BlockBase {
  id?: string;
  /** Não quebrar este bloco entre páginas. */
  keepTogether?: boolean;
  className?: string;
}

export interface TitleBlock extends BlockBase {
  type: 'title';
  text: string;
  level?: 1 | 2 | 3;
}

export interface KeyValueBlock extends BlockBase {
  type: 'kv';
  columns?: 1 | 2 | 3;
  items: { label: string; value: PrintNode; full?: boolean; highlight?: boolean }[];
  /** Borda externa em volta do grupo. */
  bordered?: boolean;
}

export interface TableColumn {
  key: string;
  title: string;
  /** Largura CSS (ex: '100px', '20%'). */
  width?: string;
  align?: 'left' | 'center' | 'right';
  /** Renderizador custom da célula. Recebe row inteira. */
  render?: (row: Record<string, unknown>, index: number) => PrintNode;
}

export interface TableBlock extends BlockBase {
  type: 'table';
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  /** Repetir thead em cada página. */
  repeatHeader?: boolean;
  /** Mostrar linha de totais ao final. */
  showTotals?: boolean;
  /** Quais colunas somar (chaves). */
  totalColumns?: string[];
  /** Agrupar visualmente por essa chave (exibe linha-título por grupo). */
  groupBy?: string;
  /** Tamanho da fonte em pt para encolher tabelas longas. */
  fontSizePt?: number;
}

export interface BarcodeBlock extends BlockBase {
  type: 'barcode';
  value: string;
  format?: 'CODE128' | 'CODE39' | 'EAN13';
  heightPx?: number;
  displayValue?: boolean;
  caption?: string;
}

export interface ImageBlock extends BlockBase {
  type: 'image';
  src: string;
  alt?: string;
  /** Ocupa página inteira (ex: desenho técnico A4). */
  fullPage?: boolean;
  /** Rotação em graus. */
  rotate?: 0 | 90 | 180 | 270;
}

export interface TextBlock extends BlockBase {
  type: 'text';
  text: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right' | 'justify';
}

export interface SpacerBlock extends BlockBase {
  type: 'spacer';
  /** Altura em mm. */
  heightMm: number;
}

export interface PageBreakBlock extends BlockBase {
  type: 'pagebreak';
  /** 'always' (padrão), 'avoid', 'left', 'right' (apenas em impressão). */
  mode?: 'always' | 'avoid' | 'left' | 'right';
}

/** Agrupa blocos para manter junto e/ou aplicar `keepTogether`. */
export interface GroupBlock extends BlockBase {
  type: 'group';
  children: Block[];
}

/** Escape hatch: JSX livre quando os primitivos não bastam. */
export interface RawBlock extends BlockBase {
  type: 'raw';
  content: React.ReactNode;
}

/* --------------------------- Documento ---------------------------- */

export interface PrintDocument {
  /** Título visível no preview e usado no <title> da janela de impressão. */
  title: string;
  /** Subtítulo opcional (ex: filtros aplicados). */
  subtitle?: string;
  page: PageSetup;
  header?: PrintHeaderFooter;
  footer?: PrintHeaderFooter;
  /** Blocos do corpo, na ordem em que devem ser impressos. */
  blocks: Block[];
  /** Metadados livres consumidos por adapters / debug. */
  meta?: Record<string, unknown>;
}

/** Helper para construir documentos de forma fluente. */
export class PrintDocumentBuilder {
  private doc: PrintDocument;
  constructor(title: string, page: PageSetup = DEFAULT_PAGE_SETUP) {
    this.doc = { title, page, blocks: [] };
  }
  subtitle(s: string) { this.doc.subtitle = s; return this; }
  header(h: PrintHeaderFooter) { this.doc.header = h; return this; }
  footer(f: PrintHeaderFooter) { this.doc.footer = f; return this; }
  add(block: Block) { this.doc.blocks.push(block); return this; }
  addAll(blocks: Block[]) { this.doc.blocks.push(...blocks); return this; }
  meta(m: Record<string, unknown>) { this.doc.meta = { ...this.doc.meta, ...m }; return this; }
  build(): PrintDocument { return this.doc; }
}
