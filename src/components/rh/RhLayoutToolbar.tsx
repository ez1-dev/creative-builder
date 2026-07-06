/**
 * Toolbar de layout dos módulos RH: entrar em edição, salvar, resetar,
 * reexibir blocos ocultos, e adicionar componentes da Biblioteca BI.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Pencil, Check, RotateCcw, EyeOff, Eye, Plus } from 'lucide-react';
import type { RhWidget } from '@/hooks/useRhModuleLayout';

interface Props {
  editing: boolean;
  onToggle: (v: boolean) => void;
  onReset: () => Promise<void> | void;
  widgets: RhWidget[];
  onShow: (type: string) => void;
  /** Chave da página no pageRegistry — habilita o botão "Adicionar da Biblioteca BI". */
  pageKey?: string;
  onAdd?: (payload: { componentId: string; title: string; mapping: Record<string, string> }) => Promise<void> | void;
}

export function RhLayoutToolbar({ editing, onToggle, onReset, widgets, onShow, pageKey, onAdd }: Props) {
  const [resetting, setResetting] = useState(false);
  const hidden = widgets.filter((w) => w.hidden);
  const openAddDialog = () => {
    if (!pageKey) return;
    window.dispatchEvent(new CustomEvent('rh:add-bi-widget', { detail: { pageKey } }));
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {editing && pageKey && onAdd && (
        <Button size="sm" variant="outline" className="h-8" onClick={openAddDialog}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">Adicionar da Biblioteca BI</span>
          <span className="sm:hidden">Adicionar</span>
        </Button>
      )}

      {hidden.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8">
              <EyeOff className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ocultos</span> ({hidden.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Reexibir bloco</DropdownMenuLabel>
            {hidden.map((w) => (
              <DropdownMenuItem key={w.type} onSelect={() => onShow(w.type)}>
                <Eye className="mr-2 h-3.5 w-3.5" />
                {w.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {editing && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8" disabled={resetting}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              <span className="hidden sm:inline">Resetar layout</span>
              <span className="sm:hidden">Resetar</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Resetar layout desta página?</AlertDialogTitle>
              <AlertDialogDescription>
                Suas customizações (posição, tamanho, blocos ocultos e substituições) serão descartadas
                e o layout padrão será restaurado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  try { setResetting(true); await onReset(); } finally { setResetting(false); }
                }}
              >
                Resetar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Button
        size="sm"
        variant={editing ? 'default' : 'outline'}
        className="h-8"
        onClick={() => onToggle(!editing)}
      >
        {editing ? (
          <><Check className="mr-1.5 h-3.5 w-3.5" /><span className="hidden sm:inline">Concluir</span><span className="sm:hidden">OK</span></>
        ) : (
          <><Pencil className="mr-1.5 h-3.5 w-3.5" /><span className="hidden sm:inline">Editar layout</span><span className="sm:hidden">Editar</span></>
        )}
      </Button>
    </div>
  );
}
