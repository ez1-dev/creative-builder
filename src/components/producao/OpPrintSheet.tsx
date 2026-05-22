import { useState } from "react";
import { Barcode } from "./Barcode";
import { useAuthedBlobUrl } from "@/hooks/useAuthedBlobUrl";
import type { BlobStateMap } from "@/hooks/useAuthedBlobUrls";
import type { OpImpressao, OpOperacao, OpComponente, OpDesenho } from "@/lib/producao/opImpressao";
import type { OpDesenhoPaginaA4Carregada } from "@/lib/producao/opDesenhosA4";
import "./op-print.css";

interface Props {
  data: OpImpressao;
  preview?: boolean;
  usuario?: string | null;
  quebrarPorOperacao?: boolean | null;
  blobStates?: BlobStateMap;
  paginasDesenhosA4?: OpDesenhoPaginaA4Carregada[];
  imprimirDesenhos?: boolean | null;
}

function MissingDrawingPage() {
  return (
    <div className="op-print-unit op-missing-drawing-page">
      <div className="op-missing-drawing-label">Desenho não encontrado para esta OP</div>
    </div>
  );
}

function fmtDate(s?: string) {
  if (!s) return "-";

  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);

  if (m) return `${m[3]}/${m[2]}/${m[1]}`;

  return s;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

export function OpPrintSheet({
  data,
  preview = false,
  quebrarPorOperacao: propQuebrarPorOperacao,
  blobStates,
  paginasDesenhosA4,
  imprimirDesenhos,
}: Props) {
  const cab = data?.cabecalho ?? {};
  const componentes = data?.componentes ?? [];
  const operacoes = data?.operacoes ?? [];

  const opCode = cab.codigo_barras_op ?? `${cab.cod_ori ?? ""}${String(cab.num_orp ?? "").padStart(9, "0")}`;

  const compsPorEtg = componentes.reduce<Record<string, OpComponente[]>>((acc, c) => {
    const k = c.cod_etg ?? "";
    (acc[k] ||= []).push(c);
    return acc;
  }, {});

  const etgKeys = Object.keys(compsPorEtg);

  const quebrarPorOperacao = propQuebrarPorOperacao ?? data?.modo_impressao?.quebrar_por_operacao ?? false;

  const limiteComp = data?.layout_componentes?.limite_componentes_primeira_pagina ?? 7;

  const quebrarComponentes =
    data?.layout_componentes?.quebrar_componentes_em_pagina_separada ?? componentes.length > limiteComp;

  const renderHeader = () => (
    <>
      <div className="op-title">Ordens de Produção - GENIUS</div>

      <div className="op-header-top">
        <div style={{ fontWeight: "bold", fontSize: 10 }}>Origem/O.P.</div>
        <div style={{ fontSize: 9.5 }}>Página: 1/1</div>
      </div>

      <div className="op-header-main">
        <div className="op-barcode-box">
          <Barcode value={cab.codigo_barras_op ?? opCode} height={40} displayValue={false} />
          <div className="op-barcode-caption">{cab.codigo_barras_op ?? opCode}</div>
        </div>

        <div className="op-kv-2col op-box op-header-data">
          <div className="k">Origem:</div>
          <div className="v">{cab.cod_ori ?? "-"}</div>

          <div className="k">O.P.:</div>
          <div className="v">
            {cab.num_orp_exibicao ?? (cab.num_orp != null ? String(cab.num_orp).replace(/^0+/, "") || "0" : "-")}
          </div>

          <div className="k op-qtde-destaque">Qtde.:</div>
          <div className="v op-qtde-destaque">{cab.quantidade ?? "-"}</div>

          <div className="k">U.M.:</div>
          <div className="v">{cab.unidade_medida ?? "-"}</div>

          <div className="k">Produto:</div>
          <div className="v full">{cab.produto ?? "-"}</div>

          <div className="k">Descrição:</div>
          <div className="v full">
            {(() => {
              const cod = String(cab.produto ?? "").trim();
              const descDireta = String(cab.descricao ?? "").trim();

              if (descDireta) return descDireta;

              const desc = String(cab.produto_descricao ?? cab.descricao_produto ?? "").trim();

              if (!desc) return "-";
              if (!cod) return desc;

              return desc.replace(new RegExp(`^${cod}\\s*-\\s*`), "").trim() || desc;
            })()}
          </div>

          <div className="k">Derivação:</div>
          <div className="v">{cab.derivacao ?? "-"}</div>

          <div className="k">Início Prev.:</div>
          <div className="v">{fmtDate(cab.inicio_previsto)}</div>

          <div className="k">Pedido:</div>
          <div className="v">{cab.pedido ?? "-"}</div>

          <div className="k">Período:</div>
          <div className="v">{cab.periodo ?? "-"}</div>

          <div className="k">Situação:</div>
          <div className="v">{cab.situacao_descricao ?? cab.situacao ?? "-"}</div>
        </div>

        <div className="op-rev-stack">
          <div className="op-rev-cell">
            <div className="lbl">Rev</div>
            <div className="val" style={{ fontSize: "10px", lineHeight: 1.3 }}>
              <div>MOD {String(cab.revisao_modelo ?? "").trim() || "-"}</div>
              <div>ROT {String(cab.revisao_roteiro ?? "").trim() || "-"}</div>
            </div>
          </div>

          <div className="op-rev-cell">
            <div className="lbl">Agrupamento</div>
            <div className="val">{cab.agrupamento ?? "-"}</div>
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

            <table className="componentes-table">
              <thead>
                <tr>
                  <th className="col-w-medium">Código</th>
                  <th>Descrição</th>
                  <th className="col-w-narrow qtd-prev">Qtde. Prev.</th>
                  <th className="col-w-narrow unidade">UN</th>
                  <th className="col-w-narrow deposito">Dep.</th>
                  <th className="col-w-medium endereco">Endereço</th>
                </tr>
              </thead>

              <tbody>
                {compsPorEtg[etg].map((c, i) => (
                  <tr key={`${etg}-${i}`}>
                    <td>{c.codigo_componente ?? ""}</td>
                    <td>{c.descricao_componente ?? ""}</td>
                    <td className="qtd-prev">{c.quantidade_prevista ?? ""}</td>
                    <td className="unidade">{c.unidade_medida ?? ""}</td>
                    <td className="deposito">{c.deposito ?? ""}</td>
                    <td className="endereco">{c.endereco ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </>
    );
  };

  const renderComponentesPagesPaginadas = () => {
    if (componentes.length === 0) return null;

    const COMPONENTES_POR_PAGINA = 38;
    const componentesPorPagina = chunkArray(componentes, COMPONENTES_POR_PAGINA);

    return (
      <>
        {componentesPorPagina.map((componentesPagina, paginaIndex) => {
          const compsPaginaPorEtg = componentesPagina.reduce<Record<string, OpComponente[]>>((acc, c) => {
            const k = c.cod_etg ?? "";
            (acc[k] ||= []).push(c);
            return acc;
          }, {});

          const etgKeysPagina = Object.keys(compsPaginaPorEtg);

          return (
            <div
              key={`componentes-page-${paginaIndex}`}
              className={`op-sheet op-print-unit componentes-page ${preview ? "op-sheet--preview" : ""}`}
            >
              {renderHeader()}

              <div className="op-section-title op-componentes-title">
                <span>RELAÇÃO DE COMPONENTES NECESSÁRIOS</span>

                {componentesPorPagina.length > 1 && (
                  <span className="op-componentes-parte">
                    Parte {paginaIndex + 1}/{componentesPorPagina.length}
                  </span>
                )}
              </div>

              {etgKeysPagina.map((etg) => (
                <div key={`comp-page-${paginaIndex}-${etg}`}>
                  {etg && <div className="op-stage-bar">Estágio: {etg}</div>}

                  <table className="componentes-table">
                    <thead>
                      <tr>
                        <th className="col-w-medium">Código</th>
                        <th>Descrição</th>
                        <th className="col-w-narrow qtd-prev">Qtde. Prev.</th>
                        <th className="col-w-narrow unidade">UN</th>
                        <th className="col-w-narrow deposito">Dep.</th>
                        <th className="col-w-medium endereco">Endereço</th>
                      </tr>
                    </thead>

                    <tbody>
                      {compsPaginaPorEtg[etg].map((c, i) => (
                        <tr key={`c-page-${paginaIndex}-${etg}-${i}`}>
                          <td>{c.codigo_componente ?? ""}</td>
                          <td>{c.descricao_componente ?? ""}</td>
                          <td className="qtd-prev">{c.quantidade_prevista ?? ""}</td>
                          <td className="unidade">{c.unidade_medida ?? ""}</td>
                          <td className="deposito">{c.deposito ?? ""}</td>
                          <td className="endereco">{c.endereco ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          );
        })}
      </>
    );
  };

  const renderOperacao = (op: OpOperacao, i: number, apontamentoBlocos = 6) => (
    <div className="op-operation" key={`op-${i}`}>
      <div className="op-row-barcode">
        <div style={{ minWidth: 180 }}>
          <Barcode
            value={op.codigo_barras_operacao ?? `${op.cod_etg ?? ""}${op.seq_rot ?? ""}`}
            height={28}
            displayValue={false}
          />
          <div className="op-barcode-caption">{op.codigo_barras_operacao ?? ""}</div>
        </div>

        <div className="op-kv-2col" style={{ flex: 1 }}>
          <div className="k">Estágio:</div>
          <div className="v">{[op.cod_etg, op.descricao_estagio].filter(Boolean).join(" ") || "—"}</div>

          <div className="k op-operacao-destaque">Centro Rec.:</div>
          <div className="v op-operacao-destaque">
            {[op.cod_cre, op.descricao_centro_recurso].filter(Boolean).join(" ") || "—"}
          </div>

          <div className="k">Seq.:</div>
          <div className="v">{op.seq_rot ?? "—"}</div>

          <div className="k op-operacao-destaque">Operação:</div>
          <div className="v op-operacao-destaque">
            {[op.cod_opr, op.descricao_operacao].filter(Boolean).join(" ") || "—"}
          </div>

          <div className="k op-tempo-destaque">Tmp Unit:</div>
          <div className="v op-tempo-destaque">
            {op.tmp_unit_formatado || (op.tmp_unit_min != null ? `${op.tmp_unit_min} min` : "—")}
          </div>

          <div className="k op-operacao-destaque">Tmp Total:</div>
          <div className="v op-operacao-destaque">
            {op.tmp_total_formatado || (op.tmp_total_min != null ? `${op.tmp_total_min} min` : "—")}
          </div>

          <div className="k">U.M.:</div>
          <div className="v">{op.unidade_medida ?? "—"}</div>

          <div className="k op-proxoper-destaque">Próx. Oper.:</div>
          <div className="v op-proxoper-destaque">
            {(() => {
              const label = op.proxima_operacao_label?.trim();

              if (label) return label;

              const cod = op.proxima_operacao_codigo?.trim();
              const desc = op.proxima_operacao_descricao?.trim();

              if (cod && desc) return `${cod} - ${desc}`;
              if (cod) return cod;

              return "—";
            })()}
          </div>

          {op.fornecedor && (
            <>
              <div className="k">Fornecedor:</div>
              <div className="v full" style={{ gridColumn: "2 / -1" }}>
                {op.fornecedor}
              </div>
            </>
          )}

          {(op.servico || op.descricao_servico) && (
            <>
              <div className="k">Serviço:</div>
              <div className="v full" style={{ gridColumn: "2 / -1" }}>
                {[op.servico, op.descricao_servico].filter(Boolean).join(" ")}
              </div>
            </>
          )}
        </div>
      </div>

      {op.narrativas && <div className="op-narrativas">{op.narrativas}</div>}

      <table className="op-apontamento-table">
        <colgroup>
          <col style={{ width: "11%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "22%" }} />
        </colgroup>

        <tbody>
          {Array.from({ length: apontamentoBlocos }).flatMap((_, r) => [
            <tr key={`apt-${i}-${r}-h1`} className="op-apt-head">
              <th>inicio</th>
              <th>data</th>
              <th>tempo setup</th>
              <th>fim</th>
              <th>data</th>
              <th>qtd produzida</th>
              <th>refugo</th>
            </tr>,

            <tr key={`apt-${i}-${r}-d1`} className="op-apt-fill">
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>,

            <tr key={`apt-${i}-${r}-h2`} className="op-apt-head">
              <th>Cod. desvio</th>
              <th colSpan={4}>obs</th>
              <th>operador</th>
              <th>check</th>
            </tr>,

            <tr key={`apt-${i}-${r}-d2`} className="op-apt-fill op-apt-row-end">
              <td>&nbsp;</td>
              <td colSpan={4}>&nbsp;</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>,
          ])}
        </tbody>
      </table>
    </div>
  );

  const desenhos = data?.desenhos ?? [];

  const renderDesenhos = (keyPrefix = "drw") => {
    if (paginasDesenhosA4 && paginasDesenhosA4.length > 0) {
      return paginasDesenhosA4.map((pg, i) => (
        <div className="op-drawing-page op-print-unit" key={`${keyPrefix}-a4-${i}`}>
          <img className="op-drawing-image" src={pg.blobUrl} alt={pg.nome_arquivo ?? `Desenho ${i + 1}`} />
        </div>
      ));
    }

    return desenhos.map((d, i) => (
      <DrawingPage
        key={`${keyPrefix}-${i}`}
        drawing={d}
        index={i}
        precomputed={blobStates ? blobStates[getDrawingPrintUrl(d)] : undefined}
      />
    ));
  };

  const renderPreviewDesenhosResumo = () => {
    if (!preview) return null;

    if (desenhos.length === 0) {
      return (
        <div className="no-print op-box" style={{ marginTop: 8, fontStyle: "italic", textAlign: "center" }}>
          Nenhum desenho encontrado para este produto.
        </div>
      );
    }

    return (
      <div className="no-print op-box" style={{ marginTop: 8 }}>
        <div style={{ fontWeight: "bold", marginBottom: 4 }}>Desenhos encontrados ({desenhos.length})</div>
      </div>
    );
  };

  if (quebrarPorOperacao) {
    if (operacoes.length === 0) {
      return (
        <div className={`op-sheet op-print-unit ${preview ? "op-sheet--preview" : ""}`}>
          {renderHeader()}

          <div className="op-box" style={{ marginTop: 12, textAlign: "center", fontStyle: "italic" }}>
            Nenhuma operação encontrada para os filtros selecionados.
          </div>
        </div>
      );
    }

    const temComponentes = componentes.length > 0;
    const componentesInline = temComponentes && componentes.length <= limiteComp;
    const componentesEmPaginaSeparada = temComponentes && componentes.length > limiteComp;

    return (
      <>
        {operacoes.map((op, i) => {
          const isPrimeiraOperacao = i === 0;
          const renderizarComponentesInline = isPrimeiraOperacao && componentesInline;

          let blocos = 6;

          if (renderizarComponentesInline) {
            const n = componentes.length;

            if (n <= 3) blocos = 5;
            else if (n <= 7) blocos = 4;
          }

          return (
            <div
              key={`opp-${i}`}
              className={`op-sheet op-print-unit op-operation-page operation-single-page ${
                renderizarComponentesInline ? "has-componentes-inline" : ""
              } apt-blocos-${blocos} ${preview ? "op-sheet--preview" : ""}`}
            >
              {renderHeader()}

              {renderizarComponentesInline && <div className="componentes-inline">{renderComponentes()}</div>}

              <div className="op-section-title">Operação</div>
              {renderOperacao(op, i, blocos)}
            </div>
          );
        })}

        {componentesEmPaginaSeparada && renderComponentesPagesPaginadas()}

        {desenhos.length > 0 && renderDesenhos("drw-end")}

        {imprimirDesenhos && desenhos.length === 0 && (!paginasDesenhosA4 || paginasDesenhosA4.length === 0) && <MissingDrawingPage />}

        {preview && renderPreviewDesenhosResumo()}
      </>
    );
  }

  if (quebrarComponentes) {
    return (
      <>
        <div className={`op-sheet op-print-unit ${preview ? "op-sheet--preview" : ""}`}>
          {renderHeader()}

          {operacoes.length > 0 && (
            <>
              <div className="op-section-title">Operações</div>
              {operacoes.map((op, i) => renderOperacao(op, i))}
            </>
          )}
        </div>

        {renderComponentesPagesPaginadas()}

        {renderDesenhos()}

        {imprimirDesenhos && desenhos.length === 0 && (!paginasDesenhosA4 || paginasDesenhosA4.length === 0) && <MissingDrawingPage />}

        {preview && renderPreviewDesenhosResumo()}
      </>
    );
  }

  return (
    <>
      <div className={`op-sheet op-print-unit ${preview ? "op-sheet--preview" : ""}`}>
        {renderHeader()}

        {renderComponentes()}

        {operacoes.length > 0 && (
          <>
            <div className="op-section-title">Operações</div>
            {operacoes.map((op, i) => renderOperacao(op, i))}
          </>
        )}
      </div>

      {renderDesenhos()}

      {preview && renderPreviewDesenhosResumo()}
    </>
  );
}

function isPdf(d: OpDesenho): boolean {
  const ext = String(d.extensao ?? "").toUpperCase();
  const mime = String(d.mime_type ?? "").toLowerCase();
  const tipo = String(d.tipo ?? "").toUpperCase();

  return ext === "PDF" || tipo === "PDF" || mime.includes("pdf");
}

function getDrawingPrintUrl(d: OpDesenho): string {
  return d.url_impressao || d.url || "";
}

function DrawingPage({
  drawing,
  index,
  precomputed,
}: {
  drawing: OpDesenho;
  index: number;
  precomputed?: {
    status: "loading" | "ok" | "error";
    blobUrl: string | null;
    error: string | null;
  };
}) {
  return precomputed ? (
    <DrawingPageFromState drawing={drawing} index={index} state={precomputed} />
  ) : (
    <DrawingPageStandalone drawing={drawing} index={index} />
  );
}

function DrawingImage({
  drawing,
  index,
  blobUrl,
  flagRotate,
}: {
  drawing: OpDesenho;
  index: number;
  blobUrl: string;
  flagRotate: boolean;
}) {
  const [isLandscape, setIsLandscape] = useState(false);
  const shouldRotate = flagRotate || isLandscape;

  return (
    <div className={`drawing-frame${shouldRotate ? " rotated" : ""}`}>
      <img
        className={`drawing-image${shouldRotate ? " rotate-90" : ""}`}
        src={blobUrl}
        alt={drawing.nome_arquivo ?? `Desenho ${index + 1}`}
        onLoad={(e) => {
          const img = e.currentTarget;
          setIsLandscape(img.naturalWidth > img.naturalHeight);
        }}
      />
    </div>
  );
}

function renderDrawingBody(
  drawing: OpDesenho,
  index: number,
  blobUrl: string | null,
  loading: boolean,
  error: string | null,
) {
  const pdf = isPdf(drawing);
  const usingPrintUrl = Boolean(drawing.url_impressao);

  const flagRotate =
    !pdf && !usingPrintUrl && (drawing.rotacionar_para_retrato === true || Number(drawing.rotacao_recomendada) === 90);

  return (
    <div className="op-drawing-page op-print-unit">
      {loading && <div className="op-drawing-missing no-print">Carregando desenho...</div>}

      {!loading && error && <div className="op-drawing-missing no-print">Falha ao carregar: {error}</div>}

      {!loading && !error && blobUrl && pdf && (
        <object data={blobUrl} type="application/pdf" aria-label={drawing.nome_arquivo ?? `Desenho ${index + 1}`}>
          <div className="op-drawing-missing no-print">Não foi possível exibir o PDF.</div>
        </object>
      )}

      {!loading && !error && blobUrl && !pdf && (
        <DrawingImage drawing={drawing} index={index} blobUrl={blobUrl} flagRotate={flagRotate} />
      )}

      {!loading && !error && !blobUrl && <div className="op-drawing-missing no-print">Desenho indisponível.</div>}
    </div>
  );
}

function DrawingPageStandalone({ drawing, index }: { drawing: OpDesenho; index: number }) {
  const { blobUrl, loading, error } = useAuthedBlobUrl(getDrawingPrintUrl(drawing));

  return renderDrawingBody(drawing, index, blobUrl, loading, error);
}

function DrawingPageFromState({
  drawing,
  index,
  state,
}: {
  drawing: OpDesenho;
  index: number;
  state: {
    status: "loading" | "ok" | "error";
    blobUrl: string | null;
    error: string | null;
  };
}) {
  return renderDrawingBody(
    drawing,
    index,
    state.blobUrl,
    state.status === "loading",
    state.status === "error" ? state.error : null,
  );
}
