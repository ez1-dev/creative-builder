import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, RotateCcw, User, Users, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  FEATURE_CATALOG,
  featuresByArea,
  type FeatureArea,
  type FeatureDef,
} from '@/config/featureCatalog';

interface Profile { id: string; name: string }
interface UserRow { id: string; erp_user: string | null; display_name: string | null; email: string | null }

interface Props {
  area: FeatureArea;
  title: string;
  description: string;
}

/**
 * Painel reutilizável de liberação de features (funcionalidades / integrações / visual & demo).
 * Alterna entre visão "Por perfil" e "Por usuário (override)".
 */
export function LiberacoesFeaturePanel({ area, title, description }: Props) {
  const qc = useQueryClient();
  const features = useMemo(() => featuresByArea(area), [area]);
  const groups = useMemo(() => {
    const m = new Map<string, FeatureDef[]>();
    for (const f of features) {
      if (!m.has(f.group)) m.set(f.group, []);
      m.get(f.group)!.push(f);
    }
    return Array.from(m.entries());
  }, [features]);

  const [tab, setTab] = useState<'perfil' | 'usuario'>('perfil');
  const [search, setSearch] = useState('');

  // ----------------- perfis / usuários -----------------
  const profilesQ = useQuery<Profile[]>({
    queryKey: ['liberacoes', 'profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('access_profiles').select('id, name').order('name');
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const usersQ = useQuery<UserRow[]>({
    queryKey: ['liberacoes', 'users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, erp_user, display_name, email')
        .order('display_name', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const [profileId, setProfileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId && profilesQ.data && profilesQ.data.length > 0) {
      setProfileId(profilesQ.data[0].id);
    }
  }, [profilesQ.data, profileId]);

  // ----------------- features do perfil selecionado -----------------
  const perfilFeaturesQ = useQuery<Record<string, boolean>>({
    queryKey: ['liberacoes', 'profile_features', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_features')
        .select('feature_key, enabled')
        .eq('profile_id', profileId);
      if (error) throw error;
      const m: Record<string, boolean> = {};
      for (const r of data ?? []) m[r.feature_key] = r.enabled;
      return m;
    },
  });

  const perfilValue = (key: string): boolean => {
    const map = perfilFeaturesQ.data;
    const def = FEATURE_CATALOG.find((f) => f.key === key)!.default;
    if (!map || !(key in map)) return def;
    return map[key];
  };

  async function saveProfileFeature(key: string, enabled: boolean) {
    if (!profileId) return;
    const { error } = await supabase
      .from('profile_features')
      .upsert({ profile_id: profileId, feature_key: key, enabled }, { onConflict: 'profile_id,feature_key' });
    if (error) return toast.error(error.message);
    toast.success('Liberação atualizada.');
    qc.invalidateQueries({ queryKey: ['liberacoes', 'profile_features', profileId] });
    qc.invalidateQueries({ queryKey: ['feature-flags'] });
  }

  // ----------------- overrides do usuário -----------------
  const userOverridesQ = useQuery<Record<string, boolean>>({
    queryKey: ['liberacoes', 'user_overrides', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_feature_overrides')
        .select('feature_key, enabled')
        .eq('user_id', userId);
      if (error) throw error;
      const m: Record<string, boolean> = {};
      for (const r of data ?? []) m[r.feature_key] = r.enabled;
      return m;
    },
  });

  // Perfis do usuário selecionado -> valor efetivo do perfil
  const userProfileFeaturesQ = useQuery<Record<string, boolean>>({
    queryKey: ['liberacoes', 'user_profile_features', userId],
    enabled: !!userId,
    queryFn: async () => {
      const user = usersQ.data?.find((u) => u.id === userId);
      if (!user?.erp_user) return {};
      const { data: acc } = await supabase.from('user_access').select('profile_id').ilike('user_login', user.erp_user);
      const ids = (acc ?? []).map((a: any) => a.profile_id);
      if (ids.length === 0) return {};
      const { data } = await supabase.from('profile_features').select('feature_key, enabled').in('profile_id', ids);
      const m: Record<string, boolean> = {};
      for (const r of data ?? []) m[r.feature_key] = m[r.feature_key] || !!r.enabled;
      return m;
    },
  });

  const userProfileValue = (key: string): boolean => {
    const map = userProfileFeaturesQ.data;
    const def = FEATURE_CATALOG.find((f) => f.key === key)!.default;
    if (!map || !(key in map)) return def;
    return map[key];
  };
  const userEffectiveValue = (key: string): boolean => {
    const ov = userOverridesQ.data?.[key];
    if (typeof ov === 'boolean') return ov;
    return userProfileValue(key);
  };
  const hasOverride = (key: string): boolean => {
    const ov = userOverridesQ.data?.[key];
    return typeof ov === 'boolean';
  };

  async function setUserOverride(key: string, enabled: boolean) {
    if (!userId) return;
    const { error } = await supabase
      .from('user_feature_overrides')
      .upsert({ user_id: userId, feature_key: key, enabled }, { onConflict: 'user_id,feature_key' });
    if (error) return toast.error(error.message);
    toast.success('Override do usuário salvo.');
    qc.invalidateQueries({ queryKey: ['liberacoes', 'user_overrides', userId] });
    qc.invalidateQueries({ queryKey: ['feature-flags'] });
  }
  async function clearUserOverride(key: string) {
    if (!userId) return;
    const { error } = await supabase
      .from('user_feature_overrides')
      .delete()
      .eq('user_id', userId)
      .eq('feature_key', key);
    if (error) return toast.error(error.message);
    toast.success('Voltou ao padrão do perfil.');
    qc.invalidateQueries({ queryKey: ['liberacoes', 'user_overrides', userId] });
    qc.invalidateQueries({ queryKey: ['feature-flags'] });
  }

  // ----------------- filtro por busca -----------------
  const filteredGroups = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return groups;
    return groups
      .map(([g, list]) => [g, list.filter((f) => f.label.toLowerCase().includes(s) || f.key.toLowerCase().includes(s))] as [string, FeatureDef[]])
      .filter(([, list]) => list.length > 0);
  }, [groups, search]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <TabsList>
              <TabsTrigger value="perfil" className="gap-1"><Users className="h-3.5 w-3.5" /> Por perfil</TabsTrigger>
              <TabsTrigger value="usuario" className="gap-1"><User className="h-3.5 w-3.5" /> Por usuário</TabsTrigger>
            </TabsList>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar funcionalidades…" className="pl-8 h-9" />
            </div>
          </div>

          {/* ============ POR PERFIL ============ */}
          <TabsContent value="perfil" className="space-y-3 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Perfil:</span>
              <Select value={profileId ?? undefined} onValueChange={(v) => setProfileId(v)}>
                <SelectTrigger className="h-9 w-72"><SelectValue placeholder="Selecionar perfil" /></SelectTrigger>
                <SelectContent>
                  {(profilesQ.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filteredGroups.map(([groupName, list]) => (
              <div key={groupName} className="rounded-md border">
                <div className="px-3 py-2 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {groupName}
                </div>
                <ul className="divide-y">
                  {list.map((f) => {
                    const value = perfilValue(f.key);
                    return (
                      <li key={f.key} className="flex items-center justify-between px-3 py-2.5 gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate flex items-center gap-1.5">
                            {f.label}
                            {f.description && (
                              <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger><TooltipContent className="max-w-xs">{f.description}</TooltipContent></Tooltip></TooltipProvider>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{f.key}</div>
                        </div>
                        <Switch checked={value} onCheckedChange={(v) => saveProfileFeature(f.key, v)} disabled={!profileId} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </TabsContent>

          {/* ============ POR USUÁRIO ============ */}
          <TabsContent value="usuario" className="space-y-3 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Usuário:</span>
              <UserPicker users={usersQ.data ?? []} value={userId} onChange={setUserId} />
              {userId && (
                <Badge variant="outline" className="ml-auto text-xs">Override sobrepõe o perfil</Badge>
              )}
            </div>

            {!userId && (
              <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                Selecione um usuário para gerenciar exceções individuais.
              </div>
            )}

            {userId && filteredGroups.map(([groupName, list]) => (
              <div key={groupName} className="rounded-md border">
                <div className="px-3 py-2 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {groupName}
                </div>
                <ul className="divide-y">
                  {list.map((f) => {
                    const effective = userEffectiveValue(f.key);
                    const overridden = hasOverride(f.key);
                    const perfilVal = userProfileValue(f.key);
                    return (
                      <li key={f.key} className="flex items-center justify-between px-3 py-2.5 gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate flex items-center gap-1.5">
                            {f.label}
                            {overridden && (
                              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">Override</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            Perfil: {perfilVal ? 'liberado' : 'bloqueado'} · {f.key}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {overridden && (
                            <Button size="sm" variant="ghost" onClick={() => clearUserOverride(f.key)} title="Voltar ao padrão do perfil">
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Switch
                            checked={effective}
                            onCheckedChange={(v) => setUserOverride(f.key, v)}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// -----------------------------------------------------------
// Combobox de usuários
// -----------------------------------------------------------
function UserPicker({ users, value, onChange }: { users: UserRow[]; value: string | null; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users.slice(0, 100);
    return users
      .filter((u) => `${u.display_name ?? ''} ${u.email ?? ''} ${u.erp_user ?? ''}`.toLowerCase().includes(s))
      .slice(0, 100);
  }, [users, q]);
  const selected = users.find((u) => u.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className={cn('h-9 w-80 justify-between font-normal', !selected && 'text-muted-foreground')}>
          {selected ? (selected.display_name ?? selected.email ?? selected.erp_user ?? selected.id) : 'Selecionar usuário…'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-80" align="start">
        <Command>
          <CommandInput placeholder="Buscar por nome, e-mail ou login…" value={q} onValueChange={setQ} />
          <CommandList>
            <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
            <CommandGroup>
              {filtered.map((u) => (
                <CommandItem key={u.id} value={u.id} onSelect={() => { onChange(u.id); setOpen(false); }}>
                  <div className="flex flex-col">
                    <span className="text-sm">{u.display_name ?? u.email ?? u.erp_user ?? u.id}</span>
                    <span className="text-xs text-muted-foreground">{u.email ?? u.erp_user ?? ''}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
