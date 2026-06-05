import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, ArrowLeft, Eye, EyeOff, Pencil, Copy, MoreHorizontal, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface ScreenItem { path: string; name: string; }
export interface ProfileItem { id: string; name: string; }
export interface ProfileScreenItem {
  id: string;
  profile_id: string;
  screen_path: string;
  screen_name: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete?: boolean;
}

interface Props {
  screens: ScreenItem[];
  profiles: ProfileItem[];
  profileScreens: ProfileScreenItem[];
  onToggle: (profileId: string, screenPath: string, screenName: string, field: 'can_view' | 'can_edit' | 'can_delete') => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
}

type ModuleKey =
  | 'producao' | 'compras' | 'estoque' | 'financeiro'
  | 'faturamento' | 'bi' | 'cadastros' | 'regras_senior'
  | 'relatorios' | 'operacional' | 'administracao' | 'outras';

const MODULE_LABEL: Record<ModuleKey, string> = {
  producao: 'Produção',
  compras: 'Compras',
  estoque: 'Estoque',
  financeiro: 'Financeiro / Contábil',
  faturamento: 'Faturamento',
  bi: 'BI / Analytics',
  cadastros: 'Cadastros',
  regras_senior: 'Regras Senior',
  relatorios: 'Relatórios',
  operacional: 'Operacional',
  administracao: 'Administração',
  outras: 'Outras',
};

const MODULE_ORDER: ModuleKey[] = [
  'producao', 'compras', 'estoque', 'financeiro',
  'faturamento', 'bi', 'cadastros', 'regras_senior',
  'relatorios', 'operacional', 'administracao', 'outras',
];

function getModule(path: string): ModuleKey {
  if (path.startsWith('/producao')) return 'producao';
  if (path.startsWith('/bi/') || path === '/etl') return 'bi';
  if (path.startsWith('/cadastros')) return 'cadastros';
  if (path.startsWith('/regras-senior')) return 'regras_senior';
  if (path.startsWith('/relatorios')) return 'relatorios';
  if (
    path === '/painel-compras' ||
    path === '/compras-produto' ||
    path === '/demonstrativo-compras-recebimentos' ||
    path === '/auditoria-tributaria' ||
    path === '/notas-recebimento'
  ) return 'compras';
  if (
    path.startsWith('/estoque') ||
    path === '/sugestao-min-max' ||
    path === '/onde-usa' ||
    path === '/bom' ||
    path === '/numero-serie'
  ) return 'estoque';
  if (
    path.startsWith('/contas-') ||
    path.startsWith('/contabilidade') ||
    path === '/conciliacao-edocs'
  ) return 'financeiro';
  if (path === '/faturamento-genius' || path === '/auditoria-apontamento-genius') return 'faturamento';
  if (path === '/passagens-aereas' || path === '/frota' || path === '/manutencao-maquinas') return 'operacional';
  if (
    path === '/configuracoes' ||
    path === '/monitor-usuarios-senior' ||
    path === '/gestao-sgu-usuarios' ||
    path === '/biblioteca-bi'
  ) return 'administracao';
  return 'outras';
}

export function PermissoesPorTelaPanel({ screens, profiles, profileScreens, onToggle, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(screens[0]?.path ?? null);
  const [openGroups, setOpenGroups] = useState<string[]>(MODULE_ORDER);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return screens;
    return screens.filter(s =>
      s.name.toLowerCase().includes(q) || s.path.toLowerCase().includes(q)
    );
  }, [search, screens]);

  const grouped = useMemo(() => {
    const map = new Map<ModuleKey, ScreenItem[]>();
    for (const s of filtered) {
      const m = getModule(s.path);
      if (!map.has(m)) map.set(m, []);
      map.get(m)!.push(s);
    }
    return MODULE_ORDER
      .map(key => ({ key, items: map.get(key) ?? [] }))
      .filter(g => g.items.length > 0);
  }, [filtered]);

  const countViewers = (path: string) =>
    profileScreens.filter(ps => ps.screen_path === path && ps.can_view).length;

  const selectedScreen = screens.find(s => s.path === selectedPath) ?? null;
  const totalProfiles = profiles.length;
  const selectedViewers = selectedScreen ? countViewers(selectedScreen.path) : 0;

  const getPerm = (profileId: string, path: string) =>
    profileScreens.find(ps => ps.profile_id === profileId && ps.screen_path === path);

  // ----- Bulk actions -----
  const applyBulk = async (
    path: string,
    name: string,
    mode: 'view-all' | 'view-edit-all' | 'clear-all',
  ) => {
    if (!profiles.length) return;
    const rows = profiles.map(p => {
      const existing = getPerm(p.id, path);
      const base = {
        profile_id: p.id,
        screen_path: path,
        screen_name: name,
      };
      if (mode === 'clear-all') return { ...base, can_view: false, can_edit: false, can_delete: false };
      if (mode === 'view-all')  return { ...base, can_view: true,  can_edit: existing?.can_edit ?? false, can_delete: existing?.can_delete ?? false };
      return { ...base, can_view: true, can_edit: true, can_delete: existing?.can_delete ?? false };
    });
    const { error } = await supabase
      .from('profile_screens')
      .upsert(rows, { onConflict: 'profile_id,screen_path' });
    if (error) {
      toast.error('Erro ao aplicar em lote: ' + error.message);
      return;
    }
    toast.success('Permissões atualizadas');
    await onRefresh();
  };

  const copyFromProfile = async (sourceProfileId: string, targetProfileId: string, path: string, name: string) => {
    if (sourceProfileId === targetProfileId) {
      toast.error('Origem e destino devem ser diferentes');
      return;
    }
    const src = getPerm(sourceProfileId, path);
    const row = {
      profile_id: targetProfileId,
      screen_path: path,
      screen_name: name,
      can_view: src?.can_view ?? false,
      can_edit: src?.can_edit ?? false,
      can_delete: src?.can_delete ?? false,
    };
    const { error } = await supabase
      .from('profile_screens')
      .upsert([row], { onConflict: 'profile_id,screen_path' });
    if (error) {
      toast.error('Erro ao copiar: ' + error.message);
      return;
    }
    toast.success('Permissões copiadas');
    await onRefresh();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(340px,380px)_1fr] xl:grid-cols-[420px_1fr] gap-4">
      {/* ===== Painel esquerdo ===== */}
      <div
        className={cn(
          'rounded-md border bg-card',
          selectedPath && 'hidden lg:block',
        )}
      >
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar tela..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <ScrollArea className="h-[560px]">
          <Accordion
            type="multiple"
            value={openGroups}
            onValueChange={setOpenGroups}
            className="px-2 py-1 pr-3"
          >
            {grouped.map(({ key, items }) => (
              <AccordionItem key={key} value={key} className="border-none">
                <AccordionTrigger className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
                  <span className="flex w-full items-center justify-between gap-2 pr-2">
                    <span>{MODULE_LABEL[key]}</span>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                      {items.length}
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-1">
                  <ul className="space-y-1">
                    {items.map(s => {
                      const viewers = countViewers(s.path);
                      const active = s.path === selectedPath;
                      return (
                        <li key={s.path}>
                          <button
                            type="button"
                            onClick={() => setSelectedPath(s.path)}
                            className={cn(
                              'w-full flex flex-col items-start gap-1 rounded-md px-2.5 py-2 text-left transition-colors border-l-2',
                              active
                                ? 'bg-primary/10 text-primary border-primary'
                                : 'hover:bg-accent text-foreground border-transparent',
                            )}
                          >
                            <span className="text-sm leading-snug whitespace-normal break-words">
                              {s.name}
                            </span>
                            <span className="flex items-center gap-2 w-full min-w-0">
                              <Badge
                                variant={viewers > 0 ? 'default' : 'outline'}
                                className="h-4 px-1.5 text-[10px] font-normal shrink-0"
                              >
                                {viewers}/{totalProfiles}
                              </Badge>
                              <span className="font-mono text-[10px] text-muted-foreground truncate">
                                {s.path}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
            {grouped.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">
                Nenhuma tela encontrada
              </p>
            )}
          </Accordion>
        </ScrollArea>
      </div>

      {/* ===== Painel direito ===== */}
      <div
        className={cn(
          'rounded-md border bg-card min-h-[300px]',
          !selectedPath && 'hidden lg:block',
        )}
      >
        {!selectedScreen ? (
          <div className="flex items-center justify-center h-[520px] text-sm text-muted-foreground">
            Selecione uma tela à esquerda para configurar permissões.
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 lg:hidden mb-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPath(null)} className="h-7 -ml-2">
                      <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
                    </Button>
                  </div>
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {selectedScreen.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">{selectedScreen.path}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {selectedViewers} de {totalProfiles} perfis com acesso
                </Badge>
              </div>

              {/* Bulk actions */}
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  size="sm" variant="outline"
                  onClick={() => applyBulk(selectedScreen.path, selectedScreen.name, 'view-all')}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> Liberar Ver p/ todos
                </Button>
                <Button
                  size="sm" variant="outline"
                  onClick={() => applyBulk(selectedScreen.path, selectedScreen.name, 'view-edit-all')}
                >
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Liberar Ver + Editar p/ todos
                </Button>
                <Button
                  size="sm" variant="outline"
                  onClick={() => applyBulk(selectedScreen.path, selectedScreen.name, 'clear-all')}
                >
                  <EyeOff className="h-3.5 w-3.5 mr-1" /> Remover tudo
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copiar de outro perfil
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Copiar permissão desta tela</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {profiles.map(src => (
                      <DropdownMenuSub key={src.id}>
                        <DropdownMenuSubTrigger>De: {src.name}</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {profiles.filter(p => p.id !== src.id).map(tgt => (
                            <DropdownMenuItem
                              key={tgt.id}
                              onClick={() => copyFromProfile(src.id, tgt.id, selectedScreen.path, selectedScreen.name)}
                            >
                              Para: {tgt.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Perfis */}
            <ScrollArea className="flex-1">
              <div className="divide-y">
                {profiles.map(p => {
                  const perm = getPerm(p.id, selectedScreen.path);
                  const canView = !!perm?.can_view;
                  const canEdit = !!perm?.can_edit;
                  return (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {canView ? (canEdit ? 'Ver + Editar' : 'Apenas Ver') : 'Sem acesso'}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 shrink-0">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                          <span>Ver</span>
                          <Switch
                            checked={canView}
                            aria-label={`Liberar visualização para ${p.name}`}
                            onCheckedChange={() => onToggle(p.id, selectedScreen.path, selectedScreen.name, 'can_view')}
                          />
                        </label>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                          <span>Editar</span>
                          <Switch
                            checked={canEdit}
                            disabled={!canView}
                            aria-label={`Liberar edição para ${p.name}`}
                            onCheckedChange={() => onToggle(p.id, selectedScreen.path, selectedScreen.name, 'can_edit')}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
                {profiles.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Nenhum perfil cadastrado.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
