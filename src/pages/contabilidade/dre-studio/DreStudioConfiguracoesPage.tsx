import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  Activity,
  Calendar,
  ClipboardList,
  Database,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCw,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { MaterializacaoDialog } from "@/components/contabil/MaterializacaoDialog";
import { HistoricoCacheDialog } from "@/components/contabil/HistoricoCacheDialog";
import {
  useExecucoesCache,
  useMaterializarResultado,
  useModelos,
  type CacheFiltros,
} from "@/hooks/contabil/api";
import {
  useSnapshotsList,
  useLimparSnapshot,
  useClonarVinculosOficial,
  useValidarVinculos,
  useReferenciaSeniorList,
  useReplicarReferenciaSenior,
  useValidarReferenciaSenior,
  useAgendamentos,
  useSalvarAgendamento,
  type AgendamentoItem,
  type FrequenciaAgendamento,
} from "@/hooks/contabil/configuracoes";
import { useVincularContasDRESenior } from "@/hooks/contabil/useVincularContasDRESenior";
import { useVincularContasBalancoSenior } from "@/hooks/contabil/useVincularContasBalancoSenior";
import { formatAnomes } from "@/lib/anomes";
import { cn } from "@/lib/utils";

function ConfiguracoesContabeisPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Configurações Contábeis</h1>
        <p className="text-sm text-muted-foreground">
          Rotinas técnicas de DRE e Balanço. A tela de visualização lê apenas o resultado pronto;
          aqui ficam as ações de materialização, vínculos, referência Senior e agendamentos.
        </p>
      </header>

      <Tabs defaultValue="snapshots" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="snapshots" className="gap-1.5">
            <Database className="h-4 w-4" /> Snapshots
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5">
            <Activity className="h-4 w-4" /> Jobs & Histórico
          </TabsTrigger>
          <TabsTrigger value="vinculos" className="gap-1.5">
            <Link2 className="h-4 w-4" /> Vínculos
          </TabsTrigger>
          <TabsTrigger value="referencia" className="gap-1.5">
            <ShieldCheck className="h-4 w-4" /> Referência Senior
          </TabsTrigger>
          <TabsTrigger value="agendamentos" className="gap-1.5">
            <Calendar className="h-4 w-4" /> Agendamentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="snapshots"><SnapshotsTab /></TabsContent>
        <TabsContent value="jobs"><JobsTab /></TabsContent>
        <TabsContent value="vinculos"><VinculosTab /></TabsContent>
        <TabsContent value="referencia"><ReferenciaTab /></TabsContent>
        <TabsContent value="agendamentos"><AgendamentosTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Helpers visuais
// ============================================================
function fmtDataHora(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("pt-BR");
}

function statusPill(status?: string | null) {
  const s = String(status ?? "").toUpperCase();
  const cls =
    s === "CONCLUIDO" || s === "OK" || s === "PROCESSADO"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : s === "ERRO" || s === "FALHA"
        ? "bg-red-100 text-red-800 border-red-200"
        : s === "EM_PROCESSAMENTO" || s === "PENDENTE" || s === "EXECUTANDO"
          ? "bg-amber-100 text-amber-800 border-amber-200"
          : s === "SEM_CACHE"
            ? "bg-slate-100 text-slate-700 border-slate-200"
            : "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium", cls)}>
      {s || "—"}
    </span>
  );
}

function EndpointIndisponivel({ titulo }: { titulo: string }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <div className="font-medium">{titulo}</div>
        <div className="text-xs">
          O endpoint correspondente ainda não está publicado na API. Solicite ao backend para
          habilitar e tente novamente — o front nunca grava direto no Supabase.
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Snapshots
// ============================================================
function SnapshotsTab() {
  const modelos = useModelos();
  const snapshots = useSnapshotsList();
  const [filtroTipo, setFiltroTipo] = useState<"TODOS" | "DRE" | "BALANCO">("TODOS");

  const linhas = useMemo(() => {
    const itens = snapshots.data?.items ?? [];
    // Se a API de listagem não está pronta, geramos linhas a partir dos modelos cadastrados.
    if (snapshots.data?.unavailable) {
      return (modelos.data ?? []).map((m) => ({
        modelo_id: m.id,
        modelo_nome: m.nome,
        tipo_modelo: m.tipo_modelo,
        codemp: m.codemp,
        codfil: null,
        anomes_ini: null,
        anomes_fim: null,
        status: "—",
        atualizado_em: m.updated_at ?? null,
        origem: null,
      }));
    }
    return itens;
  }, [snapshots.data, modelos.data]);

  const filtradas = linhas.filter((l) =>
    filtroTipo === "TODOS" ? true : l.tipo_modelo === filtroTipo,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Snapshots de DRE/Balanço</CardTitle>
          <CardDescription>
            Listagem de resultados materializados por modelo. Use as ações para gerar, atualizar,
            visualizar ou limpar um snapshot.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os tipos</SelectItem>
              <SelectItem value="DRE">DRE</SelectItem>
              <SelectItem value="BALANCO">Balanço</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => snapshots.refetch()} disabled={snapshots.isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", snapshots.isFetching && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {snapshots.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : (
          <>
            {snapshots.data?.unavailable && (
              <div className="mb-3">
                <EndpointIndisponivel titulo="GET /api/contabil/snapshots não disponível — mostrando modelos cadastrados." />
              </div>
            )}
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Filial</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Última atualização</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">
                        Nenhum snapshot encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtradas.map((s, idx) => (
                      <SnapshotRow key={`${s.modelo_id}-${idx}`} snap={s} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SnapshotRow({ snap }: { snap: any }) {
  const tipo: "DRE" | "BALANCO" = snap.tipo_modelo === "BALANCO" ? "BALANCO" : "DRE";
  const materializar = useMaterializarResultado(snap.modelo_id);
  const [jobId, setJobId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmLimpar, setConfirmLimpar] = useState(false);
  const limpar = useLimparSnapshot(snap.modelo_id);

  function rodar() {
    const ano = new Date().getFullYear();
    const filtros: CacheFiltros = {
      anomes_ini: ano * 100 + 1,
      anomes_fim: ano * 100 + 12,
      tipo_modelo: tipo,
      modo_balanco: tipo === "BALANCO" ? "MENSAL_E650SAL" : undefined,
      aplicar_referencia_senior: tipo === "BALANCO" || undefined,
      expandir_resultado_exercicio: tipo === "BALANCO" || undefined,
    };
    materializar.mutate(filtros, {
      onSuccess: (r) => {
        setJobId(r.job_id);
        setDialogOpen(true);
      },
    });
  }

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{snap.modelo_nome ?? snap.modelo_id}</TableCell>
        <TableCell><Badge variant="outline">{tipo}</Badge></TableCell>
        <TableCell className="tabular-nums">{snap.codfil ?? "—"}</TableCell>
        <TableCell className="tabular-nums">
          {snap.anomes_ini ? formatAnomes(String(snap.anomes_ini)) : "—"}
          {snap.anomes_fim ? ` – ${formatAnomes(String(snap.anomes_fim))}` : ""}
        </TableCell>
        <TableCell>{statusPill(snap.status)}</TableCell>
        <TableCell className="text-xs">{fmtDataHora(snap.atualizado_em)}</TableCell>
        <TableCell className="text-xs text-muted-foreground">{snap.origem ?? "—"}</TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button asChild size="sm" variant="outline">
              <Link to={`/contabilidade/dre-studio/${snap.modelo_id}/visualizacao`}>
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Ver
              </Link>
            </Button>
            <Button size="sm" onClick={rodar} disabled={materializar.isPending}>
              {materializar.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
              )}
              Atualizar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmLimpar(true)}
              title="Limpar snapshot"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <MaterializacaoDialog
        open={dialogOpen}
        modeloId={snap.modelo_id}
        jobId={jobId}
        onClose={() => {
          setDialogOpen(false);
          setJobId(null);
        }}
        onRetry={rodar}
      />

      <AlertDialog open={confirmLimpar} onOpenChange={setConfirmLimpar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              O snapshot atual do modelo <strong>{snap.modelo_nome}</strong> será removido. Será
              necessário gerar novamente para visualizar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => limpar.mutate(undefined, { onSettled: () => setConfirmLimpar(false) })}
            >
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================
// Jobs & Histórico
// ============================================================
function JobsTab() {
  const modelos = useModelos();
  const [modeloId, setModeloId] = useState<string | undefined>(undefined);
  const exec = useExecucoesCache({ modelo_id: modeloId, limit: 100 });
  const [historicoAberto, setHistoricoAberto] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Jobs & Histórico</CardTitle>
          <CardDescription>
            Execuções de materialização e atualização de cache contábil.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={modeloId ?? "TODOS"} onValueChange={(v) => setModeloId(v === "TODOS" ? undefined : v)}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Filtrar por modelo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os modelos</SelectItem>
              {(modelos.data ?? []).map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => exec.refetch()} disabled={exec.isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", exec.isFetching && "animate-spin")} />
            Atualizar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setHistoricoAberto(true)}>
            Abrir histórico
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {exec.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : (exec.data ?? []).length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 text-center border rounded-md bg-slate-50">
            Nenhuma execução registrada.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/hora</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Lidos</TableHead>
                  <TableHead className="text-right">Gravados</TableHead>
                  <TableHead className="text-right">Tempo</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(exec.data ?? []).map((e, idx) => (
                  <TableRow key={e.execucao_id ?? idx}>
                    <TableCell className="text-xs whitespace-nowrap">{fmtDataHora(e.data_hora)}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap font-mono">
                      {e.anomes_ini ? formatAnomes(String(e.anomes_ini)) : "—"}
                      {" – "}
                      {e.anomes_fim ? formatAnomes(String(e.anomes_fim)) : "—"}
                    </TableCell>
                    <TableCell>{statusPill(e.status)}</TableCell>
                    <TableCell className="text-right tabular-nums">{(e.registros_lidos ?? 0).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right tabular-nums">{(e.registros_gravados ?? 0).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.tempo_ms ? `${(e.tempo_ms / 1000).toFixed(1)} s` : "—"}</TableCell>
                    <TableCell className="text-xs text-red-700 max-w-[280px] truncate" title={e.erro ?? undefined}>
                      {e.erro ?? <span className="text-slate-400">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <HistoricoCacheDialog
        open={historicoAberto}
        onOpenChange={setHistoricoAberto}
        modeloId={modeloId}
      />
    </Card>
  );
}

// ============================================================
// Vínculos
// ============================================================
function VinculosTab() {
  const modelos = useModelos();
  const [modeloId, setModeloId] = useState<string | undefined>(undefined);
  const modelo = useMemo(
    () => (modelos.data ?? []).find((m) => m.id === modeloId),
    [modelos.data, modeloId],
  );

  const clonar = useClonarVinculosOficial(modeloId ?? "");
  const vincularDRE = useVincularContasDRESenior(modeloId ?? "");
  const vincularBal = useVincularContasBalancoSenior(modeloId ?? "");
  const validar = useValidarVinculos(modeloId ?? "", false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Vínculos de Contas</CardTitle>
          <CardDescription>
            Selecione o modelo para clonar vínculos do modelo oficial, vincular contas do plano
            Senior e validar o resultado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 max-w-md">
            <Label>Modelo</Label>
            <Select value={modeloId ?? ""} onValueChange={setModeloId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um modelo" />
              </SelectTrigger>
              <SelectContent>
                {(modelos.data ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome} <span className="text-xs text-muted-foreground">({m.tipo_modelo})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {modeloId ? (
            <div className="grid gap-3 md:grid-cols-3">
              <ActionCard
                titulo="Clonar do modelo oficial"
                descricao="Copia os vínculos de contas do modelo Senior validado para este modelo."
                acao="Clonar vínculos"
                disabled={clonar.isPending}
                loading={clonar.isPending}
                onClick={() => clonar.mutate()}
              />
              {modelo?.tipo_modelo === "DRE" && (
                <ActionCard
                  titulo="Vincular contas Senior (DRE)"
                  descricao={
                    vincularDRE.isPending
                      ? "Vinculando... pode levar até 1 minuto. Não recarregue a página."
                      : "Vincula automaticamente as contas analíticas da DRE via E045PLA. Pode levar até 1 minuto."
                  }
                  acao="Executar"
                  disabled={vincularDRE.isPending}
                  loading={vincularDRE.isPending}
                  onClick={() => vincularDRE.mutate()}
                />
              )}
              {modelo?.tipo_modelo === "BALANCO" && (
                <ActionCard
                  titulo="Vincular contas Senior (Balanço)"
                  descricao={
                    vincularBal.isPending
                      ? "Vinculando... pode levar até 1 minuto. Não recarregue a página."
                      : "Vincula automaticamente as contas analíticas do Balanço via E045PLA. Pode levar até 1 minuto."
                  }
                  acao="Executar"
                  disabled={vincularBal.isPending}
                  loading={vincularBal.isPending}
                  onClick={() => vincularBal.mutate()}
                />
              )}
              <ActionCard
                titulo="Validar vínculos"
                descricao="Verifica contas sem vínculo, duplicadas e com ctared 0."
                acao={validar.isFetching ? "Validando..." : "Validar"}
                disabled={validar.isFetching}
                loading={validar.isFetching}
                onClick={() => validar.refetch()}
              />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground border rounded-md p-4 bg-slate-50">
              Selecione um modelo para liberar as ações.
            </div>
          )}

          {validar.data?.unavailable && (
            <EndpointIndisponivel titulo="GET /api/contabil/modelos/{id}/validar-vinculos não disponível." />
          )}
          {validar.data?.data && (
            <div className="grid gap-2 md:grid-cols-3">
              <ValidacaoCard label="Contas sem vínculo" value={validar.data.data.contas_sem_vinculo ?? 0} bom={(validar.data.data.contas_sem_vinculo ?? 0) === 0} />
              <ValidacaoCard label="Contas duplicadas" value={validar.data.data.contas_duplicadas ?? 0} bom={(validar.data.data.contas_duplicadas ?? 0) === 0} />
              <ValidacaoCard label="CTARED 0" value={validar.data.data.contas_ctared_zero ?? 0} bom={(validar.data.data.contas_ctared_zero ?? 0) === 0} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActionCard({
  titulo,
  descricao,
  acao,
  onClick,
  disabled,
  loading,
}: {
  titulo: string;
  descricao: string;
  acao: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="rounded-md border p-4 space-y-3 bg-white">
      <div>
        <div className="font-medium text-sm">{titulo}</div>
        <p className="text-xs text-muted-foreground mt-1">{descricao}</p>
      </div>
      <Button size="sm" className="w-full" onClick={onClick} disabled={disabled}>
        {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
        {acao}
      </Button>
    </div>
  );
}

function ValidacaoCard({ label, value, bom }: { label: string; value: number; bom: boolean }) {
  return (
    <div className={cn(
      "rounded-md border p-4 flex items-center gap-3",
      bom ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50",
    )}>
      {bom ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold tabular-nums">{value.toLocaleString("pt-BR")}</div>
      </div>
    </div>
  );
}

// ============================================================
// Referência Senior
// ============================================================
function ReferenciaTab() {
  const [anomes, setAnomes] = useState<string>("");
  const lista = useReferenciaSeniorList({ anomes: anomes ? Number(anomes) : undefined });
  const replicar = useReplicarReferenciaSenior();
  const validar = useValidarReferenciaSenior({
    anomes: anomes ? Number(anomes) : undefined,
    enabled: false,
  });
  const [confirmReplicar, setConfirmReplicar] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Referência Senior Oficial</CardTitle>
          <CardDescription>
            Linhas técnicas (98, 99, VINCULAR, 999) usadas como referência oficial nos Balanços.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Anomes</Label>
            <Input
              className="w-[120px]"
              placeholder="202612"
              value={anomes}
              onChange={(e) => setAnomes(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
          <Button size="sm" variant="outline" onClick={() => lista.refetch()} disabled={lista.isFetching}>
            <RefreshCw className={cn("h-4 w-4 mr-1.5", lista.isFetching && "animate-spin")} />
            Recarregar
          </Button>
          <Button size="sm" variant="outline" onClick={() => validar.refetch()} disabled={validar.isFetching}>
            <ShieldCheck className="h-4 w-4 mr-1.5" />
            Validar 98/99/VINCULAR/999
          </Button>
          <Button size="sm" onClick={() => setConfirmReplicar(true)} disabled={replicar.isPending}>
            {replicar.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Replicar para todos os Balanços
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {lista.data?.unavailable && (
          <EndpointIndisponivel titulo="GET /api/contabil/referencia-senior não disponível." />
        )}

        {validar.data?.unavailable && (
          <EndpointIndisponivel titulo="GET /api/contabil/referencia-senior/validar não disponível." />
        )}
        {validar.data && !validar.data.unavailable && (
          <div className="grid gap-2 md:grid-cols-4">
            {validar.data.items.map((v) => (
              <div key={v.codigo} className={cn(
                "rounded-md border p-3 flex items-center gap-3",
                v.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50",
              )}>
                {v.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-red-600" />}
                <div className="min-w-0">
                  <div className="text-sm font-medium">Código {v.codigo}</div>
                  <div className="text-xs text-muted-foreground truncate">{v.observacao ?? (v.ok ? "OK" : "Falha")}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {lista.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Anomes</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(lista.data?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-sm text-muted-foreground">
                      Nenhuma referência encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  (lista.data?.items ?? []).map((r, idx) => (
                    <TableRow key={`${r.modelo_id}-${r.codigo}-${idx}`}>
                      <TableCell className="font-medium">{r.modelo_nome ?? r.modelo_id}</TableCell>
                      <TableCell><Badge variant="outline">{r.tipo_modelo ?? "—"}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{r.anomes ? formatAnomes(String(r.anomes)) : "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.codigo}</TableCell>
                      <TableCell className="text-sm">{r.descricao ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.valor != null ? r.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.origem ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={confirmReplicar} onOpenChange={setConfirmReplicar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replicar referência Senior?</AlertDialogTitle>
            <AlertDialogDescription>
              A referência oficial será aplicada em todos os modelos de Balanço para o anomes
              informado{anomes ? ` (${formatAnomes(anomes)})` : ""}. Esta ação não pode ser desfeita
              pelo front; apenas o backend pode reverter.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                replicar.mutate(
                  { anomes: anomes ? Number(anomes) : undefined },
                  { onSettled: () => setConfirmReplicar(false) },
                )
              }
            >
              Replicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ============================================================
// Agendamentos
// ============================================================
function AgendamentosTab() {
  const modelos = useModelos();
  const ags = useAgendamentos();
  const salvar = useSalvarAgendamento();

  const itensExibidos: AgendamentoItem[] = useMemo(() => {
    const existentes = ags.data?.items ?? [];
    if (existentes.length > 0) return existentes;
    // Sintetiza placeholders por modelo cadastrado para permitir configurar.
    return (modelos.data ?? []).map((m) => ({
      modelo_id: m.id,
      modelo_nome: m.nome,
      tipo_modelo: m.tipo_modelo,
      frequencia: "MANUAL" as FrequenciaAgendamento,
      ativo: false,
    }));
  }, [ags.data, modelos.data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agendamentos</CardTitle>
        <CardDescription>
          Configure a atualização automática dos snapshots. A execução efetiva é feita pelo
          backend (cron); o front apenas envia a configuração.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ags.data?.unavailable && (
          <EndpointIndisponivel titulo="GET /api/contabil/agendamentos não disponível." />
        )}

        {ags.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : itensExibidos.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6 border rounded-md bg-slate-50">
            Nenhum modelo disponível para agendamento.
          </div>
        ) : (
          <div className="space-y-3">
            {itensExibidos.map((a) => (
              <AgendamentoRow
                key={a.id ?? a.modelo_id ?? Math.random()}
                item={a}
                onSave={(v) => salvar.mutate(v)}
                saving={salvar.isPending}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AgendamentoRow({
  item,
  onSave,
  saving,
}: {
  item: AgendamentoItem;
  onSave: (v: AgendamentoItem) => void;
  saving: boolean;
}) {
  const [estado, setEstado] = useState<AgendamentoItem>(item);
  const tipo = (estado.tipo_modelo ?? "DRE") as "DRE" | "BALANCO";
  const frequencias: FrequenciaAgendamento[] =
    tipo === "BALANCO" ? ["MANUAL", "DIARIA"] : ["MANUAL", "HORARIA", "DIARIA"];

  return (
    <div className="rounded-md border p-4 grid gap-3 md:grid-cols-[1fr,160px,140px,auto,auto] md:items-end">
      <div>
        <div className="text-sm font-medium">{estado.modelo_nome ?? estado.modelo_id ?? "Modelo"}</div>
        <div className="text-xs text-muted-foreground">
          {tipo} ·
          {" "}Última: {fmtDataHora(estado.ultima_execucao)} · Próxima: {fmtDataHora(estado.proxima_execucao)}
        </div>
      </div>
      <div className="grid gap-1">
        <Label className="text-xs">Frequência</Label>
        <Select
          value={estado.frequencia}
          onValueChange={(v) => setEstado((s) => ({ ...s, frequencia: v as FrequenciaAgendamento }))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {frequencias.map((f) => (
              <SelectItem key={f} value={f}>
                {f === "MANUAL" ? "Manual" : f === "HORARIA" ? "Por hora" : "Diária"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1">
        <Label className="text-xs">Horário</Label>
        <Input
          type="time"
          value={estado.hora ?? ""}
          disabled={estado.frequencia === "HORARIA" || estado.frequencia === "MANUAL"}
          onChange={(e) => setEstado((s) => ({ ...s, hora: e.target.value }))}
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={estado.ativo}
          onCheckedChange={(v) => setEstado((s) => ({ ...s, ativo: v }))}
        />
        <Label className="text-xs">Ativo</Label>
      </div>
      <Button size="sm" onClick={() => onSave(estado)} disabled={saving}>
        {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
        Salvar
      </Button>
    </div>
  );
}

export default ConfiguracoesContabeisPage;

