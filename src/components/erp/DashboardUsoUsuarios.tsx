import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Download, Users, Clock, Activity, MousePointerClick, Layers, TrendingUp, Trophy, AlarmClock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  ActivityEvent,
  estimateSessions,
  topUsersByHours,
  aggregateByHour,
  aggregateByWeekday,
  aggregateByModule,
  aggregateByDay,
  formatDuration,
  moduleLabel,
  moduleFromPath,
} from '@/lib/userUsageMetrics';
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { formatDate } from '@/lib/format';
import { useAiPageContext } from '@/hooks/useAiPageContext';

const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2, 200 70% 50%))', 'hsl(var(--chart-3, 280 60% 55%))', 'hsl(var(--chart-4, 30 80% 55%))', 'hsl(var(--chart-5, 150 55% 45%))', 'hsl(var(--muted-foreground))'];

type Periodo = '24h' | '7d';

function periodHours(p: Periodo) { return p === '24h' ? 24 : 24 * 7; }

export function DashboardUsoUsuarios() {
  const [periodo, setPeriodo] = useState<Periodo>('7d');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - periodHours(periodo) * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('user_activity')
      .select('user_id, user_email, event_type, path, action, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(5000);
    if (!error && data) setEvents(data as ActivityEvent[]);
    setLastFetch(new Date());
    setLoading(false);
  }, [periodo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filtros aplicados
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      if (userFilter !== 'all' && (ev.user_email ?? ev.user_id) !== userFilter) return false;
      if (moduleFilter !== 'all' && moduleFromPath(ev.path) !== moduleFilter) return false;
      return true;
    });
  }, [events, userFilter, moduleFilter]);

  const userStats = useMemo(() => estimateSessions(filteredEvents), [filteredEvents]);
  const totalSeconds = useMemo(() => userStats.reduce((acc, u) => acc + u.totalSeconds, 0), [userStats]);
  const totalSessions = useMemo(() => userStats.reduce((acc, u) => acc + u.sessions, 0), [userStats]);
  const totalPageViews = useMemo(() => filteredEvents.filter(e => e.event_type === 'page_view').length, [filteredEvents]);
  const totalActions = useMemo(() => filteredEvents.filter(e => e.event_type === 'action').length, [filteredEvents]);
  const avgSessionMin = useMemo(() => totalSessions ? (totalSeconds / totalSessions / 60) : 0, [totalSeconds, totalSessions]);
  const pagesPerSession = useMemo(() => totalSessions ? (totalPageViews / totalSessions) : 0, [totalPageViews, totalSessions]);

  // Charts
  const topUsersChart = useMemo(() => topUsersByHours(userStats, 15), [userStats]);
  const byHour = useMemo(() => aggregateByHour(filteredEvents), [filteredEvents]);
  const byWeekday = useMemo(() => aggregateByWeekday(filteredEvents), [filteredEvents]);
  const byModule = useMemo(() => aggregateByModule(filteredEvents).slice(0, 8), [filteredEvents]);
  const byDay = useMemo(() => aggregateByDay(filteredEvents, periodo === '24h' ? 1 : 7), [filteredEvents, periodo]);

  // Insights
  const topUser = userStats[0];
  const topModule = byModule[0];
  const peakHour = useMemo(() => {
    let max = -1, h = 0;
    byHour.forEach(b => { if (b.eventos > max) { max = b.eventos; h = b.hora; } });
    return { hora: h, eventos: max };
  }, [byHour]);
  const inactiveUsers = useMemo(() => {
    const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
    return userStats.filter(u => u.lastSeenAt && +new Date(u.lastSeenAt) < cutoff).length;
  }, [userStats]);
  const exportCount = useMemo(
    () => filteredEvents.filter(e => e.event_type === 'action' && (e.action ?? '').toLowerCase().includes('export')).length,
    [filteredEvents]
  );

  // Listas para filtros
  const allUsers = useMemo(() => {
    const s = new Set<string>();
    events.forEach(e => { const k = e.user_email ?? e.user_id; if (k) s.add(k); });
    return Array.from(s).sort();
  }, [events]);
  const allModules = useMemo(() => {
    const s = new Set<string>();
    events.forEach(e => s.add(moduleFromPath(e.path)));
    return Array.from(s).sort();
  }, [events]);

  // Contexto IA
  useAiPageContext({
    title: 'Dashboard de Uso',
    filters: { periodo, usuario: userFilter, modulo: moduleFilter },
    kpis: {
      'Usuários ativos': userStats.length,
      'Horas de uso': formatDuration(totalSeconds),
      'Sessões': totalSessions,
      'Tempo médio/sessão': `${avgSessionMin.toFixed(1)} min`,
      'Páginas/sessão': pagesPerSession.toFixed(1),
      'Ações': totalActions,
    },
    summary: topUser
      ? `Top usuário: ${topUser.user_email} (${formatDuration(topUser.totalSeconds)}); módulo principal: ${topModule ? topModule.modulo : 'n/d'}; pico às ${peakHour.hora}h.`
      : `Sem atividade no período (${periodo}).`,
  });

  const handleExport = () => {
    const rows = [['Usuário', 'Horas de uso', 'Sessões', 'Páginas', 'Ações', 'Última atividade', 'Módulo favorito']];
    userStats.forEach(u => rows.push([
      u.user_email,
      (u.totalSeconds / 3600).toFixed(2).replace('.', ','),
      String(u.sessions),
      String(u.pageViews),
      String(u.actions),
      formatDate(u.lastSeenAt),
      moduleLabel(u.favoriteModule),
    ]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-uso-${periodo}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Período</label>
              <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Últimas 24h</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Usuário</label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {allUsers.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Módulo</label>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {allModules.map(m => <SelectItem key={m} value={m}>{moduleLabel(m)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={fetchData} disabled={loading} className="gap-1">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport} className="gap-1">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            {lastFetch && <span className="text-xs text-muted-foreground ml-auto">Atualizado: {lastFetch.toLocaleTimeString('pt-BR')}</span>}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiSmall icon={<Users className="h-4 w-4" />} label="Usuários ativos" value={String(userStats.length)} />
        <KpiSmall icon={<Clock className="h-4 w-4" />} label="Horas de uso" value={formatDuration(totalSeconds)} />
        <KpiSmall icon={<Activity className="h-4 w-4" />} label="Sessões" value={String(totalSessions)} />
        <KpiSmall icon={<AlarmClock className="h-4 w-4" />} label="Tempo médio/sessão" value={`${avgSessionMin.toFixed(1)} min`} />
        <KpiSmall icon={<Layers className="h-4 w-4" />} label="Páginas/sessão" value={pagesPerSession.toFixed(1)} />
        <KpiSmall icon={<MousePointerClick className="h-4 w-4" />} label="Ações executadas" value={String(totalActions)} />
      </div>

      {/* Charts linha 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top usuários por horas de uso</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={topUsersChart} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis type="category" dataKey="user" stroke="hsl(var(--muted-foreground))" fontSize={11} width={140} />
                <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', fontSize: 12 }} formatter={(v: number) => [`${v} h`, 'Horas']} />
                <Bar dataKey="horas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Módulos mais utilizados</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={byModule} dataKey="eventos" nameKey="modulo" cx="50%" cy="50%" outerRadius={110} innerRadius={60} label={(e: any) => e.modulo}>
                  {byModule.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts linha 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Atividade por hora do dia</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={byHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hora" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(h) => `${h}h`} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', fontSize: 12 }} labelFormatter={(h) => `${h}:00`} />
                <Line type="monotone" dataKey="eventos" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Atividade por dia da semana</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byWeekday}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
                <Bar dataKey="eventos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Linha do tempo */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Linha do tempo — acessos por dia</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="data" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', fontSize: 12 }} />
              <Line type="monotone" dataKey="eventos" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <InsightCard
          icon={<Trophy className="h-4 w-4 text-amber-500" />}
          title="Usuário mais ativo"
          value={topUser ? topUser.user_email : '—'}
          hint={topUser ? `${formatDuration(topUser.totalSeconds)} • ${topUser.sessions} sessões` : 'Sem dados'}
        />
        <InsightCard
          icon={<Layers className="h-4 w-4 text-primary" />}
          title="Módulo mais usado"
          value={topModule ? topModule.modulo : '—'}
          hint={topModule ? `${topModule.eventos} eventos` : 'Sem dados'}
        />
        <InsightCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          title="Horário de pico"
          value={peakHour.eventos > 0 ? `${peakHour.hora}:00` : '—'}
          hint={peakHour.eventos > 0 ? `${peakHour.eventos} eventos` : 'Sem dados'}
        />
        <InsightCard
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          title="Inativos > 3 dias"
          value={String(inactiveUsers)}
          hint="Sem atividade recente"
        />
        <InsightCard
          icon={<Download className="h-4 w-4 text-blue-500" />}
          title="Exportações"
          value={String(exportCount)}
          hint="Cliques em exportar"
        />
      </div>

      {/* Tabela engajamento */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Engajamento por usuário</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead className="text-right">Horas de uso</TableHead>
                <TableHead className="text-right">Sessões</TableHead>
                <TableHead className="text-right">Páginas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
                <TableHead>Módulo favorito</TableHead>
                <TableHead>Última atividade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userStats.map(u => (
                <TableRow key={u.userKey}>
                  <TableCell className="font-medium">{u.user_email}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatDuration(u.totalSeconds)}</TableCell>
                  <TableCell className="text-right tabular-nums">{u.sessions}</TableCell>
                  <TableCell className="text-right tabular-nums">{u.pageViews}</TableCell>
                  <TableCell className="text-right tabular-nums">{u.actions}</TableCell>
                  <TableCell><Badge variant="outline">{moduleLabel(u.favoriteModule)}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-xs">{u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString('pt-BR') : '—'}</TableCell>
                </TableRow>
              ))}
              {userStats.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma atividade no período selecionado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiSmall({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {icon}
          {label}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function InsightCard({ icon, title, value, hint }: { icon: React.ReactNode; title: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">{icon}{title}</div>
        <div className="text-base font-semibold truncate" title={value}>{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>
      </CardContent>
    </Card>
  );
}
