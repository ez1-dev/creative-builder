/**
 * Adapter genérico: converte um Relatorio + layout + colunas + linhas em
 * um PrintDocument do RelatorioPrintEngine.
 *
 * Esta é a base para todos os relatórios criados via Desenvolvimento de
 * Relatórios — qualquer relatório SQL pode ser impresso/exportado em PDF
 * pelo mesmo motor que renderiza a OP.
 */
import type {
  Relatorio,
  RelatorioColuna,
  RelatorioLayout,
} from '@/lib/relatorios/types';
import { formatCellValue, toNumberSafe } from '@/lib/relatorios/format';
import {
  PrintDocumentBuilder,
  type Block,
  type PrintDocument,
  type TableColumn,
} from '../types';

type ColDraft = Omit<RelatorioColuna, 'id' | 'relatorio_id'>;

interface GenericReportAdapterOptions {
  relatorio: Partial<Relatorio>;
  layout?: Partial<RelatorioLayout> | null;
  colunas: ColDraft[];
  linhas: Record<string, unknown>[];
  parametros?: Record<string, unknown>;
  usuario?: string | null;
  /** Forçar paisagem mesmo que o layout não diga. */
  landscape?: boolean;
}

function alignToPrint(a?: string): 'left' | 'center' | 'right' {
  if (a === 'centro') return 'center';
  if (a === 'direita') return 'right';
  return 'left';
}

export function genericReportToPrintDocument(
  opts: GenericReportAdapterOptions,
): PrintDocument {
  const { relatorio, layout, colunas, linhas, parametros, usuario, landscape } = opts;

  const colsVisiveis = [...colunas]
    .filter((c) => c.visivel && c.visivel_pdf !== false)
    .sort((a, b) => a.ordem - b.ordem);

  const tableColumns: TableColumn[] = colsVisiveis.map((c) => ({
    key: c.campo,
    title: c.titulo ?? c.campo,
    width: c.largura ? `${c.largura}px` : undefined,
    align: alignToPrint(c.alinhamento),
    render: (row) => formatCellValue(row[c.campo], c.tipo ?? null) as string,
  }));

  const totalColumns = colsVisiveis.filter((c) => c.totalizar).map((c) => c.campo);
  const groupColumn = colsVisiveis.find((c) => c.agrupar)?.campo;

  const orientation = landscape || colsVisiveis.length > 8 ? 'landscape' : 'portrait';
  const titulo = layout?.titulo || relatorio.nome || 'Relatório';
  const subtitulo = layout?.subtitulo ?? relatorio.descricao ?? undefined;

  const builder = new PrintDocumentBuilder(titulo, {
    size: 'A4',
    orientation,
    margins: { top: 10, right: 8, bottom: 10, left: 8 },
  })
    .header({
      left: relatorio.codigo ? `${relatorio.codigo} — ${titulo}` : titulo,
      right: usuario ? `Usuário: ${usuario}` : '',
      border: true,
      heightMm: 8,
    })
    .footer({
      left: new Date().toLocaleString('pt-BR'),
      center: relatorio.modulo ?? '',
      right: 'Página {page} de {pages}',
      border: true,
      heightMm: 8,
    })
    .meta({ adapter: 'generic', relatorioId: relatorio.id, qtdLinhas: linhas.length });

  if (subtitulo) {
    builder.add({ type: 'title', text: subtitulo, level: 3 });
  }

  // Filtros aplicados (quando o layout pede mostrar)
  if (layout?.mostrar_filtros !== false && parametros && Object.keys(parametros).length > 0) {
    const items = Object.entries(parametros)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => ({ label: k, value: String(v) }));
    if (items.length > 0) {
      builder.add({ type: 'kv', columns: 3, bordered: true, items });
    }
  }

  // Auto-shrink simples da fonte para tabelas largas/longas
  const fontSizePt = colsVisiveis.length > 10 ? 7 : colsVisiveis.length > 7 ? 8 : 9;

  const tableBlock: Block = {
    type: 'table',
    columns: tableColumns,
    rows: linhas,
    repeatHeader: true,
    showTotals: totalColumns.length > 0,
    totalColumns,
    groupBy: groupColumn,
    fontSizePt,
  };
  builder.add(tableBlock);

  // Rodapé textual com totais gerais (qtd linhas)
  if (layout?.mostrar_totais !== false) {
    builder.add({
      type: 'text',
      text: `Total de registros: ${linhas.length}`,
      bold: true,
      align: 'right',
    });
  }

  return builder.build();
}

/** Conveniência: soma rápida para totais sem usar o TableBlock interno. */
export function calcularTotais(
  colunas: ColDraft[],
  linhas: Record<string, unknown>[],
): Record<string, number> {
  const totais: Record<string, number> = {};
  for (const c of colunas) {
    if (!c.totalizar) continue;
    let acc = 0;
    for (const r of linhas) {
      const n = toNumberSafe(r[c.campo]);
      if (n !== null) acc += n;
    }
    totais[c.campo] = acc;
  }
  return totais;
}
