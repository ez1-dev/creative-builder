import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { AlertTriangle, MonitorSmartphone, RefreshCw } from 'lucide-react';
import {
  fetchTelemetriaResumo, fetchTelemetriaRanking, fetchTelemetriaPorDia, fetchTelemetriaNaoUtilizadas,
  type TelemetriaResumo, type TelemetriaRankingRow, type TelemetriaPorDiaRow, type TelemetriaNaoUtilizadaRow,
} from '@/lib/navegacaoTelemetriaApi';
import { HistoricoTelaModal } from '@/components/monitor-telas/HistoricoTelaModal';

const fmtNum = (v: number | null | undefined) =>
  v === null || v === undefined ? '-' : Number(v).toLocaleString('pt-BR');
const fmtDT = (iso: string | null | undefined) => {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleString('pt-BR'); } catch { return '-'; }
};
const fmtD = (iso: string | null | undefined) => {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return '-'; }
};

const OPCOES_DIAS = [7, 30, 60, 90];

type LoadState<T> = { loading: boolean; data: T | null; error: any };
const initial = <T,>(): LoadState<T> => ({ loading: true, data: null, error: null });

function is404OrOffline(err: any): boolean {
  if (!err) return false;
  return err.statusCode === 404 || err.isNetworkError === true || err.statusCode === 0;
}

export default function MonitorTelasPage() {
  const [dias, setDias] = useState<number>(30);
  const [modulo, setModulo] = useState('');
  const [usuario, setUsuario] = useState('');
  const [applied, setApplied] = useState({ dias: 30, modulo: '', usuario: '' });

  const [resumo, setResumo] = useState<LoadState<TelemetriaResumo>>(initial());
  const [ranking, setRanking] = useState<LoadState<TelemetriaRankingRow[]>>(initial());
  const [porDia, setPorDia] = useState<LoadState<TelemetriaPorDiaRow[]>>(initial());
  const [naoUt, setNaoUt] = useState<LoadState<TelemetriaNaoUtilizadaRow[]>>(initial());

  const [modalOpen, setModalOpen] = useState(false);
  const [drillTela, setDrillTela] = useState<{ cod: string | null; nome: string | null }>({ cod: null, nome: null });

  const load = useCallback((f: { dias: number; modulo: string; usuario: string }) => {
    const filtros = {
      dias: f.dias,
      modulo: f.modulo || undefined,
      usuario_filtro: f.usuario || undefined,
    };
    setResumo({ loading: true, data: null, error: null });
    setRanking({ loading: true, data: null, error: null });
    setPorDia({ loading: true, data: null, error: null });
    setNaoUt({ loading: true, data: null, error: null });

    fetchTelemetriaResumo(filtros)
      .then((d) => setResumo({ loading: false, data: d, error: null }))
      .catch((e) => setResumo({ loading: false, data: null, error: e }));
    fetchTelemetriaRanking(filtros, 100)
      .then((d) => setRanking({ loading: false, data: d, error: null }))
      .catch((e) => setRanking({ loading: false, data: null, error: e }));
    fetchTelemetriaPorDia(filtros)
      .then((d) => setPorDia({ loading: false, data: d, error: null }))
      .catch((e) => setPorDia({ loading: false, data: null, error: e }));
    fetchTelemetriaNaoUtilizadas(filtros)
      .then((d) => setNaoUt({ loading: false, data: d, error: null }))
      .catch((e) => setNaoUt({ loading: false, data: null, error: e }));
  }, []);

  useEffect(() => { load(applied); }, [applied, load]);

  const aplicar = () => setApplied({ dias, modulo, usuario });

  const anyOffline = useMemo(
    () => [resumo, ranking, porDia, naoUt].some((s) => is404OrOffline(s.error)),
    [resumo, ranking, porDia, naoUt],
  );

  const maxAcessos = useMemo(
    () => Math.max(1, ...(ranking.data ?? []).map((r) => r.acessos ?? 0)),
    [ranking.data],
  );

  const openDrill = (row: TelemetriaRankingRow) => {
    if (!row.cod_tela) return;
    setDrillTela({ cod: row.cod_tela, nome: row.nome_tela });
    setModalOpen(true);
  };

  const badgeDiasSemUso = (d: number | null | undefined) => {
    if (d === null || d === undefined) return <span className="text-muted-foreground">-</span>;
    if (d > 30) return <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/15">{d} dias</Badge>;
    if (d >= 15) return <Badge className="bg-orange-500/15 text-orange-600 hover:bg-orange-500/15">{d} dias</Badge>;
    return <Badge variant="outline">{d} dias</Badge>;
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <MonitorSmartphone className="h-6 w-6 text-primary" />
            Monitor de Telas
          </h1>
          <p className="text-sm text-muted-foreground">
            Telemetria de uso das telas do ERP Web — ranking, frequência e telas sem uso.
          </p>
        </div>
      </div>

      {anyOffline && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>API indisponível ou não atualizada</AlertTitle>
          <AlertDescription>
            Os endpoints de telemetria não responderam. Verifique se a porta 8070 foi reiniciada e tente novamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs">Período</Label>
            <Select value={String(dias)} onValueChange={(v) => setDias(Number(v))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OPCOES_DIAS.map((d) => <SelectItem key={d} value={String(d)}>{d} dias</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">Módulo</Label>
            <Input value={modulo} onChange={(e) => setModulo(e.target.value)} placeholder="Ex.: RH, BI, COMPRAS..." className="h-9" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Usuário</Label>
            <Input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Login ou email" className="h-9" />
          </div>
          <div className="flex items-end">
            <Button onClick={aplicar} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label="Total de Acessos" value={fmtNum(resumo.data?.total_acessos)} loading={resumo.loading} />
        <KpiCard label="Telas Usadas" value={fmtNum(resumo.data?.telas_usadas)} loading={resumo.loading} />
        <KpiCard
          label="Telas Sem Uso"
          value={fmtNum(resumo.data?.telas_sem_uso)}
          loading={resumo.loading}
          highlight={(resumo.data?.telas_sem_uso ?? 0) > 0 ? 'orange' : undefined}
        />
        <KpiCard label="Usuários Ativos" value={fmtNum(resumo.data?.usuarios_ativos)} loading={resumo.loading} />
        <KpiCard label="Último Acesso" value={fmtDT(resumo.data?.ultimo_acesso)} loading={resumo.loading} small />
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Acessos por Dia</CardTitle></CardHeader>
        <CardContent className="h-[280px]">
          {porDia.loading ? (
            <Skeleton className="h-full w-full" />
          ) : porDia.error ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {is404OrOffline(porDia.error) ? 'API indisponível.' : 'Não foi possível carregar a telemetria de telas.'}
            </div>
          ) : (porDia.data ?? []).length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Nenhum acesso encontrado para os filtros selecionados.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={porDia.data ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="dia" tickFormatter={fmtD} tick={{ fontSize: 11 }} />
                <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(v) => fmtD(String(v))} />
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
        <CardHeader className="pb-2"><CardTitle className="text-sm">Ranking de Telas Mais Usadas</CardTitle></CardHeader>
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
                {ranking.loading ? (
                  <TableRow><TableCell colSpan={7}><Skeleton className="h-24 w-full" /></TableCell></TableRow>
                ) : ranking.error ? (
                  <TableRow><TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    {is404OrOffline(ranking.error) ? 'API indisponível.' : 'Não foi possível carregar a telemetria de telas.'}
                  </TableCell></TableRow>
                ) : (ranking.data ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum acesso encontrado para os filtros selecionados.
                  </TableCell></TableRow>
                ) : (ranking.data ?? []).sort((a, b) => (b.acessos ?? 0) - (a.acessos ?? 0)).map((r, i) => {
                  const pct = Math.max(2, Math.round(((r.acessos ?? 0) / maxAcessos) * 100));
                  return (
                    <TableRow key={`${r.cod_tela}-${i}`} className="cursor-pointer hover:bg-muted/50" onClick={() => openDrill(r)}>
                      <TableCell className="font-mono text-xs">{r.cod_tela ?? '-'}</TableCell>
                      <TableCell className="text-sm">{r.nome_tela ?? '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.modulo ?? '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="hidden h-1.5 w-24 overflow-hidden rounded bg-muted sm:block">
                            <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-semibold tabular-nums">{fmtNum(r.acessos)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(r.usuarios)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDT(r.primeiro_acesso)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDT(r.ultimo_acesso)}</TableCell>
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
        <CardHeader className="pb-2"><CardTitle className="text-sm">Telas Sem Uso no Período</CardTitle></CardHeader>
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
                {naoUt.loading ? (
                  <TableRow><TableCell colSpan={6}><Skeleton className="h-24 w-full" /></TableCell></TableRow>
                ) : naoUt.error ? (
                  <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    {is404OrOffline(naoUt.error) ? 'API indisponível.' : 'Não foi possível carregar a telemetria de telas.'}
                  </TableCell></TableRow>
                ) : (naoUt.data ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    Nenhuma tela sem uso no período.
                  </TableCell></TableRow>
                ) : (naoUt.data ?? []).map((r, i) => (
                  <TableRow key={`${r.cod_tela}-${i}`}>
                    <TableCell className="font-mono text-xs">{r.cod_tela ?? '-'}</TableCell>
                    <TableCell className="text-sm">{r.nome_tela ?? '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.modulo ?? '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.ultimo_acesso ? fmtDT(r.ultimo_acesso) : <span className="italic">Nunca acessada</span>}
                    </TableCell>
                    <TableCell>{badgeDiasSemUso(r.dias_sem_uso)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(r.total_historico)}</TableCell>
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
        codTela={drillTela.cod}
        nomeTela={drillTela.nome}
        dias={applied.dias}
      />
    </div>
  );
}

function KpiCard({ label, value, loading, highlight, small }: {
  label: string; value: string; loading: boolean; highlight?: 'orange'; small?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-24" />
        ) : (
          <div className={`mt-1 font-semibold ${small ? 'text-sm' : 'text-2xl'} ${highlight === 'orange' ? 'text-orange-600' : ''}`}>
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
