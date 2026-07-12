import { ChevronRight, ChevronDown, FolderTree, Minus, Plus, Sigma, FunctionSquare, ListTree } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DreLinha, TipoLinha } from '@/lib/contabil/dreStudioTypes';

interface Props {
  linhas: DreLinha[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onAddChild?: (parentId: string | null) => void;
  onDelete?: (id: string) => void;
  canEdit?: boolean;
}

interface TreeNode extends DreLinha {
  children: TreeNode[];
}

function buildTree(linhas: DreLinha[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  linhas.forEach((l) => byId.set(l.id, { ...l, children: [] }));
  byId.forEach((n) => {
    if (n.linha_pai_id && byId.has(n.linha_pai_id)) {
      byId.get(n.linha_pai_id)!.children.push(n);
    } else {
      roots.push(n);
    }
  });
  const sortRec = (arr: TreeNode[]) => {
    arr.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    arr.forEach((c) => sortRec(c.children));
  };
  sortRec(roots);
  return roots;
}

const TIPO_ICON: Record<TipoLinha, any> = {
  GRUPO: FolderTree,
  ANALITICA: ListTree,
  SUBTOTAL: Sigma,
  TOTAL: Sigma,
  FORMULA: FunctionSquare,
};

const TIPO_COLOR: Record<TipoLinha, string> = {
  GRUPO: 'text-primary',
  ANALITICA: 'text-muted-foreground',
  SUBTOTAL: 'text-blue-500',
  TOTAL: 'text-emerald-600',
  FORMULA: 'text-purple-500',
};

export function DreModelTree({ linhas, selectedId, onSelect, onAddChild, onDelete, canEdit = true }: Props) {
  const tree = useMemo(() => buildTree(linhas), [linhas]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setCollapsed((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const renderNode = (n: TreeNode, depth: number): React.ReactNode => {
    const Icon = TIPO_ICON[n.tipo_linha] ?? ListTree;
    const isOpen = !collapsed.has(n.id);
    const hasChildren = n.children.length > 0;
    const active = selectedId === n.id;
    return (
      <div key={n.id}>
        <div
          className={cn(
            'group flex items-center gap-1 rounded-md py-1 pr-1 text-sm hover:bg-muted/60 cursor-pointer',
            active && 'bg-primary/10 text-primary font-medium',
          )}
          style={{ paddingLeft: 8 + depth * 14 }}
          onClick={() => onSelect?.(n.id)}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggle(n.id); }}
              className="p-0.5 rounded hover:bg-muted"
            >
              {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : <span className="w-4" />}
          <Icon className={cn('h-3.5 w-3.5 shrink-0', TIPO_COLOR[n.tipo_linha])} />
          <span className={cn('truncate flex-1', n.negrito && 'font-semibold')} title={n.descricao}>
            {n.codigo ? <span className="text-xs text-muted-foreground mr-1">{n.codigo}</span> : null}
            {n.descricao}
          </span>
          {!n.exibir && <Badge variant="outline" className="h-4 px-1 text-[9px]">oculta</Badge>}
          {canEdit && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
              {(n.tipo_linha === 'GRUPO' || n.tipo_linha === 'SUBTOTAL' || n.tipo_linha === 'TOTAL') && (
                <Button size="icon" variant="ghost" className="h-5 w-5"
                  onClick={(e) => { e.stopPropagation(); onAddChild?.(n.id); }}
                  title="Adicionar filha">
                  <Plus className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive"
                  onClick={(e) => { e.stopPropagation(); if (confirm(`Excluir linha "${n.descricao}"?`)) onDelete(n.id); }}
                  title="Excluir">
                  <Minus className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
        {hasChildren && isOpen && n.children.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="min-h-0 overflow-y-auto">
      {tree.length === 0 && (
        <p className="p-3 text-sm text-muted-foreground">Nenhuma linha configurada ainda.</p>
      )}
      {tree.map((n) => renderNode(n, 0))}
      {canEdit && onAddChild && (
        <div className="p-2">
          <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => onAddChild(null)}>
            <Plus className="h-3.5 w-3.5" /> Adicionar linha raiz
          </Button>
        </div>
      )}
    </div>
  );
}
