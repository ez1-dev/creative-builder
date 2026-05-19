import { Barcode } from './Barcode';
import type { OpImpressao } from '@/lib/producao/opImpressao';
import './op-print.css';

interface Props {
  data: OpImpressao;
  preview?: boolean;
  usuario?: string | null;
}

function fmtNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDate(s?: string) {
  if (!s) return '-';
  // tenta ISO yyyy-mm-dd ou yyyy-mm-ddTHH:mm
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  // dd/mm/yyyy já vem formatado
  return s;
}

export function OpPrintSheet({ data, preview = false, usuario }: Props) {
  const cab = data?.cabecalho ?? {};
  const componentes = data?.componentes ?? [];
  const operacoes = data?.operacoes ?? [];
  const observacoes = data?.observacoes ?? [];
  const responsabilidade =
    data?.mensagem_responsabilidade ??
    'Ao finalizar o apontamento o operador estará se responsabilizando pela quantidade e qualidade dos produtos informados.';

  const opCode =
    cab.codigo_barras_op ??
    `${cab.cod_ori ?? ''}${String(cab.num_orp ?? '').padStart(9, '0')}`;

  // Agrupa componentes por estágio (cod_etg)
  const compsPorEtg = componentes.reduce<Record<string, typeof componentes>>((acc, c) => {
    const k = c.cod_etg ?? '';
    (acc[k] ||= []).push(c);
    return acc;
  }, {});
  const etgKeys = Object.keys(compsPorEtg);

  return (
    <div className={`op-sheet ${preview ? 'op-sheet--preview' : ''}`}>
      {/* CABEÇALHO */}
      <div className="op-grid-2col">
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 10 }}>Origem/O.P.</div>
          <Barcode value={cab.codigo_barras_op ?? opCode} height={36} displayValue={false} />
          <div className="op-barcode-caption">{cab.codigo_barras_op ?? opCode}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 9.5 }}>
          <div>Página: 1/1</div>
        </div>
      </div>

      <div className="op-grid-2col" style={{ marginTop: 6 }}>
        <div className="op-kv op-box">
          <div className="k">Origem:</div><div className="v">{cab.cod_ori ?? '-'}</div>
          <div className="k">O.P.:</div><div className="v">{cab.num_orp_formatado ?? cab.num_orp ?? '-'}</div>
          <div className="k">Qtde.:</div><div className="v">{cab.quantidade ?? '-'}</div>
          <div className="k">U.M.:</div><div className="v">{cab.unidade_medida ?? '-'}</div>
          <div className="k">Produto:</div>
          <div className="v">
            {cab.produto ?? ''}
            {cab.produto_descricao ? ` - ${cab.produto_descricao}` : cab.descricao_produto ? ` - ${cab.descricao_produto}` : ''}
          </div>
          <div className="k">Início Prev.:</div><div className="v">{fmtDate(cab.inicio_previsto)}</div>
          <div className="k">Pedido:</div><div className="v">{cab.pedido ?? '-'}</div>
          <div className="k">Período:</div><div className="v">{cab.periodo ?? '-'}</div>
          <div className="k">Situação:</div><div className="v">{cab.situacao_descricao ?? cab.situacao ?? '-'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="op-rev-grid">
            <div className="lbl">REV</div>
            <div className="lbl">Agrupamento</div>
            <div>{cab.revisao ?? '-'}</div>
            <div>{cab.agrupamento ?? '-'}</div>
          </div>
        </div>
      </div>

      {/* COMPONENTES por estágio */}
      {componentes.length > 0 && (
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
      )}

      {/* OPERAÇÕES */}
      {operacoes.length > 0 && (
        <>
          <div className="op-section-title">Operações</div>
          {operacoes.map((op, i) => (
            <div className="op-operation" key={`op-${i}`}>
              <div className="op-row-barcode">
                <div style={{ minWidth: 180 }}>
                  <Barcode value={op.codigo_barras_operacao ?? `${op.cod_etg ?? ''}${op.seq_rot ?? ''}`} height={28} displayValue={false} />
                  <div className="op-barcode-caption">{op.codigo_barras_operacao ?? ''}</div>
                </div>
                <div className="op-kv" style={{ flex: 1 }}>
                  <div className="k">Estágio:</div><div className="v">{op.cod_etg ?? '-'} {op.descricao_estagio ?? ''}</div>
                  <div className="k">Seq.:</div><div className="v">{op.seq_rot ?? '-'}</div>
                  <div className="k">Centro Rec.:</div><div className="v">{op.cod_cre ?? '-'} {op.descricao_centro_recurso ?? ''}</div>
                  <div className="k">Operação:</div><div className="v">{op.cod_opr ?? '-'} {op.descricao_operacao ?? ''}</div>
                  {op.fornecedor && (<><div className="k">Fornecedor:</div><div className="v">{op.fornecedor}</div></>)}
                  {op.servico && (<><div className="k">Serviço:</div><div className="v">{op.servico}</div></>)}
                  <div className="k">Tmp Unit:</div><div className="v">{op.tmp_unit ?? '-'}</div>
                  <div className="k">Tmp Total:</div><div className="v">{op.tmp_total ?? '-'}</div>
                  <div className="k">U.M.:</div><div className="v">{op.unidade_medida ?? '-'}</div>
                  {op.proxima_operacao && (
                    <><div className="k">Próx. Oper.:</div><div className="v">{op.proxima_operacao}</div></>
                  )}
                </div>
              </div>
              {op.narrativas && <div className="op-narrativas">{op.narrativas}</div>}

              {/* Apontamento manual */}
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
          ))}
        </>
      )}

      {/* OBSERVAÇÕES */}
      {observacoes.length > 0 && (
        <>
          <div className="op-section-title">Observações</div>
          <div className="op-box">
            {observacoes.map((o, i) => <div key={i}>{o}</div>)}
          </div>
        </>
      )}

      {/* RESPONSABILIDADE */}
      <div className="op-responsability">{responsabilidade}</div>

      {/* RODAPÉ */}
      <div className="op-footer">
        <span>MCAP700.GER - Chão de Fábrica/Apontamentos de OP/OS</span>
        <span>{fmtNow()} {usuario ? `- ${usuario}` : ''}</span>
      </div>
    </div>
  );
}
