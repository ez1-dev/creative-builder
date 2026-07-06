import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { ChevronDown, Info, RefreshCw, Loader2, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { KpiCard } from "@/components/bi/kpis/KpiCard";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { BotaoRelatorioModuloPdf } from "@/components/rh/BotaoRelatorioModuloPdf";
import { addMonths } from "@/lib/rh/relatorio";
import { AiInsightsPanel } from "@/components/rh/AiInsightsPanel";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import {
  fetchResumoFolhaDashboard,
  sincronizarResumoFolha,
  consultarStatusSincronizacaoRh,
  exportarResumoFolhaExcel,
  DashboardIndisponivelError,
  SincronizacaoCompatIndisponivelError,
  ExportarResumoFolhaError,
  toAnomes,
} from "@/lib/rh/api";
import { KpiOrMissing, ValueOrMissing } from "@/components/rh/KpiOrMissing";


import { formatCurrency } from "@/lib/format";


function defaultMonth(offset = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info, 215 70% 45%))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--accent))",
];

function fmtCompetencia(v: string): string {
  const s = String(v ?? "").replace(/\D/g, "");
  if (s.length === 6) return `${s.slice(4, 6)}/${s.slice(0, 4)}`;
  return v;
}




export default function ResumoFolhaPage() {
  const [ini, setIni] = useState(defaultMonth(-5));
  const [fim, setFim] = useState(defaultMonth(0));
  const [codemp, setCodemp] = useState("1");

  const baseParams = {
    anomes_ini: toAnomes(ini),
    anomes_fim: toAnomes(fim),
    codemp: Number(codemp) || 1,
  };
  const enabled = !!baseParams.anomes_ini && !!baseParams.anomes_fim;

  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["rh", "resumo-folha-dashboard", baseParams, "completo"],
    queryFn: () => fetchResumoFolhaDashboard(baseParams, "completo"),
    enabled,
    retry: (count, err) => (err instanceof DashboardIndisponivelError ? false : count < 1),
  });


  const data = query.data;
  const isLoading = query.isLoading;
  const isError = query.isError;
  const error = query.error;
  const indisponivel = error instanceof DashboardIndisponivelError;

  const kpis = data?.kpis;
  const missing = new Set(data?._missing_kpis ?? []);
  const isMissing = (k: string) => missing.has(k);

  const filiaisData = data?.filiais ?? [];
  const proventos = data?.proventos_vantagens ?? [];
  const descontos = data?.descontos ?? [];
  const tipos = data?.tipos_evento ?? [];
  const mensal = data?.mensal ?? [];
  const diagnostico = data?.diagnostico ?? data?.debug;
  const { isAdmin } = useUserPermissions();

  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [syncInFlight, setSyncInFlight] = useState(false);
  const syncMut = useMutation({
    mutationFn: () => sincronizarResumoFolha(baseParams),
    onMutate: () => {
      setSyncInFlight(true);
      const id = toast.loading("Sincronizando RH...", {
        description: `${baseParams.anomes_ini} → ${baseParams.anomes_fim} (empresa ${baseParams.codemp})`,
      });
      return { id };
    },
    onSuccess: (resp: any, _vars, ctx) => {
      const status = String(resp?.status ?? "").toUpperCase();
      if (status === "EM_PROCESSAMENTO" || status === "PROCESSING") {
        setSyncJobId(resp?.job_id ?? "pending");
        toast.loading("Sincronização em andamento...", {
          id: ctx?.id,
          description: resp?.mensagem ?? "Aguardando confirmação do backend.",
        });
        return;
      }
      setSyncInFlight(false);
      setSyncJobId(null);
      toast.success("Sincronização RH concluída.", { id: ctx?.id });
      qc.invalidateQueries({ queryKey: ["rh", "resumo-folha-dashboard"] });
    },
    onError: (e: any, _vars, ctx) => {
      setSyncInFlight(false);
      setSyncJobId(null);
      if (e instanceof SincronizacaoCompatIndisponivelError) {
        toast.info("Sincronização compatível ainda não implementada na API.", { id: ctx?.id });
        return;
      }
      const tecnico =
        e?.response?.data?.diagnostico?.erro_tecnico ??
        e?.data?.diagnostico?.erro_tecnico;
      const detalhe = e?.response?.data?.detail ?? e?.data?.detail ?? e?.message ?? "";
      const description = tecnico
        ? typeof tecnico === "string" ? tecnico : JSON.stringify(tecnico)
        : typeof detalhe === "string" ? detalhe : JSON.stringify(detalhe);
      toast.error("Erro ao sincronizar dados do ERP Senior/Vetorh.", {
        id: ctx?.id,
        description,
      });
    },

  });

  // Polling de status enquanto EM_PROCESSAMENTO
  const statusQuery = useQuery({
    queryKey: ["rh", "resumo-folha-sync-status", baseParams.codemp, syncJobId],
    queryFn: () =>
      consultarStatusSincronizacaoRh({
        codemp: baseParams.codemp,
        job_id: syncJobId && syncJobId !== "pending" ? syncJobId : undefined,
      }),
    enabled: !!syncJobId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!syncJobId) return;
    const s = statusQuery.data;
    // Endpoint de status ausente (null) → considera concluído
    if (s === null) {
      setSyncInFlight(false);
      setSyncJobId(null);
      toast.success("Sincronização RH concluída.");
      qc.invalidateQueries({ queryKey: ["rh", "resumo-folha-dashboard"] });
      return;
    }
    if (!s) return;
    const st = String(s.status ?? "").toUpperCase();
    if (st === "OK" || st === "CONCLUIDO" || st === "SUCCESS") {
      setSyncInFlight(false);
      setSyncJobId(null);
      toast.success("Sincronização RH concluída.");
      qc.invalidateQueries({ queryKey: ["rh", "resumo-folha-dashboard"] });
    } else if (st === "ERRO" || st === "FAILED" || st === "ERROR") {
      setSyncInFlight(false);
      setSyncJobId(null);
      const tecnico = s?.diagnostico?.erro_tecnico ?? s?.mensagem;
      toast.error("Erro ao sincronizar dados do ERP Senior/Vetorh.", {
        description: typeof tecnico === "string" ? tecnico : JSON.stringify(tecnico ?? {}),
      });
    }
  }, [statusQuery.data, syncJobId, qc]);

  const syncing = syncMut.isPending || syncInFlight;

  const exportMut = useMutation({
    mutationFn: () => exportarResumoFolhaExcel(baseParams),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Excel exportado.");
    },
    onError: (e: any) => {
      if (e instanceof ExportarResumoFolhaError) {
        if (e.code === "SESSAO_EXPIRADA") toast.error("Sessão expirada. Faça login novamente.");
        else if (e.code === "ENDPOINT_INDISPONIVEL") toast.info("Exportação ainda não disponível no backend.");
        else if (e.code === "PERIODO_INVALIDO") toast.error("Período inválido para exportação.");
        else toast.error(e.message || "Falha ao exportar Excel.");
        return;
      }
      toast.error(e?.message || "Falha ao exportar Excel.");
    },
  });

  const kpisValues = kpis ? Object.values(kpis).map((v) => Number(v) || 0) : [];
  const totalKpis = kpisValues.reduce((a, b) => a + b, 0);
  const qtdLinhas =
    (diagnostico as any)?.qtd_linhas ?? (diagnostico as any)?.qtd_linhas_vm_folha;
  const vmFolhaStatus = String((diagnostico as any)?.vm_folha_status ?? "").toUpperCase();
  const vmFolhaPendente =
    vmFolhaStatus === "OBJETO_INEXISTENTE_NO_VETORH" ||
    vmFolhaStatus === "VM_FOLHA_COMPAT_PENDENTE";
  const semDados =
    !!data &&
    !isLoading &&
    !vmFolhaPendente &&
    (qtdLinhas === 0 ||
      (totalKpis === 0 && filiaisData.length === 0 && mensal.length === 0));



  const tiposPie = useMemo(() => {
    const total = tipos.reduce((a, t) => a + (t.valor || 0), 0) || 1;
    return tipos
      .map((t) => ({ ...t, label: t.cd_tp_evento ?? t.tipo, pct: (t.valor || 0) / total }))
      .sort((a, b) => b.valor - a.valor);
  }, [tipos]);




  const FILIAL_COLS: { key: string; label: string; format: "currency" | "horas" }[] = [
    { key: "salario_base", label: "Salário Base", format: "currency" },
    { key: "custo_total", label: "Custo Total", format: "currency" },
    { key: "qtd_horas", label: "Qtd. Horas", format: "horas" },
    { key: "custo_hora_extra", label: "Custo H. Extra", format: "currency" },
    { key: "qtd_hora_extra", label: "Qtd. H. Extra", format: "horas" },
    { key: "liquido", label: "Líquido", format: "currency" },
    { key: "fgts", label: "FGTS", format: "currency" },
    { key: "va", label: "V.A.", format: "currency" },
    { key: "inss", label: "INSS", format: "currency" },
    { key: "custo_ferias", label: "Custo Férias", format: "currency" },
    { key: "prov_ferias", label: "Prov. Férias", format: "currency" },
    { key: "prov_13", label: "Prov. 13º", format: "currency" },
    { key: "proventos", label: "Proventos", format: "currency" },
    { key: "descontos", label: "Descontos", format: "currency" },
  ];

  return (
    <div className="container mx-auto py-6 space-y-4">
      <RhPageHeader
        title="01 — Resumo Folha"
        subtitle="Painel consolidado da folha de pagamento"
        hideSync
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportMut.mutate()}
              disabled={exportMut.isPending || !enabled}
            >
              {exportMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="mr-2 h-4 w-4" />
              )}
              Exportar Excel
            </Button>
            <Button size="sm" onClick={() => syncMut.mutate()} disabled={syncing || !enabled}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sincronizar RH
            </Button>
            <BotaoRelatorioModuloPdf
              modulo="resumo-folha"
              titulo="Resumo da Folha"
              disabled={!enabled || isLoading}
              dados={data ? { tipo: "resumo-folha", atual: data } : null}
              filtros={{ anomes_ini: baseParams.anomes_ini, anomes_fim: baseParams.anomes_fim, codemp: baseParams.codemp }}
              iaPayload={{ periodo: baseParams, kpis: data?.kpis, filiais: data?.filiais, tipos_evento: data?.tipos_evento, mensal: data?.mensal, top_proventos: data?.proventos_vantagens?.slice(0, 10), top_descontos: data?.descontos?.slice(0, 10) }}
              carregarAnterior={async () => {
                const len = baseParams.anomes_fim && baseParams.anomes_ini
                  ? (parseInt(baseParams.anomes_fim.slice(0, 4)) * 12 + parseInt(baseParams.anomes_fim.slice(4, 6))) - (parseInt(baseParams.anomes_ini.slice(0, 4)) * 12 + parseInt(baseParams.anomes_ini.slice(4, 6))) + 1
                  : 1;
                return fetchResumoFolhaDashboard({ anomes_ini: addMonths(baseParams.anomes_ini, -len), anomes_fim: addMonths(baseParams.anomes_ini, -1), codemp: baseParams.codemp }, "completo");
              }}
            />
          </>
        }
      />

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div><Label>Ano/mês inicial</Label><Input type="month" value={ini} onChange={(e) => setIni(e.target.value)} /></div>
          <div><Label>Ano/mês final</Label><Input type="month" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
          <div><Label>Empresa (codemp)</Label><Input value={codemp} onChange={(e) => setCodemp(e.target.value)} placeholder="1" /></div>
        </CardContent>

      </Card>

      {indisponivel && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <div className="font-medium">Endpoint de dashboard da folha ainda não disponível.</div>
          <div className="text-muted-foreground mt-1">
            O backend precisa expor <code>GET /api/rh/resumo-folha/dashboard?anomes_ini=YYYYMM&amp;anomes_fim=YYYYMM&amp;codemp=1</code>.
          </div>
        </div>
      )}

      {isError && !indisponivel && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          Falha ao carregar dashboard da folha: {(error as any)?.message ?? "erro desconhecido"}
        </div>
      )}

      {vmFolhaPendente && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Camada compatível VM_FOLHA pendente</div>
            <div className="text-muted-foreground mt-1">
              VM_FOLHA não existe fisicamente no Vetorh. A API precisa calcular a camada compatível a partir das tabelas reais do ERP Senior/Vetorh.
            </div>
          </div>
        </div>
      )}


      {!indisponivel && !isError && semDados && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-4 text-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-medium">Sem dados retornados pela API para o período selecionado.</div>
            {qtdLinhas === 0 && (
              <div className="text-xs text-muted-foreground mt-1">A API respondeu, mas nenhuma linha foi encontrada. Rode a sincronização para trazer os dados do ERP Senior/Vetorh.</div>
            )}
            <div className="mt-3">
              <Button size="sm" onClick={() => syncMut.mutate()} disabled={syncing || !enabled}>
                {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sincronizar agora
              </Button>
            </div>
          </div>
        </div>
      )}

      {!indisponivel && !semDados && mensal.length > 0 && (
        <>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Evolução mensal</CardTitle></CardHeader>
            <CardContent className="h-[360px]">
              {mensal.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  {isLoading ? "Carregando..." : "Sem dados no período"}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mensal.map((m) => ({ ...m, label: fmtCompetencia(m.competencia) }))}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="label" fontSize={12} />
                    <YAxis fontSize={11} tickFormatter={(v) => `R$ ${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="provento" name="Provento" fill="hsl(var(--primary))" />
                    <Bar dataKey="desconto" name="Desconto" fill="hsl(var(--destructive))" />
                    <Bar dataKey="total_liquido" name="Líquido" fill="hsl(var(--success))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Detalhamento mensal</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competência</TableHead>
                    <TableHead className="text-right">Provento</TableHead>
                    <TableHead className="text-right">Desconto</TableHead>
                    <TableHead className="text-right">Total Líquido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={4}><Skeleton className="h-6" /></TableCell></TableRow>}
                  {!isLoading && mensal.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Sem dados</TableCell></TableRow>
                  )}
                  {mensal.map((m, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{fmtCompetencia(m.competencia)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(m.provento ?? 0)}</TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">{formatCurrency(m.desconto ?? 0)}</TableCell>
                      <TableCell className="text-right tabular-nums text-primary font-semibold">{formatCurrency(m.total_liquido ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

            </CardContent>
          </Card>
        </>
      )}

      {!indisponivel && !semDados && (
        <>
          {/* Componentes VM_FOLHA pendentes (visível a todos) */}
          {Array.isArray((diagnostico as any)?.componentes_pendentes) &&
            (diagnostico as any).componentes_pendentes.length > 0 && (
              <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
                <div className="font-semibold text-warning mb-1">
                  Componentes não localizados pela API:
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-muted-foreground">
                  {(diagnostico as any).componentes_pendentes.map((c: any, i: number) => (
                    <li key={i}>
                      <span className="font-mono">{c?.campo ?? String(c)}</span>
                      {c?.motivo ? <> — {c.motivo}</> : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* KPIs */}

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Card className="md:row-span-2 border-l-4 border-l-primary">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Líquido</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-[11px] text-muted-foreground">Provento</div>
                  <div className="text-xl font-bold tabular-nums">
                    <ValueOrMissing value={kpis?.provento} missing={isMissing("provento")} field="provento" />
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-muted-foreground">Desconto</div>
                  <div className="text-xl font-bold tabular-nums text-destructive">
                    <ValueOrMissing value={kpis?.desconto} missing={isMissing("desconto")} field="desconto" />
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-[11px] text-muted-foreground">Total Líquido</div>
                  <div className="text-2xl font-bold tabular-nums text-primary">
                    <ValueOrMissing value={kpis?.total_liquido} missing={isMissing("total_liquido")} field="total_liquido" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <KpiOrMissing title="Custo Total" value={kpis?.custo_total} missing={isMissing("custo_total")} field="custo_total" variant="danger" loading={isLoading} />
            <KpiOrMissing title="Benefícios" value={kpis?.beneficios} missing={isMissing("beneficios")} field="beneficios" loading={isLoading} />
            <KpiOrMissing title="INSS Total" value={kpis?.inss_total} missing={isMissing("inss_total")} field="inss_total" loading={isLoading} />
            <KpiOrMissing title="Hora Extra" value={kpis?.hora_extra} missing={isMissing("hora_extra")} field="hora_extra" variant="warning" loading={isLoading} />

            <KpiOrMissing title="Provisões" value={kpis?.provisoes} missing={isMissing("provisoes")} field="provisoes" loading={isLoading} />
            <KpiOrMissing title="Custo das Férias" value={kpis?.custo_ferias} missing={isMissing("custo_ferias")} field="custo_ferias" loading={isLoading} footer={isAdmin && data?.fonte === "public.rh_vm_folha" ? "Em validação técnica" : undefined} />
            <KpiOrMissing title="Rescisões" value={kpis?.rescisoes} missing={isMissing("rescisoes")} field="rescisoes" variant="warning" loading={isLoading} />
            <KpiOrMissing title="FGTS" value={kpis?.fgts} missing={isMissing("fgts")} field="fgts" loading={isLoading} />
          </div>

          {/* Aviso técnico */}
          <div className="flex items-start gap-2 rounded-md border border-info/30 bg-info/5 px-3 py-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Indicadores retornados pela API a partir das tabelas oficiais do ERP Senior/Vetorh.</span>
          </div>

          {/* Diagnóstico Técnico (admin) */}
          {isAdmin && (diagnostico || data?.fonte) && (
            <Collapsible>
              <Card>
                <CollapsibleTrigger asChild>
                  <button className="w-full text-left">
                    <CardHeader className="py-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm">Diagnóstico Técnico</CardTitle>
                      <ChevronDown className="h-4 w-4" />
                    </CardHeader>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      {[
                        ["__fonte__", "Fonte"],
                        ["fonte_cards", "Fonte cards"],
                        ["vm_folha_status", "Status VM_FOLHA"],
                        ["qtd_linhas", "Qtd. linhas"],
                        ["qtd_linhas_vm_folha", "Qtd. linhas VM_FOLHA"],
                        ["anomes_ini", "Anomes inicial"],
                        ["anomes_fim", "Anomes final"],
                        ["menor_anomes_vm_folha", "Menor anomes"],
                        ["maior_anomes_vm_folha", "Maior anomes"],
                      ].map(([key, label]) => {
                        const v =
                          key === "__fonte__"
                            ? (data?.fonte === "public.rh_vm_folha"
                                ? "API RH / cache técnico public.rh_vm_folha"
                                : data?.fonte)
                            : (diagnostico as any)?.[key as string];
                        if (v == null) return null;
                        return (
                          <div key={key} className="rounded border bg-muted/40 p-2">
                            <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
                            <div className="font-mono break-all">{String(v)}</div>
                          </div>
                        );
                      })}

                    </div>
                    {(qtdLinhas === 0) && (
                      <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning font-medium">
                        API retornou 0 linhas para o período selecionado.
                      </div>
                    )}
                    {(diagnostico as any)?.erro_tecnico && (
                      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">
                        <div className="font-semibold text-destructive mb-1">Erro técnico</div>
                        <pre className="whitespace-pre-wrap text-[11px]">
                          {typeof (diagnostico as any).erro_tecnico === "string"
                            ? (diagnostico as any).erro_tecnico
                            : JSON.stringify((diagnostico as any).erro_tecnico, null, 2)}
                        </pre>
                      </div>
                    )}

                    {[
                      ["vm_folha_componentes", "VM_FOLHA — componentes"],
                      ["custo_total_componentes", "Custo Total — componentes"],
                      ["inss_componentes", "INSS — componentes"],
                      ["hora_extra_componentes", "Hora Extra — componentes"],
                      ["ferias_componentes", "Férias — componentes"],
                      ["fgts_componentes", "FGTS — componentes"],
                      ["provisoes_componentes", "Provisões — componentes"],
                    ].map(([key, label]) => {
                      const v = (diagnostico as any)?.[key];
                      if (v == null) return null;
                      return (
                        <div key={key}>
                          <div className="text-xs font-semibold mb-1">{label}</div>
                          <pre className="text-[11px] bg-muted p-2 rounded overflow-auto max-h-64">
                            {typeof v === "string" ? v : JSON.stringify(v, null, 2)}
                          </pre>
                        </div>
                      );
                    })}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}




          {/* Proventos / Descontos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-center">Proventos + Vantagens</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-[420px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow><TableHead className="w-16">Cód.</TableHead><TableHead>Evento</TableHead><TableHead className="text-right">Proventos (R$)</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && <TableRow><TableCell colSpan={3}><Skeleton className="h-6" /></TableCell></TableRow>}
                      {!isLoading && proventos.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Sem dados</TableCell></TableRow>}
                      {proventos.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground">{p.cd_evento ?? "-"}</TableCell>
                          <TableCell>{p.ds_evento ?? "-"}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(p.valor)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>


                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-center">Descontos</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-[420px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow><TableHead className="w-16">Cód.</TableHead><TableHead>Evento</TableHead><TableHead className="text-right">Desc. (R$)</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && <TableRow><TableCell colSpan={3}><Skeleton className="h-6" /></TableCell></TableRow>}
                      {!isLoading && descontos.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Sem dados</TableCell></TableRow>}
                      {descontos.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground">{p.cd_evento ?? "-"}</TableCell>
                          <TableCell className="text-xs">{p.ds_evento ?? "-"}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatCurrency(p.valor)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>


                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filial + Tipos de Evento */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-center">Filial</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-[420px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead>Cód.</TableHead>
                        <TableHead>Filial</TableHead>
                        {FILIAL_COLS.map((c) => (
                          <TableHead key={c.key} className="text-right">{c.label}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && <TableRow><TableCell colSpan={FILIAL_COLS.length + 2}><Skeleton className="h-6" /></TableCell></TableRow>}
                      {!isLoading && filiaisData.length === 0 && (
                        <TableRow><TableCell colSpan={FILIAL_COLS.length + 2} className="text-center text-muted-foreground py-4">Sem dados</TableCell></TableRow>
                      )}
                      {filiaisData.map((f, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-muted-foreground">{f.cd_filial ?? "-"}</TableCell>
                          <TableCell className="font-medium">{f.filial}</TableCell>
                          {FILIAL_COLS.map((c) => {
                            const present = c.key in (f as any);
                            const v = (f as any)[c.key];
                            return (
                              <TableCell key={c.key} className="text-right tabular-nums">
                                <ValueOrMissing value={v} missing={!present} field={c.key} format={c.format} />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-center">Tipos de Evento</CardTitle></CardHeader>
              <CardContent className="h-[420px]">
                {tiposPie.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem dados</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={tiposPie} dataKey="valor" nameKey="label" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                        {tiposPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number, _n: any, p: any) => `${formatCurrency(v)} (${((p?.payload?.pct ?? 0) * 100).toFixed(1)}%)`} />
                      <Legend verticalAlign="bottom" iconSize={8} formatter={(value, entry: any) => {
                        const pct = (entry?.payload?.pct ?? 0) * 100;
                        return `${value} — ${pct.toFixed(0)}%`;
                      }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <AiInsightsPanel
        modulo="resumo-folha"
        ready={!isLoading && !!data && !indisponivel && !semDados}
        payload={{
          periodo: { anomes_ini: baseParams.anomes_ini, anomes_fim: baseParams.anomes_fim, codemp: baseParams.codemp },
          kpis,
          filiais: filiaisData.slice(0, 20),
          top_proventos: [...proventos].sort((a: any, b: any) => (b.valor || 0) - (a.valor || 0)).slice(0, 10),
          top_descontos: [...descontos].sort((a: any, b: any) => (b.valor || 0) - (a.valor || 0)).slice(0, 10),
          tipos_evento: tipos,
          serie_mensal: mensal,
        }}
      />
    </div>
  );
}
