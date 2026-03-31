import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/erp/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Users, Shield, Eye, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getApiUrl } from '@/lib/api';

const ALL_SCREENS = [
  { path: '/estoque', name: 'Estoque' },
  { path: '/onde-usa', name: 'Onde Usa' },
  { path: '/bom', name: 'Estrutura (BOM)' },
  { path: '/compras-produto', name: 'Compras / Custos' },
  { path: '/painel-compras', name: 'Painel de Compras' },
  { path: '/engenharia-producao', name: 'Eng. x Produção' },
  { path: '/auditoria-tributaria', name: 'Auditoria Tributária' },
  { path: '/notas-recebimento', name: 'NF Recebimento' },
  { path: '/numero-serie', name: 'Reserva Nº Série' },
  { path: '/configuracoes', name: 'Configurações' },
];

interface AccessProfile {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface ProfileScreen {
  id: string;
  profile_id: string;
  screen_path: string;
  screen_name: string;
  can_view: boolean;
  can_edit: boolean;
}

interface UserAccess {
  id: string;
  user_login: string;
  profile_id: string;
  created_at: string;
}

export default function ConfiguracoesPage() {
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [profileScreens, setProfileScreens] = useState<ProfileScreen[]>([]);
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [loading, setLoading] = useState(true);

  // API config states
  const [apiUrl, setApiUrl] = useState(getApiUrl());
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const checkApi = useCallback(async () => {
    setApiStatus('checking');
    try {
      await fetch(getApiUrl(), { method: 'GET', signal: AbortSignal.timeout(5000), headers: { 'ngrok-skip-browser-warning': 'true' } });
      setApiStatus('online');
    } catch {
      setApiStatus('offline');
    }
  }, []);

  useEffect(() => { checkApi(); }, [checkApi]);

  const handleSaveUrl = () => {
    const trimmed = apiUrl.trim().replace(/\/+$/, '');
    if (!trimmed) return;
    localStorage.setItem('erp_api_url', trimmed);
    setApiUrl(trimmed);
    toast.success('URL da API atualizada');
    checkApi();
  };

  const handleResetUrl = () => {
    localStorage.removeItem('erp_api_url');
    setApiUrl(getApiUrl());
    toast.success('URL restaurada para o padrão');
    checkApi();
  };

  // Dialog states
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AccessProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileDesc, setProfileDesc] = useState('');
  const [newUserLogin, setNewUserLogin] = useState('');
  const [newUserProfileId, setNewUserProfileId] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: p }, { data: ps }, { data: ua }] = await Promise.all([
      supabase.from('access_profiles').select('*').order('name'),
      supabase.from('profile_screens').select('*'),
      supabase.from('user_access').select('*').order('user_login'),
    ]);
    setProfiles(p || []);
    setProfileScreens(ps || []);
    setUserAccess(ua || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---- Perfis ----
  const handleSaveProfile = async () => {
    if (!profileName.trim()) return;
    if (editingProfile) {
      await supabase.from('access_profiles').update({ name: profileName, description: profileDesc || null }).eq('id', editingProfile.id);
      toast.success('Perfil atualizado');
    } else {
      await supabase.from('access_profiles').insert({ name: profileName, description: profileDesc || null });
      toast.success('Perfil criado');
    }
    setProfileDialogOpen(false);
    setEditingProfile(null);
    setProfileName('');
    setProfileDesc('');
    fetchData();
  };

  const handleDeleteProfile = async (id: string) => {
    await supabase.from('access_profiles').delete().eq('id', id);
    toast.success('Perfil removido');
    fetchData();
  };

  const openEditProfile = (p: AccessProfile) => {
    setEditingProfile(p);
    setProfileName(p.name);
    setProfileDesc(p.description || '');
    setProfileDialogOpen(true);
  };

  // ---- Telas por perfil ----
  const toggleScreen = async (profileId: string, screenPath: string, screenName: string, field: 'can_view' | 'can_edit') => {
    const existing = profileScreens.find(ps => ps.profile_id === profileId && ps.screen_path === screenPath);
    if (existing) {
      const newVal = !existing[field];
      // If disabling view, also disable edit
      const updates = field === 'can_view' && !newVal
        ? { can_view: false, can_edit: false }
        : { [field]: newVal };
      await supabase.from('profile_screens').update(updates).eq('id', existing.id);
    } else {
      await supabase.from('profile_screens').insert({
        profile_id: profileId,
        screen_path: screenPath,
        screen_name: screenName,
        can_view: field === 'can_view',
        can_edit: field === 'can_edit',
      });
    }
    fetchData();
  };

  const getScreenPerm = (profileId: string, screenPath: string) => {
    return profileScreens.find(ps => ps.profile_id === profileId && ps.screen_path === screenPath);
  };

  // ---- Usuários ----
  const handleAddUser = async () => {
    if (!newUserLogin.trim() || !newUserProfileId) return;
    const { error } = await supabase.from('user_access').insert({ user_login: newUserLogin.trim().toUpperCase(), profile_id: newUserProfileId });
    if (error?.code === '23505') {
      toast.error('Usuário já possui este perfil');
      return;
    }
    toast.success('Acesso atribuído');
    setUserDialogOpen(false);
    setNewUserLogin('');
    setNewUserProfileId('');
    fetchData();
  };

  const handleRemoveUser = async (id: string) => {
    await supabase.from('user_access').delete().eq('id', id);
    toast.success('Acesso removido');
    fetchData();
  };

  const getProfileName = (profileId: string) => profiles.find(p => p.id === profileId)?.name || '—';

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <PageHeader title="Configurações" description="Gerenciamento de acessos e permissões" />
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Configurações" description="Gerenciamento de perfis de acesso, permissões por tela e atribuição de usuários" />

      <Tabs defaultValue="profiles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profiles" className="gap-1"><Shield className="h-4 w-4" /> Perfis de Acesso</TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1"><Eye className="h-4 w-4" /> Permissões por Tela</TabsTrigger>
          <TabsTrigger value="users" className="gap-1"><Users className="h-4 w-4" /> Usuários</TabsTrigger>
          <TabsTrigger value="api" className="gap-1"><Wifi className="h-4 w-4" /> API</TabsTrigger>
        </TabsList>

        {/* === PERFIS === */}
        <TabsContent value="profiles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Perfis de Acesso</CardTitle>
              <Dialog open={profileDialogOpen} onOpenChange={(o) => { setProfileDialogOpen(o); if (!o) { setEditingProfile(null); setProfileName(''); setProfileDesc(''); } }}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Perfil</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingProfile ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Nome</Label>
                      <Input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Ex: Comprador" />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input value={profileDesc} onChange={e => setProfileDesc(e.target.value)} placeholder="Descrição do perfil" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveProfile}>Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-center">Telas</TableHead>
                    <TableHead className="text-center">Usuários</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map(p => {
                    const screenCount = profileScreens.filter(ps => ps.profile_id === p.id && ps.can_view).length;
                    const userCount = userAccess.filter(ua => ua.profile_id === p.id).length;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{p.description || '—'}</TableCell>
                        <TableCell className="text-center"><Badge variant="secondary">{screenCount}</Badge></TableCell>
                        <TableCell className="text-center"><Badge variant="outline">{userCount}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditProfile(p)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteProfile(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {profiles.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum perfil cadastrado</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === PERMISSÕES === */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Permissões por Tela</CardTitle>
            </CardHeader>
            <CardContent>
              {profiles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Crie um perfil primeiro na aba "Perfis de Acesso"</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[160px]">Tela</TableHead>
                        {profiles.map(p => (
                          <TableHead key={p.id} className="text-center min-w-[120px]">
                            <div className="text-xs">{p.name}</div>
                            <div className="flex justify-center gap-3 text-[10px] text-muted-foreground mt-1">
                              <span>Ver</span><span>Editar</span>
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ALL_SCREENS.map(screen => (
                        <TableRow key={screen.path}>
                          <TableCell className="font-medium text-sm">{screen.name}</TableCell>
                          {profiles.map(p => {
                            const perm = getScreenPerm(p.id, screen.path);
                            return (
                              <TableCell key={p.id} className="text-center">
                                <div className="flex justify-center gap-3">
                                  <Checkbox
                                    checked={perm?.can_view || false}
                                    onCheckedChange={() => toggleScreen(p.id, screen.path, screen.name, 'can_view')}
                                  />
                                  <Checkbox
                                    checked={perm?.can_edit || false}
                                    onCheckedChange={() => toggleScreen(p.id, screen.path, screen.name, 'can_edit')}
                                    disabled={!perm?.can_view}
                                  />
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === USUÁRIOS === */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Atribuição de Usuários</CardTitle>
              <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Atribuir Acesso</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Atribuir Perfil a Usuário</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Login do Usuário (ERP)</Label>
                      <Input value={newUserLogin} onChange={e => setNewUserLogin(e.target.value)} placeholder="Ex: JOAO.SILVA" />
                    </div>
                    <div>
                      <Label>Perfil de Acesso</Label>
                      <Select value={newUserProfileId} onValueChange={setNewUserProfileId}>
                        <SelectTrigger><SelectValue placeholder="Selecione um perfil" /></SelectTrigger>
                        <SelectContent>
                          {profiles.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleAddUser}>Atribuir</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Atribuído em</TableHead>
                    <TableHead className="w-16">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userAccess.map(ua => (
                    <TableRow key={ua.id}>
                      <TableCell className="font-medium">{ua.user_login}</TableCell>
                      <TableCell><Badge variant="secondary">{getProfileName(ua.profile_id)}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(ua.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveUser(ua.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {userAccess.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum usuário atribuído</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
