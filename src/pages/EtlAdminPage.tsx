import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Play, RefreshCw, Plus, Trash2, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";

type Tarefa = {
  id: string; codigo: string; nome: string; descricao: string | null;
  cron: string | null; enabled: boolean; params: any;
  conexao_id: string | null; updated_at: string;
};
type Conexao = {
  id: string; codigo: string; tipo: string; host: string | null;
  porta: number | null; database: string | null; usuario: string | null;
  secret_key: string | null; enabled: boolean; observacoes: string | null;
};
type Execucao = {
  id: string; tarefa_codigo: string; iniciado_em: string; terminado_em: string | null;
  status: string; linhas_lidas: number | null; linhas_inseridas: number | null;
  linhas_atualizadas: number | null; linhas_rejeitadas: number | null; erro_resumo: string | null;
  acionado_por: string;
};
type LogRow = {
  id: string; execucao_id: string; nivel: string; mensagem: string; created_at: string; contexto: any;
};
type FilaRow = {
  id: string; tarefa_codigo: string; status: string; prioridade: number;
  params: any; created_at: string; picked_at: string | null; finished_at: string | null;
};
type ValidacaoResp = {
  filtros?: Record<string, any>;
  erp: Record<string, number>;
  bi: Record<string, number>;
  diferencas?: Record<string, number>;
};

const statusColor: Record<string, string> = {
  RUNNING: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  SUCCESS: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  ERROR: "bg-destructive/20 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
  PENDENTE: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
  EM_EXECUCAO: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  CONCLUIDA: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
};

function StatusBadge({ status }: { status: string }) {
  return <Badge className={statusColor[status] ?? "bg-muted text-muted-foreground"} variant="secondary">{status}</Badge>;
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-BR");
}

// ---------- Tarefas ----------
function TarefasTab() {
  const [rows, setRows] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Tarefa | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("etl_tarefas").select("*").order("codigo");
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else setRows((data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    const payload: any = {
      codigo: editing.codigo, nome: editing.nome, descricao: editing.descricao,
      cron: editing.cron, enabled: editing.enabled, params: editing.params ?? {},
      conexao_id: editing.conexao_id,
    };
    const op = editing.id
      ? supabase.from("etl_tarefas").update(payload).eq("id", editing.id)
      : supabase.from("etl_tarefas").insert(payload);
    const { error } = await op;
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setOpen(false); setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir tarefa?")) return;
    const { error } = await supabase.from("etl_tarefas").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else load();
  };

  const executar = async (codigo: string) => {
    try {
      await api.post("/api/etl/executar", { tarefa: codigo, acionado_por: "MANUAL" });
      toast({ title: "Execução enfileirada", description: codigo });
    } catch (e: any) {
      toast({ title: "Falha ao acionar", description: e?.message ?? "Erro", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Tarefas</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className="h-4 w-4 mr-1" />Atualizar</Button>
          <Button size="sm" onClick={() => { setEditing({ id: "", codigo: "", nome: "", descricao: "", cron: "*/15 * * * *", enabled: true, params: {}, conexao_id: null, updated_at: "" }); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />Nova
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Cron</TableHead>
            <TableHead>Ativa</TableHead><TableHead className="text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono">{r.codigo}</TableCell>
                <TableCell>{r.nome}</TableCell>
                <TableCell className="font-mono text-xs">{r.cron ?? "—"}</TableCell>
                <TableCell>{r.enabled ? <Badge>Sim</Badge> : <Badge variant="outline">Não</Badge>}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="outline" onClick={() => executar(r.codigo)}><Play className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && !loading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma tarefa</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar tarefa" : "Nova tarefa"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Código</Label><Input value={editing.codigo} onChange={e => setEditing({ ...editing, codigo: e.target.value.toUpperCase() })} /></div>
              <div><Label>Nome</Label><Input value={editing.nome} onChange={e => setEditing({ ...editing, nome: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={editing.descricao ?? ""} onChange={e => setEditing({ ...editing, descricao: e.target.value })} /></div>
              <div><Label>Cron</Label><Input value={editing.cron ?? ""} onChange={e => setEditing({ ...editing, cron: e.target.value })} placeholder="*/15 * * * *" /></div>
              <div><Label>Params (JSON)</Label>
                <Textarea value={JSON.stringify(editing.params ?? {}, null, 2)}
                  onChange={e => { try { setEditing({ ...editing, params: JSON.parse(e.target.value) }); } catch { /* ignore */ } }} />
              </div>
              <div className="flex items-center gap-2"><Switch checked={editing.enabled} onCheckedChange={v => setEditing({ ...editing, enabled: v })} /><Label>Ativa</Label></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------- Conexões ----------
function ConexoesTab() {
  const [rows, setRows] = useState<Conexao[]>([]);
  const [editing, setEditing] = useState<Conexao | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("etl_conexoes").select("*").order("codigo");
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    const payload: any = { ...editing }; delete (payload as any).id;
    const op = editing.id
      ? supabase.from("etl_conexoes").update(payload).eq("id", editing.id)
      : supabase.from("etl_conexoes").insert(payload);
    const { error } = await op;
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setOpen(false); setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir conexão?")) return;
    const { error } = await supabase.from("etl_conexoes").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else load();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Conexões</CardTitle>
        <Button size="sm" onClick={() => { setEditing({ id: "", codigo: "", tipo: "SENIOR", host: "", porta: null, database: "", usuario: "", secret_key: "", enabled: true, observacoes: "" }); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />Nova
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">A senha NUNCA é armazenada aqui. Informe apenas o nome do segredo (ex.: <code>SENIOR_DB_PASSWORD</code>) que está configurado no backend.</p>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Código</TableHead><TableHead>Tipo</TableHead><TableHead>Host</TableHead>
            <TableHead>Database</TableHead><TableHead>Secret</TableHead><TableHead>Ativa</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono">{r.codigo}</TableCell>
                <TableCell>{r.tipo}</TableCell>
                <TableCell>{r.host}</TableCell>
                <TableCell>{r.database}</TableCell>
                <TableCell className="font-mono text-xs">{r.secret_key ?? "—"}</TableCell>
                <TableCell>{r.enabled ? "Sim" : "Não"}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nova"} conexão</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código</Label><Input value={editing.codigo} onChange={e => setEditing({ ...editing, codigo: e.target.value })} /></div>
              <div><Label>Tipo</Label><Input value={editing.tipo} onChange={e => setEditing({ ...editing, tipo: e.target.value })} placeholder="SENIOR | SQLSERVER | ORACLE | HTTP" /></div>
              <div><Label>Host</Label><Input value={editing.host ?? ""} onChange={e => setEditing({ ...editing, host: e.target.value })} /></div>
              <div><Label>Porta</Label><Input type="number" value={editing.porta ?? ""} onChange={e => setEditing({ ...editing, porta: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Database</Label><Input value={editing.database ?? ""} onChange={e => setEditing({ ...editing, database: e.target.value })} /></div>
              <div><Label>Usuário</Label><Input value={editing.usuario ?? ""} onChange={e => setEditing({ ...editing, usuario: e.target.value })} /></div>
              <div className="col-span-2"><Label>Nome do segredo (backend)</Label><Input value={editing.secret_key ?? ""} onChange={e => setEditing({ ...editing, secret_key: e.target.value })} placeholder="SENIOR_DB_PASSWORD" /></div>
              <div className="col-span-2"><Label>Observações</Label><Textarea value={editing.observacoes ?? ""} onChange={e => setEditing({ ...editing, observacoes: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.enabled} onCheckedChange={v => setEditing({ ...editing, enabled: v })} /><Label>Ativa</Label></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------- Ações ----------
function AcoesTab() {
  const [tarefa, setTarefa] = useState("ATU_COMPRAS");
  const [dataIni, setDataIni] = useState("");
  const [dataFim, setDataFim] = useState("");

  const reprocessar = async () => {
    try {
      await api.post("/api/etl/reprocessar", { tarefa, data_ini: dataIni || null, data_fim: dataFim || null });
      toast({ title: "Reprocessamento enfileirado", description: `${tarefa} • ${dataIni || "início"} → ${dataFim || "hoje"}` });
    } catch (e: any) {
      toast({ title: "Falha", description: e?.message ?? "Erro", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Ações</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Reprocessar período manualmente. O job entra na <strong>Fila do Integrador</strong> e é executado pelo backend, ignorando o watermark.</p>
        <div className="grid grid-cols-3 gap-3 max-w-3xl">
          <div><Label>Tarefa</Label><Input value={tarefa} onChange={e => setTarefa(e.target.value.toUpperCase())} /></div>
          <div><Label>Data início</Label><Input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} /></div>
          <div><Label>Data fim</Label><Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
        </div>
        <Button onClick={reprocessar}><Play className="h-4 w-4 mr-1" />Reprocessar período</Button>
      </CardContent>
    </Card>
  );
}

// ---------- Fila ----------
function FilaTab() {
  const [rows, setRows] = useState<FilaRow[]>([]);
  const load = async () => {
    const { data } = await supabase.from("etl_fila_integrador").select("*").order("created_at", { ascending: false }).limit(200);
    setRows((data as any) ?? []);
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Fila do Integrador</CardTitle>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Atualizar</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Tarefa</TableHead><TableHead>Status</TableHead><TableHead>Prioridade</TableHead>
            <TableHead>Criado</TableHead><TableHead>Iniciado</TableHead><TableHead>Concluído</TableHead><TableHead>Params</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono">{r.tarefa_codigo}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell>{r.prioridade}</TableCell>
                <TableCell>{fmtDate(r.created_at)}</TableCell>
                <TableCell>{fmtDate(r.picked_at)}</TableCell>
                <TableCell>{fmtDate(r.finished_at)}</TableCell>
                <TableCell className="font-mono text-xs">{JSON.stringify(r.params)}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Fila vazia</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------- Execuções ----------
function ExecucoesTab({ onOpenLogs }: { onOpenLogs: (id: string) => void }) {
  const [rows, setRows] = useState<Execucao[]>([]);
  const [filterTarefa, setFilterTarefa] = useState("");
  const load = async () => {
    let q = supabase.from("etl_execucoes").select("*").order("iniciado_em", { ascending: false }).limit(200);
    if (filterTarefa) q = q.ilike("tarefa_codigo", `%${filterTarefa}%`);
    const { data } = await q;
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, [filterTarefa]);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>Execuções</CardTitle>
        <div className="flex gap-2">
          <Input placeholder="Filtrar por tarefa..." value={filterTarefa} onChange={e => setFilterTarefa(e.target.value)} className="w-56" />
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Atualizar</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Tarefa</TableHead><TableHead>Status</TableHead><TableHead>Início</TableHead>
            <TableHead>Fim</TableHead><TableHead>Lidas</TableHead><TableHead>Inseridas</TableHead>
            <TableHead>Atualizadas</TableHead><TableHead>Erro</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono">{r.tarefa_codigo}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
                <TableCell>{fmtDate(r.iniciado_em)}</TableCell>
                <TableCell>{fmtDate(r.terminado_em)}</TableCell>
                <TableCell>{r.linhas_lidas ?? 0}</TableCell>
                <TableCell>{r.linhas_inseridas ?? 0}</TableCell>
                <TableCell>{r.linhas_atualizadas ?? 0}</TableCell>
                <TableCell className="text-xs max-w-xs truncate">{r.erro_resumo ?? "—"}</TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => onOpenLogs(r.id)}>Logs</Button></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Nenhuma execução</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------- Logs ----------
function LogsTab({ execId, setExecId }: { execId: string; setExecId: (s: string) => void }) {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [nivel, setNivel] = useState("");
  const load = async () => {
    let q = supabase.from("etl_logs").select("*").order("created_at", { ascending: false }).limit(500);
    if (execId) q = q.eq("execucao_id", execId);
    if (nivel) q = q.eq("nivel", nivel);
    const { data } = await q;
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, [execId, nivel]);
  const nivelColor = (n: string) => n === "ERROR" ? "text-destructive" : n === "WARN" ? "text-amber-600" : "text-muted-foreground";
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>Logs</CardTitle>
        <div className="flex gap-2">
          <Input placeholder="Execução ID" value={execId} onChange={e => setExecId(e.target.value)} className="w-72 font-mono text-xs" />
          <Input placeholder="Nível (INFO/WARN/ERROR)" value={nivel} onChange={e => setNivel(e.target.value.toUpperCase())} className="w-48" />
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Atualizar</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="font-mono text-xs space-y-1 max-h-[60vh] overflow-auto">
          {rows.map(r => (
            <div key={r.id} className="flex gap-2 border-b border-border pb-1">
              <span className="text-muted-foreground shrink-0">{new Date(r.created_at).toLocaleTimeString("pt-BR")}</span>
              <span className={`shrink-0 ${nivelColor(r.nivel)}`}>{r.nivel}</span>
              <span className="break-all">{r.mensagem}</span>
            </div>
          ))}
          {rows.length === 0 && <div className="text-center text-muted-foreground py-8">Sem logs</div>}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Validação ----------
function ValidacaoTab() {
  const [biCompras, setBiCompras] = useState<{ mes: string; qtd: number; total: number }[]>([]);
  const [biReceb, setBiReceb] = useState<{ mes: string; qtd: number; total: number }[]>([]);
  const [ultimasExec, setUltimasExec] = useState<Record<string, Execucao>>({});
  const [loading, setLoading] = useState(false);
  const [dataIni, setDataIni] = useState("2026-01-01");
  const [dataFim, setDataFim] = useState("2026-01-31");
  const [tipoDespesa, setTipoDespesa] = useState<string>("");
  const [projetoMacro, setProjetoMacro] = useState<string>("");
  const [somentePendentes, setSomentePendentes] = useState(false);
  const [comparando, setComparando] = useState(false);
  const [resultado, setResultado] = useState<{
    compras?: ValidacaoResp;
    receb?: ValidacaoResp;
    erros?: { compras?: string; receb?: string };
  }>({});

  const loadResumo = async () => {
    setLoading(true);
    const [{ data: comp }, { data: rec }, { data: exec }] = await Promise.all([
      supabase.from("bi_compras").select("mes_competencia, valor_liquido").not("mes_competencia", "is", null),
      supabase.from("bi_recebimentos").select("mes_competencia, valor_liquido").not("mes_competencia", "is", null),
      supabase.from("etl_execucoes").select("*").order("iniciado_em", { ascending: false }).limit(50),
    ]);
    const agrupar = (rows: any[] | null) => {
      const map = new Map<string, { qtd: number; total: number }>();
      (rows ?? []).forEach((r: any) => {
        const m = (r.mes_competencia ?? "").substring(0, 7);
        if (!m) return;
        const cur = map.get(m) ?? { qtd: 0, total: 0 };
        cur.qtd += 1;
        cur.total += Number(r.valor_liquido ?? 0);
        map.set(m, cur);
      });
      return Array.from(map.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 6)
        .map(([mes, v]) => ({ mes, ...v }));
    };
    setBiCompras(agrupar(comp));
    setBiReceb(agrupar(rec));
    const lastByCode: Record<string, Execucao> = {};
    ((exec as any[]) ?? []).forEach((e: Execucao) => {
      if (!lastByCode[e.tarefa_codigo]) lastByCode[e.tarefa_codigo] = e;
    });
    setUltimasExec(lastByCode);
    setLoading(false);
  };
  useEffect(() => { loadResumo(); }, []);

  const filtros = () => {
    const f: Record<string, any> = { data_inicio: dataIni, data_fim: dataFim };
    if (tipoDespesa) f.tipo_despesa = tipoDespesa;
    if (projetoMacro) f.projeto_macro = projetoMacro;
    if (somentePendentes) f.somente_pendentes = true;
    return f;
  };

  const compararComErp = async () => {
    setComparando(true);
    const params = filtros();
    const [c, r] = await Promise.all([
      api.get<ValidacaoResp>("/api/bi/validar-painel-compras", params).then(d => ({ ok: true, d } as const)).catch((e: any) => ({ ok: false, msg: e?.message ?? "Erro" } as const)),
      api.get<ValidacaoResp>("/api/bi/validar-notas-recebimento", params).then(d => ({ ok: true, d } as const)).catch((e: any) => ({ ok: false, msg: e?.message ?? "Erro" } as const)),
    ]);
    setResultado({
      compras: c.ok ? c.d : undefined,
      receb: r.ok ? r.d : undefined,
      erros: { compras: c.ok ? undefined : c.msg, receb: r.ok ? undefined : r.msg },
    });
    setComparando(false);
    if (c.ok || r.ok) toast({ title: "Comparação concluída" });
  };

  const aplicarCasoObrigatorio = () => {
    setDataIni("2026-01-01");
    setDataFim("2026-01-31");
    setTipoDespesa("MATERIA_PRIMA");
    setProjetoMacro("");
    setSomentePendentes(true);
  };

  const fmtMoney = (n: number) =>
    Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtNum = (n: number) => Number(n ?? 0).toLocaleString("pt-BR");

  const diffPct = (bi: number, erp: number) => {
    if (!erp) return bi === 0 ? 0 : 100;
    return ((bi - erp) / erp) * 100;
  };
  const diffClass = (pct: number) => {
    const a = Math.abs(pct);
    if (a < 0.5) return "text-emerald-600";
    if (a < 2) return "text-amber-600";
    return "text-destructive";
  };

  const renderDiffBlock = (label: string, resp: ValidacaoResp | undefined, erro: string | undefined) => {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {erro && (
            <div className="text-xs text-destructive border border-destructive/30 rounded p-2">
              Endpoint indisponível: {erro}
            </div>
          )}
          {resp && (() => {
            const keys = Object.keys(resp.erp ?? {});
            const isMoney = (k: string) => k.startsWith("valor");
            return (
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="font-medium">Métrica</div>
                <div className="font-medium">ERP</div>
                <div className="font-medium">BI</div>
                <div className="font-medium">Diff %</div>
                {keys.map(k => {
                  const erp = Number((resp.erp as any)?.[k] ?? 0);
                  const bi = Number((resp.bi as any)?.[k] ?? 0);
                  const pct = diffPct(bi, erp);
                  return (
                    <Fragment key={k}>
                      <div className="font-mono">{k}</div>
                      <div className="font-mono">{isMoney(k) ? fmtMoney(erp) : fmtNum(erp)}</div>
                      <div className="font-mono">{isMoney(k) ? fmtMoney(bi) : fmtNum(bi)}</div>
                      <div className={`font-mono font-semibold ${diffClass(pct)}`}>{pct.toFixed(2)}%</div>
                    </Fragment>
                  );
                })}
              </div>
            );
          })()}
          {!resp && !erro && <div className="text-xs text-muted-foreground">Sem dados. Clique em Comparar.</div>}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Status da camada analítica</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esta aba é usada para validar a carga ETL <strong>antes</strong> de ligar
            a flag <code className="font-mono">USE_BI_ANALYTICS</code> no backend.
            Os dashboards atuais continuam lendo direto do ERP.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {(["ATU_COMPRAS", "ATU_RECEBIMENTOS"] as const).map(code => {
              const e = ultimasExec[code];
              return (
                <div key={code} className="border border-border rounded-md p-3">
                  <div className="font-mono text-sm">{code}</div>
                  {e ? (
                    <div className="text-xs text-muted-foreground space-y-1 mt-1">
                      <div>Última: {fmtDate(e.iniciado_em)} <StatusBadge status={e.status} /></div>
                      <div>Lidas {e.linhas_lidas ?? 0} • Ins {e.linhas_inseridas ?? 0} • Atu {e.linhas_atualizadas ?? 0}</div>
                      {e.erro_resumo && <div className="text-destructive">{e.erro_resumo}</div>}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-1">Nenhuma execução registrada</div>
                  )}
                </div>
              );
            })}
          </div>
          <Button variant="outline" size="sm" onClick={loadResumo} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1" />Atualizar
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">bi_compras — últimos meses</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Mês</TableHead><TableHead>Qtd</TableHead><TableHead>Valor líquido</TableHead></TableRow></TableHeader>
              <TableBody>
                {biCompras.map(r => (
                  <TableRow key={r.mes}><TableCell className="font-mono">{r.mes}</TableCell><TableCell>{r.qtd}</TableCell><TableCell className="font-mono">{fmtMoney(r.total)}</TableCell></TableRow>
                ))}
                {biCompras.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Base ainda não populada</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">bi_recebimentos — últimos meses</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Mês</TableHead><TableHead>Qtd</TableHead><TableHead>Valor líquido</TableHead></TableRow></TableHeader>
              <TableBody>
                {biReceb.map(r => (
                  <TableRow key={r.mes}><TableCell className="font-mono">{r.mes}</TableCell><TableCell>{r.qtd}</TableCell><TableCell className="font-mono">{fmtMoney(r.total)}</TableCell></TableRow>
                ))}
                {biReceb.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Base ainda não populada</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Comparar BI × ERP</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3 max-w-2xl">
            <div><Label>Data início</Label><Input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} /></div>
            <div><Label>Data fim</Label><Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
            <div className="flex items-end"><Button onClick={compararComErp} disabled={comparando}><Play className="h-4 w-4 mr-1" />Comparar</Button></div>
          </div>
          <p className="text-xs text-muted-foreground">
            Tolerância recomendada: <span className="text-emerald-600 font-medium">verde &lt; 0,5%</span> •
            <span className="text-amber-600 font-medium"> amarelo &lt; 2%</span> •
            <span className="text-destructive font-medium"> vermelho ≥ 2%</span>.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {renderDiffBlock("Compras (painel-compras-dashboard)", diff.compras)}
            {renderDiffBlock("Recebimentos (notas-recebimento-dashboard)", diff.receb)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EtlAdminPage() {
  const [tab, setTab] = useState("tarefas");
  const [execId, setExecId] = useState("");

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">ETL — Integrador BI</h1>
        <p className="text-sm text-muted-foreground">Carga incremental do ERP para a base analítica do Lovable Cloud.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
          <TabsTrigger value="conexoes">Conexões</TabsTrigger>
          <TabsTrigger value="acoes">Ações</TabsTrigger>
          <TabsTrigger value="validacao">Validação</TabsTrigger>
          <TabsTrigger value="fila">Fila Integrador</TabsTrigger>
          <TabsTrigger value="execucoes">Execuções</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="tarefas"><TarefasTab /></TabsContent>
        <TabsContent value="conexoes"><ConexoesTab /></TabsContent>
        <TabsContent value="acoes"><AcoesTab /></TabsContent>
        <TabsContent value="validacao"><ValidacaoTab /></TabsContent>
        <TabsContent value="fila"><FilaTab /></TabsContent>
        <TabsContent value="execucoes"><ExecucoesTab onOpenLogs={(id) => { setExecId(id); setTab("logs"); }} /></TabsContent>
        <TabsContent value="logs"><LogsTab execId={execId} setExecId={setExecId} /></TabsContent>
      </Tabs>
    </div>
  );
}
