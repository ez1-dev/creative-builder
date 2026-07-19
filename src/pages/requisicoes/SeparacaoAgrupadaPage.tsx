import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAgrupadas } from '@/hooks/requisicoes';

/** Estrutura esperada de cada linha agrupada (o backend consolida — o frontend só exibe). */
interface LinhaAgrupada {
  codcmp: string;
  codder?: string | null;
  descricao?: string | null;
  unidade?: string | null;
  deposito?: number | null;
  qtd_total_pendente: number;
  saldo_disponivel?: number | null;
  origens: Array<{
    requisicao_numero: string;
    op?: string | null;
    codetg?: string | number | null;
    seqcmp?: number | null;
    qtd_pendente: number;
  }>;
}

export default function SeparacaoAgrupadaPage() {
  const q = useAgrupadas();
  const linhas = (q.data as LinhaAgrupada[] | undefined) ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Separação agrupada"
        description="Consolidação por componente/derivação/depósito. O rateio por OP/estágio/seq é preservado — só exibimos o que a API entrega."
      />

      {q.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Não foi possível carregar a separação agrupada.
        </div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Componente</TableHead>
              <TableHead>Deriv.</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>UM</TableHead>
              <TableHead>Depósito</TableHead>
              <TableHead className="text-right">Pendente total</TableHead>
              <TableHead className="text-right">Saldo disp.</TableHead>
              <TableHead>Origens (Req. / OP / Estágio / Seq / Qtd)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i}>{Array.from({ length: 8 }).map((_, j) => (
                <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
              ))}</TableRow>
            ))}
            {!q.isLoading && linhas.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum agrupamento pendente.
                </TableCell>
              </TableRow>
            )}
            {linhas.map((l, i) => (
              <TableRow key={`${l.codcmp}-${l.codder ?? ''}-${l.deposito ?? ''}-${i}`}>
                <TableCell className="font-mono text-xs">{l.codcmp}</TableCell>
                <TableCell>{l.codder ?? '—'}</TableCell>
                <TableCell className="max-w-[18rem] truncate">{l.descricao ?? '—'}</TableCell>
                <TableCell>{l.unidade ?? '—'}</TableCell>
                <TableCell>{l.deposito ?? '—'}</TableCell>
                <TableCell className="text-right font-medium">{l.qtd_total_pendente}</TableCell>
                <TableCell className="text-right">{l.saldo_disponivel ?? '—'}</TableCell>
                <TableCell className="text-xs">
                  <ul className="space-y-0.5">
                    {(l.origens ?? []).map((o, j) => (
                      <li key={j}>
                        <span className="font-mono">{o.requisicao_numero}</span>
                        {o.op ? ` · OP ${o.op}` : ''}
                        {o.codetg != null ? ` · etg ${o.codetg}` : ''}
                        {o.seqcmp != null ? ` · seq ${o.seqcmp}` : ''}
                        {' · '}<span className="font-medium">{o.qtd_pendente}</span>
                      </li>
                    ))}
                  </ul>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card>
        <CardContent className="p-3 text-xs text-muted-foreground">
          A separação em lote consome <code>POST /api/requisicoes/agrupadas/separar</code> (idempotente).
          A movimentação individual permanece disponível na Fila do Almoxarifado, preservando o saldo pendente por OP.
        </CardContent>
      </Card>
    </div>
  );
}
