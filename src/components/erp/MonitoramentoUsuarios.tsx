import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Trash2, Activity, Users as UsersIcon, BarChart3, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface SessionRow {
  user_id: string;
  user_email: string | null;
  display_name: string | null;
  last_seen_at: string;
  current_path: string | null;
}

interface ActivityRow {
  id: string;
  user_id: string | null;
  user_email: string | null;
  event_type: string;
  path: string | null;
  action: string | null;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}

const PAGE_SIZE = 50;

export function MonitoramentoUsuarios() {
  const { user } = useAuth();
  const [online, setOnline] = useState<SessionRow[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'24h' | '7d'>('7d');
  const [eventType, setEventType] = useState<'all' | 'page_view' | 'action'>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [killing, setKilling] = useState<string | null>(null);

  const fetchOnline = useCallback(async () => {
    const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data } = await (supabase.from('user_sessions' as any) as any)
      .select('*')
      .gte('last_seen_at', since)
      .order('last_seen_at', { ascending: false });
    setOnline((data as SessionRow[]) || []);
  }, []);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    const sinceMs = period === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const since = new Date(Date.now() - sinceMs).toISOString();
    let q: any = (supabase.from('user_activity' as any) as any)
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (eventType !== 'all') q = q.eq('event_type', eventType);
    if (userFilter !== 'all') q = q.eq('user_email', userFilter);
    const { data } = await q;
    setActivity((data as ActivityRow[]) || []);
    setLoading(false);
  }, [period, eventType, userFilter]);

  useEffect(() => {
    fetchOnline();
    const t = window.setInterval(fetchOnline, 30000);
    return () => window.clearInterval(t);
  }, [fetchOnline]);

  useEffect(() => { fetchActivity(); setPage(0); }, [fetchActivity]);

  const usersInActivity = useMemo(() => {
    const set = new Set<string>();
    activity.forEach(a => { if (a.user_email) set.add(a.user_email); });
    return Array.from(set).sort();
  }, [activity]);

  const last24h = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return activity.filter(a => new Date(a.created_at).getTime() >= since);
  }, [activity]);

  const topPages = useMemo(() => {
    const map = new Map<string, number>();
    last24h.filter(a => a.event_type === 'page_view' && a.path).forEach(a => {
      map.set(a.path!, (map.get(a.path!) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [last24h]);

  const topUsers = useMemo(() => {
    const map = new Map<string, number>();
    last24h.forEach(a => {
      const k = a.user_email || '—';
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [last24h]);

  const handleClear = async () => {
    if (!confirm('Apagar TODO o histórico de atividade? Esta ação não pode ser desfeita.')) return;
    const { error } = await (supabase.from('user_activity' as any) as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) { toast.error('Erro ao limpar histórico'); return; }
    toast.success('Histórico limpo');
    fetchActivity();
  };

  const handleKick = async (s: SessionRow) => {
    const label = s.display_name || s.user_email || s.user_id;
    if (!confirm(`Derrubar a conexão de ${label}?\n\nO usuário será desconectado em alguns segundos e precisará entrar novamente.`)) return;
    setKilling(s.user_id);
    try {
      const { error } = await supabase.functions.invoke('admin-force-logout', {
        body: { userId: s.user_id },
      });
      if (error) throw error;
      toast.success(`Conexão de ${label} encerrada`);
      fetchOnline();
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao derrubar conexão');
    } finally {
      setKilling(null);
    }
  };

  const paged = activity.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(activity.length / PAGE_SIZE));

  return (
    <div className="space-y-4">
      {/* Online agora */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Online agora
            <Badge variant="secondary">{online.length}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchOnline}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">
            Usuários ativos nos últimos 2 minutos. Auto-atualiza a cada 30s.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Página atual</TableHead>
                <TableHead className="w-[140px]">Última atividade</TableHead>
                <TableHead className="w-[120px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {online.map(s => {
                const isSelf = user?.id === s.user_id;
                return (
                  <TableRow key={s.user_id}>
                    <TableCell className="font-medium text-sm">{s.display_name || '—'}</TableCell>
                    <TableCell className="text-sm">{s.user_email || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{s.current_path || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeAgo(s.last_seen_at)}</TableCell>
                    <TableCell className="text-right">
                      {isSelf ? (
                        <span className="text-[10px] text-muted-foreground italic">você</span>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleKick(s)}
                          disabled={killing === s.user_id}
                        >
                          <LogOut className="h-3 w-3 mr-1" />
                          {killing === s.user_id ? 'Derrubando...' : 'Derrubar'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {online.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Nenhum usuário online</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Acessos (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{last24h.filter(a => a.event_type === 'page_view').length}</div>
            <p className="text-xs text-muted-foreground mt-1">Visualizações de página</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Páginas mais acessadas (24h)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {topPages.length === 0 && <p className="text-xs text-muted-foreground">Sem dados</p>}
            {topPages.map(([path, count]) => (
              <div key={path} className="flex justify-between text-xs">
                <span className="font-mono truncate">{path}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-primary" /> Usuários mais ativos (24h)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {topUsers.length === 0 && <p className="text-xs text-muted-foreground">Sem dados</p>}
            {topUsers.map(([email, count]) => (
              <div key={email} className="flex justify-between text-xs">
                <span className="truncate">{email}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Histórico */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2 flex-wrap">
          <CardTitle className="text-base">Histórico de atividade</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                {usersInActivity.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={eventType} onValueChange={(v) => setEventType(v as typeof eventType)}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos eventos</SelectItem>
                <SelectItem value="page_view">Navegação</SelectItem>
                <SelectItem value="action">Ações</SelectItem>
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
              <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Últimas 24h</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchActivity} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClear}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Limpar histórico
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Registros com mais de 7 dias são removidos automaticamente toda segunda-feira às 03:15.
          </p>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="w-[110px]">Tipo</TableHead>
                    <TableHead>Página</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(a.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-xs">{a.user_email || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={a.event_type === 'action' ? 'default' : 'secondary'} className="text-[10px]">
                          {a.event_type === 'action' ? 'Ação' : 'Navegação'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{a.path || '—'}</TableCell>
                      <TableCell className="text-xs">{a.action || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {paged.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sem registros no período</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {activity.length > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span>Página {page + 1} de {totalPages} · {activity.length} registros</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
