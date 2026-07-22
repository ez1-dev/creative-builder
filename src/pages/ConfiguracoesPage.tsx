import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Plus, Trash2, Edit, Users, Shield, Eye, EyeOff, Wifi, WifiOff, UserCheck, UserX, FileWarning, Sparkles, Activity, Rocket, BarChart3, Brain, LineChart, PowerOff, BookOpen, Download, ExternalLink, Search, Filter, UserPlus, ChevronsUpDown, Check, ShieldCheck, X, ArrowUpDown, Inbox } from 'lucide-react';
import { VISUAL_CATALOG } from '@/lib/visualCatalog';
import { MonitoramentoUsuarios } from '@/components/erp/MonitoramentoUsuarios';

import { DashboardUsoUsuarios } from '@/components/erp/DashboardUsoUsuarios';
import { MinhasPreferenciasSection } from '@/components/erp/MinhasPreferenciasSection';
import { useAiPageContext } from '@/hooks/useAiPageContext';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getApiUrl, setApiBaseUrl } from '@/lib/api';
import { getContabilBaseUrl, setContabilBaseUrl, pingContabilHealth, pingErpHealth, type ContabilHealthResult } from '@/lib/contabil/contabilApi';
import { formatDate } from '@/lib/format';
import { PermissoesPorTelaPanel } from '@/components/configuracoes/PermissoesPorTelaPanel';
import { DemoModeSection } from '@/components/configuracoes/DemoModeSection';
import { LiberacoesPanel } from '@/components/configuracoes/LiberacoesPanel';
import { MapaAcessosPanel } from '@/components/configuracoes/MapaAcessosPanel';
import { Sliders, Map as MapIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';


const ALL_SCREENS = [
  { path: '/estoque', name: 'Estoque' },
  { path: '/estoque-min-max', name: 'Estoque Min/Max' },
  { path: '/sugestao-min-max', name: 'Sugestão Min/Max' },
  { path: '/onde-usa', name: 'Onde Usa' },
  { path: '/bom', name: 'Estrutura (BOM)' },
  { path: '/compras-produto', name: 'Compras / Custos' },
  { path: '/painel-compras', name: 'Painel de Compras' },
  { path: '/demonstrativo-compras-recebimentos', name: 'Demonstrativo de Compras e Recebimentos' },
  { path: '/auditoria-tributaria', name: 'Auditoria Tributária' },
  { path: '/auditoria-apontamento-genius', name: 'Auditoria Apont. Genius' },
  { path: '/faturamento-genius', name: 'Faturamento Genius' },
  { path: '/conciliacao-edocs', name: 'Conciliação EDocs' },
  { path: '/notas-recebimento', name: 'NF Recebimento' },
  { path: '/contas-pagar', name: 'Contas a Pagar' },
  { path: '/contas-receber', name: 'Contas a Receber' },
  { path: '/contabilidade/balanco', name: 'Contabilidade — Balanço Patrimonial' },
  { path: '/bi/contabilidade/dre', name: 'Contabilidade — DRE' },
  { path: '/contabilidade/dre-studio', name: 'DRE Studio — Visão Geral' },
  { path: '/contabilidade/dre-studio/modelos', name: 'DRE Studio — Modelos' },
  { path: '/contabilidade/dre-studio/modelos/novo', name: 'DRE Studio — Novo Modelo' },
  { path: '/contabilidade/dre-padrao', name: 'Contabilidade — DRE Padrão' },
  
  
  { path: '/numero-serie', name: 'Reserva Nº Série' },
  { path: '/producao/dashboard', name: 'Produção - Dashboard' },
  { path: '/producao/produzido', name: 'Produção - Produzido no Período' },
  { path: '/producao/expedido', name: 'Produção - Expedido para Obra' },
  { path: '/producao/patio', name: 'Produção - Saldo em Pátio' },
  { path: '/producao/nao-carregados', name: 'Produção - Não Carregados' },
  { path: '/producao/leadtime', name: 'Produção - Lead Time' },
  { path: '/producao/engenharia', name: 'Produção - Eng. x Produção' },
  { path: '/producao/relatorio-semanal-obra', name: 'Produção - Relatório Semanal Obra' },
  { path: '/producao/impressao-op', name: 'Produção - Impressão de Ordem de Produção' },
  { path: '/producao/carga', name: 'Produção - Carga de Produção' },
  { path: '/producao/carga/dashboard', name: 'Produção - Carga (Dashboard BI)' },
  { path: '/producao/carga/recursos', name: 'Produção - Carga por Centro de Recurso' },
  { path: '/producao/programacao', name: 'Produção - Programação e Sequenciamento' },
  { path: '/cadastros/produtos', name: 'Cadastros - Consulta de Produtos' },
  { path: '/bi/faturamento-validacao', name: 'BI - Validação de Faturamento' },
  { path: '/bi/comercial', name: 'BI Comercial' },
  { path: '/bi/comercial/metas', name: 'BI Comercial - Metas de Faturamento' },
  { path: '/bi/faturamento/relatorio-executivo', name: 'BI - Relatório Executivo de Faturamento' },
  { path: '/etl', name: 'ETL / Camada Analítica' },
  { path: '/regras-senior', name: 'Regras Senior - Dashboard' },
  { path: '/regras-senior/regras', name: 'Regras Senior - Lista de Regras' },
  { path: '/regras-senior/identificadores', name: 'Regras Senior - Identificadores' },
  { path: '/regras-senior/auditoria', name: 'Regras Senior - Auditoria' },
  { path: '/regras-senior/snapshots', name: 'Regras Senior - Snapshots' },
  { path: '/relatorios/desenvolvimento', name: 'Relatórios - Desenvolvimento' },
  { path: '/relatorios/publicados', name: 'Relatórios - Publicados' },
  { path: '/relatorios/execucoes', name: 'Relatórios - Histórico de Execuções' },
  { path: '/passagens-aereas', name: 'Passagens Aéreas' },
  { path: '/frota', name: 'Manutenção de Frota' },
  { path: '/manutencao-maquinas', name: 'Manutenção de Máquinas' },
  { path: '/monitor-usuarios-senior', name: 'Monitor de Usuários Senior' },
  { path: '/gestao-sgu-usuarios', name: 'Gestão SGU - Usuários ERP Senior' },
  { path: '/configuracoes', name: 'Configurações' },
  { path: '/biblioteca-bi', name: 'Biblioteca BI (Catálogo de Componentes)' },
  { path: '/rh', name: 'RH' },
  { path: '/rh/resumo-folha', name: 'RH — Resumo Folha' },
  { path: '/rh/quadro-colaboradores', name: 'RH — Quadro de Colaboradores' },
  { path: '/rh/contrato-experiencia', name: 'RH — Contrato Experiência' },
  { path: '/rh/programacao-ferias', name: 'RH — Programação de Férias' },
  { path: '/rh/turnover', name: 'RH — Rotatividade / Turnover' },
  { path: '/rh/absenteismo', name: 'RH — Absenteísmo / Afastamentos' },
  { path: '/rh/formularios', name: 'RH — Formulários' },
  { path: '/rh/relatorio-gerencial', name: 'RH — Relatório Gerencial (PDF+IA)' },
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
  can_delete?: boolean;
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

function KpiMini({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className={cn('rounded-md border bg-card px-3 py-2 min-w-[110px]', accent && 'border-primary/40 bg-primary/5')}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn('text-xl font-semibold tabular-nums', accent && 'text-primary')}>{value}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }: { icon: any; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="rounded-full bg-muted p-3 mb-3"><Icon className="h-6 w-6 text-muted-foreground" /></div>
      <div className="text-sm font-medium">{title}</div>
      {description && <div className="text-xs text-muted-foreground mt-1 max-w-md">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
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
  const [activeTab, setActiveTab] = useState('profiles');
  const [navSearch, setNavSearch] = useState('');

  // API config states
  const [apiUrl, setApiUrl] = useState('');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [apiLastResult, setApiLastResult] = useState<ContabilHealthResult | null>(null);
  const [contabilUrl, setContabilUrl] = useState('');
  const [contabilStatus, setContabilStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [contabilLastResult, setContabilLastResult] = useState<ContabilHealthResult | null>(null);
  const [apiUser, setApiUser] = useState('');
  const [apiPass, setApiPass] = useState('');
  const [apiCredentialsLoading, setApiCredentialsLoading] = useState(true);

  // Logs states
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPeriod, setLogsPeriod] = useState('7d');
  const [logsCount24h, setLogsCount24h] = useState(0);

  useEffect(() => {
    const loadCredentials = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['erp_api_user', 'erp_api_pass', 'erp_api_url', 'contabil_api_url']);
      const map = Object.fromEntries((data || []).map(s => [s.key, s.value]));
      setApiUser(map['erp_api_user'] || '');
      setApiPass(map['erp_api_pass'] || '');
      setApiUrl(map['erp_api_url'] || getApiUrl());
      if (map['contabil_api_url']) setContabilBaseUrl(map['contabil_api_url']);
      setContabilUrl(map['contabil_api_url'] || getContabilBaseUrl());
      setApiCredentialsLoading(false);
    };
    loadCredentials();
  }, []);

  const checkApi = useCallback(async () => {
    setApiStatus('checking');
    const result = await pingErpHealth();
    setApiLastResult(result);
    setApiStatus(result.ok ? 'online' : 'offline');
  }, []);

  const checkContabil = useCallback(async () => {
    setContabilStatus('checking');
    const result = await pingContabilHealth();
    setContabilLastResult(result);
    setContabilStatus(result.ok ? 'online' : 'offline');
  }, []);

  useEffect(() => { checkApi(); checkContabil(); }, [checkApi, checkContabil]);

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
    toast.success('URL da API ERP atualizada');
    checkApi();
  };

  const handleResetUrl = async () => {
    await supabase.from('app_settings').delete().eq('key', 'erp_api_url');
    setApiBaseUrl('');
    setApiUrl(getApiUrl());
    toast.success('URL do ERP restaurada para o padrão');
    checkApi();
  };

  const handleSaveContabilUrl = async () => {
    const trimmed = contabilUrl.trim().replace(/\/+$/, '');
    if (!trimmed) return;
    if (/\/api\/contabil/i.test(trimmed)) {
      toast.error('A URL base não deve incluir /api/contabil — informe apenas o domínio.');
      return;
    }
    const { error } = await supabase.from('app_settings').upsert({ key: 'contabil_api_url', value: trimmed }, { onConflict: 'key' });
    if (error) {
      toast.error('Erro ao salvar URL da API contábil');
      return;
    }
    setContabilBaseUrl(trimmed);
    setContabilUrl(trimmed);
    toast.success('URL da API contábil atualizada');
    checkContabil();
  };

  const handleResetContabilUrl = async () => {
    await supabase.from('app_settings').delete().eq('key', 'contabil_api_url');
    setContabilBaseUrl(null);
    setContabilUrl(getContabilBaseUrl());
    toast.success('URL da API contábil restaurada para o padrão');
    checkContabil();
  };

  // Dialog states
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AccessProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileDesc, setProfileDesc] = useState('');
  const [newUserLogin, setNewUserLogin] = useState('');
  const [newUserProfileIds, setNewUserProfileIds] = useState<string[]>([]);
  const [passagensShareAllowNonAdmin, setPassagensShareAllowNonAdmin] = useState(false);

  // ---- Filtros UI ----
  const [profileSearch, setProfileSearch] = useState('');
  const [profileAiFilter, setProfileAiFilter] = useState<'all' | 'with' | 'without'>('all');
  const [profileSort, setProfileSort] = useState<'name' | 'users' | 'screens'>('name');

  const [userSearch, setUserSearch] = useState('');
  const [userProfileFilters, setUserProfileFilters] = useState<string[]>([]);
  const [userOnlyUnassigned, setUserOnlyUnassigned] = useState(false);

  const [userComboOpen, setUserComboOpen] = useState(false);
  const [userFilterPopoverOpen, setUserFilterPopoverOpen] = useState(false);

  // Visuais (gráficos e mapas) por perfil — chave canônica: visual_key denied = can_view false
  const [profileVisuals, setProfileVisuals] = useState<Array<{ id: string; profile_id: string; visual_key: string; can_view: boolean }>>([]);
  const [visualsSelectedProfile, setVisualsSelectedProfile] = useState<string>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: p }, { data: ps }, { data: ua }, { data: pending }, { data: approved }, { data: shareSetting }, { data: pv }] = await Promise.all([
      supabase.from('access_profiles').select('*').order('name'),
      supabase.from('profile_screens').select('*'),
      supabase.from('user_access').select('*').order('user_login'),
      supabase.from('profiles').select('id, email, display_name, created_at').eq('approved', false),
      supabase.from('profiles').select('id, email, display_name, erp_user').eq('approved', true),
      supabase.from('app_settings').select('value').eq('key', 'passagens_share_allow_non_admin').maybeSingle(),
      supabase.from('profile_visuals' as any).select('id, profile_id, visual_key, can_view'),
    ]);
    setProfiles(p || []);
    setProfileScreens(ps || []);
    setUserAccess(ua || []);
    setPendingUsers(pending || []);
    setApprovedUsers((approved as ApprovedUser[]) || []);
    setPassagensShareAllowNonAdmin(shareSetting?.value === 'true');
    setProfileVisuals((pv as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Register AI page context with user counts (admin sees this tab)
  const adminProfile = profiles.find(p => p.name === 'Administrador');
  const adminLogins = new Set(
    userAccess.filter(ua => ua.profile_id === adminProfile?.id).map(ua => ua.user_login.toUpperCase())
  );
  const adminCount = approvedUsers.filter(u => u.erp_user && adminLogins.has(u.erp_user.toUpperCase())).length;
  useAiPageContext({
    title: 'Configurações',
    module: 'configuracoes',
    kpis: {
      'Usuários aprovados': approvedUsers.length,
      'Usuários pendentes': pendingUsers.length,
      'Administradores': adminCount,
      'Perfis de acesso': profiles.length,
    },
    summary: `${approvedUsers.length + pendingUsers.length} usuários cadastrados (${approvedUsers.length} aprovados, ${pendingUsers.length} pendentes). ${profiles.length} perfis de acesso configurados. Para listar usuários por nome/perfil, use a tool list_system_users.`,
  });

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
  const toggleScreen = async (profileId: string, screenPath: string, screenName: string, field: 'can_view' | 'can_edit' | 'can_delete') => {
    const existing = profileScreens.find(ps => ps.profile_id === profileId && ps.screen_path === screenPath);
    if (existing) {
      const newVal = !(existing as any)[field];
      const updates: Partial<ProfileScreen> = field === 'can_view' && !newVal
        ? { can_view: false, can_edit: false, can_delete: false }
        : { [field]: newVal } as Partial<ProfileScreen>;
      const { error } = await supabase.from('profile_screens').update(updates).eq('id', existing.id);
      if (error) {
        toast.error('Erro ao atualizar permissão');
        return;
      }
      setProfileScreens(prev => prev.map(ps =>
        ps.id === existing.id ? { ...ps, ...updates } as ProfileScreen : ps
      ));
      toast.success('Permissão atualizada');
    } else {
      const { data: inserted, error } = await supabase.from('profile_screens').insert({
        profile_id: profileId,
        screen_path: screenPath,
        screen_name: screenName,
        can_view: field === 'can_view',
        can_edit: field === 'can_edit',
        can_delete: field === 'can_delete',
      }).select().single();

      if (error) {
        toast.error('Erro ao atualizar permissão');
        return;
      }
      if (inserted) setProfileScreens(prev => [...prev, inserted as ProfileScreen]);
      toast.success('Permissão atualizada');
    }
  };

  const getScreenPerm = (profileId: string, screenPath: string) => {
    return profileScreens.find(ps => ps.profile_id === profileId && ps.screen_path === screenPath);
  };

  // ---- Visuais (gráficos e mapas) por perfil ----
  // Default: ausência de registro = pode ver. Toggle grava can_view=false para ocultar.
  const isVisualVisible = (profileId: string, visualKey: string): boolean => {
    const row = profileVisuals.find(v => v.profile_id === profileId && v.visual_key === visualKey);
    if (!row) return true;
    return row.can_view !== false;
  };

  const setVisualVisible = async (profileId: string, visualKey: string, visible: boolean) => {
    const existing = profileVisuals.find(v => v.profile_id === profileId && v.visual_key === visualKey);
    if (visible) {
      // Remover registro = volta ao default (visível)
      if (existing) {
        const { error } = await supabase.from('profile_visuals' as any).delete().eq('id', existing.id);
        if (error) { toast.error('Erro ao atualizar'); return; }
        setProfileVisuals(prev => prev.filter(v => v.id !== existing.id));
      }
    } else {
      if (existing) {
        const { error } = await supabase.from('profile_visuals' as any).update({ can_view: false }).eq('id', existing.id);
        if (error) { toast.error('Erro ao atualizar'); return; }
        setProfileVisuals(prev => prev.map(v => v.id === existing.id ? { ...v, can_view: false } : v));
      } else {
        const { data: inserted, error } = await supabase
          .from('profile_visuals' as any)
          .insert({ profile_id: profileId, visual_key: visualKey, can_view: false })
          .select()
          .single();
        if (error) { toast.error('Erro ao atualizar'); return; }
        if (inserted) setProfileVisuals(prev => [...prev, inserted as any]);
      }
    }
    toast.success(visible ? 'Gráfico liberado' : 'Gráfico oculto');
  };

  const setModuleVisuals = async (profileId: string, keys: string[], visible: boolean) => {
    for (const k of keys) {
      // eslint-disable-next-line no-await-in-loop
      await setVisualVisible(profileId, k, visible);
    }
  };

  // ---- Usuários ----
  const handleAddUser = async () => {
    if (!newUserLogin.trim() || newUserProfileIds.length === 0) {
      toast.error('Selecione um usuário e ao menos um perfil');
      return;
    }
    const login = newUserLogin.trim().toUpperCase();
    const existing = new Set(
      userAccess
        .filter(ua => ua.user_login.toUpperCase() === login)
        .map(ua => ua.profile_id),
    );
    const toInsert = newUserProfileIds
      .filter(pid => !existing.has(pid))
      .map(pid => ({ user_login: login, profile_id: pid }));

    if (toInsert.length === 0) {
      toast.info('Usuário já possui os perfis selecionados');
      return;
    }

    const { error } = await supabase.from('user_access').insert(toInsert);
    if (error) {
      toast.error('Erro ao atribuir perfis');
      return;
    }
    toast.success(`${toInsert.length} perfil(is) atribuído(s)`);
    setUserDialogOpen(false);
    setNewUserLogin('');
    setNewUserProfileIds([]);
    fetchData();
  };

  const openAddProfilesFor = (login: string) => {
    setNewUserLogin(login);
    setNewUserProfileIds([]);
    setUserDialogOpen(true);
  };

  const handleRemoveUser = async (id: string) => {
    await supabase.from('user_access').delete().eq('id', id);
    toast.success('Acesso removido');
    fetchData();
  };

  const handleRemoveAllUserProfiles = async (login: string) => {
    if (!confirm(`Remover TODOS os perfis do usuário ${login}?`)) return;
    const { error } = await supabase.from('user_access').delete().ilike('user_login', login);
    if (error) { toast.error('Erro ao remover'); return; }
    toast.success('Todos os perfis removidos');
    fetchData();
  };

  const openManageProfilesFor = (login: string) => {
    setNewUserLogin(login);
    setNewUserProfileIds([]);
    setUserDialogOpen(true);
  };

  const getProfileName = (profileId: string) => profiles.find(p => p.id === profileId)?.name || '—';

  // ---- KPIs e listas derivadas ----
  const screensPerProfile = useMemo(() => {
    const map = new Map<string, number>();
    for (const ps of profileScreens) {
      if (!ps.can_view) continue;
      map.set(ps.profile_id, (map.get(ps.profile_id) ?? 0) + 1);
    }
    return map;
  }, [profileScreens]);

  const usersPerProfile = useMemo(() => {
    const map = new Map<string, number>();
    for (const ua of userAccess) {
      map.set(ua.profile_id, (map.get(ua.profile_id) ?? 0) + 1);
    }
    return map;
  }, [userAccess]);

  const filteredProfiles = useMemo(() => {
    const q = profileSearch.trim().toLowerCase();
    let list = profiles.filter(p => {
      if (q && !p.name.toLowerCase().includes(q) && !(p.description ?? '').toLowerCase().includes(q)) return false;
      if (profileAiFilter === 'with' && !p.ai_enabled) return false;
      if (profileAiFilter === 'without' && p.ai_enabled) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (profileSort === 'users') return (usersPerProfile.get(b.id) ?? 0) - (usersPerProfile.get(a.id) ?? 0);
      if (profileSort === 'screens') return (screensPerProfile.get(b.id) ?? 0) - (screensPerProfile.get(a.id) ?? 0);
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [profiles, profileSearch, profileAiFilter, profileSort, usersPerProfile, screensPerProfile]);

  // Aggregated users (group user_access by login)
  const groupedUsers = useMemo(() => {
    const map = new Map<string, { login: string; rows: UserAccess[]; latest: string }>();
    for (const ua of userAccess) {
      const key = ua.user_login.toUpperCase();
      const cur = map.get(key);
      if (cur) {
        cur.rows.push(ua);
        if (ua.created_at > cur.latest) cur.latest = ua.created_at;
      } else {
        map.set(key, { login: ua.user_login, rows: [ua], latest: ua.created_at });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.login.localeCompare(b.login));
  }, [userAccess]);

  const approvedUserByLogin = useMemo(() => {
    const map = new Map<string, ApprovedUser>();
    for (const u of approvedUsers) {
      if (u.erp_user) map.set(u.erp_user.toUpperCase(), u);
    }
    return map;
  }, [approvedUsers]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return groupedUsers.filter(g => {
      const meta = approvedUserByLogin.get(g.login.toUpperCase());
      if (q) {
        const hay = `${g.login} ${meta?.display_name ?? ''} ${meta?.email ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (userProfileFilters.length > 0) {
        const has = g.rows.some(r => userProfileFilters.includes(r.profile_id));
        if (!has) return false;
      }
      return true;
    });
  }, [groupedUsers, userSearch, userProfileFilters, approvedUserByLogin]);

  const usersWithoutAssignment = useMemo(() => {
    const assignedLogins = new Set(groupedUsers.map(g => g.login.toUpperCase()));
    return approvedUsers.filter(u => u.erp_user && !assignedLogins.has(u.erp_user.toUpperCase()));
  }, [approvedUsers, groupedUsers]);

  const distinctProfilesInUse = useMemo(() => new Set(userAccess.map(ua => ua.profile_id)).size, [userAccess]);

  // Stable color token per profile name (semantic)
  const PROFILE_BADGE_VARIANTS = ['default', 'secondary', 'outline'] as const;
  const profileBadgeVariant = (name: string) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return PROFILE_BADGE_VARIANTS[h % PROFILE_BADGE_VARIANTS.length];
  };

  const userInitials = (login: string, meta?: ApprovedUser) => {
    const src = meta?.display_name || login;
    const parts = src.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };


  if (loading && profiles.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <PageHeader title="Configurações" description="Gerenciamento de acessos e permissões" />
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const NAV_GROUPS: Array<{
    label: string;
    items: Array<{ value: string; label: string; icon: any; badge?: number; description?: string }>;
  }> = [
    {
      label: 'Acessos',
      items: [
        { value: 'profiles', label: 'Perfis de Acesso', icon: Shield, description: 'Perfis e telas liberadas' },
        { value: 'permissions', label: 'Permissões por Tela', icon: Eye, description: 'Matriz perfil × tela' },
        { value: 'liberacoes', label: 'Liberações', icon: Sliders, description: 'Funcionalidades, integrações e overrides por usuário' },
        { value: 'mapa-acessos', label: 'Mapa de Acessos', icon: MapIcon, description: 'Matriz visual usuários × telas/funcionalidades' },
        { value: 'users', label: 'Usuários', icon: Users, description: 'Atribuição de perfis' },
        { value: 'approvals', label: 'Aprovações', icon: UserCheck, badge: pendingUsers.length, description: 'Solicitações de acesso' },
      ],
    },
    {
      label: 'Plataforma',
      items: [
        { value: 'api', label: 'API', icon: Wifi, description: 'Conexão com o backend' },
        { value: 'visuals', label: 'Gráficos e Mapas', icon: LineChart, description: 'Catálogo visual' },
        { value: 'versao', label: 'Versão', icon: Rocket, description: 'Build e changelog' },
        { value: 'documentacao', label: 'Documentação', icon: BookOpen, description: 'Guias e referências' },
      ],
    },
    {
      label: 'Operação',
      items: [
        { value: 'logs', label: 'Logs', icon: FileWarning, badge: logsCount24h, description: 'Erros e auditoria' },
        { value: 'monitoramento', label: 'Monitoramento', icon: Activity, description: 'Sessões ativas' },
        { value: 'dashboard-uso', label: 'Dashboard de Uso', icon: BarChart3, description: 'Adoção e engajamento' },
      ],
    },
    {
      label: 'Pessoal',
      items: [
        { value: 'minhas-preferencias', label: 'Minhas Preferências', icon: Brain, description: 'Ajustes do seu usuário' },
        { value: 'demo', label: 'Modo Demonstração', icon: EyeOff, description: 'Esconder módulos e mascarar dados' },
      ],
    },
  ];

  const activeItem = NAV_GROUPS.flatMap(g => g.items.map(i => ({ ...i, group: g.label }))).find(i => i.value === activeTab);
  const filteredGroups = NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(i => !navSearch || i.label.toLowerCase().includes(navSearch.toLowerCase()) || i.description?.toLowerCase().includes(navSearch.toLowerCase())),
  })).filter(g => g.items.length > 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="text-muted-foreground/70">Configurações</span>
            <span className="mx-1.5 text-muted-foreground/40">›</span>
            <span className="text-muted-foreground/70">{activeItem?.group ?? 'Geral'}</span>
            <span className="mx-1.5 text-muted-foreground/40">›</span>
            <span className="text-foreground">{activeItem?.label ?? ''}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1 font-normal">
            <Shield className="h-3.5 w-3.5 text-primary" />
            {profiles.length} perfis
          </Badge>
          <Badge variant="outline" className="gap-1 font-normal">
            <Users className="h-3.5 w-3.5 text-primary" />
            {approvedUsers.length} usuários
          </Badge>
          {pendingUsers.length > 0 && (
            <Badge variant="destructive" className="gap-1 font-normal">
              <UserCheck className="h-3.5 w-3.5" />
              {pendingUsers.length} pendentes
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-0">
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="p-3 border-b bg-muted/30">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={navSearch}
                    onChange={(e) => setNavSearch(e.target.value)}
                    placeholder="Filtrar configurações…"
                    className="h-9 pl-8 bg-background"
                  />
                </div>
              </div>
              <nav className="p-2 space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto">
                {filteredGroups.length === 0 && (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                    Nenhuma configuração encontrada
                  </div>
                )}
                {filteredGroups.map((group) => (
                  <div key={group.label}>
                    <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {group.label}
                    </div>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.value;
                        return (
                          <button
                            key={item.value}
                            type="button"
                            aria-current={isActive ? 'page' : undefined}
                            onClick={() => setActiveTab(item.value)}
                            className={cn(
                              'group w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-left transition-colors',
                              isActive
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                            )}
                          >
                            <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                            <span className="flex-1 truncate">{item.label}</span>
                            {item.badge ? (
                              <Badge
                                variant={isActive ? 'default' : 'destructive'}
                                className="h-5 min-w-[20px] px-1.5 text-[10px]"
                              >
                                {item.badge}
                              </Badge>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0 space-y-4">
        {/* === PERFIS === */}
        <TabsContent value="profiles" className="space-y-4">
          {/* Header */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5"><Shield className="h-5 w-5 text-primary" /></div>
                <div>
                  <h2 className="text-lg font-semibold leading-tight">Perfis de Acesso</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Crie e gerencie perfis que agrupam permissões e usuários.</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 md:gap-3 w-full md:w-auto">
                <KpiMini label="Perfis" value={profiles.length} />
                <KpiMini label="Telas liberadas" value={Array.from(screensPerProfile.values()).reduce((a, b) => a + b, 0)} />
                <KpiMini label="Usuários vinculados" value={userAccess.length} />
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col lg:flex-row gap-2 lg:items-center lg:justify-between">
                <div className="flex flex-col sm:flex-row gap-2 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={profileSearch} onChange={e => setProfileSearch(e.target.value)} placeholder="Buscar por nome ou descrição..." className="pl-8 h-9" />
                  </div>
                  <Select value={profileAiFilter} onValueChange={(v: any) => setProfileAiFilter(v)}>
                    <SelectTrigger className="h-9 w-full sm:w-44"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">IA: todos</SelectItem>
                      <SelectItem value="with">Com IA habilitada</SelectItem>
                      <SelectItem value="without">Sem IA</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={profileSort} onValueChange={(v: any) => setProfileSort(v)}>
                    <SelectTrigger className="h-9 w-full sm:w-44"><ArrowUpDown className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Ordenar por nome</SelectItem>
                      <SelectItem value="users">Mais usuários</SelectItem>
                      <SelectItem value="screens">Mais telas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Perfil</TableHead>
                    <TableHead className="hidden md:table-cell">Descrição</TableHead>
                    <TableHead className="text-center w-24">Telas</TableHead>
                    <TableHead className="text-center w-24">Usuários</TableHead>
                    <TableHead className="text-center w-24">IA</TableHead>
                    <TableHead className="text-right w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map(p => {
                    const screenCount = screensPerProfile.get(p.id) ?? 0;
                    const userCount = usersPerProfile.get(p.id) ?? 0;
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="rounded-md bg-primary/10 p-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /></div>
                            <span>{p.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{p.description || '—'}</TableCell>
                        <TableCell className="text-center"><Badge variant={screenCount === 0 ? 'outline' : 'secondary'}>{screenCount}</Badge></TableCell>
                        <TableCell className="text-center"><Badge variant={userCount === 0 ? 'outline' : 'secondary'}>{userCount}</Badge></TableCell>
                        <TableCell className="text-center">
                          {p.ai_enabled
                            ? <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/20 border-transparent"><Sparkles className="h-3 w-3" /> Ativa</Badge>
                            : <Badge variant="outline" className="text-muted-foreground">—</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => openEditProfile(p)} aria-label="Editar perfil">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar perfil</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteProfile(p.id)} aria-label="Excluir perfil">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir perfil</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredProfiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <EmptyState
                          icon={Shield}
                          title={profiles.length === 0 ? 'Nenhum perfil cadastrado' : 'Nenhum perfil encontrado'}
                          description={profiles.length === 0 ? 'Crie seu primeiro perfil de acesso para começar a configurar permissões.' : 'Ajuste a busca ou os filtros para encontrar o perfil desejado.'}
                          action={profiles.length === 0 ? (
                            <Button size="sm" onClick={() => { setEditingProfile(null); setProfileName(''); setProfileDesc(''); setProfileDialogOpen(true); }}>
                              <Plus className="h-4 w-4 mr-1" /> Criar primeiro perfil
                            </Button>
                          ) : null}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>


        {/* === PERMISSÕES === */}
        <TabsContent value="permissions" className="space-y-4">
          {/* Header */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5"><Eye className="h-5 w-5 text-primary" /></div>
                <div>
                  <h2 className="text-lg font-semibold leading-tight">Permissões por Tela</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Defina, por perfil, quais telas podem ser visualizadas, editadas ou excluídas.</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 md:gap-3 w-full md:w-auto">
                <KpiMini label="Telas" value={ALL_SCREENS.length} />
                <KpiMini label="Perfis" value={profiles.length} />
                <KpiMini label="Regras ativas" value={profileScreens.filter(ps => ps.can_view).length} />
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="pt-4">
              {profiles.length === 0 ? (
                <EmptyState
                  icon={Shield}
                  title="Nenhum perfil cadastrado"
                  description='Crie um perfil primeiro na aba "Perfis de Acesso" para configurar permissões.'
                  action={<Button size="sm" onClick={() => setActiveTab('profiles')}><Shield className="h-4 w-4 mr-1" /> Ir para Perfis</Button>}
                />
              ) : (
                <PermissoesPorTelaPanel
                  screens={ALL_SCREENS}
                  profiles={profiles.map(p => ({ id: p.id, name: p.name }))}
                  profileScreens={profileScreens}
                  onToggle={toggleScreen}
                  onRefresh={fetchData}
                />
              )}
            </CardContent>
          </Card>

          {profiles.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="rounded-md bg-primary/10 p-1.5"><Sparkles className="h-4 w-4 text-primary" /></div>
                    Assistente IA por perfil
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Habilite o painel do Assistente IA para os perfis selecionados.</p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profiles.map(p => (
                      <div key={p.id} className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="rounded-md bg-primary/10 p-1.5"><Shield className="h-4 w-4 text-primary" /></div>
                    Compartilhamento de Passagens Aéreas
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Quando ativado, usuários com permissão de <strong>edição</strong> em Passagens Aéreas podem criar e revogar links de compartilhamento. Administradores sempre têm acesso.</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 w-fit">
                    <span className="text-sm">Permitir não-administradores</span>
                    <Switch
                      checked={passagensShareAllowNonAdmin}
                      onCheckedChange={async (checked) => {
                        const { error } = await supabase
                          .from('app_settings')
                          .upsert({ key: 'passagens_share_allow_non_admin', value: checked ? 'true' : 'false' }, { onConflict: 'key' });
                        if (error) {
                          toast.error('Erro ao salvar: ' + error.message);
                        } else {
                          setPassagensShareAllowNonAdmin(checked);
                          toast.success(checked ? 'Compartilhamento liberado para usuários com permissão de edição' : 'Compartilhamento restrito a administradores');
                        }
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* === LIBERAÇÕES === */}
        <TabsContent value="liberacoes" className="space-y-4">
          <LiberacoesPanel
            screens={ALL_SCREENS}
            profiles={profiles.map(p => ({ id: p.id, name: p.name }))}
            profileScreens={profileScreens}
            onToggle={toggleScreen}
            onRefresh={fetchData}
          />
        </TabsContent>

        {/* === MAPA DE ACESSOS === */}
        <TabsContent value="mapa-acessos" className="space-y-4">
          <MapaAcessosPanel screens={ALL_SCREENS} />
        </TabsContent>




        {/* === GRÁFICOS E MAPAS === */}
        <TabsContent value="visuals">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <LineChart className="h-4 w-4 text-primary" />
                Gráficos e Mapas por Perfil
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Escolha quais gráficos e mapas cada perfil pode visualizar nas telas do ERP. Itens desmarcados ficam ocultos para os usuários daquele perfil. Administradores sempre veem todos.
              </p>
            </CardHeader>
            <CardContent>
              {profiles.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Crie um perfil primeiro na aba "Perfis de Acesso"
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 max-w-md">
                    <Label className="text-xs whitespace-nowrap">Perfil:</Label>
                    <Select
                      value={visualsSelectedProfile || profiles[0]?.id || ''}
                      onValueChange={setVisualsSelectedProfile}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione um perfil" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(() => {
                    const pid = visualsSelectedProfile || profiles[0]?.id;
                    if (!pid) return null;
                    return (
                      <div className="space-y-4">
                        {VISUAL_CATALOG.map(group => {
                          const keys = group.items.map(i => i.key);
                          const allOn = keys.every(k => isVisualVisible(pid, k));
                          const allOff = keys.every(k => !isVisualVisible(pid, k));
                          return (
                            <div key={group.module} className="rounded-md border bg-card">
                              <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30">
                                <h4 className="text-sm font-semibold">{group.module}</h4>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    disabled={allOn}
                                    onClick={() => setModuleVisuals(pid, keys, true)}
                                  >
                                    Marcar todos
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    disabled={allOff}
                                    onClick={() => setModuleVisuals(pid, keys, false)}
                                  >
                                    Desmarcar todos
                                  </Button>
                                </div>
                              </div>
                              <div className="divide-y">
                                {group.items.map(item => {
                                  const visible = isVisualVisible(pid, item.key);
                                  return (
                                    <label
                                      key={item.key}
                                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer"
                                    >
                                      <Checkbox
                                        checked={visible}
                                        onCheckedChange={(c) => setVisualVisible(pid, item.key, c === true)}
                                      />
                                      <span className="text-sm">{item.label}</span>
                                      <span className="ml-auto text-[10px] text-muted-foreground font-mono">{item.key}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === USUÁRIOS === */}
        <TabsContent value="users" className="space-y-4">
          {/* Header */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5"><Users className="h-5 w-5 text-primary" /></div>
                <div>
                  <h2 className="text-lg font-semibold leading-tight">Atribuição de Usuários</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Vincule usuários do ERP aos perfis. Múltiplos perfis somam permissões.</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 md:gap-3 w-full md:w-auto">
                <KpiMini label="Usuários" value={groupedUsers.length} />
                <KpiMini label="Perfis em uso" value={distinctProfilesInUse} />
                <KpiMini label="Sem perfil" value={usersWithoutAssignment.length} accent={usersWithoutAssignment.length > 0} />
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col lg:flex-row gap-2 lg:items-center lg:justify-between">
                <div className="flex flex-col sm:flex-row gap-2 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={userSearch} onChange={e=>setUserSearch(e.target.value)} placeholder="Buscar login, nome ou email..." className="pl-8 h-9" />
                  </div>
                  <Popover open={userFilterPopoverOpen} onOpenChange={setUserFilterPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-1.5">
                        <Filter className="h-3.5 w-3.5" />
                        Filtrar perfis
                        {userProfileFilters.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{userProfileFilters.length}</Badge>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      <div className="text-xs font-medium px-2 py-1 text-muted-foreground">Filtrar por perfil</div>
                      <div className="max-h-60 overflow-auto space-y-0.5">
                        {profiles.map(p => {
                          const checked = userProfileFilters.includes(p.id);
                          return (
                            <label key={p.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer">
                              <Checkbox checked={checked} onCheckedChange={(c) => setUserProfileFilters(prev => c ? [...prev, p.id] : prev.filter(id => id !== p.id))} />
                              <span className="text-sm">{p.name}</span>
                            </label>
                          );
                        })}
                      </div>
                      {userProfileFilters.length > 0 && (
                        <Button variant="ghost" size="sm" className="w-full mt-1 h-8" onClick={() => setUserProfileFilters([])}>Limpar filtros</Button>
                      )}
                    </PopoverContent>
                  </Popover>
                  <Button variant={userOnlyUnassigned ? 'default' : 'outline'} size="sm" className="h-9 gap-1.5" onClick={() => setUserOnlyUnassigned(v => !v)}>
                    <UserX className="h-3.5 w-3.5" />
                    Sem perfil ({usersWithoutAssignment.length})
                  </Button>
                </div>
                <Dialog open={userDialogOpen} onOpenChange={(open) => {
                  setUserDialogOpen(open);
                  if (!open) { setNewUserLogin(''); setNewUserProfileIds([]); setUserComboOpen(false); }
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm" onClick={() => { setNewUserLogin(''); setNewUserProfileIds([]); }}>
                      <UserPlus className="h-4 w-4 mr-1" /> Atribuir Acesso
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Atribuir Perfis a Usuário</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div>
                        <Label>Usuário</Label>
                        <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between font-normal mt-1">
                              {(() => {
                                if (!newUserLogin) return <span className="text-muted-foreground">Selecione um usuário</span>;
                                const u = approvedUsers.find(x => x.erp_user === newUserLogin);
                                return <span className="truncate">{u?.display_name || u?.email || newUserLogin} <span className="text-muted-foreground">({newUserLogin})</span></span>;
                              })()}
                              <ChevronsUpDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar nome, login ou email..." />
                              <CommandList>
                                <CommandEmpty>Nenhum usuário encontrado</CommandEmpty>
                                <CommandGroup>
                                  {approvedUsers.filter(u => !!u.erp_user).map(u => (
                                    <CommandItem
                                      key={u.id}
                                      value={`${u.erp_user} ${u.display_name ?? ''} ${u.email ?? ''}`}
                                      onSelect={() => { setNewUserLogin(u.erp_user!); setNewUserProfileIds([]); setUserComboOpen(false); }}
                                    >
                                      <Check className={cn('h-4 w-4 mr-2', newUserLogin === u.erp_user ? 'opacity-100' : 'opacity-0')} />
                                      <div className="flex flex-col min-w-0">
                                        <span className="truncate">{u.display_name || u.email || u.erp_user}</span>
                                        <span className="text-xs text-muted-foreground font-mono truncate">{u.erp_user}{u.email ? ` · ${u.email}` : ''}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div>
                        <Label>Perfis de Acesso</Label>
                        <p className="text-xs text-muted-foreground mb-2">Selecione um ou mais perfis. As permissões serão somadas.</p>
                        <div className="max-h-64 overflow-auto rounded-md border p-2 space-y-1">
                          {profiles.map(p => {
                            const alreadyAssigned = !!newUserLogin && userAccess.some(
                              ua => ua.user_login.toUpperCase() === newUserLogin.toUpperCase() && ua.profile_id === p.id,
                            );
                            const checked = alreadyAssigned || newUserProfileIds.includes(p.id);
                            return (
                              <div key={p.id} className="flex items-start gap-2 rounded px-2 py-1.5 hover:bg-accent/40">
                                <Checkbox
                                  id={`profile-${p.id}`}
                                  checked={checked}
                                  disabled={alreadyAssigned}
                                  className="mt-0.5"
                                  onCheckedChange={(c) => {
                                    setNewUserProfileIds(prev => c ? [...prev, p.id] : prev.filter(id => id !== p.id));
                                  }}
                                />
                                <Label htmlFor={`profile-${p.id}`} className={cn('flex-1 cursor-pointer text-sm', alreadyAssigned && 'text-muted-foreground')}>
                                  <span className="font-medium">{p.name}</span>
                                  {p.description && <span className="block text-xs text-muted-foreground font-normal mt-0.5">{p.description}</span>}
                                  {alreadyAssigned && <span className="block text-xs italic mt-0.5">Já atribuído</span>}
                                </Label>
                              </div>
                            );
                          })}
                          {profiles.length === 0 && (
                            <p className="text-sm text-muted-foreground py-2 text-center">Nenhum perfil cadastrado</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddUser} disabled={!newUserLogin || newUserProfileIds.length === 0}>
                        Atribuir {newUserProfileIds.length > 0 ? `(${newUserProfileIds.length})` : ''}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {userOnlyUnassigned ? (
                <div className="space-y-2">
                  {usersWithoutAssignment.length === 0 ? (
                    <EmptyState icon={UserCheck} title="Todos os usuários têm perfil" description="Nenhum usuário aprovado está sem atribuição de perfil." />
                  ) : (
                    usersWithoutAssignment.map(u => (
                      <div key={u.id} className="flex items-center justify-between rounded-md border bg-card px-3 py-2.5 hover:bg-muted/40">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center shrink-0">{userInitials(u.erp_user!, u)}</div>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{u.display_name || u.email || u.erp_user}</div>
                            <div className="text-xs text-muted-foreground font-mono truncate">{u.erp_user}{u.email ? ` · ${u.email}` : ''}</div>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => openManageProfilesFor(u.erp_user!)}>
                          <UserPlus className="h-3.5 w-3.5 mr-1" /> Atribuir
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Perfis atribuídos</TableHead>
                      <TableHead className="hidden md:table-cell w-44">Última atribuição</TableHead>
                      <TableHead className="text-right w-40">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="p-0">
                        <EmptyState icon={groupedUsers.length === 0 ? Inbox : Search} title={groupedUsers.length === 0 ? 'Nenhum usuário atribuído' : 'Nenhum usuário encontrado'} description={groupedUsers.length === 0 ? 'Clique em "Atribuir Acesso" para vincular o primeiro usuário a um perfil.' : 'Ajuste a busca ou os filtros.'} />
                      </TableCell></TableRow>
                    ) : filteredUsers.map(g => {
                      const meta = approvedUserByLogin.get(g.login.toUpperCase());
                      return (
                        <TableRow key={g.login} className="hover:bg-muted/40">
                          <TableCell className="align-top">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center shrink-0">{userInitials(g.login, meta)}</div>
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate">{meta?.display_name || meta?.email || g.login}</div>
                                <div className="text-xs text-muted-foreground font-mono truncate">{g.login}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-wrap gap-1.5">
                              {g.rows.map(r => {
                                const name = getProfileName(r.profile_id);
                                return (
                                  <Badge key={r.id} variant={profileBadgeVariant(name)} className="gap-1 pr-1">
                                    <span>{name}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveUser(r.id)}
                                      className="ml-1 rounded-sm px-1 hover:bg-destructive/20 hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                      aria-label={`Remover ${name}`}
                                      title="Remover este perfil"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground align-top">
                            {new Date(g.latest).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex gap-1 justify-end">
                              <Button variant="outline" size="sm" onClick={() => openManageProfilesFor(g.login)}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Perfil
                              </Button>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveAllUserProfiles(g.login)} aria-label="Remover todos os perfis">
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Remover todos os perfis</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
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
              <CardTitle className="text-base">Configuração das APIs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API principal do ERP */}
              <section className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">API principal do ERP</h3>
                    <p className="text-xs text-muted-foreground">Endpoint testado: <span className="font-mono">{getApiUrl()}/health</span></p>
                  </div>
                  {apiStatus === 'online' ? (
                    <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600 text-sm font-normal">
                      <Wifi className="h-3.5 w-3.5" /> Online
                    </Badge>
                  ) : apiStatus === 'offline' ? (
                    <Badge variant="destructive" className="gap-1 text-sm font-normal">
                      <WifiOff className="h-3.5 w-3.5" /> Offline
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-sm font-normal">Verificando…</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-url">URL da API principal do ERP</Label>
                  <Input
                    id="api-url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://api-erp-renato.ngrok.app"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSaveUrl}>Salvar URL</Button>
                  <Button variant="outline" onClick={handleResetUrl}>Resetar para padrão</Button>
                  <Button variant="secondary" onClick={checkApi}>Testar conexão</Button>
                </div>

                {apiStatus === 'offline' && apiLastResult && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-1">
                    <div className="font-semibold text-destructive">API principal indisponível</div>
                    <div><span className="font-medium">URL testada:</span> <span className="font-mono break-all">{apiLastResult.urlTested}</span></div>
                    <div><span className="font-medium">Status HTTP:</span> <span className="font-mono">{String(apiLastResult.status)}</span></div>
                    {apiLastResult.details && (
                      <div><span className="font-medium">Detalhes:</span> <span className="font-mono break-all">{String(apiLastResult.details).slice(0, 400)}</span></div>
                    )}
                  </div>
                )}
              </section>

              {/* API contábil / DRE */}
              <section className="space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">API contábil / DRE</h3>
                    <p className="text-xs text-muted-foreground">Endpoint testado: <span className="font-mono">{getContabilBaseUrl()}/api/contabil/health</span></p>
                  </div>
                  {contabilStatus === 'online' ? (
                    <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600 text-sm font-normal">
                      <Wifi className="h-3.5 w-3.5" /> Online
                    </Badge>
                  ) : contabilStatus === 'offline' ? (
                    <Badge variant="destructive" className="gap-1 text-sm font-normal">
                      <WifiOff className="h-3.5 w-3.5" /> Offline
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 text-sm font-normal">Verificando…</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contabil-url">URL da API contábil / DRE</Label>
                  <Input
                    id="contabil-url"
                    value={contabilUrl}
                    onChange={(e) => setContabilUrl(e.target.value)}
                    placeholder="https://api-erp-renato.ngrok.app"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Informe apenas o domínio (não inclua <code>/api/contabil</code>).
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSaveContabilUrl}>Salvar URL</Button>
                  <Button variant="outline" onClick={handleResetContabilUrl}>Resetar para padrão</Button>
                  <Button variant="secondary" onClick={checkContabil}>Testar conexão</Button>
                </div>

                {contabilStatus === 'offline' && contabilLastResult && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-1">
                    <div className="font-semibold text-destructive">API contábil indisponível</div>
                    <div><span className="font-medium">URL testada:</span> <span className="font-mono break-all">{contabilLastResult.urlTested}</span></div>
                    <div><span className="font-medium">Status HTTP:</span> <span className="font-mono">{String(contabilLastResult.status)}</span></div>
                    {contabilLastResult.details && (
                      <div><span className="font-medium">Detalhes:</span> <span className="font-mono break-all">{String(contabilLastResult.details).slice(0, 400)}</span></div>
                    )}
                    <div className="pt-1 text-muted-foreground">Somente o módulo DRE Studio depende desta API. Os demais módulos do ERP não são afetados.</div>
                  </div>
                )}
              </section>

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
              <p className="text-xs text-muted-foreground mb-3">
                Logs com mais de 7 dias são removidos automaticamente toda segunda-feira às 03:00.
              </p>
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

        {/* === MONITORAMENTO === */}
        <TabsContent value="monitoramento">
          <MonitoramentoUsuarios />
        </TabsContent>

        {/* === DASHBOARD DE USO === */}
        <TabsContent value="dashboard-uso">
          <DashboardUsoUsuarios />
        </TabsContent>

        {/* === MINHAS PREFERÊNCIAS === */}
        <TabsContent value="minhas-preferencias">
          <MinhasPreferenciasSection />
        </TabsContent>

        {/* === MODO DEMONSTRAÇÃO === */}
        <TabsContent value="demo">
          <DemoModeSection />
        </TabsContent>

        {/* === VERSÃO === */}
        <TabsContent value="versao">
          <VersionPanel />
        </TabsContent>

        {/* === DOCUMENTAÇÃO === */}
        <TabsContent value="documentacao">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Documentação Técnica do Projeto
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Visão geral, arquitetura, rotas, módulos, endpoints, banco de dados,
                    edge functions, segurança e integrações de IA.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a href="/docs/sapiens-control-center.pdf" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-1">
                      <ExternalLink className="h-4 w-4" /> Abrir em nova aba
                    </Button>
                  </a>
                  <a href="/docs/sapiens-control-center.pdf" download="sapiens-control-center.pdf">
                    <Button size="sm" className="gap-1">
                      <Download className="h-4 w-4" /> Baixar PDF
                    </Button>
                  </a>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-muted/30 overflow-hidden" style={{ height: '70vh' }}>
                <iframe
                  src="/docs/sapiens-control-center.pdf#view=FitH"
                  title="Documentação HUB de Gestão"
                  className="w-full h-full"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Documento estático (14 páginas) — atualizado conforme novas versões do sistema.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

function VersionPanel() {
  const currentVersion = (import.meta.env.VITE_APP_VERSION as string) || '0.0.0';
  const [dbVersion, setDbVersion] = useState<string>('');
  const [newVersion, setNewVersion] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifierEnabled, setNotifierEnabled] = useState<boolean>(true);
  const [notifierSaving, setNotifierSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['app_version', 'update_notifier_enabled']);
    const map = Object.fromEntries(((data as any[]) || []).map((s) => [s.key, s.value]));
    const v = (map['app_version'] as string) || '';
    setDbVersion(v);
    setNewVersion(v || currentVersion);
    const flag = map['update_notifier_enabled'];
    setNotifierEnabled(flag === undefined ? true : String(flag).toLowerCase() !== 'false');
    setLoading(false);
  }, [currentVersion]);

  const handleToggleNotifier = async (next: boolean) => {
    setNotifierSaving(true);
    const prev = notifierEnabled;
    setNotifierEnabled(next);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'update_notifier_enabled', value: next ? 'true' : 'false' }, { onConflict: 'key' });
    setNotifierSaving(false);
    if (error) {
      setNotifierEnabled(prev);
      toast.error('Erro ao salvar preferência');
      return;
    }
    toast.success(next ? 'Aviso de nova versão ativado' : 'Aviso de nova versão desativado');
  };

  useEffect(() => { load(); }, [load]);

  const handlePublish = async () => {
    const v = newVersion.trim();
    if (!v) {
      toast.error('Informe o número da versão');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'app_version', value: v }, { onConflict: 'key' });
    setSaving(false);
    if (error) {
      toast.error('Erro ao publicar versão');
      return;
    }
    toast.success('Versão publicada. Usuários receberão o aviso em até 60s.');
    setDbVersion(v);
  };

  const mismatch = dbVersion && dbVersion !== currentVersion;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Rocket className="h-4 w-4" /> Versão do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Após publicar uma nova versão do app, atualize aqui o número da versão para que todos
          os usuários conectados sejam forçados a recarregar e carregar a versão mais recente.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Versão carregada (este navegador)</div>
            <div className="text-lg font-semibold mt-1">v{currentVersion}</div>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">Versão publicada (banco)</div>
            <div className="text-lg font-semibold mt-1 flex items-center gap-2">
              {loading ? '...' : dbVersion ? `v${dbVersion}` : '—'}
              {mismatch && <Badge variant="destructive" className="text-[10px]">divergente</Badge>}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Publicar nova versão</Label>
          <div className="flex gap-2">
            <Input
              value={newVersion}
              onChange={(e) => setNewVersion(e.target.value)}
              placeholder="Ex: 1.0.1"
              className="max-w-[200px]"
            />
            <Button onClick={handlePublish} disabled={saving} className="gap-2">
              <Rocket className="h-4 w-4" />
              {saving ? 'Publicando...' : 'Publicar nova versão'}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Use o mesmo número que está no <code>package.json</code> do deploy mais recente.
          </p>
        </div>

        <div className="rounded-md border bg-muted/30 p-3 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <Label className="text-sm">Notificar usuários sobre novas versões</Label>
            <p className="text-[11px] text-muted-foreground">
              Quando ativo, exibe o popup "Nova versão disponível" assim que uma nova versão do
              HUB de Gestão for publicada. Desligue para suprimir o aviso para todos os usuários.
            </p>
          </div>
          <Switch
            checked={notifierEnabled}
            disabled={loading || notifierSaving}
            onCheckedChange={handleToggleNotifier}
          />
        </div>
      </CardContent>
    </Card>
  );
}

