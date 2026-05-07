/**
 * Painel "Meus Widgets" — lista todos os widgets que o usuário aplicou
 * em todas as páginas. Permite navegar para a página alvo ou remover.
 *
 * Renderizado no topo de /biblioteca-bi para dar visibilidade imediata
 * do que foi aplicado, sem precisar abrir cada página piloto.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Trash2, LayoutDashboard, Inbox } from 'lucide-react';
import { getPage } from '@/lib/bi/pageRegistry';
import { getComponent } from '@/lib/bi/componentRegistry';
import { deleteUserWidget, type UserWidgetRow } from '@/hooks/useUserWidgets';
import { toast } from 'sonner';

export function MyWidgetsPanel() {
  const [rows, setRows] = useState<UserWidgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    setAuthed(!!auth.user);
    if (!auth.user) { setRows([]); setLoading(false); return; }
    const { data } = await supabase
      .from('bi_user_widgets')
      .select('*')
      .order('page_key', { ascending: true })
      .order('section', { ascending: true });
    setRows((data ?? []) as UserWidgetRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const remove = async (id: string) => {
    const { error } = await deleteUserWidget(id);
    if (error) toast.error('Erro ao remover', { description: error.message });
    else { toast.success('Widget removido'); refresh(); }
  };

  if (loading) return null;

  if (authed === false) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-300">
        Faça login para aplicar componentes nas páginas e vê-los aqui.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Meus widgets aplicados</h3>
          <Badge variant="secondary" className="text-[10px]">{rows.length}</Badge>
        </div>
        <Button size="sm" variant="ghost" onClick={refresh} className="h-7 text-[11px]">Atualizar</Button>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
          <Inbox className="h-4 w-4" />
          Nenhum widget aplicado ainda. Clique em <span className="font-semibold text-primary">Aplicar</span> em qualquer componente abaixo.
        </div>
      ) : (
        <div className="grid gap-1.5 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((w) => {
            const page = getPage(w.page_key);
            const def = getComponent(w.component_id);
            return (
              <div key={w.id} className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-2 py-1.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold truncate">
                    {w.title || def?.label || w.component_id}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {page?.label ?? w.page_key} → {w.section}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {page && (
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                      onClick={() => { window.location.href = page.route; }}
                      title="Abrir página">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                    onClick={() => remove(w.id)} title="Remover">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
