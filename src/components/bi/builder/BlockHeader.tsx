import { useState } from 'react';
import { Plus, MoreVertical, Pencil, Trash2, ArrowUp, ArrowDown, GripVertical, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Props {
  title: string;
  count: number;
  editing: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onAddComponent?: () => void;
  onRename?: (next: string) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onMoveUp?: () => Promise<void> | void;
  onMoveDown?: () => Promise<void> | void;
}

export function BlockHeader({
  title,
  count,
  editing,
  canMoveUp,
  canMoveDown,
  onAddComponent,
  onRename,
  onDelete,
  onMoveUp,
  onMoveDown,
}: Props) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(title);

  const commitRename = async () => {
    const next = draft.trim();
    if (next && next !== title && onRename) {
      await onRename(next);
    } else {
      setDraft(title);
    }
    setRenaming(false);
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        {editing && <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />}
        {renaming && editing ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') {
                  setDraft(title);
                  setRenaming(false);
                }
              }}
              className="h-7 w-48"
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={commitRename}>
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                setDraft(title);
                setRenaming(false);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <h3 className="font-semibold text-sm truncate">{title}</h3>
        )}
        <span className="text-xs text-muted-foreground shrink-0">
          {count} {count === 1 ? 'componente' : 'componentes'}
        </span>
      </div>
      {editing && (
        <div className="flex items-center gap-1">
          {onAddComponent && (
            <Button size="sm" variant="outline" onClick={onAddComponent} className="h-7">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar componente
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onRename && (
                <DropdownMenuItem onClick={() => setRenaming(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Renomear
                </DropdownMenuItem>
              )}
              {onMoveUp && (
                <DropdownMenuItem onClick={onMoveUp} disabled={!canMoveUp}>
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Mover para cima
                </DropdownMenuItem>
              )}
              {onMoveDown && (
                <DropdownMenuItem onClick={onMoveDown} disabled={!canMoveDown}>
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Mover para baixo
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir bloco
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
