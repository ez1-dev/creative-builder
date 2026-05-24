import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UnidadeNegocioBadge, TipoRecursoBadge } from '@/components/producao/carga/badges';
import type { RecursoAgg } from './aggregations';
import { fmtDec, fmtNum } from './aggregations';

export function CentrosDemandadosTable({ rows }: { rows: RecursoAgg[] }) {
  const top = rows.slice(0, 15);
  const total = rows.reduce(
    (acc, r) => {
      acc.qtd_ops += r.qtd_ops;
      acc.carga_prevista_min += r.carga_prevista_min;
      acc.carga_prevista_horas += r.carga_prevista_horas;
      return acc;
    },
    { qtd_ops: 0, carga_prevista_min: 0, carga_prevista_horas: 0 },
  );

  return (
    <Card className="rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b">
        <div className="text-sm font-semibold">Centros mais demandados</div>
        <div className="text-[11px] text-muted-foreground">Top {top.length} de {rows.length} recursos no período</div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>CCusto</TableHead>
              <TableHead>Recurso</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Qtd OPs</TableHead>
              <TableHead className="text-right">Carga (min)</TableHead>
              <TableHead className="text-right">Carga (h)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {top.map((r) => (
              <TableRow key={`${r.codcre}-${r.codccu}`}>
                <TableCell><UnidadeNegocioBadge value={r.unidade_negocio} /></TableCell>
                <TableCell><TipoRecursoBadge value={r.tipo_recurso} /></TableCell>
                <TableCell className="text-xs">{r.codccu}</TableCell>
                <TableCell className="text-xs font-mono">{r.codcre}</TableCell>
                <TableCell className="text-xs">{r.descre}</TableCell>
                <TableCell className="text-right text-xs">{fmtNum(r.qtd_ops)}</TableCell>
                <TableCell className="text-right text-xs">{fmtDec(r.carga_prevista_min)}</TableCell>
                <TableCell className="text-right text-xs font-semibold">{fmtDec(r.carga_prevista_horas)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/40">
              <TableCell colSpan={5} className="text-xs font-semibold">Total geral</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmtNum(total.qtd_ops)}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmtDec(total.carga_prevista_min)}</TableCell>
              <TableCell className="text-right text-xs font-semibold">{fmtDec(total.carga_prevista_horas)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
