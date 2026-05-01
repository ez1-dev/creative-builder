import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Download, Loader2, Activity, Search } from 'lucide-react';

const HEARTBEAT_ACTIVE_MIN = 5;

interface UltimaTela {
  user_id: string | null;
  user_email: string | null;
  erp_user: string | null;
  sistema: string | null;
  tela_codigo: string | null;
  tela_nome: string | null;
  acao: string | null;
  computador: string | null;
  ip: string | null;
  user_agent: string | null;
  session_id: string | null;
  ultima_navegacao: string;
}

interface HeartbeatRow {
  user_id: string | null;
  ultimo_heartbeat: string;
}

function minutosAtras(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor(ms / 60000));
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return '-';
  }
}

export function MonitorNavegacaoSection() {
  const [rows, setRows] = useState<UltimaTela[]>([]);
  const [heartbeats, setHeartbeats] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [filtroSistema, setFiltroSistema] = useState<string>('__all__');
  const [, setTick] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: ult }, { data: hbs }] = await Promise.all([
        (supabase.from('vw_ultima_tela_usuario') as any)
          .select('*')
          .order('ultima_navegacao', { ascending: false })
          .limit(500),
        (supabase.from('usu_log_navegacao_erp') as any)
          .select('user_id, created_at')
          .eq('acao', 'HEARTBEAT')
          .gte('created_at', new Date(Date.now() - 30 * 60_000).toISOString())
          .order('created_at', { ascending: false })
          .limit(2000),
      ]);
      setRows((ult ?? []) as UltimaTela[]);
      const map: Record<string, string> = {};
      for (const h of (hbs ?? []) as HeartbeatRow[]) {
        if (!h.user_id) continue;
        if (!map[h.user_id]) map[h.user_id] = h.ultimo_heartbeat ?? (h as any).created_at;
      }
      setHeartbeats(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(load, 30_000);
    return () => window.clearInterval(id);
  }, [autoRefresh]);

  // re-render a cada 30s para manter "há X min" atualizado
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const sistemas = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.sistema && set.add(r.sistema));
    return Array.from(set).sort();
  }, [rows]);

  const statusOf = (r: UltimaTela): 'ativo' | 'inativo' => {
    if (!r.user_id) return 'inativo';
    const hb = heartbeats[r.user_id];
    if (!hb) return 'inativo';
    const m = minutosAtras(hb);
    return m !== null && m <= HEARTBEAT_ACTIVE_MIN ? 'ativo' : 'inativo';
  };

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (filtroSistema !== '__all__' && (r.sistema ?? '') !== filtroSistema) return false;
      if (filtroStatus !== 'todos' && statusOf(r) !== filtroStatus) return false;
      if (!q) return true;
      const blob = [r.user_email, r.erp_user, r.tela_nome, r.tela_codigo, r.computador]
        .filter(Boolean).join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [rows, busca, filtroStatus, filtroSistema, heartbeats]);

  const exportCsv = () => {
    const header = ['Usuário', 'Email', 'Tela', 'Código', 'Ação', 'Há min', 'Computador', 'Sistema', 'Status', 'Última navegação'];
    const lines = filtradas.map((r) => {
      const m = minutosAtras(r.ultima_navegacao);
      return [
        r.erp_user ?? '',
        r.user_email ?? '',
        r.tela_nome ?? '',
        r.tela_codigo ?? '',
        r.acao ?? '',
        m === null ? '' : String(m),
        r.computador ?? '',
        r.sistema ?? '',
        statusOf(r),
        fmtDateTime(r.ultima_navegacao),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';');
    });
    const csv = [header.join(';'), ...lines].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `navegacao-erp-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-5">
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">Buscar</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Usuário, email, tela, computador..."
                className="h-9 pl-7"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativo (≤ {HEARTBEAT_ACTIVE_MIN} min)</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sistema</Label>
            <Select value={filtroSistema} onValueChange={setFiltroSistema}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {sistemas.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5">
              <Switch id="auto-nav" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              <Label htmlFor="auto-nav" className="cursor-pointer text-xs">Auto 30s</Label>
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={filtradas.length === 0} className="gap-2">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="text-xs text-muted-foreground">
              {filtradas.length} {filtradas.length === 1 ? 'usuário' : 'usuários'}
              {rows.length !== filtradas.length && ` (de ${rows.length})`}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              Heartbeat ativo: ≤ {HEARTBEAT_ACTIVE_MIN} min
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Última tela</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead className="text-right">Há min</TableHead>
                  <TableHead>Computador</TableHead>
                  <TableHead>Sistema</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quando</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : filtradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      Nenhuma navegação registrada ainda.
                    </TableCell>
                  </TableRow>
                ) : filtradas.map((r) => {
                  const min = minutosAtras(r.ultima_navegacao);
                  const status = statusOf(r);
                  return (
                    <TableRow key={(r.user_id ?? r.erp_user ?? r.session_id ?? '') + r.ultima_navegacao}>
                      <TableCell className="font-medium">{r.erp_user ?? '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.user_email ?? '-'}</TableCell>
                      <TableCell>
                        <div className="text-sm">{r.tela_nome ?? '-'}</div>
                        <div className="text-[11px] text-muted-foreground">{r.tela_codigo ?? '-'}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px]">{r.acao ?? '-'}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">{min ?? '-'}</TableCell>
                      <TableCell className="text-xs">{r.computador ?? '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.sistema ?? '-'}</TableCell>
                      <TableCell>
                        {status === 'ativo' ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 text-[10px]">
                            • ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            • inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDateTime(r.ultima_navegacao)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
