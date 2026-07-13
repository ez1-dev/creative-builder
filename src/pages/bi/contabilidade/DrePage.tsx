import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { PageHeader } from '@/components/erp/PageHeader';
import { KpiGrid } from '@/components/bi/kpis/KpiGrid';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { formatCurrency, formatPercent } from '@/components/bi/utils/formatters';
import { toast } from 'sonner';
import { AlertTriangle, TrendingUp, DollarSign, BarChart3, PiggyBank, FileSpreadsheet, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageDataProvider } from '@/lib/bi/PageDataContext';
import { UserWidgetsSlot } from '@/components/bi';
import { useDreDrill } from '@/hooks/useDreDrill';
import { DreDrillDrawer } from '@/components/bi/contabilidade/DreDrillDrawer';
import { DRE_DRILL_LABELS, type DreDrillTipo } from '@/lib/bi/dreDrillApi';
import { isLinhaCalculada } from '@/lib/bi/dreReabrir';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useDreApiHealth } from '@/lib/bi/dreErrors';
import { fetchDreMatriz, buildAnomesRange, FONTE_VALIDACAO_DRE, type DreLinhaApi, type DreMatrizMeta } from '@/lib/contabil/dreMatrizApi';
import { describeDreError } from '@/lib/bi/dreErrors';
import { getContabilBaseUrl } from '@/lib/contabil/contabilApi';
import { anomesToLabel } from '@/lib/contabil/anomes';
import { DreMetaBar } from '@/components/contabil/DreMetaBar';
import { DreIncompletoBanner } from '@/components/contabil/DreIncompletoBanner';
import { DreAcoesAdmin } from '@/components/contabil/DreAcoesAdminDialog';
import { DreConciliacaoBiTab } from '@/components/contabil/DreConciliacaoBiTab';

type Unidade = 'TODOS' | 'GENIUS' | 'ESTRUTURAL' | 'OUTROS';

const MESES: { numero: string; label: string }[] = [
  { numero: '01', label: 'Janeiro' }, { numero: '02', label: 'Fevereiro' },
  { numero: '03', label: 'Março' }, { numero: '04', label: 'Abril' },
  { numero: '05', label: 'Maio' }, { numero: '06', label: 'Junho' },
  { numero: '07', label: 'Julho' }, { numero: '08', label: 'Agosto' },
  { numero: '09', label: 'Setembro' }, { numero: '10', label: 'Outubro' },
  { numero: '11', label: 'Novembro' }, { numero: '12', label: 'Dezembro' },
];

const TOTAL_KEY = 'TOTAL_ANO';

const CODIGOS_TOTALIZADORES = new Set([
  'RECEITA_LIQUIDA', 'LUCRO_BRUTO', 'EBITDA', 'EBIT', 'RESULTADO_EXERCICIO',
]);

const fmtSigned = (v: number | null | undefined) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  if (n < 0) return `(${formatCurrency(Math.abs(n))})`;
  return formatCurrency(n);
};

const fmtSignedPct = (v: number | null | undefined) => {
  if (v === null || v === undefined || !Number.isFinite(Number(v))) return '0,00%';
  const n = Number(v);
  if (n < 0) return `(${formatPercent(Math.abs(n))})`;
  return formatPercent(n);
};

const currentYear = new Date().getFullYear();

function findByCodigo(linhas: DreLinhaApi[], codigo: string): DreLinhaApi | undefined {
  return linhas.find((l) => String(l.codigo_linha ?? '').trim().toUpperCase() === codigo);
}

function findByDescricao(linhas: DreLinhaApi[], substr: string): DreLinhaApi | undefined {
  const s = substr.toLowerCase();
  return linhas.find((l) => (l.descricao ?? '').toLowerCase().includes(s));
}

export default function DrePage() {
  const queryClient = useQueryClient();
  const perms = useUserPermissions();
  const isAdmin = perms.isAdmin;

  const [ano, setAno] = useState<number>(currentYear);
  const [unidade, setUnidade] = useState<Unidade>('TODOS');
  const [mesInicial, setMesInicial] = useState<string>('01');
  const [mesFinal, setMesFinal] = useState<string>('12');

  const [loading, setLoading] = useState(false);
  const [linhasRaw, setLinhasRaw] = useState<DreLinhaApi[]>([]);
  const [meta, setMeta] = useState<DreMatrizMeta | null>(null);
  const [erro, setErro] = useState<{ message: string; kind?: string } | null>(null);
  const [buscou, setBuscou] = useState(false);
  const [cacheDesatualizado, setCacheDesatualizado] = useState(false);
  const failCountRef = useRef(0);

  const health = useDreApiHealth();
  const apiOnline = health.isLoading ? null : (health.isSuccess ? true : false);

  const handleMesInicialChange = (v: string) => {
    setMesInicial(v);
    if (v > mesFinal) {
      setMesFinal(v);
      const label = MESES.find((m) => m.numero === v)?.label;
      if (label) toast.info(`Mês final ajustado para ${label}.`);
    }
  };

  const handleMesFinalChange = (v: string) => {
    if (v < mesInicial) {
      setMesFinal(mesInicial);
      const label = MESES.find((m) => m.numero === mesInicial)?.label;
      if (label) toast.info(`Mês final não pode ser anterior a ${label}.`);
      return;
    }
    setMesFinal(v);
  };

  const abortRef = useRef<AbortController | null>(null);

  const carregarDre = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setErro(null);
    setBuscou(true);
    setCacheDesatualizado(true);

    console.log('[DRE] GET matriz →', getContabilBaseUrl(), { ano, mesInicial, mesFinal, unidade });

    try {
      const resp = await fetchDreMatriz({
        ano, mes_ini: mesInicial, mes_fim: mesFinal,
        unidade: unidade === 'TODOS' ? undefined : unidade,
      });
      if (controller.signal.aborted) return;
      failCountRef.current = 0;
      setLinhasRaw(resp.linhas);
      setMeta(resp.meta);
      setCacheDesatualizado(false);
    } catch (e: any) {
      if (controller.signal.aborted) return;
      console.error('[DRE] Falha ao buscar matriz', e);
      const info = describeDreError(e);
      failCountRef.current += 1;
      setErro({ message: info.message, kind: info.kind });
      // Erro persistente ou de infraestrutura: NUNCA continuar mostrando números antigos.
      if (
        failCountRef.current >= 2 ||
        info.kind === 'api_offline' ||
        info.kind === 'erp_offline' ||
        info.kind === 'auth'
      ) {
        setLinhasRaw([]);
        setMeta(null);
      }
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  };

  const atualizarTela = () => {
    queryClient.invalidateQueries({ queryKey: ['dre-api-health'] });
    queryClient.invalidateQueries({ queryKey: ['dre-conciliacao-bi'] });
    carregarDre();
  };

  useEffect(() => {
    const t = setTimeout(() => { carregarDre(); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, unidade, mesInicial, mesFinal]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const linhas = useMemo<DreLinhaApi[]>(
    () => [...linhasRaw].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [linhasRaw],
  );

  const meses = useMemo(() => buildAnomesRange(ano, mesInicial, mesFinal), [ano, mesInicial, mesFinal]);
  const receita = useMemo(
    () => findByCodigo(linhas, 'RECEITA_BRUTA') ?? findByDescricao(linhas, 'receita bruta'),
    [linhas],
  );

  const colunas = useMemo(() => {
    const cols: { key: string; label: string; isTotal?: boolean }[] = meses.map((am) => ({
      key: am, label: anomesToLabel(am) || am,
    }));
    // Só mostra a coluna TOTAL se o backend enviou TOTAL_ANO em qualquer linha.
    const temTotal = linhas.some((l) => TOTAL_KEY in (l.valores ?? {}));
    if (temTotal) cols.push({ key: TOTAL_KEY, label: 'TOTAL', isTotal: true });
    return cols;
  }, [meses, linhas]);

  const isTotalizadora = (l: DreLinhaApi) => {
    const cod = String(l.codigo_linha ?? '').trim().toUpperCase();
    return CODIGOS_TOTALIZADORES.has(cod) || !!l.negrito;
  };

  const getRealizado = (l: DreLinhaApi, k: string) => l.valores?.[k]?.realizado ?? null;
  const getOrcado = (l: DreLinhaApi, k: string) => l.valores?.[k]?.orcado ?? null;
  const getSuspeito = (l: DreLinhaApi, k: string) => l.valores?.[k];

  // A.V. calculada apenas visualmente (única exceção permitida pela spec).
  const calcAV = (linha: DreLinhaApi, mes: string): number | null => {
    if (!receita) return null;
    const base = receita.valores?.[mes]?.realizado ?? null;
    const val = linha.valores?.[mes]?.realizado ?? null;
    if (val == null) return null;
    if (base == null || base === 0) return 0; // "0,00%"
    return (val / base) * 100;
  };

  // Motivos de dados incompletos (a partir do meta).
  const motivosIncompletos = useMemo<string[]>(() => {
    if (!meta) return [];
    const out: string[] = [];
    if (meta.meses_incompletos?.length) {
      out.push(`Competências incompletas: ${meta.meses_incompletos.map((m) => anomesToLabel(m) || m).join(', ')}`);
    }
    if (meta.sync_status === 'erro') out.push('A última sincronização terminou com erro.');
    if (meta.ultima_sincronizacao && meta.ultima_materializacao
        && new Date(meta.ultima_materializacao) < new Date(meta.ultima_sincronizacao)) {
      out.push('A materialização está mais antiga que a última sincronização.');
    }
    if (meta.conciliacao_divergente) out.push('O backend indicou divergência de conciliação.');
    if (meta.status === 'nao_materializado') out.push('A DRE ainda não foi materializada para o período.');
    return out;
  }, [meta]);

  // ---- Drill-down (mantido, agora sobre matriz nova) --------------------
  const drill = useDreDrill();
  const codigosLinha = useMemo(
    () => Array.from(new Set(linhas.map((l) => String(l.codigo_linha ?? '').trim().toUpperCase()).filter(Boolean))),
    [linhas],
  );
  const descricoesLinha = useMemo(() => {
    const map: Record<string, string> = {};
    linhas.forEach((l) => {
      const cod = String(l.codigo_linha ?? '').trim().toUpperCase();
      if (cod) map[cod] = l.descricao ?? cod;
    });
    return map;
  }, [linhas]);
  const TIPOS_CALCULADOS = new Set(['TOTAL', 'CALCULO', 'CÁLCULO']);

  const abrirDrill = (linha: DreLinhaApi, tipo: DreDrillTipo, mesKey: string) => {
    const codigoLinha = String(linha.codigo_linha ?? '').trim().toUpperCase();
    const tipoLinha = String(linha.tipo_linha ?? '').trim().toUpperCase();
    const calculada = TIPOS_CALCULADOS.has(tipoLinha) || isLinhaCalculada(codigoLinha);

    let tipoDrillFinal: DreDrillTipo = tipo;
    if (calculada && tipo !== 'REABRIR') {
      tipoDrillFinal = 'REABRIR';
      toast.info('Linha calculada — abrindo componentes da fórmula. Detalhe um componente para ver o drill.');
    }
    if (!codigoLinha) { toast.error('Linha da DRE sem código técnico para drill.'); return; }

    drill.openWith({
      ano,
      mes_ini: mesInicial,
      mes_fim: mesFinal,
      codigo_linha: codigoLinha,
      tipo_drill: tipoDrillFinal,
      unidade: unidade === 'TODOS' ? undefined : unidade,
      anomes_referente: mesKey === TOTAL_KEY ? null : mesKey,
    });
  };

  // ---- Exportação XLSX (fallback local, sem recálculo) -------------------
  const exportarXlsx = async () => {
    if (!linhas.length) { toast.info('Nada para exportar.'); return; }
    try {
      // TODO: preferir download binário via GET {DRE_API}/api/contabil/dre/matriz/export
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Sapiens Control Center';
      wb.created = new Date();
      const ws = wb.addWorksheet(`DRE ${ano}`, { views: [{ state: 'frozen', xSplit: 1, ySplit: 6 }] });
      const FMT = '#,##0.00;[Red](#,##0.00);"-"';

      const infoLinhas = [
        `Sapiens Control Center`,
        `Demonstração do Resultado — ${ano} (${mesInicial}-${mesFinal})`,
        `Unidade: ${unidade}   |   Fonte: ${meta?.fonte_saldo ?? '—'}   |   Modelo: ${meta?.modelo_nome ?? '—'}`,
        `Última sincronização: ${meta?.ultima_sincronizacao ?? '—'}   |   Último cálculo: ${meta?.ultima_materializacao ?? '—'}`,
      ];
      infoLinhas.forEach((txt, i) => {
        ws.mergeCells(i + 1, 1, i + 1, 1 + colunas.length * 3);
        ws.getCell(i + 1, 1).value = txt;
        ws.getCell(i + 1, 1).font = { bold: i === 0 };
      });
      if (motivosIncompletos.length) {
        const row = infoLinhas.length + 1;
        ws.mergeCells(row, 1, row, 1 + colunas.length * 3);
        ws.getCell(row, 1).value = `AVISO: ${motivosIncompletos.join(' | ')}`;
        ws.getCell(row, 1).font = { color: { argb: 'FFB45309' }, italic: true };
      }

      const headRow = 6;
      ws.getCell(headRow, 1).value = 'Máscara';
      ws.mergeCells(headRow, 1, headRow + 1, 1);
      colunas.forEach((m, idx) => {
        const c0 = 2 + idx * 3;
        ws.mergeCells(headRow, c0, headRow, c0 + 2);
        ws.getCell(headRow, c0).value = m.label;
        ws.getCell(headRow, c0).alignment = { horizontal: 'center' };
        ws.getCell(headRow, c0).font = { bold: true };
        ['Realizado', 'A.V.', 'Orçado'].forEach((lbl, j) => {
          ws.getCell(headRow + 1, c0 + j).value = lbl;
          ws.getCell(headRow + 1, c0 + j).font = { bold: true };
        });
      });

      linhas.forEach((l, i) => {
        const rowIdx = headRow + 2 + i;
        const row = ws.getRow(rowIdx);
        row.getCell(1).value = l.descricao ?? '';
        colunas.forEach((m, idx) => {
          const c0 = 2 + idx * 3;
          const r = getRealizado(l, m.key);
          const av = calcAV(l, m.key);
          const o = getOrcado(l, m.key);
          row.getCell(c0).value = r ?? null;
          row.getCell(c0).numFmt = FMT;
          row.getCell(c0 + 1).value = av != null ? av / 100 : null;
          row.getCell(c0 + 1).numFmt = '0.0%';
          row.getCell(c0 + 2).value = o ?? null;
          row.getCell(c0 + 2).numFmt = FMT;
        });
      });

      ws.getColumn(1).width = 42;
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DRE_${ano}_${mesInicial}-${mesFinal}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(`Falha ao exportar: ${e?.message ?? e}`);
    }
  };

  // Cards derivados exclusivamente do payload.
  const cardReceita = receita;
  const cardLucroBruto = findByCodigo(linhas, 'LUCRO_BRUTO');
  const cardEbitda = findByCodigo(linhas, 'EBITDA');
  const cardResultado = findByCodigo(linhas, 'RESULTADO_EXERCICIO');

  const totalRealizado = (l?: DreLinhaApi) => (l ? (l.valores?.[TOTAL_KEY]?.realizado ?? null) : null);

  const negClass = (v: any) => (v != null && Number(v) < 0 ? 'text-destructive' : '');

  // Renderiza estado global (banners de erro/estado antes da matriz).
  const renderEstadoBanner = () => {
    if (loading && linhas.length === 0) return null;
    if (erro) {
      const kind = erro.kind;
      let title = 'Erro ao carregar DRE';
      let msg = erro.message;
      if (kind === 'api_offline' || kind === 'timeout') {
        title = 'API indisponível';
        msg = 'Não foi possível acessar a API da DRE.';
      } else if (kind === 'not_found') {
        title = 'Rota não encontrada';
      }
      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-3 text-sm">
            <div className="font-semibold text-destructive">{title}</div>
            <div className="text-destructive/80">{msg}</div>
          </CardContent>
        </Card>
      );
    }
    if (meta?.status === 'nao_materializado') {
      return (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-3 text-sm">
            <div className="font-semibold text-amber-900 dark:text-amber-200">Resultado não materializado</div>
            <div className="text-amber-900/80 dark:text-amber-200/80">
              Os saldos foram sincronizados, mas a DRE ainda não foi recalculada.
            </div>
          </CardContent>
        </Card>
      );
    }
    if (meta?.status === 'desatualizado') {
      return (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-3 text-sm">
            <div className="font-semibold text-amber-900 dark:text-amber-200">Dados desatualizados</div>
            <div className="text-amber-900/80 dark:text-amber-200/80">
              Os dados apresentados foram calculados antes da última sincronização.
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  return (
    <PageDataProvider pageKey="bi.contabilidade.dre">
      <TooltipProvider>
        <div className="space-y-4 p-4">
          <PageHeader
            title="Contabilidade — DRE"
            description="Demonstração do Resultado materializada pelo backend contábil unificado."
            actions={
              <Button asChild size="sm" variant="outline">
                <Link to="/bi/contabilidade/dre-excecoes"><Flag className="h-4 w-4 mr-1" />Exceções</Link>
              </Button>
            }
          />

          <DreMetaBar meta={meta} apiOnline={apiOnline} loading={health.isLoading} />
          {renderEstadoBanner()}
          <DreIncompletoBanner motivos={motivosIncompletos} />
          {cacheDesatualizado && loading && linhas.length > 0 && (
            <div className="text-xs text-muted-foreground italic">
              Dados em cache — recarregando…
            </div>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Filtros e ações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-6 items-end">
                <div>
                  <Label className="text-xs">Ano</Label>
                  <Input type="number" className="h-8 text-xs" value={ano}
                    onChange={(e) => setAno(Number(e.target.value) || currentYear)} />
                </div>
                <div>
                  <Label className="text-xs">Mês inicial</Label>
                  <Select value={mesInicial} onValueChange={handleMesInicialChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESES.map((m) => (
                        <SelectItem key={m.numero} value={m.numero}>{m.numero} - {m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Mês final</Label>
                  <Select value={mesFinal} onValueChange={handleMesFinalChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESES.map((m) => (
                        <SelectItem key={m.numero} value={m.numero}>{m.numero} - {m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Unidade de negócio</Label>
                  <Select value={unidade} onValueChange={(v) => setUnidade(v as Unidade)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODOS">Todos</SelectItem>
                      <SelectItem value="GENIUS">GENIUS</SelectItem>
                      <SelectItem value="ESTRUTURAL">Estrutural</SelectItem>
                      <SelectItem value="OUTROS">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Ações</Label>
                  <div className="flex flex-wrap gap-2">
                    <DreAcoesAdmin
                      ano={ano} mesIni={mesInicial} mesFim={mesFinal}
                      modeloId={meta?.modelo_id ?? null}
                      isAdmin={isAdmin}
                      onAtualizarTela={atualizarTela}
                      loading={loading}
                    />
                    <Button size="sm" variant="outline" className="h-8" onClick={exportarXlsx}
                      disabled={loading || linhas.length === 0}>
                      <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                      Exportar XLSX
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <KpiGrid cols={4}>
            <KpiCard title={cardReceita?.descricao ?? 'Receita Bruta de Vendas'}
              value={fmtSigned(totalRealizado(cardReceita))} icon={<DollarSign className="h-4 w-4" />} />
            <KpiCard title={cardLucroBruto?.descricao ?? 'Lucro Bruto'}
              value={fmtSigned(totalRealizado(cardLucroBruto))} icon={<TrendingUp className="h-4 w-4" />} />
            <KpiCard title={cardEbitda?.descricao ?? 'EBITDA'}
              value={fmtSigned(totalRealizado(cardEbitda))} icon={<BarChart3 className="h-4 w-4" />} />
            <KpiCard title="Resultado do Exercício"
              value={fmtSigned(totalRealizado(cardResultado))} icon={<PiggyBank className="h-4 w-4" />} />
          </KpiGrid>

          <Tabs defaultValue="dre" className="w-full">
            <TabsList>
              <TabsTrigger value="dre">DRE</TabsTrigger>
              <TabsTrigger value="conciliacao">Conciliação BI</TabsTrigger>
            </TabsList>

            <TabsContent value="dre" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Demonstração do Resultado — {ano}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto max-h-[70vh] relative">
                    <table className="text-xs border-separate border-spacing-0">
                      <thead>
                        <tr className="bg-muted">
                          <th rowSpan={2} className="sticky left-0 top-0 z-40 bg-muted px-3 py-2 text-left font-semibold border-b border-r min-w-[280px]">
                            Máscara
                          </th>
                          {colunas.map((m) => (
                            <th key={m.key} colSpan={3}
                              className={cn('sticky top-0 z-30 bg-muted px-3 py-2 text-center font-semibold border-b border-l',
                                m.isTotal && 'bg-primary/15')}>
                              {m.label}
                            </th>
                          ))}
                        </tr>
                        <tr className="bg-muted">
                          {colunas.map((m) => (
                            <Fragment key={m.key}>
                              <th className={cn('sticky top-[34px] z-30 bg-muted px-2 py-1 text-right font-medium border-b border-l', m.isTotal && 'bg-primary/15')}>Realizado</th>
                              <th className={cn('sticky top-[34px] z-30 bg-muted px-2 py-1 text-right font-medium border-b', m.isTotal && 'bg-primary/15')}>A.V.</th>
                              <th className={cn('sticky top-[34px] z-30 bg-muted px-2 py-1 text-right font-medium border-b', m.isTotal && 'bg-primary/15')}>Orçado</th>
                            </Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loading && linhas.length === 0 && (
                          <tr><td colSpan={1 + colunas.length * 3} className="px-3 py-6 text-center text-muted-foreground">
                            Carregando resultado contábil...
                          </td></tr>
                        )}
                        {!loading && !erro && buscou && linhas.length === 0 && (
                          <tr><td colSpan={1 + colunas.length * 3} className="px-3 py-6 text-center text-muted-foreground">
                            Nenhum dado retornado pelo backend para os filtros selecionados.
                          </td></tr>
                        )}
                        {linhas.map((l, i) => {
                          const total = isTotalizadora(l);
                          const rowBg = total ? 'bg-primary/10 font-semibold' : i % 2 === 0 ? 'bg-background' : 'bg-muted/30';
                          const stickyBg = total ? 'bg-primary/10' : i % 2 === 0 ? 'bg-background' : 'bg-muted/30';
                          return (
                            <tr key={i} className={cn('border-t', rowBg)}>
                              <td className={cn('sticky left-0 z-20 px-3 py-1.5 border-r border-b whitespace-nowrap', stickyBg)}>
                                {l.descricao ?? ''}
                              </td>
                              {colunas.map((m) => {
                                const r = getRealizado(l, m.key);
                                const av = calcAV(l, m.key);
                                const o = getOrcado(l, m.key);
                                const cel = getSuspeito(l, m.key);
                                const suspeito = !!cel?.suspeito;
                                const totalCol = !!m.isTotal;
                                const codLinha = String(l.codigo_linha ?? '').trim().toUpperCase();
                                const podeReabrir = isLinhaCalculada(codLinha);
                                const drillOpts: { tipo: DreDrillTipo; label: string }[] = [
                                  ...(podeReabrir ? [{ tipo: 'REABRIR' as DreDrillTipo, label: DRE_DRILL_LABELS.REABRIR }] : []),
                                  { tipo: 'CENTRO_CUSTOS', label: DRE_DRILL_LABELS.CENTRO_CUSTOS },
                                  { tipo: 'CONTA_CONTABIL', label: DRE_DRILL_LABELS.CONTA_CONTABIL },
                                  { tipo: 'ORIGEM', label: DRE_DRILL_LABELS.ORIGEM },
                                  { tipo: 'TRANSACAO', label: DRE_DRILL_LABELS.TRANSACAO },
                                  { tipo: 'HISTORICO', label: DRE_DRILL_LABELS.HISTORICO },
                                  { tipo: 'LANCAMENTO', label: DRE_DRILL_LABELS.LANCAMENTO },
                                  { tipo: 'UNIDADE', label: DRE_DRILL_LABELS.UNIDADE },
                                ];
                                return (
                                  <Fragment key={`${i}-${m.key}`}>
                                    <ContextMenu>
                                      <ContextMenuTrigger asChild>
                                        <td
                                          className={cn(
                                            'px-2 py-1.5 text-right tabular-nums border-b border-l cursor-context-menu hover:bg-accent/30',
                                            negClass(r),
                                            totalCol && 'bg-primary/10 font-semibold',
                                            suspeito && 'bg-amber-100/50 dark:bg-amber-900/20',
                                          )}
                                          onDoubleClick={() => codLinha && !totalCol && abrirDrill(l, podeReabrir ? 'REABRIR' : 'LANCAMENTO', m.key)}
                                          title="Clique direito para opções de drill; duplo clique = Lançamentos"
                                        >
                                          {suspeito ? (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span className="inline-flex items-center gap-1">
                                                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                                                  {fmtSigned(r)}
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                {cel?.motivo_suspeita ?? 'Célula sinalizada como possivelmente incompleta.'}
                                              </TooltipContent>
                                            </Tooltip>
                                          ) : fmtSigned(r)}
                                        </td>
                                      </ContextMenuTrigger>
                                      <ContextMenuContent className="w-56">
                                        <ContextMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                          {l.descricao} — {m.label}
                                        </ContextMenuLabel>
                                        <ContextMenuSeparator />
                                        {drillOpts.map((opt) => (
                                          <ContextMenuItem
                                            key={opt.tipo}
                                            className="text-xs"
                                            disabled={!codLinha || totalCol}
                                            onSelect={(e) => { e.preventDefault(); if (codLinha) abrirDrill(l, opt.tipo, m.key); }}
                                          >
                                            {opt.label}
                                          </ContextMenuItem>
                                        ))}
                                      </ContextMenuContent>
                                    </ContextMenu>
                                    <td className={cn('px-2 py-1.5 text-right tabular-nums border-b', negClass(av), totalCol && 'bg-primary/10 font-semibold')}>
                                      {fmtSignedPct(av)}
                                    </td>
                                    <td className={cn('px-2 py-1.5 text-right tabular-nums border-b', negClass(o), totalCol && 'bg-primary/10 font-semibold')}>
                                      {fmtSigned(o)}
                                    </td>
                                  </Fragment>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4 mt-4">
                <UserWidgetsSlot section="kpis" cols={4} emptyHint={false} />
                <UserWidgetsSlot section="charts" cols={2} emptyHint={false} />
                <UserWidgetsSlot section="tables" cols={1} emptyHint={false} />
              </div>
            </TabsContent>

            <TabsContent value="conciliacao" className="mt-4">
              <DreConciliacaoBiTab
                ano={ano} mes_ini={mesInicial} mes_fim={mesFinal}
                modelo_id={meta?.modelo_id ?? null}
                unidade={unidade === 'TODOS' ? undefined : unidade}
              />
            </TabsContent>
          </Tabs>

          <DreDrillDrawer
            open={drill.open}
            onOpenChange={drill.setOpen}
            stack={drill.stack}
            onPush={drill.push}
            onPop={drill.pop}
            onGoTo={drill.goTo}
            codigosLinha={codigosLinha}
            descricoesLinha={descricoesLinha}
          />
        </div>
      </TooltipProvider>
    </PageDataProvider>
  );
}
