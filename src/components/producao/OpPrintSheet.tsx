import { Barcode } from './Barcode';
import { useAuthedBlobUrl } from '@/hooks/useAuthedBlobUrl';
import type { BlobStateMap } from '@/hooks/useAuthedBlobUrls';
import type { OpImpressao, OpOperacao, OpComponente, OpDesenho } from '@/lib/producao/opImpressao';
import './op-print.css';


interface Props {
  data: OpImpressao;
  preview?: boolean;
  usuario?: string | null;
  quebrarPorOperacao?: boolean;
  /** Mapa url->{status, blobUrl, error} pré-carregado pelo pai. Se omitido, cada DrawingPage faz seu próprio fetch. */
  blobStates?: BlobStateMap;
}

function fmtNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDate(s?: string) {
  if (!s) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

export function OpPrintSheet({ data, preview = false, usuario, quebrarPorOperacao = false, blobStates }: Props) {
  const cab = data?.cabecalho ?? {};
  const componentes = data?.componentes ?? [];
  const operacoes = data?.operacoes ?? [];
  const observacoesRaw = data?.observacoes ?? [];
  const observacoes: string[] = (observacoesRaw as any[])
    .map((o) => (typeof o === 'string' ? o : (o?.observacao ?? '')))
    .filter((s) => String(s ?? '').trim() !== '');
  const responsabilidade =
    data?.mensagem_responsabilidade ??
    'Ao finalizar o apontamento o operador estará se responsabilizando pela quantidade e qualidade dos produtos informados.';

  const opCode =
    cab.codigo_barras_op ??
    `${cab.cod_ori ?? ''}${String(cab.num_orp ?? '').padStart(9, '0')}`;

  // Agrupa componentes por estágio
  const compsPorEtg = componentes.reduce<Record<string, OpComponente[]>>((acc, c) => {
    const k = c.cod_etg ?? '';
    (acc[k] ||= []).push(c);
    return acc;
  }, {});
  const etgKeys = Object.keys(compsPorEtg);

  const quebrarComponentes =
    data?.layout_componentes?.quebrar_componentes_em_pagina_separada
    ?? (componentes.length > 7);

  const renderHeader = () => (
    <>
      <div className="op-title">Ordens de Produção - GENIUS</div>
      <div className="op-header-top">
        <div style={{ fontWeight: 'bold', fontSize: 10 }}>Origem/O.P.</div>
        <div style={{ fontSize: 9.5 }}>Página: 1/1</div>
      </div>

      <div className="op-header-main">
        <div className="op-barcode-box">
          <Barcode value={cab.codigo_barras_op ?? opCode} height={40} displayValue={false} />
          <div className="op-barcode-caption">{cab.codigo_barras_op ?? opCode}</div>
        </div>
        <div className="op-kv-2col op-box op-header-data">
          <div className="k">Origem:</div><div className="v">{cab.cod_ori ?? '-'}</div>
          <div className="k">O.P.:</div><div className="v">{cab.num_orp_formatado ?? cab.num_orp ?? '-'}</div>
          <div className="k">Qtde.:</div><div className="v">{cab.quantidade ?? '-'}</div>
          <div className="k">U.M.:</div><div className="v">{cab.unidade_medida ?? '-'}</div>
          <div className="k">Produto:</div>
          <div className="v full">
            {cab.produto ?? ''}
            {cab.produto_descricao ? ` - ${cab.produto_descricao}` : cab.descricao_produto ? ` - ${cab.descricao_produto}` : ''}
          </div>
          <div className="k">Início Prev.:</div><div className="v">{fmtDate(cab.inicio_previsto)}</div>
          <div className="k">Pedido:</div><div className="v">{cab.pedido ?? '-'}</div>
          <div className="k">Período:</div><div className="v">{cab.periodo ?? '-'}</div>
          <div className="k">Situação:</div><div className="v">{cab.situacao_descricao ?? cab.situacao ?? '-'}</div>
        </div>
        <div className="op-rev-stack">
          <div className="op-rev-cell">
            <div className="lbl">REV</div>
            <div className="val">{cab.revisao ?? '-'}</div>
          </div>
          <div className="op-rev-cell">
            <div className="lbl">Agrupamento</div>
            <div className="val">{cab.agrupamento ?? '-'}</div>
          </div>
        </div>
      </div>
    </>
  );

  const renderComponentes = () => {
    if (componentes.length === 0) return null;
    return (
      <>
        <div className="op-section-title">Relação de Componentes Necessários</div>
        {etgKeys.map((etg) => (
          <div key={`comp-${etg}`}>
            {etg && <div className="op-stage-bar">Estágio: {etg}</div>}
            <table>
              <thead>
                <tr>
                  <th className="col-w-medium">Código</th>
                  <th>Descrição</th>
                  <th className="col-w-narrow" style={{ textAlign: 'right' }}>Qtde. Prev.</th>
                  <th className="col-w-narrow">UN</th>
                  <th className="col-w-narrow">Dep.</th>
                  <th className="col-w-medium">Endereço</th>
                </tr>
              </thead>
              <tbody>
                {compsPorEtg[etg].map((c, i) => (
                  <tr key={`${etg}-${i}`}>
                    <td>{c.codigo_componente ?? ''}</td>
                    <td>{c.descricao_componente ?? ''}</td>
                    <td style={{ textAlign: 'right' }}>{c.quantidade_prevista ?? ''}</td>
                    <td>{c.unidade_medida ?? ''}</td>
                    <td>{c.deposito ?? ''}</td>
                    <td>{c.endereco ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </>
    );
  };

  const renderIndicacaoComponentesSeparados = () => (
    <div className="op-componentes-indicacao">Componentes impressos em página separada</div>
  );

  const renderComponentesPage = () => {
    if (componentes.length === 0) return null;
    return (
      <div className={`op-sheet componentes-page ${preview ? 'op-sheet--preview' : ''}`}>
        {renderHeader()}
        <div className="op-section-title">RELAÇÃO DE COMPONENTES NECESSÁRIOS</div>
        {etgKeys.map((etg) => (
          <div key={`compsep-${etg}`}>
            {etg && <div className="op-stage-bar">Estágio: {etg}</div>}
            <table>
              <thead>
                <tr>
                  <th className="col-w-medium">Código</th>
                  <th>Descrição</th>
                  <th className="col-w-narrow" style={{ textAlign: 'right' }}>Qtde. Prev.</th>
                  <th className="col-w-narrow">UN</th>
                  <th className="col-w-narrow">Dep.</th>
                  <th className="col-w-medium">Endereço</th>
                </tr>
              </thead>
              <tbody>
                {compsPorEtg[etg].map((c, i) => (
                  <tr key={`csep-${etg}-${i}`}>
                    <td>{c.codigo_componente ?? ''}</td>
                    <td>{c.descricao_componente ?? ''}</td>
                    <td style={{ textAlign: 'right' }}>{c.quantidade_prevista ?? ''}</td>
                    <td>{c.unidade_medida ?? ''}</td>
                    <td>{c.deposito ?? ''}</td>
                    <td>{c.endereco ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  };

  const renderOperacao = (op: OpOperacao, i: number) => (
    <div className="op-operation" key={`op-${i}`}>
      <div className="op-row-barcode">

        <div style={{ minWidth: 180 }}>
          <Barcode value={op.codigo_barras_operacao ?? `${op.cod_etg ?? ''}${op.seq_rot ?? ''}`} height={28} displayValue={false} />
          <div className="op-barcode-caption">{op.codigo_barras_operacao ?? ''}</div>
        </div>
        <div className="op-kv-2col" style={{ flex: 1 }}>
          <div className="k">Estágio:</div>
          <div className="v">{[op.cod_etg, op.descricao_estagio].filter(Boolean).join(' ') || '—'}</div>
          <div className="k">Centro Rec.:</div>
          <div className="v">{[op.cod_cre, op.descricao_centro_recurso].filter(Boolean).join(' ') || '—'}</div>

          <div className="k">Seq.:</div>
          <div className="v">{op.seq_rot ?? '—'}</div>
          <div className="k">Operação:</div>
          <div className="v">{[op.cod_opr, op.descricao_operacao].filter(Boolean).join(' ') || '—'}</div>

          <div className="k">Tmp Unit:</div>
          <div className="v">{op.tmp_unit ?? '—'}</div>
          <div className="k">Tmp Total:</div>
          <div className="v">{op.tmp_total ?? '—'}</div>

          <div className="k">U.M.:</div>
          <div className="v">{op.unidade_medida ?? '—'}</div>
          <div className="k">Próx. Oper.:</div>
          <div className="v">{(() => {
            const label = op.proxima_operacao_label?.trim();
            if (label) return label;
            const cod = op.proxima_operacao_codigo?.trim();
            const desc = op.proxima_operacao_descricao?.trim();
            if (cod && desc) return `${cod} - ${desc}`;
            if (cod) return cod;
            return '—';
          })()}</div>

          {op.fornecedor && (
            <>
              <div className="k">Fornecedor:</div>
              <div className="v full" style={{ gridColumn: '2 / -1' }}>{op.fornecedor}</div>
            </>
          )}
          {(op.servico || op.descricao_servico) && (
            <>
              <div className="k">Serviço:</div>
              <div className="v full" style={{ gridColumn: '2 / -1' }}>{[op.servico, op.descricao_servico].filter(Boolean).join(' ')}</div>
            </>
          )}
        </div>
      </div>
      {op.narrativas && <div className="op-narrativas">{op.narrativas}</div>}

      <table style={{ marginTop: 4 }}>
        <thead>
          <tr>
            <th>Início</th>
            <th>Fim</th>
            <th>Qtd. Produzida</th>
            <th>Refugos</th>
            <th>Operador</th>
            <th style={{ width: 30, textAlign: 'center' }}>Check</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, r) => (
            <tr key={`apt-${i}-${r}`} className="op-apontamento-row">
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td style={{ textAlign: 'center' }}><span className="op-apontamento-cell-check" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderFooter = () => (
    <>
      <div className="op-responsability">{responsabilidade}</div>
      <div className="op-footer">
        <span>MCAP700.GER - Chão de Fábrica/Apontamentos de OP/OS</span>
        <span>{fmtNow()} {usuario ? `- ${usuario}` : ''}</span>
      </div>
    </>
  );


  const desenhos = data?.desenhos ?? [];

  const renderDesenhos = (keyPrefix = 'drw') =>
    desenhos.map((d, i) => (
      <DrawingPage
        key={`${keyPrefix}-${i}`}
        drawing={d}
        index={i}
        precomputed={blobStates ? blobStates[getDrawingPrintUrl(d)] : undefined}
      />
    ));

  const renderPreviewDesenhosResumo = () => {
    if (!preview) return null;
    if (desenhos.length === 0) {
      return (
        <div className="no-print op-box" style={{ marginTop: 8, fontStyle: 'italic', textAlign: 'center' }}>
          Nenhum desenho encontrado para este produto.
        </div>
      );
    }
    const totalComStatus = blobStates ? desenhos.filter((d) => blobStates[d.url]).length : 0;
    const totalFalhas = blobStates
      ? desenhos.filter((d) => blobStates[d.url]?.status === 'error').length
      : 0;
    const totalOk = blobStates
      ? desenhos.filter((d) => blobStates[d.url]?.status === 'ok').length
      : 0;
    const todosFalharam =
      blobStates && totalComStatus === desenhos.length && totalOk === 0 && totalFalhas > 0;

    return (
      <div className="no-print op-box" style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Desenhos encontrados ({desenhos.length})</div>
        {todosFalharam && (
          <div
            style={{
              marginBottom: 6,
              padding: '6px 8px',
              border: '1px solid hsl(var(--destructive))',
              color: 'hsl(var(--destructive))',
              fontSize: 11,
              borderRadius: 4,
            }}
          >
            A API listou {desenhos.length} desenho(s) mas nenhum pôde ser baixado.
            Verifique o token e as permissões do endpoint <code>/api/producao/ordem-producao/desenho</code>.
          </div>
        )}
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Arquivo</th>
              <th>Tipo</th>
              {blobStates && <th>Status</th>}
            </tr>
          </thead>
          <tbody>
            {desenhos.map((d, i) => {
              const st = blobStates?.[d.url];
              let statusLabel: React.ReactNode = '-';
              if (st) {
                if (st.status === 'loading') statusLabel = <span style={{ color: 'hsl(var(--muted-foreground))' }}>Carregando…</span>;
                else if (st.status === 'ok') statusLabel = <span style={{ color: 'hsl(142 76% 36%)' }}>OK</span>;
                else statusLabel = <span style={{ color: 'hsl(var(--destructive))' }} title={st.error ?? ''}>Falha: {st.error ?? 'erro'}</span>;
              }
              return (
                <tr key={`drw-meta-${i}`}>
                  <td>{i + 1}</td>
                  <td>{d.nome_arquivo ?? '-'}</td>
                  <td>{d.extensao ?? d.tipo ?? d.mime_type ?? '-'}</td>
                  {blobStates && <td>{statusLabel}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };



  // Modo: quebra por operação
  if (quebrarPorOperacao) {
    if (operacoes.length === 0) {
      return (
        <div className={`op-sheet ${preview ? 'op-sheet--preview' : ''}`}>
          {renderHeader()}
          <div className="op-box" style={{ marginTop: 12, textAlign: 'center', fontStyle: 'italic' }}>
            Nenhuma operação encontrada para os filtros selecionados.
          </div>
          {renderFooter()}
        </div>
      );
    }
    return (
      <>
        {quebrarComponentes && (
          <div className={`op-sheet ${preview ? 'op-sheet--preview' : ''}`}>
            {renderHeader()}
            {renderIndicacaoComponentesSeparados()}
            {renderFooter()}
          </div>
        )}
        {quebrarComponentes && renderComponentesPage()}
        {operacoes.map((op, i) => (
          <div key={`opp-wrap-${i}`} style={{ display: 'contents' }}>
            <div
              className={`op-sheet op-operation-page operation-single-page ${preview ? 'op-sheet--preview' : ''}`}
            >
              {renderHeader()}
              {!quebrarComponentes && renderComponentes()}
              <div className="op-section-title">Operação</div>
              {renderOperacao(op, i)}
              {renderFooter()}
            </div>
            {desenhos.length > 0 && renderDesenhos(`drw-op${i}`)}
          </div>
        ))}
        {renderPreviewDesenhosResumo()}
      </>
    );
  }

  // Modo padrão: tudo numa página
  if (quebrarComponentes) {
    return (
      <>
        <div className={`op-sheet ${preview ? 'op-sheet--preview' : ''}`}>
          {renderHeader()}
          {renderIndicacaoComponentesSeparados()}
          {renderFooter()}
        </div>
        {renderComponentesPage()}
        <div className={`op-sheet ${preview ? 'op-sheet--preview' : ''}`}>
          {renderHeader()}
          {operacoes.length > 0 && (
            <>
              <div className="op-section-title">Operações</div>
              {operacoes.map((op, i) => renderOperacao(op, i))}
            </>
          )}
          {renderFooter()}
        </div>
        {renderDesenhos()}
        {renderPreviewDesenhosResumo()}
      </>
    );
  }

  return (
    <>
      <div className={`op-sheet ${preview ? 'op-sheet--preview' : ''}`}>
        {renderHeader()}
        {renderComponentes()}
        {operacoes.length > 0 && (
          <>
            <div className="op-section-title">Operações</div>
            {operacoes.map((op, i) => renderOperacao(op, i))}
          </>
        )}
        {renderFooter()}
      </div>
      {renderDesenhos()}
      {renderPreviewDesenhosResumo()}
    </>
  );
}

function isPdf(d: OpDesenho): boolean {
  const ext = String(d.extensao ?? '').toUpperCase();
  const mime = String(d.mime_type ?? '').toLowerCase();
  const tipo = String(d.tipo ?? '').toUpperCase();
  return ext === 'PDF' || tipo === 'PDF' || mime.includes('pdf');
}

function DrawingPage({
  drawing,
  index,
  precomputed,
}: {
  drawing: OpDesenho;
  index: number;
  precomputed?: { status: 'loading' | 'ok' | 'error'; blobUrl: string | null; error: string | null };
}) {
  return precomputed
    ? <DrawingPageFromState drawing={drawing} index={index} state={precomputed} />
    : <DrawingPageStandalone drawing={drawing} index={index} />;
}

function renderDrawingBody(
  drawing: OpDesenho,
  index: number,
  blobUrl: string | null,
  loading: boolean,
  error: string | null,
) {
  const pdf = isPdf(drawing);
  const shouldRotate =
    drawing.rotacionar_para_retrato === true ||
    Number(drawing.rotacao_recomendada) === 90;
  return (
    <div className="op-drawing-page">
      {loading && <div className="op-drawing-missing no-print">Carregando desenho...</div>}
      {!loading && error && <div className="op-drawing-missing no-print">Falha ao carregar: {error}</div>}
      {!loading && !error && blobUrl && pdf && (
        <iframe src={blobUrl} title={drawing.nome_arquivo ?? `Desenho ${index + 1}`} />
      )}
      {!loading && !error && blobUrl && !pdf && (
        <div className={`drawing-frame${shouldRotate ? ' rotated' : ''}`}>
          <img
            className={`drawing-image${shouldRotate ? ' rotate-90' : ''}`}
            src={blobUrl}
            alt={drawing.nome_arquivo ?? `Desenho ${index + 1}`}
          />
        </div>
      )}
      {!loading && !error && !blobUrl && (
        <div className="op-drawing-missing no-print">Desenho indisponível.</div>
      )}
    </div>
  );
}

function DrawingPageStandalone({ drawing, index }: { drawing: OpDesenho; index: number }) {
  const { blobUrl, loading, error } = useAuthedBlobUrl(drawing.url);
  return renderDrawingBody(drawing, index, blobUrl, loading, error);
}

function DrawingPageFromState({
  drawing,
  index,
  state,
}: {
  drawing: OpDesenho;
  index: number;
  state: { status: 'loading' | 'ok' | 'error'; blobUrl: string | null; error: string | null };
}) {
  return renderDrawingBody(
    drawing,
    index,
    state.blobUrl,
    state.status === 'loading',
    state.status === 'error' ? state.error : null,
  );
}


