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
type Modulo = "compras" | "recebimentos";

const TIPOS_DESPESA = [
  { v: "MATERIA_PRIMA", l: "Matéria-prima" },
  { v: "USO_CONSUMO", l: "Uso e consumo" },
  { v: "DESPESAS_GERAIS", l: "Despesas gerais" },
  { v: "SERVICOS", l: "Serviços" },
];

const TRANSACOES_NF = [
  { v: "RECEBIMENTO", l: "Recebimento" },
  { v: "DEVOLUCAO", l: "Devolução" },
  { v: "ESTORNO", l: "Estorno" },
  { v: "CANCELAMENTO", l: "Cancelamento" },
];

function ValidacaoTab() {
  const [modulo, setModulo] = useState<Modulo>("compras");
  const [biCompras, setBiCompras] = useState<{ mes: string; qtd: number; total: number }[]>([]);
  const [biReceb, setBiReceb] = useState<{ mes: string; qtd: number; total: number }[]>([]);
  const [ultimasExec, setUltimasExec] = useState<Record<string, Execucao>>({});
  const [ultimaCarga, setUltimaCarga] = useState<{ compras: string | null; receb: string | null }>({ compras: null, receb: null });
  const [counts, setCounts] = useState<{ compras: number; receb: number }>({ compras: 0, receb: 0 });
  const [loading, setLoading] = useState(false);

  const [dataIni, setDataIni] = useState("2026-01-01");
  const [dataFim, setDataFim] = useState("2026-01-31");
  const [tipoDespesa, setTipoDespesa] = useState("");
  const [projetoMacro, setProjetoMacro] = useState("");
  const [projeto, setProjeto] = useState("");
  const [centroCusto, setCentroCusto] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [somentePendentes, setSomentePendentes] = useState(false);
  const [transacaoNf, setTransacaoNf] = useState("");

  const [opcoes, setOpcoes] = useState<{
    projetosMacro: string[]; projetos: { numero: string; nome: string | null }[];
    centros: { codigo: string; descricao: string | null }[];
    fornecedores: { codigo: string; nome: string | null }[];
  }>({ projetosMacro: [], projetos: [], centros: [], fornecedores: [] });

  const [comparando, setComparando] = useState(false);
  const [resultado, setResultado] = useState<{ resp?: ValidacaoResp; erro?: string }>({});

  const loadResumo = async () => {
    setLoading(true);
    const [{ data: comp }, { data: rec }, { data: exec }, projs, centros, forns] = await Promise.all([
      supabase.from("bi_compras").select("mes_competencia, valor_liquido, etl_updated_at, projeto_macro"),
      supabase.from("bi_recebimentos").select("mes_competencia, valor_liquido, etl_updated_at"),
      supabase.from("etl_execucoes").select("*").order("iniciado_em", { ascending: false }).limit(50),
      supabase.from("bi_projetos").select("numero_projeto, nome_projeto, projeto_macro").order("numero_projeto").limit(500),
      supabase.from("bi_centros_custo").select("codigo, descricao").order("codigo").limit(500),
      supabase.from("bi_fornecedores").select("codigo, nome").eq("ativo", true).order("nome").limit(500),
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
      return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6).map(([mes, v]) => ({ mes, ...v }));
    };
    const maxEtl = (rows: any[] | null) =>
      (rows ?? []).reduce((max: string | null, r: any) => {
        const v = r.etl_updated_at as string | null;
        if (!v) return max;
        return !max || v > max ? v : max;
      }, null as string | null);

    setBiCompras(agrupar(comp));
    setBiReceb(agrupar(rec));
    setCounts({ compras: comp?.length ?? 0, receb: rec?.length ?? 0 });
    setUltimaCarga({ compras: maxEtl(comp), receb: maxEtl(rec) });

    const lastByCode: Record<string, Execucao> = {};
    ((exec as any[]) ?? []).forEach((e: Execucao) => {
      if (!lastByCode[e.tarefa_codigo]) lastByCode[e.tarefa_codigo] = e;
    });
    setUltimasExec(lastByCode);

    const macros = Array.from(new Set(((comp as any[]) ?? []).map(r => r.projeto_macro).filter(Boolean))) as string[];
    setOpcoes({
      projetosMacro: macros.sort(),
      projetos: ((projs.data as any[]) ?? []).map(p => ({ numero: p.numero_projeto, nome: p.nome_projeto })),
      centros: ((centros.data as any[]) ?? []).map(c => ({ codigo: c.codigo, descricao: c.descricao })),
      fornecedores: ((forns.data as any[]) ?? []).map(f => ({ codigo: f.codigo, nome: f.nome })),
    });
    setLoading(false);
  };
  useEffect(() => { loadResumo(); }, []);

  const filtros = () => {
    const f: Record<string, any> = { data_inicio: dataIni, data_fim: dataFim };
    if (tipoDespesa) f.tipo_despesa = tipoDespesa;
    if (projetoMacro) f.projeto_macro = projetoMacro;
    if (projeto) f.projeto = projeto;
    if (centroCusto) f.centro_custo = centroCusto;
    if (fornecedor) f.fornecedor = fornecedor;
    if (modulo === "compras" && somentePendentes) f.somente_pendentes = true;
    if (modulo === "recebimentos" && transacaoNf) f.tipo_movimento = transacaoNf;
    return f;
  };

  const validar = async () => {
    setComparando(true);
    setResultado({});
    const endpoint = modulo === "compras" ? "/api/bi/validar-painel-compras" : "/api/bi/validar-notas-recebimento";
    try {
      const d = await api.get<ValidacaoResp>(endpoint, filtros());
      setResultado({ resp: d });
      toast({ title: "Comparação concluída" });
    } catch (e: any) {
      setResultado({ erro: e?.message ?? "Erro" });
      toast({ title: "Falha ao validar", description: e?.message ?? "Erro", variant: "destructive" });
    } finally {
      setComparando(false);
    }
  };

  const aplicarCasoObrigatorio = () => {
    setModulo("compras"); setDataIni("2026-01-01"); setDataFim("2026-01-31");
    setTipoDespesa("MATERIA_PRIMA"); setProjetoMacro(""); setProjeto("");
    setCentroCusto(""); setFornecedor(""); setSomentePendentes(true);
  };

  const fmtMoney = (n: number) => Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtNum = (n: number) => Number(n ?? 0).toLocaleString("pt-BR");
  const diffPct = (bi: number, erp: number) => (!erp ? (bi === 0 ? 0 : 100) : ((bi - erp) / erp) * 100);
  const diffClass = (diff: number, pct: number) => {
    if (diff === 0) return "text-emerald-600";
    const a = Math.abs(pct);
    if (a < 2) return "text-amber-600";
    return "text-destructive";
  };

  const KEYS_COMPRAS = ["valor_bruto", "valor_liquido", "valor_pendente", "qtd_ocs", "qtd_itens", "qtd_fornecedores"];
  const KEYS_RECEB = ["valor_bruto", "valor_liquido", "valor_total", "qtd_nfs", "qtd_itens", "qtd_fornecedores"];
  const LABELS: Record<string, string> = {
    valor_bruto: "Valor bruto", valor_liquido: "Valor líquido", valor_pendente: "Valor pendente",
    valor_total: "Valor total", qtd_ocs: "Qtd documentos", qtd_nfs: "Qtd documentos",
    qtd_itens: "Qtd itens", qtd_fornecedores: "Qtd fornecedores",
  };

  const renderResultado = () => {
    if (resultado.erro) {
      return <div className="text-sm text-destructive border border-destructive/30 rounded p-3">Endpoint indisponível: {resultado.erro}</div>;
    }
    if (!resultado.resp) {
      return <div className="text-sm text-muted-foreground">Sem dados. Defina os filtros e clique em Validar.</div>;
    }
    const keys = modulo === "compras" ? KEYS_COMPRAS : KEYS_RECEB;
    const isMoney = (k: string) => k.startsWith("valor");
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Métrica</TableHead>
            <TableHead className="text-right">ERP</TableHead>
            <TableHead className="text-right">BI</TableHead>
            <TableHead className="text-right">Diferença</TableHead>
            <TableHead className="text-right">Diff %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keys.map(k => {
            const erp = Number((resultado.resp!.erp as any)?.[k] ?? 0);
            const bi = Number((resultado.resp!.bi as any)?.[k] ?? 0);
            const diff = bi - erp;
            const pct = diffPct(bi, erp);
            const cls = diffClass(diff, pct);
            return (
              <TableRow key={k}>
                <TableCell className="font-medium">{LABELS[k] ?? k}</TableCell>
                <TableCell className="text-right font-mono">{isMoney(k) ? fmtMoney(erp) : fmtNum(erp)}</TableCell>
                <TableCell className="text-right font-mono">{isMoney(k) ? fmtMoney(bi) : fmtNum(bi)}</TableCell>
                <TableCell className={`text-right font-mono ${cls}`}>{isMoney(k) ? fmtMoney(diff) : fmtNum(diff)}</TableCell>
                <TableCell className={`text-right font-mono font-semibold ${cls}`}>{pct.toFixed(2)}%</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const baseVazia = (modulo === "compras" ? counts.compras : counts.receb) === 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Status da camada analítica</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {([
              { code: "ATU_COMPRAS" as const, label: "bi_compras", count: counts.compras, ultima: ultimaCarga.compras },
              { code: "ATU_RECEBIMENTOS" as const, label: "bi_recebimentos", count: counts.receb, ultima: ultimaCarga.receb },
            ]).map(t => {
              const e = ultimasExec[t.code];
              return (
                <div key={t.code} className="border border-border rounded-md p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-sm">{t.code}</div>
                    {t.count === 0 && <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-300">Vazia</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.label}: <span className="font-mono">{fmtNum(t.count)}</span> linhas •
                    Última carga: <span className="font-mono">{fmtDate(t.ultima)}</span>
                  </div>
                  {e ? (
                    <div className="text-xs text-muted-foreground">
                      Última execução: {fmtDate(e.iniciado_em)} <StatusBadge status={e.status} />
                      {e.erro_resumo && <div className="text-destructive">{e.erro_resumo}</div>}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Nenhuma execução registrada</div>
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

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>Validação ERP × BI</CardTitle>
          <Button variant="outline" size="sm" onClick={aplicarCasoObrigatorio}>
            Caso obrigatório (jan/2026, Matéria-prima, pendentes)
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Compara <strong>ERP atual</strong> com <strong>base analítica</strong> via <code className="font-mono">/api/bi/validar-*</code>.
            Os dashboards principais continuam intocados.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <Label>Módulo</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                value={modulo} onChange={e => { setModulo(e.target.value as Modulo); setResultado({}); }}>
                <option value="compras">Painel de Compras</option>
                <option value="recebimentos">Notas Fiscais de Recebimento</option>
              </select>
            </div>
            <div><Label>Data início</Label><Input type="date" value={dataIni} onChange={e => setDataIni(e.target.value)} /></div>
            <div><Label>Data fim</Label><Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
            <div>
              <Label>Tipo despesa</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                value={tipoDespesa} onChange={e => setTipoDespesa(e.target.value)}>
                <option value="">Todos</option>
                {TIPOS_DESPESA.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div>
              <Label>Projeto macro</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                value={projetoMacro} onChange={e => setProjetoMacro(e.target.value)}>
                <option value="">Todos</option>
                {opcoes.projetosMacro.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <Label>Projeto</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                value={projeto} onChange={e => setProjeto(e.target.value)}>
                <option value="">Todos</option>
                {opcoes.projetos.map(p => <option key={p.numero} value={p.numero}>{p.numero} {p.nome ? `— ${p.nome}` : ""}</option>)}
              </select>
            </div>
            <div>
              <Label>Centro de custo</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                value={centroCusto} onChange={e => setCentroCusto(e.target.value)}>
                <option value="">Todos</option>
                {opcoes.centros.map(c => <option key={c.codigo} value={c.codigo}>{c.codigo} {c.descricao ? `— ${c.descricao}` : ""}</option>)}
              </select>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                value={fornecedor} onChange={e => setFornecedor(e.target.value)}>
                <option value="">Todos</option>
                {opcoes.fornecedores.map(f => <option key={f.codigo} value={f.codigo}>{f.codigo} {f.nome ? `— ${f.nome}` : ""}</option>)}
              </select>
            </div>
            {modulo === "compras" ? (
              <div className="flex items-end gap-2">
                <Switch checked={somentePendentes} onCheckedChange={setSomentePendentes} />
                <Label className="text-xs">Somente pendentes</Label>
              </div>
            ) : (
              <div>
                <Label>Transação NF</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
                  value={transacaoNf} onChange={e => setTransacaoNf(e.target.value)}>
                  <option value="">Todas</option>
                  {TRANSACOES_NF.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </div>
            )}
          </div>

          {baseVazia && (
            <div className="text-xs text-amber-700 dark:text-amber-300 border border-amber-500/30 bg-amber-500/10 rounded p-2">
              Base <code className="font-mono">{modulo === "compras" ? "bi_compras" : "bi_recebimentos"}</code> ainda não populada.
              Execute o ETL na aba <strong>Ações</strong> antes de validar.
            </div>
          )}

          <div>
            <Button onClick={validar} disabled={comparando}>
              <Play className="h-4 w-4 mr-1" />{comparando ? "Validando..." : "Validar"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            <span className="text-emerald-600 font-medium">Verde</span> = igual •
            <span className="text-amber-600 font-medium"> amarelo</span> &lt; 2% •
            <span className="text-destructive font-medium"> vermelho</span> ≥ 2%.
          </p>

          {renderResultado()}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    </div>
  );
}

// ---------- Configuração BI ----------
type ConfigRow = { chave: string; valor: string; descricao: string | null; atualizado_em: string; atualizado_por: string | null };

function ConfiguracaoBiTab() {
  const [rows, setRows] = useState<Record<string, ConfigRow>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ compras: number; receb: number }>({ compras: 0, receb: 0 });
  const [ultimasExec, setUltimasExec] = useState<Record<string, Execucao>>({});
  const [ttlDraft, setTtlDraft] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: cfg }, { count: cCompras }, { count: cReceb }, { data: exec }] = await Promise.all([
      supabase.from("etl_configuracoes_bi").select("*"),
      supabase.from("bi_compras").select("*", { count: "exact", head: true }),
      supabase.from("bi_recebimentos").select("*", { count: "exact", head: true }),
      supabase.from("etl_execucoes").select("*").order("iniciado_em", { ascending: false }).limit(50),
    ]);
    const map: Record<string, ConfigRow> = {};
    ((cfg as any[]) ?? []).forEach(r => { map[r.chave] = r; });
    setRows(map);
    setTtlDraft(map.DASHBOARD_CACHE_TTL_MINUTES?.valor ?? "5");
    setCounts({ compras: cCompras ?? 0, receb: cReceb ?? 0 });
    const last: Record<string, Execucao> = {};
    ((exec as any[]) ?? []).forEach((e: Execucao) => { if (!last[e.tarefa_codigo]) last[e.tarefa_codigo] = e; });
    setUltimasExec(last);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const salvar = async (chave: string, valor: string, descricao?: string) => {
    setSaving(chave);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("etl_configuracoes_bi").upsert({
      chave, valor, descricao: descricao ?? rows[chave]?.descricao ?? null,
      atualizado_por: user?.id ?? null, atualizado_em: new Date().toISOString(),
    }, { onConflict: "chave" });
    setSaving(null);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Configuração salva", description: `${chave} = ${valor}` });
    load();
  };

  const get = (k: string) => rows[k]?.valor;
  const isOn = (k: string) => get(k) === "true";

  const FlagRow = ({ chave, label, descricao, disabled, warn }: { chave: string; label: string; descricao: string; disabled?: boolean; warn?: string }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="space-y-1">
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{descricao}</div>
        <div className="text-xs font-mono text-muted-foreground">{chave}</div>
        {warn && <div className="text-xs text-amber-700 dark:text-amber-300">{warn}</div>}
        {rows[chave] && (
          <div className="text-xs text-muted-foreground">Atualizado em {fmtDate(rows[chave].atualizado_em)}</div>
        )}
      </div>
      <Switch
        checked={isOn(chave)}
        onCheckedChange={(v) => salvar(chave, v ? "true" : "false")}
        disabled={disabled || saving === chave}
      />
    </div>
  );

  const compEmpty = counts.compras === 0;
  const recEmpty = counts.receb === 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Configuração do BI Analítico</CardTitle>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1" />Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Estas chaves vivem em <code className="font-mono">etl_configuracoes_bi</code> e são lidas pelo backend FastAPI a cada requisição
            (cache curto). Mudanças têm efeito imediato. Apenas administradores podem alterar.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Cutover dos dashboards</CardTitle></CardHeader>
          <CardContent>
            <FlagRow
              chave="USE_BI_ANALYTICS_COMPRAS"
              label="BI Analítico — Painel de Compras"
              descricao={`Quando ligado, /api/painel-compras* lê de bi_compras. Linhas atuais: ${counts.compras.toLocaleString("pt-BR")}.`}
              warn={compEmpty ? "Base bi_compras está vazia. Rode ATU_COMPRAS antes de ligar." : undefined}
            />
            <FlagRow
              chave="USE_BI_ANALYTICS_RECEBIMENTOS"
              label="BI Analítico — Notas de Recebimento"
              descricao={`Quando ligado, /api/notas-recebimento* lê de bi_recebimentos. Linhas atuais: ${counts.receb.toLocaleString("pt-BR")}.`}
              warn={recEmpty ? "Base bi_recebimentos está vazia. Rode ATU_RECEBIMENTOS antes de ligar." : undefined}
            />
            <FlagRow
              chave="FALLBACK_TO_ERP_WHEN_BI_EMPTY"
              label="Fallback para ERP se BI vazio"
              descricao="Se BI estiver vazio, cai pro ERP. Desligado = retorna HTTP 409."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Cache de dashboards</CardTitle></CardHeader>
          <CardContent>
            <FlagRow
              chave="USE_DASHBOARD_CACHE"
              label="Habilitar cache"
              descricao="Quando ligado, dashboards consultam dashboard_cache antes de recomputar."
            />
            <div className="flex items-end gap-2 pt-3">
              <div className="flex-1">
                <Label>TTL (minutos)</Label>
                <Input type="number" min={1} value={ttlDraft} onChange={e => setTtlDraft(e.target.value)} />
                <div className="text-xs font-mono text-muted-foreground mt-1">DASHBOARD_CACHE_TTL_MINUTES</div>
              </div>
              <Button
                size="sm"
                onClick={() => salvar("DASHBOARD_CACHE_TTL_MINUTES", String(Math.max(1, parseInt(ttlDraft || "5", 10))))}
                disabled={saving === "DASHBOARD_CACHE_TTL_MINUTES"}
              >
                Salvar TTL
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Status das tarefas ETL</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(["ATU_COMPRAS", "ATU_RECEBIMENTOS"] as const).map(code => {
              const e = ultimasExec[code];
              return (
                <div key={code} className="border border-border rounded-md p-3 space-y-1">
                  <div className="font-mono text-sm">{code}</div>
                  {e ? (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Última: {fmtDate(e.iniciado_em)} <StatusBadge status={e.status} /></div>
                      <div>Lidas {e.linhas_lidas ?? 0} • Ins {e.linhas_inseridas ?? 0} • Atu {e.linhas_atualizadas ?? 0}</div>
                      {e.erro_resumo && <div className="text-destructive">{e.erro_resumo}</div>}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Nenhuma execução registrada</div>
                  )}
                </div>
              );
            })}
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
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
          <TabsTrigger value="conexoes">Conexões</TabsTrigger>
          <TabsTrigger value="acoes">Ações</TabsTrigger>
          <TabsTrigger value="fila">Fila Integrador</TabsTrigger>
          <TabsTrigger value="execucoes">Execuções</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="validacao">Validação ERP × BI</TabsTrigger>
          <TabsTrigger value="config">Configuração BI</TabsTrigger>
        </TabsList>
        <TabsContent value="tarefas"><TarefasTab /></TabsContent>
        <TabsContent value="conexoes"><ConexoesTab /></TabsContent>
        <TabsContent value="acoes"><AcoesTab /></TabsContent>
        <TabsContent value="fila"><FilaTab /></TabsContent>
        <TabsContent value="execucoes"><ExecucoesTab onOpenLogs={(id) => { setExecId(id); setTab("logs"); }} /></TabsContent>
        <TabsContent value="logs"><LogsTab execId={execId} setExecId={setExecId} /></TabsContent>
        <TabsContent value="validacao"><ValidacaoTab /></TabsContent>
        <TabsContent value="config"><ConfiguracaoBiTab /></TabsContent>
      </Tabs>
    </div>
  );
}
