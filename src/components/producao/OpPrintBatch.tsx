import type { OpImpressao } from "@/lib/producao/opImpressao";
import type { BlobStateMap } from "@/hooks/useAuthedBlobUrls";
import type { OpDesenhoPaginaA4Carregada } from "@/lib/producao/opDesenhosA4";
import { OpPrintSheet } from "./OpPrintSheet";
import "./op-print.css";

interface Props {
  ops: OpImpressao[];
  preview?: boolean;
  usuario?: string | null;
  quebrarPorOperacao?: boolean | null;
  frenteVersoSeguro?: boolean | null;
  blobStates?: BlobStateMap;
  paginasDesenhosA4PorOp?: Record<string, OpDesenhoPaginaA4Carregada[]>;
}

function getOpKey(op: OpImpressao, index: number) {
  const cab = op?.cabecalho ?? {};

  return `${cab.cod_emp ?? ""}-${cab.cod_ori ?? ""}-${cab.num_orp ?? ""}-${index}`;
}

function getOpMapaKey(op: OpImpressao) {
  const cab = op?.cabecalho ?? {};

  return `${cab.cod_emp ?? ""}-${cab.cod_ori ?? ""}-${cab.num_orp ?? ""}`;
}

export function OpPrintBatch({
  ops,
  preview = false,
  usuario,
  quebrarPorOperacao,
  frenteVersoSeguro,
  blobStates,
  paginasDesenhosA4PorOp,
}: Props) {
  const lista = Array.isArray(ops) ? ops : [];

  if (lista.length === 0) {
    return (
      <div className="print-root">
        <div className="op-print-empty no-print">Nenhuma ordem de produção selecionada para impressão.</div>
      </div>
    );
  }

  return (
    <div className="print-root op-print-batch">
      {lista.map((op, index) => {
        const isLast = index === lista.length - 1;
        const mapaKey = getOpMapaKey(op);
        const paginasDesenhosA4 = paginasDesenhosA4PorOp?.[mapaKey] ?? [];

        return (
          <div key={getOpKey(op, index)} className={`op-print-group ${isLast ? "last-print-group" : ""}`}>
            <OpPrintSheet
              data={op}
              preview={preview}
              usuario={usuario}
              quebrarPorOperacao={quebrarPorOperacao}
              frenteVersoSeguro={frenteVersoSeguro}
              blobStates={blobStates}
              paginasDesenhosA4={paginasDesenhosA4}
            />
          </div>
        );
      })}
    </div>
  );
}
