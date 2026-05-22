/**
 * Adapter: converte uma OpImpressao (ou lote de OpImpressao) no
 * PrintDocument genérico consumido pelo RelatorioPrintEngine.
 *
 * Cobre cabeçalho + componentes + operações e respeita a flag
 * `quebrar_por_operacao`. Desde a Onda 7 é o único caminho de impressão
 * de Ordens de Produção (o motor legado foi removido).
 */
import type { OpImpressao } from '@/lib/producao/opImpressao';
import {
  PrintDocumentBuilder,
  type Block,
  type PrintDocument,
  type TableColumn,
} from '../types';

interface OpAdapterOptions {
  usuario?: string | null;
  preview?: boolean;
  quebrarPorOperacao?: boolean;
}

function fmtDate(s?: string) {
  if (!s) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

const COMPONENT_COLS: TableColumn[] = [
  { key: 'codigo_componente', title: 'Código', width: '100px' },
  { key: 'descricao_componente', title: 'Descrição' },
  { key: 'quantidade_prevista', title: 'Qtde. Prev.', width: '70px', align: 'center' },
  { key: 'unidade_medida', title: 'UN', width: '40px', align: 'center' },
  { key: 'deposito', title: 'Dep.', width: '50px', align: 'center' },
  { key: 'endereco', title: 'Endereço', width: '100px', align: 'center' },
];

function opBlocks(op: OpImpressao): Block[] {
  const cab = op.cabecalho ?? {};
  const componentes = op.componentes ?? [];
  const operacoes = op.operacoes ?? [];
  const opCode = cab.codigo_barras_op ?? `${cab.cod_ori ?? ''}${String(cab.num_orp ?? '').padStart(9, '0')}`;

  const blocks: Block[] = [
    { type: 'title', text: 'Ordens de Produção — GENIUS', level: 1 },
    {
      type: 'group',
      keepTogether: true,
      children: [
        { type: 'barcode', value: opCode, caption: opCode, heightPx: 40 },
        {
          type: 'kv',
          columns: 2,
          bordered: true,
          items: [
            { label: 'Origem', value: cab.cod_ori ?? '-' },
            { label: 'O.P.', value: cab.num_orp_exibicao ?? String(cab.num_orp ?? '-') },
            { label: 'Qtde.', value: String(cab.quantidade ?? '-'), highlight: true },
            { label: 'U.M.', value: cab.unidade_medida ?? '-' },
            { label: 'Produto', value: cab.produto ?? '-', full: true },
            { label: 'Descrição', value: cab.descricao ?? cab.produto_descricao ?? '-', full: true },
            { label: 'Derivação', value: cab.derivacao ?? '-' },
            { label: 'Início Prev.', value: fmtDate(cab.inicio_previsto) },
            { label: 'Pedido', value: cab.pedido ?? '-' },
            { label: 'Período', value: cab.periodo ?? '-' },
            { label: 'Situação', value: cab.situacao_descricao ?? cab.situacao ?? '-', full: true },
          ],
        },
      ],
    },
  ];

  if (componentes.length > 0) {
    blocks.push({ type: 'title', text: 'Relação de Componentes Necessários', level: 2 });
    blocks.push({
      type: 'table',
      columns: COMPONENT_COLS,
      rows: componentes as unknown as Record<string, unknown>[],
      repeatHeader: true,
      groupBy: componentes.some((c) => c.cod_etg) ? 'cod_etg' : undefined,
    });
  }

  if (operacoes.length > 0) {
    blocks.push({ type: 'title', text: 'Operações', level: 2 });
    operacoes.forEach((op, idx) => {
      blocks.push({
        type: 'group',
        keepTogether: true,
        children: [
          {
            type: 'kv',
            columns: 2,
            bordered: true,
            items: [
              { label: 'Estágio', value: `${op.cod_etg ?? ''} ${op.descricao_estagio ?? ''}`.trim() || '—' },
              { label: 'Centro Rec.', value: `${op.cod_cre ?? ''} ${op.descricao_centro_recurso ?? ''}`.trim() || '—', highlight: true },
              { label: 'Seq.', value: String(op.seq_rot ?? '—') },
              { label: 'Operação', value: `${op.cod_opr ?? ''} ${op.descricao_operacao ?? ''}`.trim() || '—', highlight: true },
              { label: 'Tmp Unit', value: op.tmp_unit_formatado || (op.tmp_unit_min != null ? `${op.tmp_unit_min} min` : '—') },
              { label: 'Tmp Total', value: op.tmp_total_formatado || (op.tmp_total_min != null ? `${op.tmp_total_min} min` : '—'), highlight: true },
              { label: 'Próx. Oper.', value: op.proxima_operacao_label || op.proxima_operacao_codigo || '—', full: true },
            ],
          },
          ...(op.narrativas
            ? [{ type: 'text' as const, text: op.narrativas, italic: true }]
            : []),
        ],
        id: `op-${idx}`,
      });
    });
  }

  return blocks;
}

export function opToPrintDocument(
  ops: OpImpressao[],
  opts: OpAdapterOptions = {},
): PrintDocument {
  const first = ops[0]?.cabecalho;
  const title = ops.length === 1 && first
    ? `OP ${first.cod_ori ?? ''}/${first.num_orp_exibicao ?? first.num_orp ?? ''}`
    : `Ordens de Produção (${ops.length})`;

  const builder = new PrintDocumentBuilder(title, {
    size: 'A4',
    orientation: 'portrait',
    margins: { top: 8, right: 8, bottom: 10, left: 8 },
  })
    .header({
      left: 'GENIUS — Impressão de OP',
      right: opts.usuario ? `Usuário: ${opts.usuario}` : '',
      border: true,
      heightMm: 8,
    })
    .footer({
      left: new Date().toLocaleString('pt-BR'),
      right: 'Página {page} de {pages}',
      border: true,
      heightMm: 8,
    })
    .meta({ adapter: 'op', quebrarPorOperacao: !!opts.quebrarPorOperacao, totalOps: ops.length });

  ops.forEach((op, i) => {
    if (i > 0) builder.add({ type: 'pagebreak' });
    builder.addAll(opBlocks(op));
  });

  return builder.build();
}
