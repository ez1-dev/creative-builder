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
import { Plus, Trash2, Edit, Users, Shield, Eye, Wifi, WifiOff, UserCheck, UserX, FileWarning, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getApiUrl, setApiBaseUrl } from '@/lib/api';
import { formatDate } from '@/lib/format';

const ALL_SCREENS = [
  { path: '/estoque', name: 'Estoque' },
  { path: '/estoque-min-max', name: 'Estoque Min/Max' },
  { path: '/onde-usa', name: 'Onde Usa' },
  { path: '/bom', name: 'Estrutura (BOM)' },
  { path: '/compras-produto', name: 'Compras / Custos' },
  { path: '/painel-compras', name: 'Painel de Compras' },
  { path: '/auditoria-tributaria', name: 'Auditoria Tributária' },
  { path: '/conciliacao-edocs', name: 'Conciliação EDocs' },
  { path: '/notas-recebimento', name: 'NF Recebimento' },
  { path: '/contas-pagar', name: 'Contas a Pagar' },
  { path: '/contas-receber', name: 'Contas a Receber' },
  { path: '/numero-serie', name: 'Reserva Nº Série' },
  { path: '/producao/dashboard', name: 'Produção - Dashboard' },
  { path: '/producao/produzido', name: 'Produção - Produzido no Período' },
  { path: '/producao/expedido', name: 'Produção - Expedido para Obra' },
  { path: '/producao/patio', name: 'Produção - Saldo em Pátio' },
  { path: '/producao/nao-carregados', name: 'Produção - Não Carregados' },
  { path: '/producao/leadtime', name: 'Produção - Lead Time' },
  { path: '/producao/engenharia', name: 'Produção - Eng. x Produção' },
  { path: '/configuracoes', name: 'Configurações' },
];

interface AccessProfile {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  ai_enabled: boolean;
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

interface ApprovedUser {
  id: string;
  email: string | null;
  display_name: string | null;
  erp_user: string | null;
}

function getErrorExplanation(log: any): { explicacao: string; resolucao: string } {
  const msg = (log.message || '').toLowerCase();
  const mod = log.module || '';
  const code = log.status_code;

  if (mod === 'global/js-error') {
    return { explicacao: 'Erro inesperado no navegador (JavaScript)', resolucao: 'Tente recarregar a página (Ctrl+Shift+R). Se persistir, reporte ao suporte.' };
  }
  if (mod === 'global/unhandled-rejection') {
    return { explicacao: 'Uma operação assíncrona falhou inesperadamente', resolucao: 'Recarregue a página. Verifique sua conexão de internet.' };
  }
  if (code === 401) {
    return { explicacao: 'Sessão da API ERP expirou ou credenciais inválidas', resolucao: 'Verifique as credenciais da API em Configurações > API e reconecte.' };
  }
  if (code === 403) {
    return { explicacao: 'Acesso negado ao recurso solicitado', resolucao: 'Verifique as permissões do usuário no ERP.' };
  }
  if (code === 404) {
    return { explicacao: 'Endpoint ou recurso não encontrado na API', resolucao: 'Verifique se a URL da API está correta em Configurações.' };
  }
  if (code && code >= 500) {
    return { explicacao: 'Erro interno no servidor da API ERP', resolucao: 'O servidor ERP está com problemas. Tente novamente mais tarde.' };
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch')) {
    return { explicacao: 'Falha de comunicação de rede', resolucao: 'Verifique sua conexão com a internet e se o servidor ERP está acessível.' };
  }
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return { explicacao: 'A requisição demorou demais para responder', resolucao: 'O servidor pode estar sobrecarregado. Tente novamente em alguns minutos.' };
  }
  return { explicacao: 'Erro não categorizado', resolucao: 'Verifique os detalhes e, se necessário, contate o suporte técnico.' };
}

export default function ConfiguracoesPage() {
  const [profiles, setProfiles] = useState<AccessProfile[]>([]);
  const [profileScreens, setProfileScreens] = useState<ProfileScreen[]>([]);
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
  const [pendingUsers, setPendingUsers] = useState<Array<{ id: string; email: string | null; display_name: string | null; created_at: string | null }>>([]);
  
  const [pendingProfileSelections, setPendingProfileSelections] = useState<Record<string, string>>({});
  const [pendingErpUserInputs, setPendingErpUserInputs] = useState<Record<string, string>>({});
  const [approvedErpEdits, setApprovedErpEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // API config states
  const [apiUrl, setApiUrl] = useState('');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [apiUser, setApiUser] = useState('');
  const [apiPass, setApiPass] = useState('');
  const [apiCredentialsLoading, setApiCredentialsLoading] = useState(true);

  // Logs states
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPeriod, setLogsPeriod] = useState('7d');
  const [logsCount24h, setLogsCount24h] = useState(0);

  // Carregar credenciais do banco
  useEffect(() => {
    const loadCredentials = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['erp_api_user', 'erp_api_pass', 'erp_api_url']);
      const map = Object.fromEntries((data || []).map(s => [s.key, s.value]));
      setApiUser(map['erp_api_user'] || '');
      setApiPass(map['erp_api_pass'] || '');
      setApiUrl(map['erp_api_url'] || getApiUrl());
      setApiCredentialsLoading(false);
    };
    loadCredentials();
  }, []);

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

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    const now = new Date();
    let since: Date;
    if (logsPeriod === '24h') {
      since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (logsPeriod === '7d') {
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    const { data } = await supabase
      .from('error_logs' as any)
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(200);
    setErrorLogs(data || []);
    // Count 24h
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('error_logs' as any)
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since24h);
    setLogsCount24h(count || 0);
    setLogsLoading(false);
  }, [logsPeriod]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleClearOldLogs = async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from('error_logs' as any).delete().lt('created_at', thirtyDaysAgo);
    if (error) {
      toast.error('Erro ao limpar logs');
      return;
    }
    toast.success('Logs antigos removidos');
    fetchLogs();
  };

  const handleSaveUrl = async () => {
    const trimmed = apiUrl.trim().replace(/\/+$/, '');
    if (!trimmed) return;
    const { error } = await supabase.from('app_settings').upsert({ key: 'erp_api_url', value: trimmed }, { onConflict: 'key' });
    if (error) {
      toast.error('Erro ao salvar URL da API');
      return;
    }
    setApiBaseUrl(trimmed);
    setApiUrl(trimmed);
    toast.success('URL da API atualizada para todos os usuários');
    checkApi();
  };

  const handleResetUrl = async () => {
    await supabase.from('app_settings').delete().eq('key', 'erp_api_url');
    setApiBaseUrl('');
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
    const [{ data: p }, { data: ps }, { data: ua }, { data: pending }, { data: approved }] = await Promise.all([
      supabase.from('access_profiles').select('*').order('name'),
      supabase.from('profile_screens').select('*'),
      supabase.from('user_access').select('*').order('user_login'),
      supabase.from('profiles').select('id, email, display_name, created_at').eq('approved', false),
      supabase.from('profiles').select('id, email, display_name, erp_user').eq('approved', true),
    ]);
    setProfiles(p || []);
    setProfileScreens(ps || []);
    setUserAccess(ua || []);
    setPendingUsers(pending || []);
    setApprovedUsers((approved as ApprovedUser[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApproveUser = async (userId: string) => {
    const user = pendingUsers.find(u => u.id === userId);
    if (!user?.email) {
      toast.error('Usuário sem email cadastrado');
      return;
    }
    const selectedProfileId = pendingProfileSelections[userId];
    if (!selectedProfileId) {
      toast.error('Selecione um Perfil de Acesso antes de aprovar');
      return;
    }
    const erpLogin = (pendingErpUserInputs[userId] || user.email || '').toUpperCase().trim();
    if (!erpLogin) {
      toast.error('Informe o Usuário ERP');
      return;
    }
    const { error } = await supabase.from('profiles').update({ approved: true, erp_user: erpLogin } as any).eq('id', userId);
    if (error) {
      toast.error('Erro ao aprovar usuário');
      return;
    }
    const { error: accessError } = await supabase.from('user_access').insert({ user_login: erpLogin, profile_id: selectedProfileId });
    if (accessError) {
      toast.error('Usuário aprovado, mas erro ao vincular perfil');
    } else {
      toast.success('Usuário aprovado e perfil atribuído');
    }
    setPendingProfileSelections(prev => { const n = { ...prev }; delete n[userId]; return n; });
    setPendingErpUserInputs(prev => { const n = { ...prev }; delete n[userId]; return n; });
    fetchData();
  };

  const handleSaveErpUser = async (userId: string) => {
    const newErp = (approvedErpEdits[userId] || '').toUpperCase().trim();
    if (!newErp) {
      toast.error('Informe o Usuário ERP');
      return;
    }
    const { error } = await supabase.from('profiles').update({ erp_user: newErp } as any).eq('id', userId);
    if (error) {
      toast.error('Erro ao salvar Usuário ERP');
      return;
    }
    toast.success('Usuário ERP atualizado');
    setApprovedErpEdits(prev => { const n = { ...prev }; delete n[userId]; return n; });
    fetchData();
  };

  const handleRejectUser = async (userId: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) {
      toast.error('Erro ao rejeitar usuário');
      return;
    }
    toast.success('Usuário rejeitado');
    fetchData();
  };

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
          <TabsTrigger value="approvals" className="gap-1">
            <UserCheck className="h-4 w-4" /> Aprovações
            {pendingUsers.length > 0 && <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">{pendingUsers.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-1"><Wifi className="h-4 w-4" /> API</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1">
            <FileWarning className="h-4 w-4" /> Logs
            {logsCount24h > 0 && <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">{logsCount24h}</Badge>}
          </TabsTrigger>
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
                <>
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

                  <div className="mt-6 border-t pt-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-primary" /> Assistente IA
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {profiles.map(p => (
                        <div key={p.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                          <span className="text-sm">{p.name}</span>
                          <Switch
                            checked={p.ai_enabled}
                            onCheckedChange={async (checked) => {
                              await supabase.from('access_profiles').update({ ai_enabled: checked } as any).eq('id', p.id);
                              fetchData();
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
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
                      <Label>Usuário</Label>
                      <Select value={newUserLogin} onValueChange={setNewUserLogin}>
                        <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
                        <SelectContent>
                          {approvedUsers
                            .filter(u => u.erp_user && !userAccess.some(ua => ua.user_login.toUpperCase() === u.erp_user!.toUpperCase() && ua.profile_id === newUserProfileId))
                            .map(u => (
                              <SelectItem key={u.id} value={u.erp_user!}>
                                {u.display_name || u.email || u.erp_user} ({u.erp_user})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
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

        {/* === APROVAÇÕES === */}
        <TabsContent value="approvals">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Aprovação de Novos Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Usuário ERP</TableHead>
                    <TableHead>Perfil de Acesso</TableHead>
                    <TableHead className="w-32">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email || '—'}</TableCell>
                      <TableCell>{u.display_name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-xs w-[180px]"
                          placeholder="Login ERP"
                          value={pendingErpUserInputs[u.id] ?? (u.email || '').toUpperCase()}
                          onChange={(e) => setPendingErpUserInputs(prev => ({ ...prev, [u.id]: e.target.value }))}
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={pendingProfileSelections[u.id] || ''} onValueChange={(val) => setPendingProfileSelections(prev => ({ ...prev, [u.id]: val }))}>
                          <SelectTrigger className="h-8 text-xs w-[180px]"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {profiles.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => handleApproveUser(u.id)} disabled={!pendingProfileSelections[u.id]}>
                            <UserCheck className="h-3.5 w-3.5" /> Aprovar
                          </Button>
                          <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={() => handleRejectUser(u.id)}>
                            <UserX className="h-3.5 w-3.5" /> Rejeitar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pendingUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum usuário pendente de aprovação
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Usuários Aprovados — Usuário ERP</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Usuário ERP</TableHead>
                    <TableHead className="w-24">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedUsers.map(u => {
                    const currentErp = approvedErpEdits[u.id] ?? (u.erp_user || '');
                    const isDirty = approvedErpEdits[u.id] !== undefined && approvedErpEdits[u.id] !== (u.erp_user || '');
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-sm">{u.email || '—'}</TableCell>
                        <TableCell className="text-sm">{u.display_name || '—'}</TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-xs w-[200px]"
                            value={currentErp}
                            onChange={(e) => setApprovedErpEdits(prev => ({ ...prev, [u.id]: e.target.value }))}
                            placeholder="Login ERP"
                          />
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleSaveErpUser(u.id)} disabled={!isDirty}>
                            Salvar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {approvedUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum usuário aprovado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="api">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Configuração da API</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {apiStatus === 'online' ? (
                  <Badge variant="default" className="gap-1 bg-emerald-600 hover:bg-emerald-600 text-sm font-normal">
                    <Wifi className="h-3.5 w-3.5" /> API Online
                  </Badge>
                ) : apiStatus === 'offline' ? (
                  <Badge variant="destructive" className="gap-1 text-sm font-normal">
                    <WifiOff className="h-3.5 w-3.5" /> API Offline
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1 text-sm font-normal">
                    Verificando...
                  </Badge>
                )}
                <Button variant="outline" size="sm" onClick={checkApi}>
                  Verificar conexão
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-url">URL da API</Label>
                <Input
                  id="api-url"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://sua-api.ngrok.io"
                />
                <p className="text-xs text-muted-foreground">URL atual: {getApiUrl()}</p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveUrl}>Salvar URL</Button>
                <Button variant="outline" onClick={handleResetUrl}>Resetar para padrão</Button>
              </div>

              <hr className="my-4 border-border" />

              <div className="space-y-3">
                <h3 className="text-sm font-medium">Credenciais da API</h3>
                <div className="space-y-2">
                  <Label htmlFor="api-user">Usuário da API</Label>
                  <Input
                    id="api-user"
                    value={apiUser}
                    onChange={(e) => setApiUser(e.target.value)}
                    placeholder="Ex: admin"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-pass">Senha da API</Label>
                  <Input
                    id="api-pass"
                    type="password"
                    value={apiPass}
                    onChange={(e) => setApiPass(e.target.value)}
                    placeholder="Senha"
                  />
                </div>
                <Button onClick={async () => {
                  if (!apiUser.trim() || !apiPass.trim()) {
                    toast.error('Preencha usuário e senha da API');
                    return;
                  }
                  const upserts = [
                    { key: 'erp_api_user', value: apiUser.trim(), updated_at: new Date().toISOString() },
                    { key: 'erp_api_pass', value: apiPass.trim(), updated_at: new Date().toISOString() },
                  ];
                  const { error } = await supabase.from('app_settings').upsert(upserts, { onConflict: 'key' });
                  if (error) {
                    toast.error('Erro ao salvar credenciais');
                    return;
                  }
                  toast.success('Credenciais da API salvas. Faça logout e login novamente para reconectar.');
                }}>
                  Salvar Credenciais
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === LOGS === */}
        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Logs de Erros</CardTitle>
              <div className="flex items-center gap-2">
                <Select value={logsPeriod} onValueChange={setLogsPeriod}>
                  <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Últimas 24h</SelectItem>
                    <SelectItem value="7d">Últimos 7 dias</SelectItem>
                    <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={fetchLogs} disabled={logsLoading}>
                  Atualizar
                </Button>
                <Button variant="destructive" size="sm" onClick={handleClearOldLogs}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Limpar antigos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Carregando logs...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Módulo</TableHead>
                      <TableHead className="w-[80px] text-center">Status</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead className="w-[220px]">Explicação</TableHead>
                      <TableHead className="w-[220px]">Como Resolver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errorLogs.map((log: any) => {
                      const explanation = getErrorExplanation(log);
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-xs">{log.user_email || '—'}</TableCell>
                          <TableCell className="text-xs font-mono">{log.module}</TableCell>
                          <TableCell className="text-center">
                            {log.status_code ? (
                              <Badge variant={log.status_code >= 500 ? 'destructive' : 'secondary'} className="text-[10px]">
                                {log.status_code}
                              </Badge>
                            ) : '—'}
                          </TableCell>
                          <TableCell className="text-xs max-w-[300px] truncate" title={log.message}>
                            {log.message}
                          </TableCell>
                          <TableCell className="text-xs max-w-[220px] truncate" title={explanation.explicacao}>
                            {explanation.explicacao}
                          </TableCell>
                          <TableCell className="text-xs max-w-[220px] truncate text-blue-600 dark:text-blue-400" title={explanation.resolucao}>
                            {explanation.resolucao}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {errorLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Nenhum erro registrado no período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                Exibindo {errorLogs.length} registro(s) · Erros nas últimas 24h: {logsCount24h}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
