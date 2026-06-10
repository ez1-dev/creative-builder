import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileSpreadsheet, Loader2, Printer, Sparkles, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  RelatorioDocument, KpisBlocoGenerico, EvolucaoBlocoGenerico, RankingsBlocoGenerico,
  ComentariosIaBlocoGenerico, TabelaAnaliticaGenerica,
  useRelatorioIa, gerarPptxGenerico, exportarPdfRelatorio,
  type KpiCard, type RankingRow, type EvolucaoPoint,
} from '@/components/relatorio-executivo-generico';
import type { Passagem } from '@/components/passagens/PassagensDashboard';

type Etapa = 'wizard' | 'preview';

function fmtMes(d: string) {
  if (!d || d.length < 7) return d;
  const [y, m] = d.split('-');
  return `${m}/${y.slice(2)}`;
}
const BRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const NUM = (v: number) => new Intl.NumberFormat('pt-BR').format(v);

function ymdInicioMes(offset = 0) {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 10);
}
function ymdHoje() { return new Date().toISOString().slice(0, 10); }

export default function RelatorioExecutivoPassagensPage() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>('wizard');
  const [de, setDe] = useState(ymdInicioMes(-5));
  const [ate, setAte] = useState(ymdHoje());
  const [comIa, setComIa] = useState(true);
  const [dados, setDados] = useState<Passagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [exportandoPptx, setExportandoPptx] = useState(false);

  useEffect(() => {
    if (etapa !== 'preview') return;
    let cancel = false;
    setLoading(true); setErro(null);
    (async () => {
      const { data, error } = await supabase
        .from('passagens_aereas')
        .select('*')
        .gte('data_registro', de)
        .lte('data_registro', ate)
        .order('data_registro', { ascending: false });
      if (cancel) return;
      if (error) setErro(error.message);
      else setDados((data ?? []) as Passagem[]);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [etapa, de, ate]);

  const calc = useMemo(() => {
    const rows = dados;
    const total = rows.reduce((s, r) => s + Number(r.valor || 0), 0);
    const qtd = rows.length;
    const colabs = new Set(rows.map((r) => r.colaborador).filter(Boolean)).size;
    const destinos = new Set(rows.map((r) => r.destino).filter(Boolean) as string[]).size;
    const ticket = qtd > 0 ? total / qtd : 0;

    const mensalMap = new Map<string, { valor: number; qtd: number }>();
    for (const r of rows) {
      const key = (r.data_registro || '').slice(0, 7);
      if (!key) continue;
      const cur = mensalMap.get(key) ?? { valor: 0, qtd: 0 };
      cur.valor += Number(r.valor || 0);
      cur.qtd += 1;
      mensalMap.set(key, cur);
    }
    const mensal: EvolucaoPoint[] = Array.from(mensalMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ label: fmtMes(k), Valor: v.valor, Quantidade: v.qtd }));

    const aggBy = (key: keyof Passagem): RankingRow[] => {
      const m = new Map<string, number>();
      for (const r of rows) {
        const k = String((r[key] ?? '') || '').trim();
        if (!k) continue;
        m.set(k, (m.get(k) ?? 0) + Number(r.valor || 0));
      }
      return Array.from(m.entries()).map(([label, value]) => ({ label, value }));
    };

    return {
      kpis: [
        { label: 'Custo Total', value: BRL(total), accent: 'primary' as const },
        { label: 'Nº de Passagens', value: NUM(qtd), accent: 'success' as const },
        { label: 'Ticket Médio', value: BRL(ticket), accent: 'primary' as const },
        { label: 'Colaboradores', value: NUM(colabs), accent: 'primary' as const },
        { label: 'Destinos Únicos', value: NUM(destinos), accent: 'primary' as const },
        { label: 'Período (dias)', value: NUM(Math.max(1, Math.round((+new Date(ate) - +new Date(de)) / 86400000) + 1)), accent: 'primary' as const },
      ] as KpiCard[],
      mensal,
      topColab: aggBy('colaborador'),
      topDest: aggBy('destino'),
      topCia: aggBy('cia_aerea'),
      topCC: aggBy('centro_custo'),
    };
  }, [dados, de, ate]);

  const iaPayload = useMemo(() => ({
    contexto: { periodo: `${de} a ${ate}` },
    kpis: { custo_total: calc.kpis[0].value, nº_passagens: calc.kpis[1].value, ticket_medio: calc.kpis[2].value },
    mensal: calc.mensal,
    rankings: {
      colaboradores: calc.topColab.slice(0, 10),
      destinos: calc.topDest.slice(0, 10),
      cias: calc.topCia.slice(0, 10),
    },
  }), [calc, de, ate]);

  const ia = useRelatorioIa('passagens', etapa === 'preview' && comIa && !loading && dados.length > 0, iaPayload, `${de}-${ate}-${dados.length}`);

  const exportarPptx = async () => {
    setExportandoPptx(true);
    try {
      await gerarPptxGenerico({
        titulo: 'Relatório Executivo de Passagens Aéreas',
        subtitulo: 'Análise de Despesas com Viagens',
        periodo: `Período: ${de} a ${ate}`,
        fileName: `relatorio-passagens-${new Date().toISOString().slice(0, 10)}.pptx`,
        kpis: calc.kpis,
        evolucaoChartId: 'pa-evolucao',
        evolucaoTitulo: 'Evolução Mensal de Custos',
        rankings: [
          { titulo: 'Top Colaboradores', chartId: 'pa-rk-colab' },
          { titulo: 'Top Destinos', chartId: 'pa-rk-dest' },
          { titulo: 'Top Companhias', chartId: 'pa-rk-cia' },
          { titulo: 'Top Centros de Custo', chartId: 'pa-rk-cc' },
        ],
        comentariosIa: ia.data,
        tabela: {
          titulo: 'Últimas Passagens (top 25)',
          head: ['Data', 'Colaborador', 'Destino', 'Cia', 'Centro de Custo', 'Valor'],
          rows: dados.slice(0, 25).map((r) => [
            r.data_registro, r.colaborador, r.destino ?? '—', r.cia_aerea ?? '—', r.centro_custo ?? '—', BRL(Number(r.valor || 0)),
          ]),
        },
      });
      toast.success('PPTX gerado');
    } catch (e: any) { toast.error('Falha PPTX', { description: e?.message }); }
    finally { setExportandoPptx(false); }
  };

  if (etapa === 'wizard') {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="p-8 space-y-6">
          <div>
            <h1 className="text-xl font-semibold">Relatório Executivo de Passagens Aéreas</h1>
            <p className="text-sm text-muted-foreground mt-1">Configure o período e gere a análise executiva.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs"><Calendar className="inline h-3 w-3 mr-1" /> De</Label>
              <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs"><Calendar className="inline h-3 w-3 mr-1" /> Até</Label>
              <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={comIa} onChange={(e) => setComIa(e.target.checked)} className="w-4 h-4 accent-primary" />
            Incluir comentários executivos (IA)
          </label>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={() => navigate('/passagens-aereas')}>Cancelar</Button>
            <Button onClick={() => setEtapa('preview')}>
              <Sparkles className="h-4 w-4 mr-2" /> Gerar relatório
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={() => setEtapa('wizard')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Editar filtros
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportarPdfRelatorio}>
            <Printer className="h-4 w-4 mr-2" /> Exportar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportarPptx} disabled={exportandoPptx || loading}>
            {exportandoPptx ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
            Exportar PPTX
          </Button>
        </div>
      </div>

      {erro && <Alert variant="destructive" className="print:hidden"><AlertDescription>{erro}</AlertDescription></Alert>}

      <RelatorioDocument
        titulo="Relatório Executivo de Passagens Aéreas"
        subtitulo={`Período ${de} – ${ate} • ${dados.length} registro(s)`}
      >
        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando dados…
          </div>
        )}
        {!loading && (
          <>
            <KpisBlocoGenerico titulo="Visão Geral" cards={calc.kpis} />
            <EvolucaoBlocoGenerico
              titulo="Evolução Mensal de Custos"
              chartId="pa-evolucao"
              data={calc.mensal}
              series={[
                { key: 'Valor', color: 'hsl(var(--primary))', tipo: 'bar' },
                { key: 'Quantidade', color: 'hsl(var(--success))', tipo: 'line' },
              ]}
            />
            <RankingsBlocoGenerico
              titulo="Rankings por Dimensão"
              rankings={[
                { titulo: 'Top Colaboradores', rows: calc.topColab, chartId: 'pa-rk-colab' },
                { titulo: 'Top Destinos', rows: calc.topDest, chartId: 'pa-rk-dest' },
                { titulo: 'Top Companhias', rows: calc.topCia, chartId: 'pa-rk-cia' },
                { titulo: 'Top Centros de Custo', rows: calc.topCC, chartId: 'pa-rk-cc' },
              ]}
            />
            {comIa && <ComentariosIaBlocoGenerico comentarios={ia.data} loading={ia.loading} error={ia.error} />}
            <TabelaAnaliticaGenerica
              titulo="Últimas Passagens"
              rows={dados}
              colunas={[
                { header: 'Data', cell: (r) => r.data_registro },
                { header: 'Colaborador', cell: (r) => r.colaborador },
                { header: 'Destino', cell: (r) => r.destino ?? '—' },
                { header: 'Cia', cell: (r) => r.cia_aerea ?? '—' },
                { header: 'Centro de Custo', cell: (r) => r.centro_custo ?? '—' },
                { header: 'Projeto/Obra', cell: (r) => r.projeto_obra ?? '—' },
                { header: 'Valor', cell: (r) => BRL(Number(r.valor || 0)), align: 'right' },
              ]}
            />
          </>
        )}
      </RelatorioDocument>
    </div>
  );
}
