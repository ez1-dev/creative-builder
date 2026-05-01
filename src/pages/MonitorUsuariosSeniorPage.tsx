import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { PageHeader } from '@/components/erp/PageHeader';
import { KPICard } from '@/components/erp/KPICard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Card, CardContent,
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefreshCw, Users, Activity, Clock, LayoutGrid, Loader2, PowerOff, Link2Off } from 'lucide-react';
import { api, getApiUrl } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { BackendStatusCard, type BackendStatus } from '@/components/erp/BackendStatusCard';
import { UpdateApiUrlDialog } from '@/components/erp/UpdateApiUrlDialog';

interface SessaoSenior {
  numsec: number | string;
  usuario_senior?: string;
  usuario_windows?: string;
  computador?: string;
  aplicativo?: string;
  cod_modulo?: string | number;
  modulo?: string;
  data_hora_conexao?: string;
  minutos_conectado?: number;
  instancia?: string;
  tipo_aplicacao?: string;
  mensagem_admin?: string;
}

const motivoSchema = z.string().trim().min(5, 'Informe um motivo (mín. 5 caracteres)').max(500, 'Máximo 500 caracteres');

const fmtDateTime = (v?: string) => {
  if (!v) return '-';
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
};

export default function MonitorUsuariosSeniorPage() {
  const { toast } = useToast();
  const { erpUser } = useAuth();
  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('erp_is_admin') === 'true';
  const canDisconnect = isAdmin || (erpUser?.toUpperCase() === 'RENATO');

  const [data, setData] = useState<SessaoSenior[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(30);

  // filtros
  const [fUsuario, setFUsuario] = useState('');
  const [fComputador, setFComputador] = useState('');
  const [fModulo, setFModulo] = useState('');
  const [fAplicativo, setFAplicativo] = useState('SAPIENS');

  // modal
  const [target, setTarget] = useState<SessaoSenior | null>(null);
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadingRef = useRef(false);
  const load = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await api.get<any>('/api/senior/sessoes');
      const rows: SessaoSenior[] = Array.isArray(res) ? res : (res?.sessoes ?? res?.data ?? []);
      setData(rows);
    } catch (e: any) {
      toast({ title: 'Erro ao carregar sessões', description: e?.message ?? 'Falha desconhecida', variant: 'destructive' });
    } finally {
      setLoading(false);
      loadingRef.current = false;
      setCountdown(30);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // auto-refresh com contador
  useEffect(() => {
    if (!autoRefresh) return;
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          load();
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line
  }, [autoRefresh]);

  const aplicativos = useMemo(() => {
    const set = new Set<string>();
    data.forEach((s) => { if (s.aplicativo) set.add(s.aplicativo); });
    set.add('SAPIENS');
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter((s) => {
      if (fUsuario && !(s.usuario_senior ?? '').toLowerCase().includes(fUsuario.toLowerCase())) return false;
      if (fComputador && !(s.computador ?? '').toLowerCase().includes(fComputador.toLowerCase())) return false;
      if (fModulo) {
        const m = `${s.modulo ?? ''} ${s.cod_modulo ?? ''}`.toLowerCase();
        if (!m.includes(fModulo.toLowerCase())) return false;
      }
      if (fAplicativo && fAplicativo !== '__all__' && (s.aplicativo ?? '').toUpperCase() !== fAplicativo.toUpperCase()) return false;
      return true;
    });
  }, [data, fUsuario, fComputador, fModulo, fAplicativo]);

  const stats = useMemo(() => {
    const totalSessoes = filtered.length;
    const usuariosDistintos = new Set(filtered.map((s) => s.usuario_senior).filter(Boolean)).size;
    const acimaDe4h = filtered.filter((s) => (s.minutos_conectado ?? 0) > 240).length;
    const porModulo: Record<string, number> = {};
    filtered.forEach((s) => {
      const k = s.modulo || String(s.cod_modulo ?? '—');
      porModulo[k] = (porModulo[k] ?? 0) + 1;
    });
    const top = Object.entries(porModulo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value: String(value) }));
    return { totalSessoes, usuariosDistintos, acimaDe4h, modulosTop: top, totalModulos: Object.keys(porModulo).length };
  }, [filtered]);

  const openConfirm = (s: SessaoSenior) => {
    setTarget(s);
    setMotivo('');
  };

  const confirmDisconnect = async () => {
    if (!target) return;
    const parsed = motivoSchema.safeParse(motivo);
    if (!parsed.success) {
      toast({ title: 'Motivo inválido', description: parsed.error.issues[0].message, variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/api/senior/sessoes/${target.numsec}/desconectar`, {
        confirmar: true,
        motivo: parsed.data,
      });
      toast({ title: 'Sessão desconectada', description: `Sessão ${target.numsec} encerrada.` });
      setTarget(null);
      setMotivo('');
      await load();
    } catch (e: any) {
      toast({ title: 'Erro ao desconectar', description: e?.message ?? 'Falha desconhecida', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-3 sm:p-6">
      <PageHeader
        title="Monitor de Usuários Senior"
        description="Sessões ativas no ERP Senior/Sapiens"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5">
              <Switch id="auto" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              <Label htmlFor="auto" className="cursor-pointer text-xs">
                Auto-atualizar
                {autoRefresh && <span className="ml-1 text-muted-foreground">({countdown}s)</span>}
              </Label>
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard
          title="Total de Sessões"
          value={stats.totalSessoes}
          icon={<Activity className="h-5 w-5" />}
          variant="info"
        />
        <KPICard
          title="Usuários Distintos"
          value={stats.usuariosDistintos}
          icon={<Users className="h-5 w-5" />}
          variant="default"
        />
        <KPICard
          title="Módulos em Uso"
          value={stats.totalModulos}
          subtitle={stats.modulosTop[0]?.label ? `Top: ${stats.modulosTop[0].label}` : undefined}
          icon={<LayoutGrid className="h-5 w-5" />}
          variant="success"
          details={stats.modulosTop}
        />
        <KPICard
          title="Conectados > 4h"
          value={stats.acimaDe4h}
          icon={<Clock className="h-5 w-5" />}
          variant={stats.acimaDe4h > 0 ? 'destructive' : 'default'}
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Usuário Senior</Label>
            <Input value={fUsuario} onChange={(e) => setFUsuario(e.target.value)} placeholder="Filtrar por usuário" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Computador</Label>
            <Input value={fComputador} onChange={(e) => setFComputador(e.target.value)} placeholder="Nome da máquina" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Módulo</Label>
            <Input value={fModulo} onChange={(e) => setFModulo(e.target.value)} placeholder="Nome ou código" className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Aplicativo</Label>
            <Select value={fAplicativo} onValueChange={setFAplicativo}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {aplicativos.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Sessão</TableHead>
                  <TableHead className="whitespace-nowrap">Usuário Senior</TableHead>
                  <TableHead className="whitespace-nowrap">Usuário Windows</TableHead>
                  <TableHead className="whitespace-nowrap">Computador</TableHead>
                  <TableHead className="whitespace-nowrap">Aplicativo</TableHead>
                  <TableHead className="whitespace-nowrap">Cód. Mód.</TableHead>
                  <TableHead className="whitespace-nowrap">Módulo</TableHead>
                  <TableHead className="whitespace-nowrap">Conexão</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Min.</TableHead>
                  <TableHead className="whitespace-nowrap">Instância</TableHead>
                  <TableHead className="whitespace-nowrap">Tipo Aplic.</TableHead>
                  <TableHead className="whitespace-nowrap">Mensagem Admin</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="py-8 text-center text-muted-foreground">
                      Nenhuma sessão encontrada.
                    </TableCell>
                  </TableRow>
                ) : filtered.map((s) => {
                  const min = s.minutos_conectado ?? 0;
                  const longa = min > 240;
                  return (
                    <TableRow key={String(s.numsec)}>
                      <TableCell className="font-mono text-xs">{s.numsec}</TableCell>
                      <TableCell className="whitespace-nowrap font-medium">{s.usuario_senior ?? '-'}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{s.usuario_windows ?? '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{s.computador ?? '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{s.aplicativo ?? '-'}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{s.cod_modulo ?? '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{s.modulo ?? '-'}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{fmtDateTime(s.data_hora_conexao)}</TableCell>
                      <TableCell className="text-right">
                        {longa ? (
                          <Badge variant="destructive">{min}</Badge>
                        ) : min > 120 ? (
                          <Badge variant="secondary">{min}</Badge>
                        ) : (
                          <span>{min}</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{s.instancia ?? '-'}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{s.tipo_aplicacao ?? '-'}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-muted-foreground" title={s.mensagem_admin ?? ''}>
                        {s.mensagem_admin ?? '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {canDisconnect ? (
                          <Button size="sm" variant="destructive" className="h-7 gap-1" onClick={() => openConfirm(s)}>
                            <PowerOff className="h-3 w-3" />
                            Desconectar
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-xs">Somente consulta</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de confirmação */}
      <AlertDialog open={!!target} onOpenChange={(o) => { if (!o) { setTarget(null); setMotivo(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar sessão?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Esta ação encerrará imediatamente a sessão abaixo:</p>
                {target && (
                  <div className="rounded-md border bg-muted/40 p-3 text-xs space-y-1">
                    <div><span className="text-muted-foreground">Sessão:</span> <span className="font-mono">{target.numsec}</span></div>
                    <div><span className="text-muted-foreground">Usuário:</span> <strong>{target.usuario_senior ?? '-'}</strong></div>
                    <div><span className="text-muted-foreground">Computador:</span> {target.computador ?? '-'}</div>
                    <div><span className="text-muted-foreground">Módulo:</span> {target.modulo ?? '-'}</div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo" className="text-xs">Motivo (obrigatório)</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: Usuário esqueceu sessão aberta na máquina X."
              rows={3}
              maxLength={500}
            />
            <p className="text-[11px] text-muted-foreground">{motivo.length}/500 caracteres</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDisconnect(); }}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <PowerOff className="mr-1 h-3.5 w-3.5" />}
              Confirmar Desconexão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
