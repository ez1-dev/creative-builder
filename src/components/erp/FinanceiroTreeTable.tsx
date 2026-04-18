import { useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import {
  LinhaArvoreFinanceira,
  construirMapaFilhos,
  flattenArvore,
} from '@/lib/treeFinanceiro';

const statusLabel: Record<string, string> = {
  PAGO: 'Pago',
  PARCIAL: 'Parcial',
  VENCIDO: 'Vencido',
  A_VENCER: 'A Vencer',
  EM_ABERTO: 'Em Aberto',
};
const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PAGO: 'default',
  PARCIAL: 'secondary',
  VENCIDO: 'destructive',
  A_VENCER: 'outline',
  EM_ABERTO: 'secondary',
};

interface Props {
  dados: LinhaArvoreFinanceira[];
  expandidos: Set<string>;
  onToggle: (idLinha: string) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export function FinanceiroTreeTable({
  dados, expandidos, onToggle, loading, emptyMessage = 'Nenhum registro.',
}: Props) {
  const mapaFilhos = useMemo(() => construirMapaFilhos(dados), [dados]);
  const linhas = useMemo(() => flattenArvore(dados, expandidos), [dados, expandidos]);

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Carregando...</div>;
  }
  if (!dados.length) {
    return <div className="p-4 text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="table-header-bg hover:bg-[hsl(var(--table-header))]">
            <TableHead className="text-[hsl(var(--table-header-foreground))]">Estrutura</TableHead>
            <TableHead className="text-[hsl(var(--table-header-foreground))]">Projeto</TableHead>
            <TableHead className="text-[hsl(var(--table-header-foreground))]">Fase</TableHead>
            <TableHead className="text-[hsl(var(--table-header-foreground))]">CCU</TableHead>
            <TableHead className="text-[hsl(var(--table-header-foreground))]">Descrição CCU</TableHead>
            <TableHead className="text-right text-[hsl(var(--table-header-foreground))]">% Rateio</TableHead>
            <TableHead className="text-right text-[hsl(var(--table-header-foreground))]">Valor Rateado</TableHead>
            <TableHead className="text-[hsl(var(--table-header-foreground))]">Origem</TableHead>
            <TableHead className="text-[hsl(var(--table-header-foreground))]">Status</TableHead>
            <TableHead className="text-[hsl(var(--table-header-foreground))]">Vencimento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.map((item, idx) => {
            const isTitulo = item.tipo_linha === 'TITULO';
            const possuiFilhos =
              item.possui_filhos ?? (mapaFilhos.get(item.id_linha)?.length ?? 0) > 0;
            const expandido = expandidos.has(item.id_linha);
            const status = item.status_titulo ? String(item.status_titulo) : '';
            return (
              <TableRow
                key={`${item.id_linha}-${idx}`}
                className={isTitulo ? 'bg-muted/40 font-medium' : ''}
              >
                <TableCell>
                  <div
                    className="tree-cell"
                    style={{ paddingLeft: `${(item.nivel || 0) * 16}px` }}
                  >
                    {possuiFilhos ? (
                      <button
                        type="button"
                        className="tree-toggle text-muted-foreground hover:text-foreground"
                        onClick={() => onToggle(item.id_linha)}
                        aria-label={expandido ? 'Recolher' : 'Expandir'}
                      >
                        {expandido ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>
                    ) : (
                      <span className="tree-leaf" />
                    )}
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {isTitulo ? 'Título' : 'Rateio'}
                    </span>
                    <span className="ml-1">{item.descricao_resumida || '-'}</span>
                  </div>
                </TableCell>
                <TableCell>{item.numero_projeto || '-'}</TableCell>
                <TableCell>{item.codigo_fase_projeto || '-'}</TableCell>
                <TableCell title={import.meta.env.DEV ? `id_linha=${item.id_linha} | codigo_pai=${item.codigo_pai ?? '-'} | cod_ccu=${item.codigo_centro_custo ?? '-'}` : undefined}>{item.codigo_centro_custo || '-'}</TableCell>
                <TableCell title={import.meta.env.DEV ? `desc_ccu=${item.descricao_centro_custo ?? '-'}` : undefined}>{item.descricao_centro_custo || '-'}</TableCell>
                <TableCell className="text-right">
                  {item.percentual_rateio != null
                    ? `${formatNumber(item.percentual_rateio, 2)}%`
                    : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {item.valor_rateado != null
                    ? formatCurrency(item.valor_rateado)
                    : isTitulo
                      ? formatCurrency(item.valor_original)
                      : '-'}
                </TableCell>
                <TableCell>{item.origem_rateio || '-'}</TableCell>
                <TableCell>
                  {status ? (
                    <Badge variant={statusVariant[status] || 'secondary'}>
                      {statusLabel[status] || status}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{formatDate(item.data_vencimento)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
