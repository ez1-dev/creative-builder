/**
 * Toolbar de layout dos módulos RH: entrar em edição, salvar, resetar,
 * reexibir blocos ocultos.
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
import { Pencil, Check, RotateCcw, EyeOff, Eye } from 'lucide-react';
import type { RhWidget } from '@/hooks/useRhModuleLayout';

interface Props {
  editing: boolean;
  onToggle: (v: boolean) => void;
  onReset: () => Promise<void> | void;
  widgets: RhWidget[];
  onShow: (type: string) => void;
}

export function RhLayoutToolbar({ editing, onToggle, onReset, widgets, onShow }: Props) {
  const [resetting, setResetting] = useState(false);
  const hidden = widgets.filter((w) => w.hidden);
  return (
    <div className="flex items-center gap-2">
      {hidden.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8">
              <EyeOff className="mr-1.5 h-3.5 w-3.5" />
              Ocultos ({hidden.length})
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
              Resetar layout
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
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
          <><Check className="mr-1.5 h-3.5 w-3.5" />Concluir</>
        ) : (
          <><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar layout</>
        )}
      </Button>
    </div>
  );
}
