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
import type { ManutencaoMaquina } from '@/components/maquinas/MaquinasDashboard';

type Etapa = 'wizard' | 'preview';
const BRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const NUM = (v: number) => new Intl.NumberFormat('pt-BR').format(v);
function fmtMes(d: string) { if (!d || d.length < 7) return d; const [y, m] = d.split('-'); return `${m}/${y.slice(2)}`; }
function ymdInicioMes(offset = 0) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset); return d.toISOString().slice(0, 10); }
function ymdHoje() { return new Date().toISOString().slice(0, 10); }

export default function RelatorioExecutivoMaquinasPage() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>('wizard');
  const [de, setDe] = useState(ymdInicioMes(-5));
  const [ate, setAte] = useState(ymdHoje());
  const [comIa, setComIa] = useState(true);
  const [dados, setDados] = useState<ManutencaoMaquina[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [exportandoPptx, setExportandoPptx] = useState(false);

  useEffect(() => {
    if (etapa !== 'preview') return;
    let cancel = false;
    setLoading(true); setErro(null);
    (async () => {
      const { data, error } = await (supabase as any)
        .from('manutencao_maquinas').select('*')
        .gte('data', de).lte('data', ate)
        .order('data', { ascending: false });
      if (cancel) return;
      if (error) setErro(error.message);
      else setDados((data ?? []) as ManutencaoMaquina[]);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [etapa, de, ate]);

  const calc = useMemo(() => {
    const rows = dados;
    const total = rows.reduce((s, r) => s + Number(r.valor || 0), 0);
    const qtd = rows.length;
    const maquinas = new Set(rows.map((r) => r.maquina).filter(Boolean)).size;
    const fornecedores = new Set(rows.map((r) => r.fornecedor).filter(Boolean) as string[]).size;
    const ticket = qtd > 0 ? total / qtd : 0;
    const custoMedioMaq = maquinas > 0 ? total / maquinas : 0;

    const mensalMap = new Map<string, { valor: number; qtd: number }>();
    for (const r of rows) {
      const key = (r.data || '').slice(0, 7);
      if (!key) continue;
      const cur = mensalMap.get(key) ?? { valor: 0, qtd: 0 };
      cur.valor += Number(r.valor || 0); cur.qtd += 1;
      mensalMap.set(key, cur);
    }
    const mensal: EvolucaoPoint[] = Array.from(mensalMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ label: fmtMes(k), Custo: v.valor, Intervenções: v.qtd }));

    const aggBy = (key: keyof ManutencaoMaquina): RankingRow[] => {
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
        { label: 'Nº de Intervenções', value: NUM(qtd), accent: 'success' as const },
        { label: 'Custo por Intervenção', value: BRL(ticket), accent: 'primary' as const },
        { label: 'Máquinas', value: NUM(maquinas), accent: 'primary' as const },
        { label: 'Custo Médio/Máquina', value: BRL(custoMedioMaq), accent: 'warning' as const },
        { label: 'Fornecedores', value: NUM(fornecedores), accent: 'primary' as const },
      ] as KpiCard[],
      mensal,
      topMaq: aggBy('maquina'),
      topTipo: aggBy('tipo_maquina'),
      topForn: aggBy('fornecedor'),
      topCC: aggBy('centro_custo'),
    };
  }, [dados]);

  const iaPayload = useMemo(() => ({
    contexto: { periodo: `${de} a ${ate}` },
    kpis: { custo_total: calc.kpis[0].value, intervencoes: calc.kpis[1].value, custo_medio_maquina: calc.kpis[4].value },
    mensal: calc.mensal,
    rankings: {
      maquinas: calc.topMaq.slice(0, 10),
      tipos: calc.topTipo.slice(0, 10),
      fornecedores: calc.topForn.slice(0, 10),
    },
  }), [calc, de, ate]);

  const ia = useRelatorioIa('maquinas', etapa === 'preview' && comIa && !loading && dados.length > 0, iaPayload, `${de}-${ate}-${dados.length}`);

  const exportarPptx = async () => {
    setExportandoPptx(true);
    try {
      await gerarPptxGenerico({
        titulo: 'Relatório Executivo de Manutenção de Máquinas',
        subtitulo: 'Análise de Custos e Intervenções',
        periodo: `Período: ${de} a ${ate}`,
        fileName: `relatorio-maquinas-${new Date().toISOString().slice(0, 10)}.pptx`,
        kpis: calc.kpis,
        evolucaoChartId: 'mq-evolucao',
        evolucaoTitulo: 'Evolução Mensal — Custos e Intervenções',
        rankings: [
          { titulo: 'Top Máquinas', chartId: 'mq-rk-maq' },
          { titulo: 'Top Tipos de Máquina', chartId: 'mq-rk-tipo' },
          { titulo: 'Top Fornecedores', chartId: 'mq-rk-forn' },
          { titulo: 'Top Centros de Custo', chartId: 'mq-rk-cc' },
        ],
        comentariosIa: ia.data,
        tabela: {
          titulo: 'Últimas Intervenções (top 25)',
          head: ['Data', 'Máquina', 'Tipo', 'Fornecedor', 'Descrição', 'Valor'],
          rows: dados.slice(0, 25).map((r) => [
            r.data, r.maquina, r.tipo_maquina ?? '—', r.fornecedor ?? '—', r.descricao ?? '—', BRL(Number(r.valor || 0)),
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
            <h1 className="text-xl font-semibold">Relatório Executivo de Manutenção de Máquinas</h1>
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
            <Button variant="ghost" onClick={() => navigate('/manutencao-maquinas')}>Cancelar</Button>
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
        titulo="Relatório Executivo de Manutenção de Máquinas"
        subtitulo={`Período ${de} – ${ate} • ${dados.length} intervenção(ões)`}
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
              titulo="Evolução Mensal — Custos e Intervenções"
              chartId="mq-evolucao"
              data={calc.mensal}
              series={[
                { key: 'Custo', color: 'hsl(var(--primary))', tipo: 'bar' },
                { key: 'Intervenções', color: 'hsl(var(--success))', tipo: 'line' },
              ]}
            />
            <RankingsBlocoGenerico
              titulo="Rankings por Dimensão"
              rankings={[
                { titulo: 'Top Máquinas', rows: calc.topMaq, chartId: 'mq-rk-maq' },
                { titulo: 'Top Tipos de Máquina', rows: calc.topTipo, chartId: 'mq-rk-tipo' },
                { titulo: 'Top Fornecedores', rows: calc.topForn, chartId: 'mq-rk-forn' },
                { titulo: 'Top Centros de Custo', rows: calc.topCC, chartId: 'mq-rk-cc' },
              ]}
            />
            {comIa && <ComentariosIaBlocoGenerico comentarios={ia.data} loading={ia.loading} error={ia.error} />}
            <TabelaAnaliticaGenerica
              titulo="Últimas Intervenções"
              rows={dados}
              colunas={[
                { header: 'Data', cell: (r) => r.data },
                { header: 'Máquina', cell: (r) => r.maquina },
                { header: 'Tipo', cell: (r) => r.tipo_maquina ?? '—' },
                { header: 'Fornecedor', cell: (r) => r.fornecedor ?? '—' },
                { header: 'Descrição', cell: (r) => r.descricao ?? '—' },
                { header: 'Centro Custo', cell: (r) => r.centro_custo ?? '—' },
                { header: 'Valor', cell: (r) => BRL(Number(r.valor || 0)), align: 'right' },
              ]}
            />
          </>
        )}
      </RelatorioDocument>
    </div>
  );
}
