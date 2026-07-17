import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  fetchTelemetriaResumo, fetchTelemetriaRanking, fetchTelemetriaPorDia, fetchTelemetriaNaoUtilizadas,
  type TelemetriaOrigem, type TelemetriaResumo, type TelemetriaRankingRow,
  type TelemetriaPorDiaRow, type TelemetriaNaoUtilizadaRow,
} from '@/lib/navegacaoTelemetriaApi';
import { Button } from '@/components/ui/button';
import { Settings2 } from 'lucide-react';
import { formatDateBR, formatDateTimeBR, formatNumberBR } from '@/lib/format';
import { HistoricoTelaModal } from './HistoricoTelaModal';
import { AnaliseIaCard } from './AnaliseIaCard';
import { DeParaTelasModal } from './DeParaTelasModal';

const FONTES_WEB = new Set(['ERP_WEB', 'PORTAL_WEB', 'NAVEGACAO_WEB']);
const FONTE_NATIVO = 'ERP_SENIOR_NATIVO';
const REFRESH_MS = 30_000;

interface Props {
  origem: TelemetriaOrigem;
  filtros: { dias: number; modulo: string; usuario_filtro: string };
  /** Muda para forçar reload. */
  reloadKey: number;
}

export function MonitorTelasTab({ origem, filtros, reloadKey }: Props) {
  const queryClient = useQueryClient();

  const commonOpts = {
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  } as const;

  const resumo = useQuery<TelemetriaResumo>({
    queryKey: ['telemetria', origem, 'resumo', filtros],
    queryFn: () => fetchTelemetriaResumo(origem, filtros),
    ...commonOpts,
  });
  const ranking = useQuery<TelemetriaRankingRow[]>({
    queryKey: ['telemetria', origem, 'ranking', filtros, 100],
    queryFn: () => fetchTelemetriaRanking(origem, filtros, 100),
    ...commonOpts,
  });
  const porDia = useQuery<TelemetriaPorDiaRow[]>({
    queryKey: ['telemetria', origem, 'por-dia', filtros],
    queryFn: () => fetchTelemetriaPorDia(origem, filtros),
    ...commonOpts,
  });
  const naoUt = useQuery<TelemetriaNaoUtilizadaRow[]>({
    queryKey: ['telemetria', origem, 'nao-utilizadas', filtros],
    queryFn: () => fetchTelemetriaNaoUtilizadas(origem, filtros),
    ...commonOpts,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [drill, setDrill] = useState<{ cod: string | null; nome: string | null }>({ cod: null, nome: null });
  const [deParaOpen, setDeParaOpen] = useState(false);

  const load = () => {
    queryClient.invalidateQueries({ queryKey: ['telemetria', origem] });
  };

  useEffect(() => {
    if (reloadKey > 0) {
      queryClient.invalidateQueries({ queryKey: ['telemetria', origem] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  // "Atualizado há Xs" — força re-render a cada 5s.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const lastUpdatedAt = Math.max(
    resumo.dataUpdatedAt || 0,
    ranking.dataUpdatedAt || 0,
    porDia.dataUpdatedAt || 0,
    naoUt.dataUpdatedAt || 0,
  );
  const atualizadoHa = lastUpdatedAt
    ? Math.max(0, Math.round((Date.now() - lastUpdatedAt) / 1000))
    : null;

  const fonteInvalida = useMemo(() => {
    const fontes: string[] = [];
    if (resumo.data?.fonte) fontes.push(String(resumo.data.fonte).toUpperCase());
    (ranking.data ?? []).forEach((r) => r.fonte && fontes.push(String(r.fonte).toUpperCase()));
    if (fontes.length === 0) return false;
    if (origem === 'web') return fontes.some((f) => !FONTES_WEB.has(f));
    return fontes.some((f) => f !== FONTE_NATIVO);
  }, [resumo.data, ranking.data, origem]);

  const anyError = [resumo, ranking, porDia, naoUt].find((s) => s.error)?.error;
  const errorMsg = useMemo(() => errorMessage(anyError), [anyError]);

  const isVazio =
    !resumo.isLoading && !ranking.isLoading && !porDia.isLoading && !naoUt.isLoading &&
    !anyError &&
    (resumo.data?.total_acessos ?? 0) === 0 &&
    (ranking.data ?? []).length === 0 &&
    (porDia.data ?? []).length === 0 &&
    (naoUt.data ?? []).length === 0;

  const maxAcessos = useMemo(
    () => Math.max(1, ...(ranking.data ?? []).map((r) => r.acessos ?? 0)),
    [ranking.data],
  );

  const identificador = (r: { cod_tela: string | null; sig_processo?: string | null }) =>
    r.cod_tela || (origem === 'nativo' ? r.sig_processo ?? null : null);

  const nomeTela = (r: TelemetriaRankingRow | TelemetriaNaoUtilizadaRow) => {
    if (r.nome_tela) return r.nome_tela;
    if (origem === 'nativo' && r.sig_processo) return `Processo ${r.sig_processo}`;
    return '-';
  };

  const openDrill = (r: TelemetriaRankingRow) => {
    const id = identificador(r);
    if (!id) return;
    setDrill({ cod: id, nome: nomeTela(r) });
    setModalOpen(true);
  };

  const badgeDiasSemUso = (d: number | null | undefined) => {
    if (d === null || d === undefined) return <span className="text-muted-foreground">-</span>;
    if (d > 30) return <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/15">{d} dias</Badge>;
    if (d >= 15) return <Badge className="bg-orange-500/15 text-orange-600 hover:bg-orange-500/15">{d} dias</Badge>;
    return <Badge variant="outline">{d} dias</Badge>;
  };

  if (fonteInvalida) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Fonte incorreta</AlertTitle>
        <AlertDescription>
          {origem === 'nativo'
            ? 'Fonte incorreta: estes dados são do Portal Web, não do ERP Senior Nativo.'
            : 'Fonte incorreta para o Portal Web.'}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Falha ao carregar telemetria</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {isVazio && (
        <Alert>
          <AlertDescription>
            {origem === 'nativo'
              ? 'A telemetria nativa depende da regra GER-000CONCX01 no Senior. Nenhum evento nativo foi registrado ainda.'
              : 'Sem dados no período selecionado.'}
          </AlertDescription>
        </Alert>
      )}

      {origem === 'nativo' && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setDeParaOpen(true)}>
            <Settings2 className="h-4 w-4" />
            De-Para de Telas
          </Button>
        </div>
      )}


      <AnaliseIaCard
        origem={origem}
        filtros={filtros}
        resumo={resumo.data}
        porDia={porDia.data ?? []}
        ranking={ranking.data ?? []}
        naoUtilizadas={naoUt.data ?? []}
        disabled={resumo.isLoading || ranking.isLoading || porDia.isLoading || naoUt.isLoading || !!anyError}
      />

      {/* KPIs */}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total de Acessos" value={formatNumberBR(resumo.data?.total_acessos)} loading={resumo.isLoading} />
        <KpiCard
          label="Telas Usadas"
          value={
            resumo.data
              ? `${formatNumberBR(resumo.data.telas_usadas)}${
                  resumo.data.telas_catalogo != null ? ` / ${formatNumberBR(resumo.data.telas_catalogo)}` : ''
                }`
              : '-'
          }
          loading={resumo.isLoading}
        />
        <KpiCard
          label="Telas Sem Uso"
          value={formatNumberBR(resumo.data?.telas_sem_uso)}
          loading={resumo.isLoading}
          highlight={(resumo.data?.telas_sem_uso ?? 0) > 0 ? 'orange' : undefined}
        />
        {/*
          Card "Usuários Ativos": SEMPRE exibir o valor agregado do backend
          (resumo.usuarios_ativos). NUNCA recalcular no cliente com algo como
          `new Set(itens.map(i => i.codusu)).size` — CODUSU é opcional na
          telemetria nativa e a identidade oficial é NOMUSU, já contabilizada
          pelo backend com fallback.
        */}
        <KpiCard
          label="Usuários Ativos"
          value={formatNumberBR(resumo.data?.usuarios_ativos)}
          loading={resumo.isLoading}
          subtitle={
            resumo.data
              ? resumo.data.ultimo_acesso
                ? `Último acesso: ${formatDateTimeBR(resumo.data.ultimo_acesso)}`
                : 'Sem acesso no período.'
              : undefined
          }
        />
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Acessos por Dia</CardTitle></CardHeader>
        <CardContent className="h-[280px]">
          {porDia.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (porDia.data ?? []).length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Sem dados no período selecionado.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={porDia.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="dia" tickFormatter={formatDateBR} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(v) => formatDateBR(String(v))} />
                <Legend />
                <Bar yAxisId="l" dataKey="acessos" name="Acessos" fill="hsl(var(--primary))" />
                <Line yAxisId="r" type="monotone" dataKey="telas" name="Telas" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Ranking */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Ranking de Telas</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cód. Tela</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead className="text-right">Acessos</TableHead>
                  <TableHead className="text-right">Usuários</TableHead>
                  <TableHead>Primeiro Acesso</TableHead>
                  <TableHead>Último Acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.isLoading ? (
                  <TableRow><TableCell colSpan={7}><Skeleton className="h-24 w-full" /></TableCell></TableRow>
                ) : (ranking.data ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    Sem dados no período selecionado.
                  </TableCell></TableRow>
                ) : [...(ranking.data ?? [])].sort((a, b) => (b.acessos ?? 0) - (a.acessos ?? 0)).map((r, i) => {
                  const pct = Math.max(2, Math.round(((r.acessos ?? 0) / maxAcessos) * 100));
                  const id = identificador(r);
                  return (
                    <TableRow key={`${id}-${i}`} className={id ? 'cursor-pointer hover:bg-muted/50' : ''} onClick={() => id && openDrill(r)}>
                      <TableCell className="font-mono text-xs">{id ?? '-'}</TableCell>
                      <TableCell className="text-sm">{nomeTela(r)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.modulo ?? (origem === 'nativo' ? 'Não mapeado' : '-')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden h-1.5 w-24 overflow-hidden rounded bg-muted sm:block">
                            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-semibold tabular-nums">{formatNumberBR(r.acessos)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumberBR(r.usuarios)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTimeBR(r.primeiro_acesso)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTimeBR(r.ultimo_acesso)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Não utilizadas */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Telas Sem Uso</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cód. Tela</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead>Dias Sem Uso</TableHead>
                  <TableHead className="text-right">Total Histórico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {naoUt.isLoading ? (
                  <TableRow><TableCell colSpan={6}><Skeleton className="h-24 w-full" /></TableCell></TableRow>
                ) : (naoUt.data ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    Sem dados no período selecionado.
                  </TableCell></TableRow>
                ) : (naoUt.data ?? []).map((r, i) => (
                  <TableRow key={`${identificador(r)}-${i}`}>
                    <TableCell className="font-mono text-xs">{identificador(r) ?? '-'}</TableCell>
                    <TableCell className="text-sm">{nomeTela(r)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.modulo ?? (origem === 'nativo' ? 'Não mapeado' : '-')}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.ultimo_acesso ? formatDateTimeBR(r.ultimo_acesso) : <span className="italic">Nunca acessada</span>}
                    </TableCell>
                    <TableCell>{badgeDiasSemUso(r.dias_sem_uso)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(r.total_historico ?? 0) === 0
                        ? <Badge variant="outline">Nunca usada</Badge>
                        : formatNumberBR(r.total_historico)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <HistoricoTelaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        origem={origem}
        codTela={drill.cod}
        nomeTela={drill.nome}
        dias={filtros.dias}
      />

      {origem === 'nativo' && (
        <DeParaTelasModal
          open={deParaOpen}
          onOpenChange={setDeParaOpen}
          onSaved={load}
        />
      )}
    </div>
  );
}

function errorMessage(err: any): string | null {
  if (!err) return null;
  const status = err.statusCode;
  if (status === 401) return 'Sessão expirada. Faça login novamente.';
  if (status === 404) return 'Endpoint de telemetria ainda não disponível. Verifique se a API 8070 foi reiniciada.';
  return 'Não foi possível carregar a telemetria de telas.';
}

function KpiCard({ label, value, loading, highlight, subtitle }: {
  label: string; value: string; loading: boolean; highlight?: 'orange'; subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-24" />
        ) : (
          <>
            <div className={`mt-1 text-2xl font-semibold ${highlight === 'orange' ? 'text-orange-600' : ''}`}>{value}</div>
            {subtitle && <div className="mt-1 text-[11px] text-muted-foreground">{subtitle}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
