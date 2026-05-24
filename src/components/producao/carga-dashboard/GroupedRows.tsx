import { Fragment, type ReactNode } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { GROUP_FIELD_LABELS, type GroupNode } from './useTableGrouping';

interface Props<T> {
  nodes: GroupNode<T>[];
  expanded: Set<string>;
  onToggle: (key: string) => void;
  /** colspan da célula da esquerda do header de grupo (rótulo). */
  labelColspan: number;
  /** células agregadas à direita do rótulo, alinhadas com as colunas numéricas. */
  renderTotals: (totals: Record<string, number>, node: GroupNode<T>) => ReactNode;
  /** células finais "extras" depois das totals (ex: coluna de status / ações). */
  trailingCells?: ReactNode;
  /** renderiza uma linha-folha. */
  renderLeaf: (row: T, index: number) => ReactNode;
}

export function GroupedRows<T>({
  nodes,
  expanded,
  onToggle,
  labelColspan,
  renderTotals,
  trailingCells,
  renderLeaf,
}: Props<T>) {
  const render = (list: GroupNode<T>[]): ReactNode =>
    list.map((node) => {
      const isOpen = expanded.has(node.key);
      const indent = node.level * 16;
      return (
        <Fragment key={node.key}>
          <TableRow
            className={cn(
              'cursor-pointer hover:bg-muted/60',
              node.level === 0 ? 'bg-muted/50 font-medium' : 'bg-muted/20',
            )}
            onClick={() => onToggle(node.key)}
          >
            <TableCell colSpan={labelColspan} className="text-xs">
              <div className="flex items-center gap-1.5" style={{ paddingLeft: indent }}>
                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                <span className="text-muted-foreground">{GROUP_FIELD_LABELS[node.field]}:</span>
                <span className="font-semibold">{node.value}</span>
                <span className="text-[10px] text-muted-foreground">
                  · {node.count} {node.count === 1 ? 'linha' : 'linhas'}
                </span>
              </div>
            </TableCell>
            {renderTotals(node.totals, node)}
            {trailingCells}
          </TableRow>
          {isOpen && node.children.length > 0 && render(node.children)}
          {isOpen && node.rows.length > 0 && node.rows.map((r, i) => renderLeaf(r, i))}
        </Fragment>
      );
    });
  return <>{render(nodes)}</>;
}
