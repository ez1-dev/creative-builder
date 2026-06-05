/**
 * Wrapper visual de cada widget injetado pelo usuário.
 * Mostra menu (⋮) com opção de remover.
 */
import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2 } from 'lucide-react';
import { deleteUserWidget } from '@/hooks/useUserWidgets';
import { toast } from 'sonner';

export function UserWidgetFrame({
  id, span = 1, onChanged, unidadeOverride, children,
}: {
  id: string;
  span?: number;
  onChanged: () => void;
  unidadeOverride?: string;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  const colSpan =
    span >= 4 ? 'lg:col-span-4'
      : span === 3 ? 'lg:col-span-3'
      : span === 2 ? 'lg:col-span-2'
      : '';

  const remove = async () => {
    if (!confirm('Remover este widget?')) return;
    setBusy(true);
    const { error } = await deleteUserWidget(id);
    setBusy(false);
    if (error) {
      toast.error('Erro ao remover widget');
    } else {
      toast.success('Widget removido');
      onChanged();
    }
  };

  return (
    <div className={`group relative ${colSpan}`}>
      <div className="absolute right-1 top-1 z-10 flex items-center gap-1">
        {unidadeOverride && (
          <span
            title="Unidade fixada para este widget (sobrepõe o filtro da página)"
            className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary-foreground shadow-sm"
          >
            {unidadeOverride}
          </span>
        )}
        <div className="opacity-0 transition-opacity group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={busy}>
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={remove} className="text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {children}
    </div>
  );
}
