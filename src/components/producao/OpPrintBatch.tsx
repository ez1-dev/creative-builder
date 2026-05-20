import { OpPrintSheet } from './OpPrintSheet';
import type { OpImpressao } from '@/lib/producao/opImpressao';
import './op-print.css';

interface Props {
  ordens: OpImpressao[];
  preview?: boolean;
  usuario?: string | null;
  quebrarPorOperacao?: boolean;
}

export function OpPrintBatch({ ordens, preview = false, usuario, quebrarPorOperacao = false }: Props) {
  if (!ordens?.length) return null;
  return (
    <div className="op-print-batch">
      {ordens.map((op, idx) => {
        const cab = op?.cabecalho ?? {};
        const key = `${cab.cod_emp ?? ''}-${cab.cod_ori ?? ''}-${cab.num_orp ?? ''}-${idx}`;
        return (
          <div key={key} className="op-print-page">
            <OpPrintSheet data={op} preview={preview} usuario={usuario} quebrarPorOperacao={quebrarPorOperacao} />
          </div>
        );
      })}
    </div>
  );
}
