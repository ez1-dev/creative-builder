/**
 * Toolbar de layout dos módulos RH: entrar em edição, salvar/cancelar rascunho,
 * resetar, reexibir blocos ocultos, e adicionar componentes da Biblioteca BI.
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
import { Pencil, RotateCcw, EyeOff, Eye, Plus, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
  /** Salvar todas as alterações pendentes do modo edição. */
  onCommit?: () => Promise<void> | void;
  /** Descartar alterações pendentes e sair do modo edição. */
  onCancel?: () => Promise<void> | void;
  /** Indica se há alterações pendentes para persistir. */
  hasPendingChanges?: boolean;
}

export function RhLayoutToolbar({
  editing, onToggle, onReset, widgets, onShow, pageKey, onAdd,
  onCommit, onCancel, hasPendingChanges = false,
}: Props) {
  const [resetting, setResetting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const hidden = widgets.filter((w) => w.hidden);
  const openAddDialog = () => {
    if (!pageKey) return;
    window.dispatchEvent(new CustomEvent('rh:add-bi-widget', { detail: { pageKey } }));
  };

  const doCommit = async () => {
    if (!onCommit) { onToggle(false); return; }
    setSaving(true);
    try {
      await onCommit();
      toast.success('Layout salvo');
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar layout');
    } finally {
      setSaving(false);
    }
  };

  const doCancel = async () => {
    if (!onCancel) { onToggle(false); return; }
    setCancelling(true);
    try {
      await onCancel();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao cancelar');
    } finally {
      setCancelling(false);
    }
  };

  const handleCancelClick = () => {
    if (hasPendingChanges) setConfirmCancel(true);
    else void doCancel();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {editing && pageKey && onAdd && (
        <Button size="sm" variant="outline" className="h-8" onClick={openAddDialog} disabled={saving || cancelling}>
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
            <Button size="sm" variant="outline" className="h-8" disabled={resetting || saving || cancelling}>
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

      {editing ? (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={handleCancelClick}
            disabled={saving || cancelling}
          >
            {cancelling ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1.5 h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Cancelar</span>
            <span className="sm:hidden">Cancelar</span>
          </Button>
          <Button
            size="sm"
            variant="default"
            className="h-8"
            onClick={doCommit}
            disabled={saving || cancelling || !hasPendingChanges}
            title={!hasPendingChanges ? 'Nenhuma alteração para salvar' : undefined}
          >
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Salvar edição</span>
            <span className="sm:hidden">Salvar</span>
          </Button>

          <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
            <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Descartar alterações não salvas?</AlertDialogTitle>
                <AlertDialogDescription>
                  As mudanças feitas nesta edição serão perdidas e o layout voltará ao último estado salvo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Continuar editando</AlertDialogCancel>
                <AlertDialogAction onClick={() => { setConfirmCancel(false); void doCancel(); }}>
                  Descartar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => onToggle(true)}
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline">Editar layout</span>
          <span className="sm:hidden">Editar</span>
        </Button>
      )}
    </div>
  );
}
