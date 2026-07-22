import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Download, Map, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FEATURE_CATALOG, type FeatureArea } from '@/config/featureCatalog';
import * as XLSX from 'xlsx';

interface ScreenItem { path: string; name: string }

interface Props {
  screens: ScreenItem[];
}

type Kind = 'telas' | 'funcionalidade' | 'integracao';

interface ColumnDef {
  key: string;      // screen path or feature key
  label: string;
  group: string;
  defaultAllowed: boolean;
}

interface UserRow {
  login: string;          // uppercase
  userId: string | null;  // profiles.id
  displayName: string;
  email: string | null;
  profileIds: string[];
  profileNames: string[];
}

interface CellState {
  allowed: boolean;
  source: 'override' | 'profile' | 'default';
  detail: string;
}

export function MapaAcessosPanel({ screens }: Props) {
  const [kind, setKind] = useState<Kind>('telas');
  const [userSearch, setUserSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('__all__');
  const [profileFilter, setProfileFilter] = useState<string>('__all__');
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [onlyOverrides, setOnlyOverrides] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['mapa-acessos'],
    staleTime: 60_000,
    queryFn: async () => {
      const [
        { data: profiles },
        { data: userAccess },
        { data: approved },
        { data: profileScreens },
        { data: userScreenOv },
        { data: profileFeatures },
        { data: userFeatureOv },
      ] = await Promise.all([
        supabase.from('access_profiles').select('id, name').order('name'),
        supabase.from('user_access').select('user_login, profile_id'),
        supabase.from('profiles').select('id, email, display_name, erp_user').eq('approved', true),
        supabase.from('profile_screens').select('profile_id, screen_path, can_view'),
        supabase.from('user_screen_overrides').select('user_id, screen_path, can_view'),
        supabase.from('profile_features').select('profile_id, feature_key, enabled'),
        supabase.from('user_feature_overrides').select('user_id, feature_key, enabled'),
      ]);
      return {
        profiles: profiles || [],
        userAccess: userAccess || [],
        approved: approved || [],
        profileScreens: profileScreens || [],
        userScreenOv: userScreenOv || [],
        profileFeatures: profileFeatures || [],
        userFeatureOv: userFeatureOv || [],
      };
    },
  });

  const profilesById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of data?.profiles ?? []) m.set(p.id, p.name);
    return m;
  }, [data?.profiles]);

  // approved by uppercase erp_user
  const approvedByLogin = useMemo(() => {
    const m = new Map<string, { id: string; display_name: string | null; email: string | null }>();
    for (const u of data?.approved ?? []) {
      if (u.erp_user) m.set(u.erp_user.toUpperCase(), { id: u.id, display_name: u.display_name, email: u.email });
    }
    return m;
  }, [data?.approved]);

  // build users: aggregate user_access by login
  const users: UserRow[] = useMemo(() => {
    const byLogin = new Map<string, UserRow>();
    for (const ua of data?.userAccess ?? []) {
      const key = ua.user_login.toUpperCase();
      const meta = approvedByLogin.get(key);
      const existing = byLogin.get(key);
      if (existing) {
        if (!existing.profileIds.includes(ua.profile_id)) {
          existing.profileIds.push(ua.profile_id);
          existing.profileNames.push(profilesById.get(ua.profile_id) ?? '—');
        }
      } else {
        byLogin.set(key, {
          login: key,
          userId: meta?.id ?? null,
          displayName: meta?.display_name ?? ua.user_login,
          email: meta?.email ?? null,
          profileIds: [ua.profile_id],
          profileNames: [profilesById.get(ua.profile_id) ?? '—'],
        });
      }
    }
    return Array.from(byLogin.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [data?.userAccess, approvedByLogin, profilesById]);

  // columns per kind
  const columns: ColumnDef[] = useMemo(() => {
    if (kind === 'telas') {
      return screens.map(s => ({
        key: s.path,
        label: s.name,
        group: s.name.split('—')[0].trim() || 'Geral',
        defaultAllowed: false,
      }));
    }
    const area: FeatureArea = kind === 'funcionalidade' ? 'funcionalidade' : 'integracao';
    return FEATURE_CATALOG.filter(f => f.area === area).map(f => ({
      key: f.key,
      label: f.label,
      group: f.group,
      defaultAllowed: f.default,
    }));
  }, [kind, screens]);

  const availableGroups = useMemo(() => {
    const s = new Set<string>();
    for (const c of columns) s.add(c.group);
    return Array.from(s).sort();
  }, [columns]);

  const filteredColumns = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    return columns.filter(c => {
      if (groupFilter !== '__all__' && c.group !== groupFilter) return false;
      if (q && !`${c.label} ${c.key}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [columns, itemSearch, groupFilter]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter(u => {
      if (profileFilter !== '__all__' && !u.profileIds.includes(profileFilter)) return false;
      if (q && !`${u.login} ${u.displayName} ${u.email ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, userSearch, profileFilter]);

  // resolver
  const resolveCell = (user: UserRow, col: ColumnDef): CellState => {
    if (!data) return { allowed: col.defaultAllowed, source: 'default', detail: 'Padrão' };
    if (kind === 'telas') {
      // user_screen_overrides by user_id
      if (user.userId) {
        const ov = data.userScreenOv.find(o => o.user_id === user.userId && o.screen_path === col.key);
        if (ov) return { allowed: !!ov.can_view, source: 'override', detail: 'Override individual' };
      }
      const contributing: string[] = [];
      let allowed = false;
      for (const pid of user.profileIds) {
        const ps = data.profileScreens.find(x => x.profile_id === pid && x.screen_path === col.key);
        if (ps?.can_view) {
          allowed = true;
          contributing.push(profilesById.get(pid) ?? pid);
        }
      }
      if (allowed) return { allowed: true, source: 'profile', detail: `Perfil: ${contributing.join(', ')}` };
      return { allowed: false, source: 'default', detail: 'Nenhum perfil libera' };
    }
    // feature
    if (user.userId) {
      const ov = data.userFeatureOv.find(o => o.user_id === user.userId && o.feature_key === col.key);
      if (ov) return { allowed: !!ov.enabled, source: 'override', detail: 'Override individual' };
    }
    const contributing: string[] = [];
    let matched = false;
    let allowed = false;
    for (const pid of user.profileIds) {
      const pf = data.profileFeatures.find(x => x.profile_id === pid && x.feature_key === col.key);
      if (pf) {
        matched = true;
        if (pf.enabled) {
          allowed = true;
          contributing.push(profilesById.get(pid) ?? pid);
        }
      }
    }
    if (matched) {
      return allowed
        ? { allowed: true, source: 'profile', detail: `Perfil: ${contributing.join(', ')}` }
        : { allowed: false, source: 'profile', detail: 'Bloqueado por perfil' };
    }
    return { allowed: col.defaultAllowed, source: 'default', detail: `Padrão do catálogo (${col.defaultAllowed ? 'liberado' : 'bloqueado'})` };
  };

  // matrix + counters
  const { matrix, totalCells, allowedCells, overrideCells } = useMemo(() => {
    const m: CellState[][] = [];
    let total = 0, allowed = 0, ov = 0;
    for (const u of filteredUsers) {
      const row: CellState[] = [];
      for (const c of filteredColumns) {
        const s = resolveCell(u, c);
        row.push(s);
        total++;
        if (s.allowed) allowed++;
        if (s.source === 'override') ov++;
      }
      m.push(row);
    }
    return { matrix: m, totalCells: total, allowedCells: allowed, overrideCells: ov };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredUsers, filteredColumns, data, kind]);

  // apply "only blocked" / "only overrides" row filter
  const visibleRowIndexes = useMemo(() => {
    return matrix
      .map((row, i) => ({ row, i }))
      .filter(({ row }) => {
        if (onlyBlocked && !row.some(c => !c.allowed)) return false;
        if (onlyOverrides && !row.some(c => c.source === 'override')) return false;
        return true;
      })
      .map(({ i }) => i);
  }, [matrix, onlyBlocked, onlyOverrides]);

  const exportXlsx = () => {
    const header = ['Usuário', 'Login', 'Perfis', ...filteredColumns.map(c => c.label)];
    const rows: (string | number)[][] = [header];
    for (const idx of visibleRowIndexes) {
      const u = filteredUsers[idx];
      const cells = matrix[idx];
      rows.push([
        u.displayName,
        u.login,
        u.profileNames.join(' + '),
        ...cells.map(c => (c.allowed ? (c.source === 'override' ? 'SIM (override)' : 'SIM') : (c.source === 'override' ? 'NÃO (override)' : 'NÃO'))),
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MapaAcessos');
    const kindLabel = kind === 'telas' ? 'telas' : kind === 'funcionalidade' ? 'funcionalidades' : 'integracoes';
    XLSX.writeFile(wb, `mapa-acessos-${kindLabel}.xlsx`);
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Map className="h-4 w-4 text-primary" />
              Mapa de Acessos
              <Badge variant="outline" className="text-xs font-normal">
                {filteredUsers.length} usuários × {filteredColumns.length} itens
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Atualizar'}
              </Button>
              <Button variant="outline" size="sm" onClick={exportXlsx} disabled={!data}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Exportar XLSX
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={kind} onValueChange={(v) => { setKind(v as Kind); setGroupFilter('__all__'); }}>
            <TabsList>
              <TabsTrigger value="telas">Telas & Menus</TabsTrigger>
              <TabsTrigger value="funcionalidade">Funcionalidades</TabsTrigger>
              <TabsTrigger value="integracao">Integrações</TabsTrigger>
            </TabsList>

            {/* Filtros */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
              <div>
                <Label className="text-xs">Buscar usuário</Label>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                  <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Nome, login ou e-mail" className="h-9 pl-7" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Buscar item</Label>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                  <Input value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder="Tela ou funcionalidade" className="h-9 pl-7" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Categoria</Label>
                <Select value={groupFilter} onValueChange={setGroupFilter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas</SelectItem>
                    {availableGroups.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Perfil</Label>
                <Select value={profileFilter} onValueChange={setProfileFilter}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {(data?.profiles ?? []).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch id="ma-blocked" checked={onlyBlocked} onCheckedChange={setOnlyBlocked} />
                <Label htmlFor="ma-blocked" className="text-xs">Só usuários com bloqueios</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="ma-ov" checked={onlyOverrides} onCheckedChange={setOnlyOverrides} />
                <Label htmlFor="ma-ov" className="text-xs">Só usuários com overrides</Label>
              </div>
              <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-emerald-500/80" /> liberado</span>
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-rose-500/30 border border-rose-500/60" /> bloqueado</span>
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-sm bg-emerald-500/80 ring-2 ring-blue-500" /> override</span>
              </div>
            </div>

            <TabsContent value={kind} className="mt-3">
              {isLoading ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                  Carregando mapa…
                </div>
              ) : visibleRowIndexes.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">Nenhum usuário para exibir com os filtros atuais.</div>
              ) : (
                <div className="relative border rounded-md overflow-auto max-h-[70vh]">
                  <table className="text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="sticky top-0 left-0 z-30 bg-background border-b border-r px-3 py-2 text-left min-w-[220px]">
                          Usuário
                        </th>
                        {filteredColumns.map(c => (
                          <th key={c.key} className="sticky top-0 z-20 bg-background border-b p-0 align-bottom">
                            <div className="h-[140px] w-[34px] flex items-end justify-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="rotate-[-70deg] origin-bottom-left translate-x-3 whitespace-nowrap text-[11px] text-muted-foreground max-w-[130px] truncate">
                                    {c.label}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="font-medium">{c.label}</div>
                                  <div className="text-[10px] opacity-70">{c.group} · {c.key}</div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRowIndexes.map(i => {
                        const u = filteredUsers[i];
                        const row = matrix[i];
                        return (
                          <tr key={u.login} className="hover:bg-muted/30">
                            <td className="sticky left-0 z-10 bg-background border-b border-r px-3 py-1.5 min-w-[220px]">
                              <div className="font-medium truncate max-w-[220px]">{u.displayName}</div>
                              <div className="text-[10px] text-muted-foreground flex flex-wrap gap-1 mt-0.5">
                                <span className="uppercase">{u.login}</span>
                                {u.profileNames.map(pn => (
                                  <Badge key={pn} variant="outline" className="h-4 px-1 text-[9px] font-normal">{pn}</Badge>
                                ))}
                              </div>
                            </td>
                            {row.map((cell, ci) => {
                              const col = filteredColumns[ci];
                              return (
                                <td key={col.key} className="border-b p-0 w-[34px] h-[28px]">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={cn(
                                          'mx-auto my-1 h-4 w-4 rounded-sm border',
                                          cell.allowed
                                            ? 'bg-emerald-500/80 border-emerald-600'
                                            : 'bg-rose-500/20 border-rose-500/60',
                                          cell.source === 'override' && 'ring-2 ring-blue-500 ring-offset-1 ring-offset-background',
                                        )}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <div className="font-medium">{u.displayName}</div>
                                      <div className="text-[10px] opacity-70 mb-1">{col.label}</div>
                                      <div className="text-[11px]">
                                        {cell.allowed ? '✓ Liberado' : '✕ Bloqueado'} · {cell.detail}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span>Usuários visíveis: <b>{visibleRowIndexes.length}</b></span>
                <span>Itens visíveis: <b>{filteredColumns.length}</b></span>
                <span>Células liberadas: <b>{allowedCells}</b> / {totalCells} ({totalCells ? Math.round((allowedCells / totalCells) * 100) : 0}%)</span>
                <span>Overrides: <b>{overrideCells}</b></span>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
