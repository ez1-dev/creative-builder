/**
 * Adapter (esqueleto): converte uma lista de itens em PrintDocument
 * formatado como folha de etiquetas (código de barras + descrição curta).
 *
 * Implementação detalhada será feita quando o primeiro relatório de etiqueta
 * for solicitado. Mantido aqui como ponto de partida documentado para o
 * RelatorioPrintEngine — siga o mesmo padrão dos demais adapters:
 *
 *   1. Receba o input do domínio (linhas + opções).
 *   2. Construa blocos com `PrintDocumentBuilder` (preferindo
 *      blocos `group` com `keepTogether` para cada etiqueta).
 *   3. Retorne `PrintDocument` pronto para `PrintRenderer` /
 *      `exportPrintDocumentToPdf`.
 */
import { PrintDocumentBuilder, type Block, type PrintDocument } from '../types';

export interface EtiquetaInput {
  codigo: string;
  descricao?: string;
  extra?: string;
}

export interface EtiquetaAdapterOptions {
  titulo?: string;
  usuario?: string | null;
  /** Colunas de etiquetas por página (default 2). */
  colunas?: number;
}

export function etiquetasToPrintDocument(
  itens: EtiquetaInput[],
  opts: EtiquetaAdapterOptions = {},
): PrintDocument {
  const titulo = opts.titulo ?? `Etiquetas (${itens.length})`;
  const builder = new PrintDocumentBuilder(titulo, {
    size: 'A4',
    orientation: 'portrait',
    margins: { top: 8, right: 8, bottom: 8, left: 8 },
  })
    .header({ left: titulo, right: opts.usuario ? `Usuário: ${opts.usuario}` : '', border: true, heightMm: 8 })
    .footer({ left: new Date().toLocaleString('pt-BR'), right: 'Página {page} de {pages}', border: true, heightMm: 8 })
    .meta({ adapter: 'etiqueta', total: itens.length, colunas: opts.colunas ?? 2 });

  // TODO: agrupar `itens` em blocos `group` por etiqueta. Por enquanto,
  // cada item é renderizado como um pequeno bloco com barcode + descrição.
  const blocks: Block[] = [];
  for (const it of itens) {
    blocks.push({
      type: 'group',
      keepTogether: true,
      children: [
        { type: 'barcode', value: it.codigo, caption: it.codigo, heightPx: 36 },
        ...(it.descricao ? [{ type: 'text' as const, text: it.descricao }] : []),
        ...(it.extra ? [{ type: 'text' as const, text: it.extra, italic: true }] : []),
      ],
    });
  }
  builder.addAll(blocks);
  return builder.build();
}
