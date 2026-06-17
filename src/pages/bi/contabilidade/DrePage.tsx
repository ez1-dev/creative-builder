import { Fragment, useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/erp/PageHeader';
import { KpiGrid } from '@/components/bi/kpis/KpiGrid';
import { KpiCard } from '@/components/bi/kpis/KpiCard';
import { getApiUrl } from '@/lib/api';
import { formatCurrency, formatPercent } from '@/components/bi/utils/formatters';
import { toast } from 'sonner';
import { RefreshCw, TrendingUp, DollarSign, BarChart3, PiggyBank, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageDataProvider } from '@/lib/bi/PageDataContext';
import { UserWidgetsSlot } from '@/components/bi';

type Unidade = 'TODOS' | 'GENIUS' | 'ESTRUTURAL' | 'OUTROS';

interface DreLinha {
  ordem?: number;
  codigo_linha?: string;
  descricao?: string;
  total_realizado?: number | null;
  total_av?: number | null;
  total_orcado?: number | null;
  [k: string]: any;
}

const MESES: { key: string; numero: string; label: string }[] = [
  { key: 'jan', numero: '01', label: 'Janeiro' },
  { key: 'fev', numero: '02', label: 'Fevereiro' },
  { key: 'mar', numero: '03', label: 'Março' },
  { key: 'abr', numero: '04', label: 'Abril' },
  { key: 'mai', numero: '05', label: 'Maio' },
  { key: 'jun', numero: '06', label: 'Junho' },
  { key: 'jul', numero: '07', label: 'Julho' },
  { key: 'ago', numero: '08', label: 'Agosto' },
  { key: 'set', numero: '09', label: 'Setembro' },
  { key: 'out', numero: '10', label: 'Outubro' },
  { key: 'nov', numero: '11', label: 'Novembro' },
  { key: 'dez', numero: '12', label: 'Dezembro' },
];

const CODIGOS_TOTALIZADORES = new Set([
  'RECEITA_LIQUIDA', 'LUCRO_BRUTO', 'EBITDA', 'EBIT', 'RESULTADO_EXERCICIO',
]);

const fmtSigned = (v: number | null | undefined) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '-';
  const n = Number(v);
  if (n < 0) return `(${formatCurrency(Math.abs(n))})`;
  return formatCurrency(n);
};

const fmtSignedPct = (v: number | null | undefined) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '-';
  const n = Number(v);
  if (n < 0) return `(${formatPercent(Math.abs(n))})`;
  return formatPercent(n);
};

const currentYear = new Date().getFullYear();

function findByCodigo(linhas: DreLinha[], codigo: string): DreLinha | undefined {
  return linhas.find((l) => String(l.codigo_linha ?? '').trim().toUpperCase() === codigo);
}

export default function DrePage() {
  const [ano, setAno] = useState<number>(currentYear);
  const [unidade, setUnidade] = useState<Unidade>('TODOS');
  const [mesInicial, setMesInicial] = useState<string>('01');
  const [mesFinal, setMesFinal] = useState<string>('12');
  const [loading, setLoading] = useState(false);
  const [linhasRaw, setLinhasRaw] = useState<DreLinha[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [buscou, setBuscou] = useState(false);

  const handleMesInicialChange = (v: string) => {
    setMesInicial(v);
    if (v > mesFinal) {
      const novoFim = MESES.find((m) => m.numero === v);
      setMesFinal(v);
      if (novoFim) toast.info(`Mês final ajustado para ${novoFim.label}.`);
    }
  };

  const handleMesFinalChange = (v: string) => {
    if (v < mesInicial) {
      const novoIni = MESES.find((m) => m.numero === mesInicial);
      setMesFinal(mesInicial);
      if (novoIni) toast.info(`Mês final não pode ser anterior ao mês inicial (${novoIni.label}).`);
      return;
    }
    setMesFinal(v);
  };

  const carregarDre = async () => {
    setLoading(true);
    setErro(null);
    setBuscou(true);

    const unidadeParam =
      !unidade || String(unidade).trim().toUpperCase() === 'TODOS'
        ? ''
        : unidade;

    const base = getApiUrl();
    const url =
      `${base}/api/bi/contabilidade/dre-matriz?ano=${ano || '2026'}` +
      `&mes_ini=${mesInicial}&mes_fim=${mesFinal}` +
      `&unidade=${encodeURIComponent(unidadeParam)}`;

    console.log('[DRE] GET', url);

    try {
      const token = localStorage.getItem('erp_token');
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.status === 401) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      if (!response.ok) {
        throw new Error(`Erro ao carregar DRE: HTTP ${response.status}`);
      }

      const json = await response.json();
      const linhas: DreLinha[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : [];
      console.log('[DRE] Linhas recebidas', linhas.length);
      setLinhasRaw(linhas);
    } catch (e: any) {
      console.error('[DRE] Falha ao buscar /api/bi/contabilidade/dre-matriz', e);
      setErro(e?.message || String(e));
      setLinhasRaw([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDre();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, unidade, mesInicial, mesFinal]);

  const linhas = useMemo<DreLinha[]>(() => {
    return [...linhasRaw].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  }, [linhasRaw]);

  const isTotalizadora = (l: DreLinha) => {
    const cod = String(l.codigo_linha ?? '').trim().toUpperCase();
    return CODIGOS_TOTALIZADORES.has(cod);
  };

  const lReceita = findByCodigo(linhas, 'RECEITA_BRUTA');
  const lLucroBruto = findByCodigo(linhas, 'LUCRO_BRUTO');
  const lEbitda = findByCodigo(linhas, 'EBITDA');
  const lLiquido = findByCodigo(linhas, 'RESULTADO_EXERCICIO');

  const negClass = (v: any) => (v != null && Number(v) < 0 ? 'text-destructive' : '');

  const colunas: { key: string; label: string; isTotal?: boolean }[] = [
    ...MESES.filter((m) => m.numero >= mesInicial && m.numero <= mesFinal),
    { key: 'total', label: 'TOTAL', isTotal: true },
  ];

  const exportarXlsx = async () => {
    if (!linhas.length) {
      toast.info('Nada para exportar.');
      return;
    }
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Sapiens Control Center';
      wb.created = new Date();
      const ws = wb.addWorksheet(`DRE ${ano}`, { views: [{ state: 'frozen', xSplit: 1, ySplit: 6 }] });

      const FMT_MOEDA = '#,##0.00;[Red](#,##0.00);"-"';
      const FMT_PCT = '0.0%;[Red](0.0%);"-"';
      const FILL_HEADER = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF1F5F9' } };
      const FILL_TOTAL_LINHA = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFDBEAFE' } };
      const FILL_TOTAL_COL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFEFF6FF' } };
      const FONT_TOTAL = { bold: true, color: { argb: 'FF1E3A8A' } };
      const BORDER_THIN = { style: 'thin' as const, color: { argb: 'FFE2E8F0' } };
      const ALL_BORDERS = { top: BORDER_THIN, left: BORDER_THIN, bottom: BORDER_THIN, right: BORDER_THIN };

      const unidadeLabel = unidade === 'TODOS' ? 'Todas' : unidade;
      const mesIniLabel = MESES.find((m) => m.numero === mesInicial)?.label ?? mesInicial;
      const mesFimLabel = MESES.find((m) => m.numero === mesFinal)?.label ?? mesFinal;

      // Cabeçalho relatório
      ws.mergeCells(1, 1, 1, 1 + colunas.length * 3);
      ws.getCell(1, 1).value = 'Sapiens Control Center';
      ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };

      ws.mergeCells(2, 1, 2, 1 + colunas.length * 3);
      ws.getCell(2, 1).value = `Demonstração do Resultado — ${ano}`;
      ws.getCell(2, 1).font = { bold: true, size: 12 };

      ws.mergeCells(3, 1, 3, 1 + colunas.length * 3);
      ws.getCell(3, 1).value = `Unidade: ${unidadeLabel}   |   Período: ${mesIniLabel} a ${mesFimLabel}   |   Gerado em ${new Date().toLocaleString('pt-BR')}`;
      ws.getCell(3, 1).font = { italic: true, color: { argb: 'FF64748B' } };

      // Linha 5: cabeçalho de meses (merge 3 colunas cada)
      const rowMes = ws.getRow(5);
      const rowSub = ws.getRow(6);
      rowMes.getCell(1).value = 'Máscara';
      ws.mergeCells(5, 1, 6, 1);
      colunas.forEach((m, idx) => {
        const c0 = 2 + idx * 3;
        ws.mergeCells(5, c0, 5, c0 + 2);
        const cell = ws.getCell(5, c0);
        cell.value = m.label;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { bold: true };
        cell.fill = m.isTotal ? FILL_TOTAL_COL : FILL_HEADER;
        cell.border = ALL_BORDERS;
        ['Realizado', 'A.V.', 'Orçado'].forEach((lbl, j) => {
          const sc = rowSub.getCell(c0 + j);
          sc.value = lbl;
          sc.alignment = { horizontal: 'right' };
          sc.font = { bold: true };
          sc.fill = m.isTotal ? FILL_TOTAL_COL : FILL_HEADER;
          sc.border = ALL_BORDERS;
        });
      });
      rowMes.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      rowMes.getCell(1).font = { bold: true };
      rowMes.getCell(1).fill = FILL_HEADER;
      rowMes.getCell(1).border = ALL_BORDERS;

      // Dados
      linhas.forEach((l, i) => {
        const rowIdx = 7 + i;
        const row = ws.getRow(rowIdx);
        const total = isTotalizadora(l);
        row.getCell(1).value = l.descricao ?? '';
        row.getCell(1).border = ALL_BORDERS;
        if (total) {
          row.getCell(1).font = FONT_TOTAL;
          row.getCell(1).fill = FILL_TOTAL_LINHA;
        }
        colunas.forEach((m, idx) => {
          const c0 = 2 + idx * 3;
          const r = m.isTotal ? l.total_realizado : l[`${m.key}_realizado`];
          const av = m.isTotal ? l.total_av : l[`${m.key}_av`];
          const o = m.isTotal ? l.total_orcado : l[`${m.key}_orcado`];

          const cR = row.getCell(c0);
          const cA = row.getCell(c0 + 1);
          const cO = row.getCell(c0 + 2);

          cR.value = r == null || r === '' ? null : Number(r);
          cR.numFmt = FMT_MOEDA;
          cA.value = av == null || av === '' ? null : Number(av) / 100;
          cA.numFmt = FMT_PCT;
          cO.value = o == null || o === '' ? null : Number(o);
          cO.numFmt = FMT_MOEDA;

          [cR, cA, cO].forEach((c) => {
            c.alignment = { horizontal: 'right' };
            c.border = ALL_BORDERS;
            if (total) {
              c.font = FONT_TOTAL;
              c.fill = FILL_TOTAL_LINHA;
            } else if (m.isTotal) {
              c.fill = FILL_TOTAL_COL;
              if (total === false) c.font = { bold: true };
            }
          });
        });
      });

      // Larguras
      ws.getColumn(1).width = 42;
      for (let i = 0; i < colunas.length * 3; i++) {
        ws.getColumn(2 + i).width = 14;
      }

      // Auto-filter na linha 6
      ws.autoFilter = {
        from: { row: 6, column: 1 },
        to: { row: 6 + linhas.length, column: 1 + colunas.length * 3 },
      };

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dre_${ano}_${unidade}_${mesInicial}-${mesFinal}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('XLSX gerado.');
    } catch (e: any) {
      console.error('[DRE] export xlsx', e);
      toast.error(e?.message || 'Falha ao gerar XLSX');
    }
  };

  return (
    <PageDataProvider
      pageKey="contabilidade-dre"
      kpis={{}}
      series={{}}
      rows={linhas}
      filtros={{ ano, unidade }}
    >
      <div className="space-y-4 p-4">
        <PageHeader
          title="Contabilidade — DRE"
          description="Demonstração do Resultado em formato matriz mensal (API backend)."
        />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6 items-end">
              <div>
                <Label className="text-xs">Ano</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  value={ano}
                  onChange={(e) => setAno(Number(e.target.value) || currentYear)}
                />
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
              <div>
                <Button size="sm" className="h-8 w-full" onClick={carregarDre} disabled={loading}>
                  <RefreshCw className={cn('h-3.5 w-3.5 mr-1', loading && 'animate-spin')} />
                  {loading ? 'Atualizando...' : 'Atualizar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <KpiGrid cols={4}>
          <KpiCard
            title="Receita Bruta"
            value={fmtSigned(lReceita?.total_realizado ?? 0)}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <KpiCard
            title="Lucro Bruto"
            value={fmtSigned(lLucroBruto?.total_realizado ?? 0)}
            subtitle={lLucroBruto?.total_av != null ? fmtSignedPct(Number(lLucroBruto.total_av)) : undefined}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <KpiCard
            title="EBITDA"
            value={fmtSigned(lEbitda?.total_realizado ?? 0)}
            subtitle={lEbitda?.total_av != null ? fmtSignedPct(Number(lEbitda.total_av)) : undefined}
            icon={<BarChart3 className="h-4 w-4" />}
          />
          <KpiCard
            title="Lucro Líquido"
            value={fmtSigned(lLiquido?.total_realizado ?? 0)}
            subtitle={lLiquido?.total_av != null ? fmtSignedPct(Number(lLiquido.total_av)) : undefined}
            icon={<PiggyBank className="h-4 w-4" />}
          />
        </KpiGrid>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Demonstração do Resultado — {ano}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[70vh] relative">
              <table className="text-xs border-separate border-spacing-0">
                <thead>
                  <tr className="bg-muted">
                    <th
                      rowSpan={2}
                      className="sticky left-0 top-0 z-40 bg-muted px-3 py-2 text-left font-semibold border-b border-r min-w-[280px]"
                    >
                      Máscara
                    </th>
                    {colunas.map((m) => (
                      <th
                        key={m.key}
                        colSpan={3}
                        className={cn(
                          'sticky top-0 z-30 bg-muted px-3 py-2 text-center font-semibold border-b border-l',
                          m.isTotal && 'bg-primary/15',
                        )}
                      >
                        {m.label}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-muted">
                    {colunas.map((m) => (
                      <Fragment key={m.key}>
                        <th className={cn('sticky top-[34px] z-30 bg-muted px-2 py-1 text-right font-medium border-b border-l', m.isTotal && 'bg-primary/15')}>
                          Realizado
                        </th>
                        <th className={cn('sticky top-[34px] z-30 bg-muted px-2 py-1 text-right font-medium border-b', m.isTotal && 'bg-primary/15')}>
                          A.V.
                        </th>
                        <th className={cn('sticky top-[34px] z-30 bg-muted px-2 py-1 text-right font-medium border-b', m.isTotal && 'bg-primary/15')}>
                          Orçado
                        </th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={1 + colunas.length * 3} className="px-3 py-6 text-center text-muted-foreground">
                        Carregando DRE...
                      </td>
                    </tr>
                  )}
                  {!loading && erro && (
                    <tr>
                      <td colSpan={1 + colunas.length * 3} className="px-3 py-6 text-center text-destructive bg-destructive/10 font-medium">
                        Erro ao carregar DRE: {erro}
                      </td>
                    </tr>
                  )}
                  {!loading && !erro && buscou && linhas.length === 0 && (
                    <tr>
                      <td colSpan={1 + colunas.length * 3} className="px-3 py-6 text-center text-muted-foreground">
                        Nenhum dado encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                  {linhas.map((l, i) => {
                    const total = isTotalizadora(l);
                    const rowBg = total ? 'bg-primary/10 font-semibold' : i % 2 === 0 ? 'bg-background' : 'bg-muted/30';
                    const stickyBg = total ? 'bg-primary/10' : i % 2 === 0 ? 'bg-background' : 'bg-muted/30';
                    return (
                      <tr key={i} className={cn('border-t', rowBg)}>
                        <td
                          className={cn(
                            'sticky left-0 z-20 px-3 py-1.5 border-r border-b whitespace-nowrap',
                            stickyBg,
                          )}
                        >
                          {l.descricao ?? ''}
                        </td>
                        {colunas.map((m) => {
                          const r = m.isTotal ? l.total_realizado : l[`${m.key}_realizado`];
                          const av = m.isTotal ? l.total_av : l[`${m.key}_av`];
                          const o = m.isTotal ? l.total_orcado : l[`${m.key}_orcado`];
                          const totalCol = !!m.isTotal;
                          return (
                            <Fragment key={`${i}-${m.key}`}>
                              <td className={cn('px-2 py-1.5 text-right tabular-nums border-b border-l', negClass(r), totalCol && 'bg-primary/10 font-semibold')}>
                                {fmtSigned(r)}
                              </td>
                              <td className={cn('px-2 py-1.5 text-right tabular-nums border-b', negClass(av), totalCol && 'bg-primary/10 font-semibold')}>
                                {av != null ? fmtSignedPct(Number(av)) : '-'}
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
      </div>
    </PageDataProvider>
  );
}
