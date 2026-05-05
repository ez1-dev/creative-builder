import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
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
import { RefreshCw, Users, Activity, LayoutGrid, Loader2, PowerOff, Link2Off, Monitor, Search, Download, ArrowUp, ArrowDown, ArrowUpDown, Settings, ChevronRight, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SeniorRulesSection } from '@/components/erp/SeniorRulesSection';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MonitorNavegacaoSection } from '@/components/erp/MonitorNavegacaoSection';
import { api, getApiUrl } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { BackendStatusCard, type BackendStatus } from '@/components/erp/BackendStatusCard';
import { UpdateApiUrlDialog } from '@/components/erp/UpdateApiUrlDialog';
import { ApplyRulesDialog } from '@/components/erp/ApplyRulesDialog';
import { useSeniorDisconnectRules } from '@/hooks/useSeniorDisconnectRules';

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

/** Normaliza um registro vindo do backend (qualquer formato conhecido) para o shape interno SessaoSenior. */
const pick = (o: any, ...keys: string[]) => {
  for (const k of keys) {
    if (o && o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k];
  }
  return undefined;
};

const toIsoDate = (v: any): string | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return undefined;
    // Formato SQL Server style 120: 'YYYY-MM-DD HH:MM:SS' — devolver como veio
    if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/.test(s)) return s;
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : s;
  }
  // number (formato NUMERIC do Senior, ex.: 46140.431939) ou outro tipo: ignorar
  // — não é timestamp Unix e não pode ser convertido com new Date().
  return undefined;
};

const normalizeSessao = (raw: any): SessaoSenior => {
  const data_hora_conexao = toIsoDate(pick(raw, 'data_hora_conexao', 'dat_tim', 'dattim', 'DatTim'));
  let minutos_conectado = pick(raw, 'minutos_conectado', 'minutos', 'min_conectado');
  if ((minutos_conectado === undefined || minutos_conectado === null) && typeof data_hora_conexao === 'string') {
    const d = new Date(data_hora_conexao.replace(' ', 'T'));
    if (!isNaN(d.getTime())) {
      minutos_conectado = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
    }
  }
  return {
    numsec: pick(raw, 'numsec', 'sessao', 'num_sec', 'numSec', 'NumSec'),
    usuario_senior: pick(raw, 'usuario_senior', 'usuario', 'app_usr', 'appusr', 'AppUsr'),
    usuario_windows: pick(raw, 'usuario_windows', 'usuario_sistema_operacional', 'usr_nam', 'usrnam', 'UsrNam'),
    computador: pick(raw, 'computador', 'com_nam', 'comnam', 'ComNam'),
    aplicativo: pick(raw, 'aplicativo', 'app_nam', 'appnam', 'AppNam'),
    cod_modulo: pick(raw, 'cod_modulo', 'codigo_modulo', 'mod_nam', 'modnam', 'ModNam'),
    modulo: pick(raw, 'modulo', 'modulo_acessado', 'descricao_modulo'),
    data_hora_conexao,
    minutos_conectado,
    instancia: pick(raw, 'instancia', 'id_inst', 'idinst', 'IDInst'),
    tipo_aplicacao: pick(raw, 'tipo_aplicacao', 'app_knd', 'appknd', 'AppKnd'),
    mensagem_admin: pick(raw, 'mensagem_admin', 'adm_msg', 'admmsg', 'AdmMsg'),
  };
};

const fmtDateTime = (v?: string) => {
  if (!v) return '-';
  // Formato vindo do backend: 'YYYY-MM-DD HH:MM[:SS]' — formatar sem new Date() para evitar fuso.
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(v);
  if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
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

  // status do backend
  const [connStatus, setConnStatus] = useState<BackendStatus>({ kind: 'idle' });
  const [apiUrl, setApiUrl] = useState<string>(getApiUrl());
  const [testing, setTesting] = useState(false);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);

  // filtros
  const [fUsuario, setFUsuario] = useState('');
  const [fComputador, setFComputador] = useState('');
  const [fModulo, setFModulo] = useState('');
  const [fAplicativo, setFAplicativo] = useState('SAPIENS');
  const [rawSamplePreview, setRawSamplePreview] = useState<string | null>(null);
  const [quickSearch, setQuickSearch] = useState('');

  type SortKey = 'numsec' | 'usuario_senior' | 'modulo';
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };
  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="ml-1 inline h-3 w-3" />
      : <ArrowDown className="ml-1 inline h-3 w-3" />;
  };

  // modal individual
  const [target, setTarget] = useState<SessaoSenior | null>(null);
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // expansão da árvore por usuário
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (u: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(u)) next.delete(u); else next.add(u);
      return next;
    });
  // modal de lote (regras)
  const [applyOpen, setApplyOpen] = useState(false);
  const [rulesConfigOpen, setRulesConfigOpen] = useState(false);
  const { rules, whitelistUpper, reload: reloadRules } = useSeniorDisconnectRules();

  const classifyError = (e: any): BackendStatus => {
    const msg = String(e?.message ?? 'Falha desconhecida');
    const code = e?.statusCode;
    const isNetwork = e?.isNetworkError || code === 0 || /Failed to fetch|NetworkError|ERR_NGROK|timeout/i.test(msg);
    if (code === 401) return { kind: 'unauthorized', message: msg, statusCode: 401, timestamp: new Date().toISOString() };
    if (code === 404) return { kind: 'not_found', message: msg, statusCode: 404, timestamp: new Date().toISOString() };
    if (typeof code === 'number' && code >= 500) {
      return { kind: 'server_error', message: msg, statusCode: code, timestamp: new Date().toISOString() };
    }
    if (isNetwork) return { kind: 'offline', message: msg, statusCode: code ?? 0, timestamp: new Date().toISOString() };
    return { kind: 'server_error', message: msg, statusCode: code, timestamp: new Date().toISOString() };
  };

  const loadingRef = useRef(false);
  const load = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setConnStatus((s) => (s.kind === 'idle' ? { kind: 'loading' } : s));
    const url = `${getApiUrl()}/api/senior/sessoes`;
    const startedAt = new Date().toISOString();
    try {
      const res = await api.get<any>('/api/senior/sessoes');
      // Leitura robusta do retorno: o backend devolve { total, dados: [...] }
      let rawList: any[] = [];
      if (Array.isArray(res)) {
        rawList = res;
      } else if (Array.isArray((res as any)?.dados)) {
        rawList = (res as any).dados;
      } else if (Array.isArray((res as any)?.sessoes)) {
        rawList = (res as any).sessoes;
      } else if (Array.isArray((res as any)?.data)) {
        rawList = (res as any).data;
      } else {
        rawList = [];
      }
      // Logs obrigatórios para diagnóstico
      // eslint-disable-next-line no-console
      console.log('[MonitorSenior] response completo:', res);
      // eslint-disable-next-line no-console
      console.log('[MonitorSenior] response.total:', (res as any)?.total);
      // eslint-disable-next-line no-console
      console.log('[MonitorSenior] response.dados:', (res as any)?.dados);
      // eslint-disable-next-line no-console
      console.log('[MonitorSenior] linhas interpretadas para a tabela:', rawList.length);
      const rows: SessaoSenior[] = rawList.map(normalizeSessao);
      setData(rows);
      setRawSamplePreview(
        rawList.length > 0 ? JSON.stringify(rawList[0], null, 2).slice(0, 1500) : JSON.stringify(res, null, 2).slice(0, 1500),
      );
      setConnStatus({ kind: 'online', statusCode: 200, timestamp: new Date().toISOString() });
      // eslint-disable-next-line no-console
      console.info('[MonitorSenior] GET sessoes OK', {
        url, status: 200, rows: rows.length, timestamp: startedAt,
        sampleKeys: rawList[0] ? Object.keys(rawList[0]) : [],
      });
    } catch (e: any) {
      const status = classifyError(e);
      setConnStatus(status);
      // eslint-disable-next-line no-console
      console.warn('[MonitorSenior] GET sessoes FAIL', {
        url,
        status: status.statusCode ?? 0,
        errorMessage: status.message,
        timestamp: startedAt,
      });
      // Toast só para erros que não viram destaque visível no card (todos viram card,
      // então mantemos um toast curto para reforçar)
      toast({
        title: status.kind === 'offline' ? 'Backend offline' : 'Erro ao carregar sessões',
        description: status.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      loadingRef.current = false;
      setCountdown(30);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // auto-refresh com contador — pausa quando offline para não martelar o backend caído
  useEffect(() => {
    if (!autoRefresh) return;
    if (connStatus.kind === 'offline' || connStatus.kind === 'unauthorized') return;
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
  }, [autoRefresh, connStatus.kind]);

  const testHealth = async (): Promise<boolean> => {
    setTesting(true);
    const base = getApiUrl();
    setApiUrl(base);
    const url = `${base}/health`;
    const startedAt = new Date().toISOString();
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      // eslint-disable-next-line no-console
      console.info('[MonitorSenior] GET /health', { url, status: res.status, timestamp: startedAt });
      if (res.ok) {
        setConnStatus({ kind: 'online', statusCode: res.status, timestamp: new Date().toISOString() });
        toast({ title: 'Backend online', description: 'Conexão verificada com sucesso.' });
        return true;
      }
      setConnStatus({
        kind: res.status >= 500 ? 'server_error' : res.status === 401 ? 'unauthorized' : res.status === 404 ? 'not_found' : 'offline',
        statusCode: res.status,
        message: `HTTP ${res.status}`,
        timestamp: new Date().toISOString(),
      });
      return false;
    } catch (e: any) {
      const msg = String(e?.message ?? 'Falha de rede');
      // eslint-disable-next-line no-console
      console.warn('[MonitorSenior] GET /health FAIL', { url, errorMessage: msg, timestamp: startedAt });
      setConnStatus({
        kind: 'offline',
        statusCode: 0,
        message: msg,
        timestamp: new Date().toISOString(),
      });
      return false;
    } finally {
      setTesting(false);
    }
  };

  const onUrlSavedAndTest = async (newUrl: string): Promise<boolean> => {
    setApiUrl(newUrl);
    const ok = await testHealth();
    if (ok) await load();
    return ok;
  };

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
      if (quickSearch) {
        const q = quickSearch.toLowerCase();
        const haystack = [
          s.numsec, s.usuario_senior, s.usuario_windows, s.computador, s.aplicativo,
          s.cod_modulo, s.modulo, s.instancia, s.tipo_aplicacao, s.mensagem_admin,
        ].map((v) => String(v ?? '').toLowerCase()).join(' ');
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [data, fUsuario, fComputador, fModulo, fAplicativo, quickSearch]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const sign = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortKey] ?? '';
      const bv = (b as any)[sortKey] ?? '';
      if (sortKey === 'numsec') return (Number(av) - Number(bv)) * sign;
      return String(av).localeCompare(String(bv), 'pt-BR') * sign;
    });
  }, [filtered, sortKey, sortDir]);

  // Agrupar por usuário (mantendo ordenação interna)
  const grouped = useMemo(() => {
    const map = new Map<string, {
      usuario: string;
      sessoes: SessaoSenior[];
      totalMinutos: number;
      computadores: Set<string>;
      modulos: Set<string>;
      aplicativos: Set<string>;
    }>();
    for (const s of sorted) {
      const u = s.usuario_senior || '(sem usuário)';
      let g = map.get(u);
      if (!g) {
        g = { usuario: u, sessoes: [], totalMinutos: 0, computadores: new Set(), modulos: new Set(), aplicativos: new Set() };
        map.set(u, g);
      }
      g.sessoes.push(s);
      g.totalMinutos += s.minutos_conectado ?? 0;
      if (s.computador) g.computadores.add(s.computador);
      if (s.modulo) g.modulos.add(s.modulo);
      else if (s.cod_modulo != null) g.modulos.add(String(s.cod_modulo));
      if (s.aplicativo) g.aplicativos.add(s.aplicativo);
    }
    return Array.from(map.values());
  }, [sorted]);

  const allExpanded = grouped.length > 0 && grouped.every((g) => expanded.has(g.usuario));
  const toggleAll = () => {
    if (allExpanded) setExpanded(new Set());
    else setExpanded(new Set(grouped.map((g) => g.usuario)));
  };
  const stats = useMemo(() => {
    const totalSessoes = filtered.length;
    const usuariosDistintos = new Set(filtered.map((s) => s.usuario_senior).filter(Boolean)).size;
    const computadoresDistintos = new Set(filtered.map((s) => s.computador).filter(Boolean)).size;
    const porModulo: Record<string, number> = {};
    filtered.forEach((s) => {
      const k = s.modulo || String(s.cod_modulo ?? '—');
      porModulo[k] = (porModulo[k] ?? 0) + 1;
    });
    const top = Object.entries(porModulo)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value: String(value) }));
    return { totalSessoes, usuariosDistintos, computadoresDistintos, modulosTop: top, totalModulos: Object.keys(porModulo).length };
  }, [filtered]);

  const exportCsv = () => {
    const headers = ['Sessão','Usuário Senior','Usuário Windows','Computador','Aplicativo',
      'Cód. Módulo','Módulo','Conexão','Min.','Instância','Tipo Aplic.','Mensagem Admin'];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = sorted.map((s) => [
      s.numsec, s.usuario_senior, s.usuario_windows, s.computador, s.aplicativo,
      s.cod_modulo, s.modulo, s.data_hora_conexao, s.minutos_conectado,
      s.instancia, s.tipo_aplicacao, s.mensagem_admin,
    ].map(esc).join(';'));
    const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `usuarios-conectados-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

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
      const resp = await api.post<{
        ok?: boolean;
        numsec?: number | string;
        usuario?: string;
        computador?: string;
        registros_removidos?: { R911MOD?: number; R911SRV?: number; R911SEC?: number; total?: number };
        mensagem?: string;
      }>(`/api/senior/sessoes/${target.numsec}/desconectar`, {
        confirmar: true,
        motivo: parsed.data,
      });

      const total = resp?.registros_removidos?.total ?? 0;
      const usuario = resp?.usuario ?? target.usuario_senior ?? '?';
      const computador = resp?.computador ?? target.computador ?? '?';

      toast({
        title: 'Sessão desconectada',
        description: `${usuario} @ ${computador} — ${total} registro(s) removido(s).`,
      });
      // Aviso obrigatório sobre Terminal Server
      toast({
        title: 'Atenção',
        description: resp?.mensagem
          ?? 'Sessão removida do controle do ERP. Se o SAPIENS continuar aberto no Terminal Server, pode ser necessário encerrar a sessão Windows.',
        duration: 8000,
      });

      setTarget(null);
      setMotivo('');
      await load();
    } catch (e: any) {
      toast({
        title: 'Erro ao desconectar',
        description: e?.message ?? 'Falha desconhecida',
        variant: 'destructive',
      });
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
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={sorted.length === 0} className="gap-2">
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </Button>
            <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-2">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            {canDisconnect && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRulesConfigOpen(true)}
                  className="gap-2"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Configurar regras
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setApplyOpen(true)}
                  disabled={loading || data.length === 0}
                  className="gap-2"
                >
                  <PowerOff className="h-3.5 w-3.5" />
                  Aplicar regras agora
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Status do backend — escondido para usuários comuns quando estiver tudo OK.
          Admin/RENATO continuam enxergando para diagnosticar. Erros aparecem para todos. */}
      {(connStatus.kind !== 'online' || canDisconnect) && (
        <BackendStatusCard
          status={connStatus.kind === 'idle' && loading ? { kind: 'loading' } : connStatus}
          apiUrl={apiUrl}
          onTest={testHealth}
          onChangeUrl={() => setUrlDialogOpen(true)}
          onRetry={load}
          testing={testing}
          retrying={loading}
        />
      )}

      <UpdateApiUrlDialog
        open={urlDialogOpen}
        onOpenChange={setUrlDialogOpen}
        currentUrl={apiUrl}
        onSavedAndTest={onUrlSavedAndTest}
      />

      <ApplyRulesDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        sessoes={data}
        rules={rules}
        whitelistUpper={whitelistUpper}
        selfErpUser={erpUser ?? undefined}
        onCompleted={load}
      />

      <Dialog
        open={rulesConfigOpen}
        onOpenChange={(o) => {
          setRulesConfigOpen(o);
          if (!o) reloadRules();
        }}
      >
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Regras de Desconexão Senior
            </DialogTitle>
            <DialogDescription>
              Configure as regras e a whitelist usadas pelo botão "Aplicar regras agora".
            </DialogDescription>
          </DialogHeader>
          <SeniorRulesSection />
        </DialogContent>
      </Dialog>

      {/* Preview do JSON cru — útil quando vem 200 OK mas a tabela parece vazia */}
      {connStatus.kind === 'online' && rawSamplePreview && (data.length === 0 || (import.meta as any).env?.DEV) && (
        <details className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            Resposta bruta da API (primeiro registro) — útil para diagnosticar campos
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-muted-foreground">
            {rawSamplePreview}
          </pre>
        </details>
      )}

      <Tabs defaultValue="senior" className="space-y-3">
        <TabsList>
          <TabsTrigger value="senior">Sessões Senior</TabsTrigger>
          <TabsTrigger value="navegacao">Navegação ERP Web</TabsTrigger>
        </TabsList>

        <TabsContent value="senior" className="space-y-4">
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
          title="Computadores Distintos"
          value={stats.computadoresDistintos}
          icon={<Monitor className="h-5 w-5" />}
          variant="default"
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
          {/* Toolbar busca rápida */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
            <div className="text-xs text-muted-foreground">
              {grouped.length} {grouped.length === 1 ? 'usuário' : 'usuários'} · {sorted.length} {sorted.length === 1 ? 'sessão' : 'sessões'}
              {data.length !== sorted.length && ` (de ${data.length})`}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={toggleAll} disabled={grouped.length === 0} className="h-8 text-xs">
                {allExpanded ? 'Recolher todos' : 'Expandir todos'}
              </Button>
              <div className="relative w-full max-w-xs">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder="Buscar em todas as colunas..."
                  className="h-8 pl-7 text-xs"
                />
              </div>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="whitespace-nowrap cursor-pointer select-none" onClick={() => toggleSort('usuario_senior')}>
                    Usuário Senior<SortIcon k="usuario_senior" />
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right">Sessões</TableHead>
                  <TableHead className="whitespace-nowrap">Computadores</TableHead>
                  <TableHead className="whitespace-nowrap">Módulos</TableHead>
                  <TableHead className="whitespace-nowrap">Aplicativos</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Min. (total)</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : grouped.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      {connStatus.kind === 'offline' || connStatus.kind === 'server_error' ? (
                        <div className="flex flex-col items-center gap-2">
                          <Link2Off className="h-5 w-5 text-destructive" />
                          <p>Nenhuma sessão carregada porque o backend ERP está offline.</p>
                          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1">
                            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar
                          </Button>
                        </div>
                      ) : connStatus.kind === 'unauthorized' ? (
                        <p>Token expirado ou inválido. Faça login novamente.</p>
                      ) : connStatus.kind === 'not_found' ? (
                        <p>Backend online, mas a rota /api/senior/sessoes ainda não foi publicada.</p>
                      ) : (
                        <p>Nenhuma sessão conectada encontrada.</p>
                      )}
                    </TableCell>
                  </TableRow>
                ) : grouped.map((g) => {
                  const isOpen = expanded.has(g.usuario);
                  const compsArr = Array.from(g.computadores);
                  const modsArr = Array.from(g.modulos);
                  const appsArr = Array.from(g.aplicativos);
                  const tot = g.totalMinutos;
                  return (
                    <Fragment key={`g-${g.usuario}`}>
                      <TableRow
                        key={`grp-${g.usuario}`}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpand(g.usuario)}
                      >
                        <TableCell className="w-8">
                          {isOpen
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-semibold">{g.usuario}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="text-xs">{g.sessoes.length}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs" title={compsArr.join(', ')}>
                          {compsArr.length === 0 ? '-' : compsArr.length === 1 ? compsArr[0] : `${compsArr[0]} +${compsArr.length - 1}`}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs" title={modsArr.join(', ')}>
                          {modsArr.length === 0 ? '-' : modsArr.length === 1 ? modsArr[0] : `${modsArr[0]} +${modsArr.length - 1}`}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {appsArr.join(', ') || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {tot > 240 ? <Badge variant="destructive">{tot}</Badge>
                            : tot > 120 ? <Badge variant="secondary">{tot}</Badge>
                            : <span>{tot}</span>}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {isOpen ? 'Ver detalhes ↓' : 'Expandir →'}
                        </TableCell>
                      </TableRow>

                      {isOpen && (
                        <TableRow key={`det-${g.usuario}`} className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={8} className="p-0">
                            <div className="border-l-2 border-primary/40 ml-4 my-1">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-transparent">
                                    <TableHead className="h-8 text-[11px]">Sessão</TableHead>
                                    <TableHead className="h-8 text-[11px]">Win</TableHead>
                                    <TableHead className="h-8 text-[11px]">Computador</TableHead>
                                    <TableHead className="h-8 text-[11px]">Aplic.</TableHead>
                                    <TableHead className="h-8 text-[11px]">Cód.</TableHead>
                                    <TableHead className="h-8 text-[11px]">Módulo</TableHead>
                                    <TableHead className="h-8 text-[11px]">Conexão</TableHead>
                                    <TableHead className="h-8 text-[11px] text-right">Min.</TableHead>
                                    <TableHead className="h-8 text-[11px]">Instância</TableHead>
                                    <TableHead className="h-8 text-[11px]">Tipo</TableHead>
                                    <TableHead className="h-8 text-[11px]">Mensagem</TableHead>
                                    <TableHead className="h-8 text-[11px] text-right">Ações</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {g.sessoes.map((s, i) => {
                                    const min = s.minutos_conectado ?? 0;
                                    const longa = min > 240;
                                    const rowKey = s.numsec != null && s.numsec !== ''
                                      ? `${g.usuario}-${s.numsec}`
                                      : `${g.usuario}-${s.computador ?? '?'}-${i}`;
                                    return (
                                      <TableRow key={rowKey}>
                                        <TableCell className="font-mono text-xs">{s.numsec}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{s.usuario_windows ?? '-'}</TableCell>
                                        <TableCell className="text-xs">{s.computador ?? '-'}</TableCell>
                                        <TableCell className="text-xs">{s.aplicativo ?? '-'}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{s.cod_modulo ?? '-'}</TableCell>
                                        <TableCell className="text-xs">{s.modulo ?? '-'}</TableCell>
                                        <TableCell className="text-xs">{fmtDateTime(s.data_hora_conexao)}</TableCell>
                                        <TableCell className="text-right text-xs">
                                          {longa ? <Badge variant="destructive">{min}</Badge>
                                            : min > 120 ? <Badge variant="secondary">{min}</Badge>
                                            : <span>{min}</span>}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{s.instancia ?? '-'}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{s.tipo_aplicacao ?? '-'}</TableCell>
                                        <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground" title={s.mensagem_admin ?? ''}>
                                          {s.mensagem_admin ?? '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          {canDisconnect ? (
                                            <Button size="sm" variant="destructive" className="h-7 gap-1" onClick={(e) => { e.stopPropagation(); openConfirm(s); }}>
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
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="navegacao">
          <MonitorNavegacaoSection />
        </TabsContent>
      </Tabs>

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
