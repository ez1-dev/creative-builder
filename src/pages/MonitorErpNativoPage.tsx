import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Database,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  Users,
  MonitorSmartphone,
  AlertCircle,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from "recharts";

import {
  buscarEventos,
  getPorDia,
  getRanking,
  getResumo,
  getSemUso,
  getUsuarios,
  mapTiplog,
  type MonitorErpEvento,
  type MonitorErpFiltros,
  type TipLog,
} from "@/lib/monitorErpNativoApi";
import { DeParaMonitorErpModal } from "@/components/monitor-erp-nativo/DeParaMonitorErpModal";
import { EdicaoTelaPopover } from "@/components/monitor-erp-nativo/EdicaoTelaPopover";
import { fetchDeParaMonitorErp } from "@/lib/monitorErpNativoDeparaApi";


const OPCOES_DIAS = [7, 30, 90, 180] as const;

function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const QUERY_OPTS = {
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  retry: 1,
};

function fmtNum(n?: number | null) {
  if (n === undefined || n === null || Number.isNaN(Number(n))) return "-";
  return new Intl.NumberFormat("pt-BR").format(Number(n));
}

function fmtDia(v?: string | null) {
  if (!v) return "-";
  const s = String(v);
  // aceita YYYY-MM-DD ou ISO
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

function fmtDataHora(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("pt-BR");
}

function CardKpi({
  label,
  value,
  loading,
  icon,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          {icon}
        </div>
        <div className="mt-2 text-2xl font-semibold text-foreground">
          {loading ? <Skeleton className="h-8 w-24" /> : fmtNum(value)}
        </div>
      </CardContent>
    </Card>
  );
}

function OperacaoBadge({ tiplog }: { tiplog?: string | null }) {
  const { label, variant } = mapTiplog(tiplog);
  const v = (tiplog ?? "").toString().toUpperCase();
  const Icon = v === "I" ? Plus : v === "A" ? Pencil : v === "E" ? Trash2 : Info;
  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" aria-hidden />
      <span>{label}</span>
    </Badge>
  );
}

function ErroBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Não foi possível carregar o Monitor do ERP Nativo.</AlertTitle>
      <AlertDescription className="mt-2">
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function VazioBlock() {
  return (
    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
      Sem registros no período selecionado.
    </div>
  );
}

export default function MonitorErpNativoPage() {
  const [dias, setDias] = useState<number>(30);
  const [telaInput, setTelaInput] = useState("");
  const [tabelaInput, setTabelaInput] = useState("");
  const [usuarioInput, setUsuarioInput] = useState("");
  const [tiplog, setTiplog] = useState<TipLog | "">("");

  const tela = useDebouncedValue(telaInput, 400);
  const tabela = useDebouncedValue(tabelaInput, 400);
  const usuario = useDebouncedValue(usuarioInput, 400);

  const filtros: MonitorErpFiltros = useMemo(
    () => ({ dias, tela, tabela, usuario_filtro: usuario, tiplog }),
    [dias, tela, tabela, usuario, tiplog],
  );

  const baseKey = [dias, tela, tabela, usuario, tiplog] as const;

  const qResumo = useQuery({
    queryKey: ["monitor-erp-nativo", "resumo", ...baseKey],
    queryFn: () => getResumo(filtros),
    ...QUERY_OPTS,
  });

  const qPorDia = useQuery({
    queryKey: ["monitor-erp-nativo", "por-dia", ...baseKey],
    queryFn: () => getPorDia(filtros),
    ...QUERY_OPTS,
  });

  const qRanking = useQuery({
    queryKey: ["monitor-erp-nativo", "ranking", ...baseKey],
    queryFn: () => getRanking(filtros, 100),
    ...QUERY_OPTS,
  });

  const qUsuarios = useQuery({
    queryKey: ["monitor-erp-nativo", "usuarios", ...baseKey],
    queryFn: () => getUsuarios(filtros, 200),
    ...QUERY_OPTS,
  });

  const qEventos = useQuery({
    queryKey: ["monitor-erp-nativo", "buscar", ...baseKey],
    queryFn: () => buscarEventos(filtros, 200),
    ...QUERY_OPTS,
  });

  const qSemUso = useQuery({
    queryKey: ["monitor-erp-nativo", "sem-uso", dias],
    queryFn: () => getSemUso(dias),
    ...QUERY_OPTS,
  });

  const qSemNome = useQuery({
    queryKey: ["monitor-erp-nativo", "depara"],
    queryFn: fetchDeParaMonitorErp,
    ...QUERY_OPTS,
  });



  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitulo, setDrawerTitulo] = useState<string>("");
  const [drawerFiltros, setDrawerFiltros] = useState<MonitorErpFiltros | null>(null);
  const [deParaOpen, setDeParaOpen] = useState(false);
  const queryClient = useQueryClient();

  const invalidarTudo = () =>
    queryClient.invalidateQueries({ queryKey: ["monitor-erp-nativo"] });


  const qDrawer = useQuery({
    queryKey: [
      "monitor-erp-nativo",
      "buscar-drawer",
      drawerFiltros?.dias,
      drawerFiltros?.tela,
      drawerFiltros?.tabela,
      drawerFiltros?.usuario_filtro,
      drawerFiltros?.tiplog,
    ],
    queryFn: () => buscarEventos(drawerFiltros!, 200),
    enabled: drawerOpen && !!drawerFiltros,
    ...QUERY_OPTS,
  });

  const abrirTela = (tela?: string | null, tabelaSel?: string | null) => {
    setDrawerTitulo(`Eventos — ${tela ?? "-"}${tabelaSel ? ` · ${tabelaSel}` : ""}`);
    setDrawerFiltros({ ...filtros, tela: tela ?? "", tabela: tabelaSel ?? filtros.tabela });
    setDrawerOpen(true);
  };
  const abrirUsuario = (u?: string | null) => {
    setDrawerTitulo(`Eventos — usuário ${u ?? "-"}`);
    setDrawerFiltros({ ...filtros, usuario_filtro: u ?? "" });
    setDrawerOpen(true);
  };

  const resumo = qResumo.data ?? {};
  const serie = qPorDia.data ?? [];
  const ranking = qRanking.data ?? [];
  const usuariosData = qUsuarios.data ?? [];
  const eventos = qEventos.data ?? [];
  const semUso = qSemUso.data ?? [];

  const anyError =
    qResumo.isError || qPorDia.isError || qRanking.isError || qUsuarios.isError || qEventos.isError;

  const refetchTudo = () => {
    qResumo.refetch();
    qPorDia.refetch();
    qRanking.refetch();
    qUsuarios.refetch();
    qEventos.refetch();
    qSemUso.refetch();
  };

  return (
    <TooltipProvider>
      <div className="space-y-4 p-4">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
              <Database className="h-6 w-6 text-primary" />
              Monitor de Telas — ERP Nativo
            </h1>
            <p className="text-sm text-muted-foreground">
              Auditoria nativa do ERP Senior (tabela <code className="rounded bg-muted px-1">e000log</code>):
              inclusões, alterações e exclusões de dados por tela, tabela e usuário.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeParaOpen(true)} className="gap-2">
              <Settings2 className="h-4 w-4" /> De-Para de Telas
            </Button>
            <Button variant="outline" size="sm" onClick={refetchTudo} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Atualizar
            </Button>
          </div>

        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-6">
            <div className="space-y-1 lg:col-span-2">
              <Label className="text-xs">Período</Label>
              <div className="flex flex-wrap gap-1">
                {OPCOES_DIAS.map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={dias === d ? "default" : "outline"}
                    onClick={() => setDias(d)}
                    className="h-9"
                  >
                    {d} dias
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tela</Label>
              <Input
                value={telaInput}
                onChange={(e) => setTelaInput(e.target.value)}
                placeholder="Código, nome ou atalho da tela"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tabela</Label>
              <Input
                value={tabelaInput}
                onChange={(e) => setTabelaInput(e.target.value)}
                placeholder="Nome da tabela"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Usuário</Label>
              <Input
                value={usuarioInput}
                onChange={(e) => setUsuarioInput(e.target.value)}
                placeholder="Login ou código do usuário"
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Operação</Label>
              <Select value={tiplog || "ALL"} onValueChange={(v) => setTiplog(v === "ALL" ? "" : (v as TipLog))}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="I">Inclusão</SelectItem>
                  <SelectItem value="A">Alteração</SelectItem>
                  <SelectItem value="E">Exclusão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {anyError && <ErroBlock onRetry={refetchTudo} />}

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <CardKpi
            label="Total de Gravações"
            value={resumo.total_gravacoes}
            loading={qResumo.isLoading}
            icon={<Database className="h-4 w-4 text-muted-foreground" />}
          />
          <CardKpi
            label="Telas Usadas"
            value={resumo.telas_usadas}
            loading={qResumo.isLoading}
            icon={<MonitorSmartphone className="h-4 w-4 text-muted-foreground" />}
          />
          <CardKpi
            label="Telas Sem Uso"
            value={resumo.telas_sem_uso}
            loading={qResumo.isLoading}
            icon={<Info className="h-4 w-4 text-muted-foreground" />}
          />
          <CardKpi
            label="Usuários Ativos"
            value={resumo.usuarios_ativos}
            loading={qResumo.isLoading}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="default" className="gap-1">
            <Plus className="h-3 w-3" /> Inclusões: {fmtNum(resumo.inclusoes)}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Pencil className="h-3 w-3" /> Alterações: {fmtNum(resumo.alteracoes)}
          </Badge>
          <Badge variant="destructive" className="gap-1">
            <Trash2 className="h-3 w-3" /> Exclusões: {fmtNum(resumo.exclusoes)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Fonte: {resumo.fonte ?? "ERP Senior (e000log)"}. Captura gravações de dados, não simples visualização de telas.
          </span>
        </div>

        {/* Gráfico por dia */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gravações por dia</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {qPorDia.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : serie.length === 0 ? (
              <VazioBlock />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="dia" tickFormatter={fmtDia} className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <RTooltip
                    labelFormatter={(l) => `Data: ${fmtDia(String(l))}`}
                    formatter={(value: any, name: any) => [fmtNum(Number(value)), name]}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="gravacoes"
                    name="Gravações"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="usuarios"
                    name="Usuários"
                    stroke="hsl(var(--accent-foreground))"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="telas" className="w-full">
          <TabsList>
            <TabsTrigger value="telas">Telas</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários</TabsTrigger>
            <TabsTrigger value="eventos">Eventos</TabsTrigger>
            <TabsTrigger value="sem-uso">Sem uso</TabsTrigger>
            <TabsTrigger value="sem-nome" className="gap-2">
              Telas sem nome
              {(qSemNome.data?.nao_mapeadas?.length ?? 0) > 0 && (
                <Badge className="bg-orange-500/15 text-orange-600 hover:bg-orange-500/15 h-5 px-1.5">
                  {qSemNome.data?.nao_mapeadas.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Ranking Telas */}
          <TabsContent value="telas">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ranking de telas</CardTitle>
              </CardHeader>
              <CardContent>
                {qRanking.isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : ranking.length === 0 ? (
                  <VazioBlock />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tela</TableHead>
                          <TableHead>Nome amigável</TableHead>
                          <TableHead>Atalho</TableHead>
                          <TableHead>Módulo</TableHead>
                          <TableHead>Tabela</TableHead>
                          <TableHead className="text-right">Gravações</TableHead>
                          <TableHead className="text-right">Usuários</TableHead>
                          <TableHead className="text-right">Incl.</TableHead>
                          <TableHead className="text-right">Alter.</TableHead>
                          <TableHead className="text-right">Excl.</TableHead>
                          <TableHead>Última mov.</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ranking.map((r) => (
                          <TableRow
                            key={`${r.tela ?? "-"}|${r.tabela ?? "-"}`}
                            onClick={() => abrirTela(r.tela, r.tabela)}
                            className="cursor-pointer"
                          >
                            <TableCell className="font-mono text-xs">{r.tela ?? "-"}</TableCell>
                            <TableCell className="max-w-[220px] truncate" title={r.nome_tela ?? undefined}>
                              {r.nome_tela ? (
                                <span className="font-medium">{r.nome_tela}</span>
                              ) : (
                                <span className="italic text-muted-foreground">— não mapeado —</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {r.atalho ? (
                                <Badge variant="outline" className="font-mono text-[11px]">{r.atalho}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {r.modulo ? (
                                <Badge variant="secondary" className="text-[11px]">{r.modulo}</Badge>
                              ) : (
                                <span className="text-xs italic text-muted-foreground">Não mapeado</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{r.tabela ?? "-"}</TableCell>
                            <TableCell className="text-right">{fmtNum(r.gravacoes)}</TableCell>
                            <TableCell className="text-right">{fmtNum(r.usuarios)}</TableCell>
                            <TableCell className="text-right">{fmtNum(r.inclusoes)}</TableCell>
                            <TableCell className="text-right">{fmtNum(r.alteracoes)}</TableCell>
                            <TableCell className="text-right">{fmtNum(r.exclusoes)}</TableCell>
                            <TableCell>{fmtDia(r.ultimo_dia)}</TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {r.tela && (
                                <EdicaoTelaPopover
                                  tela={r.tela}
                                  initial={{
                                    nome_tela: r.nome_tela,
                                    atalho: r.atalho,
                                    modulo: r.modulo,
                                    ativo: true,
                                  }}
                                  onSaved={invalidarTudo}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ranking Usuários */}
          <TabsContent value="usuarios">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quem está injetando dados</CardTitle>
              </CardHeader>
              <CardContent>
                {qUsuarios.isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : usuariosData.length === 0 ? (
                  <VazioBlock />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead className="text-right">Gravações</TableHead>
                          <TableHead className="text-right">Telas</TableHead>
                          <TableHead className="text-right">Incl.</TableHead>
                          <TableHead className="text-right">Alter.</TableHead>
                          <TableHead className="text-right">Excl.</TableHead>
                          <TableHead>Última mov.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usuariosData.map((u, i) => (
                          <TableRow
                            key={`${u.usuario ?? "-"}|${i}`}
                            onClick={() => abrirUsuario(u.usuario)}
                            className="cursor-pointer"
                          >
                            <TableCell className="font-medium">{u.usuario ?? "-"}</TableCell>
                            <TableCell className="text-right">{fmtNum(u.gravacoes)}</TableCell>
                            <TableCell className="text-right">{fmtNum(u.telas)}</TableCell>
                            <TableCell className="text-right">{fmtNum(u.inclusoes)}</TableCell>
                            <TableCell className="text-right">{fmtNum(u.alteracoes)}</TableCell>
                            <TableCell className="text-right">{fmtNum(u.exclusoes)}</TableCell>
                            <TableCell>{fmtDia(u.ultimo_dia)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Eventos */}
          <TabsContent value="eventos">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Eventos auditados</CardTitle>
              </CardHeader>
              <CardContent>
                <EventosTable eventos={eventos} loading={qEventos.isLoading} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sem uso */}
          <TabsContent value="sem-uso">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                <CardTitle className="text-base">Telas sem movimentação recente</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Sem uso significa sem gravação recente entre as telas e tabelas que possuem auditoria ativa no ERP.
                  </TooltipContent>
                </Tooltip>
              </CardHeader>
              <CardContent>
                {qSemUso.isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : semUso.length === 0 ? (
                  <VazioBlock />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tela</TableHead>
                          <TableHead>Nome amigável</TableHead>
                          <TableHead>Atalho</TableHead>
                          <TableHead>Módulo</TableHead>
                          <TableHead>Tabela</TableHead>
                          <TableHead>Última movimentação</TableHead>
                          <TableHead className="text-right">Dias sem uso</TableHead>
                          <TableHead className="text-right">Total histórico</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {semUso.map((r, i) => (
                          <TableRow key={`${r.tela ?? "-"}|${r.tabela ?? "-"}|${i}`}>
                            <TableCell className="font-mono text-xs">{r.tela ?? "-"}</TableCell>
                            <TableCell className="max-w-[220px] truncate" title={r.nome_tela ?? undefined}>
                              {r.nome_tela ? (
                                <span className="font-medium">{r.nome_tela}</span>
                              ) : (
                                <span className="italic text-muted-foreground">— não mapeado —</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {r.atalho ? (
                                <Badge variant="outline" className="font-mono text-[11px]">{r.atalho}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {r.modulo ? (
                                <Badge variant="secondary" className="text-[11px]">{r.modulo}</Badge>
                              ) : (
                                <span className="text-xs italic text-muted-foreground">Não mapeado</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{r.tabela ?? "-"}</TableCell>
                            <TableCell>{fmtDia(r.ultimo_dia)}</TableCell>
                            <TableCell className="text-right">{fmtNum(r.dias_sem_uso)}</TableCell>
                            <TableCell className="text-right">{fmtNum(r.total_historico)}</TableCell>
                            <TableCell>
                              {r.tela && (
                                <EdicaoTelaPopover
                                  tela={r.tela}
                                  initial={{
                                    nome_tela: r.nome_tela,
                                    atalho: r.atalho,
                                    modulo: r.modulo,
                                    ativo: true,
                                  }}
                                  onSaved={invalidarTudo}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Aviso fixo */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Sobre este monitor</AlertTitle>
          <AlertDescription>
            Este monitor reflete gravações de dados — inclusões, alterações e exclusões — auditadas pelo ERP Senior.
            Não representa simples visualização ou abertura de telas. A cobertura depende das tabelas que possuem log
            ativo no ERP.
          </AlertDescription>
        </Alert>

        {/* Drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{drawerTitulo}</SheetTitle>
              <SheetDescription>Detalhamento dos eventos filtrados.</SheetDescription>
            </SheetHeader>
            <div className="mt-4">
              <EventosTable eventos={qDrawer.data ?? []} loading={qDrawer.isLoading} />
            </div>
          </SheetContent>
        </Sheet>

        <DeParaMonitorErpModal
          open={deParaOpen}
          onOpenChange={setDeParaOpen}
          onSaved={invalidarTudo}
        />
      </div>
    </TooltipProvider>

  );
}

function EventosTable({
  eventos,
  loading,
}: {
  eventos: MonitorErpEvento[];
  loading: boolean;
}) {
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!eventos.length) return <VazioBlock />;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/Hora</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Tela</TableHead>
            <TableHead>Módulo</TableHead>
            <TableHead>Tabela</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Chave do registro</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {eventos.map((ev, i) => (
            <TableRow key={`${ev.data_hora ?? ev.dia ?? ""}|${ev.usuario ?? ""}|${ev.tela ?? ""}|${ev.tabela ?? ""}|${ev.chave ?? ""}|${i}`}>
              <TableCell className="whitespace-nowrap">
                {ev.data_hora ? fmtDataHora(ev.data_hora) : fmtDia(ev.dia)}
              </TableCell>
              <TableCell>{ev.usuario ?? "-"}</TableCell>
              <TableCell>
                <div className="flex flex-col leading-tight" title={ev.nome_tela ?? undefined}>
                  <span className="text-sm">
                    {ev.nome_tela ?? (
                      <span className="italic text-muted-foreground">— não mapeado —</span>
                    )}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {ev.tela ?? "-"}
                    {ev.atalho ? ` · ${ev.atalho}` : ""}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{ev.modulo ?? "-"}</TableCell>
              <TableCell className="text-muted-foreground">{ev.tabela ?? "-"}</TableCell>
              <TableCell>
                <OperacaoBadge tiplog={ev.tiplog ?? ev.acao} />
              </TableCell>
              <TableCell className="font-mono text-xs">
                {ev.chave && String(ev.chave).trim() ? ev.chave : (
                  <span className="italic text-muted-foreground">Não informada</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

