import { useState, ReactNode } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

export interface TreeNode {
  id: string;
  label: string;
  value?: ReactNode;
  children?: TreeNode[];
}

export interface TreeViewProps {
  nodes: TreeNode[];
  defaultExpanded?: boolean;
}

export function TreeView({ nodes, defaultExpanded = false }: TreeViewProps) {
  return (
    <div className="space-y-0.5 text-xs">
      {nodes.map((n) => <TreeRow key={n.id} node={n} depth={0} defaultExpanded={defaultExpanded} />)}
    </div>
  );
}

function TreeRow({ node, depth, defaultExpanded }: { node: TreeNode; depth: number; defaultExpanded: boolean }) {
  const [open, setOpen] = useState(defaultExpanded);
  const hasChildren = !!node.children?.length;
  return (
    <div>
      <button
        type="button"
        onClick={() => hasChildren && setOpen(!open)}
        className="flex w-full items-center gap-1 rounded-sm px-1.5 py-1 hover:bg-accent/50 text-left"
        style={{ paddingLeft: depth * 14 + 6 }}
      >
        {hasChildren ? (open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : <span className="w-3" />}
        <span className="flex-1 truncate">{node.label}</span>
        {node.value != null && <span className="text-muted-foreground">{node.value}</span>}
      </button>
      {hasChildren && open && node.children!.map((c) => <TreeRow key={c.id} node={c} depth={depth + 1} defaultExpanded={defaultExpanded} />)}
    </div>
  );
}
