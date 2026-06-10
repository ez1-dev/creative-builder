import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download, FileSpreadsheet, Printer, Sparkles, ChevronLeft, Loader2,
  Calendar, Filter, FileText, LayoutGrid, Gauge, TrendingUp, BarChart3, Percent, Table as TableIcon, Check, Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  useRelatorioExecutivoFaturamento,
  BLOCOS_PADRAO, BLOCOS_CURTO,
  type BlocosSelecionados,
} from '@/hooks/useRelatorioExecutivoFaturamento';
import type { BiComercialFilters, UnidadeNegocio } from '@/lib/bi/comercialFilters';
import {
  KpisBloco, EvolucaoBloco, RankingsBloco, MargemImpostosBloco,
  ComentariosIaBloco, TabelaAnaliticaBloco, ParetoBloco, buildParetoPayload,
} from '@/components/bi/relatorio-executivo/RelatorioBlocos';
import { gerarRelatorioPptx } from '@/components/bi/relatorio-executivo/exportPptx';
import './relatorio.css';
import { AnomesSelect } from '@/components/bi/comercial/AnomesSelect';

type Etapa = 'wizard' | 'preview';
type NivelDetalhe = 'curto' | 'completo';

function currentYmd(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const PRESETS = [
  { id: 'mes', label: 'Mês atual', ini: () => currentYmd(0), fim: () => currentYmd(0) },
  { id: 'mes_ant', label: 'Mês anterior', ini: () => currentYmd(-1), fim: () => currentYmd(-1) },
  { id: 'tri', label: 'Trimestre', ini: () => currentYmd(-2), fim: () => currentYmd(0) },
  { id: 'ytd', label: 'YTD', ini: () => `${new Date().getFullYear()}01`, fim: () => currentYmd(0) },
  { id: 'l12', label: 'Últimos 12 meses', ini: () => currentYmd(-11), fim: () => currentYmd(0) },
];

export default function RelatorioExecutivoFaturamentoPage() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState<Etapa>('wizard');
  const [nivel, setNivel] = useState<NivelDetalhe>('completo');
  const [blocos, setBlocos] = useState<BlocosSelecionados>(BLOCOS_PADRAO);
  const [filtros, setFiltros] = useState<BiComercialFilters>({
    anomes_ini: `${new Date().getFullYear()}01`,
    anomes_fim: currentYmd(0),
    unidade_negocio: 'CONSOLIDADO',
  });
  const [drillCliente, setDrillCliente] = useState('');
  const [drillRevenda, setDrillRevenda] = useState('');
  const [drillEstado, setDrillEstado] = useState('');
  const [drillProduto, setDrillProduto] = useState('');

  const filtrosFinais = useMemo<BiComercialFilters>(() => ({
    ...filtros,
    ...(drillCliente && { cd_cliente: drillCliente }),
    ...(drillRevenda && { cd_rev_pedido: drillRevenda }),
    ...(drillEstado && { cd_estado: drillEstado }),
    ...(drillProduto && { cd_produto: drillProduto }),
  }), [filtros, drillCliente, drillRevenda, drillEstado, drillProduto]);

  const { dados, isLoading, error } = useRelatorioExecutivoFaturamento(
    filtrosFinais, blocos, etapa === 'preview',
  );

  const [comentarios, setComentarios] = useState<{
    destaques: string[]; alertas: string[]; recomendacoes: string[];
  } | null>(null);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaError, setIaError] = useState<string | null>(null);
  const [exportandoPptx, setExportandoPptx] = useState(false);

  // Aplica nível de detalhe → preset de blocos
  useEffect(() => {
    setBlocos(nivel === 'curto' ? BLOCOS_CURTO : BLOCOS_PADRAO);
  }, [nivel]);

  // Gera comentários IA quando entra no preview com bloco ativo
  useEffect(() => {
    if (etapa !== 'preview' || !blocos.comentariosIa) return;
    if (isLoading || !dados.kpis) return;
    let cancelled = false;
    (async () => {
      setIaLoading(true); setIaError(null);
      try {
        const payload = {
          contexto: {
            periodo: `${filtrosFinais.anomes_ini} a ${filtrosFinais.anomes_fim}`,
            unidade_negocio: filtrosFinais.unidade_negocio,
            drills: { cliente: drillCliente, revenda: drillRevenda, estado: drillEstado, produto: drillProduto },
          },
          kpis: dados.kpis,
          mensal: dados.mensal,
          rankings: {
            revenda: dados.rankings.revenda.slice(0, 10),
            estado: dados.rankings.estado.slice(0, 10),
            obras: dados.rankings.obras.slice(0, 10),
          },
          metas: dados.metas,
        };
        const { data, error } = await supabase.functions.invoke('relatorio-executivo-ia', {
          body: payload,
        });
        if (cancelled) return;
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setComentarios({
          destaques: data?.destaques ?? [],
          alertas: data?.alertas ?? [],
          recomendacoes: data?.recomendacoes ?? [],
        });
      } catch (e: any) {
        if (!cancelled) setIaError(e?.message ?? 'Falha ao gerar comentários');
      } finally {
        if (!cancelled) setIaLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa, isLoading, blocos.comentariosIa, JSON.stringify(filtrosFinais)]);

  const aplicarPreset = (preset: typeof PRESETS[number]) => {
    setFiltros((f) => ({ ...f, anomes_ini: preset.ini(), anomes_fim: preset.fim() }));
  };

  const toggleBloco = (k: keyof BlocosSelecionados) => {
    setBlocos((b) => ({ ...b, [k]: !b[k] }));
  };

  const exportarPdf = () => window.print();

  const exportarPptx = async () => {
    setExportandoPptx(true);
    try {
      await gerarRelatorioPptx(dados, filtrosFinais, blocos, comentarios);
      toast.success('PPTX gerado com sucesso');
    } catch (e: any) {
      toast.error('Falha ao gerar PPTX', { description: e?.message });
    } finally {
      setExportandoPptx(false);
    }
  };

  if (etapa === 'wizard') {
    const presetAtivo = PRESETS.find(
      (p) => p.ini() === filtros.anomes_ini && p.fim() === filtros.anomes_fim,
    )?.id;

    const blocosCatalogo = [
      { k: 'kpis' as const, l: 'Visão geral (KPIs)', icon: Gauge },
      { k: 'evolucao' as const, l: 'Evolução + Meta', icon: TrendingUp },
      { k: 'rankings' as const, l: 'Rankings', icon: BarChart3 },
      { k: 'margem' as const, l: 'Margem e Impostos', icon: Percent },
      { k: 'comentariosIa' as const, l: 'Comentários IA', icon: Sparkles },
      { k: 'tabela' as const, l: 'Tabela analítica', icon: TableIcon },
    ];

    const SectionHeader = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
      <div className="flex items-center gap-2 text-foreground font-medium">
        <div className="p-1.5 bg-primary/10 text-primary rounded-md">
          <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-sm">{children}</h2>
      </div>
    );

    return (
      <div className="max-w-5xl mx-auto">
        <Card className="overflow-hidden">
          <div className="px-8 py-6 border-b border-border">
            <h1 className="text-xl font-semibold text-foreground">Relatório Executivo de Faturamento</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure os parâmetros para gerar a análise executiva com suporte de IA.
            </p>
          </div>

          <div className="p-8 space-y-10">
            {/* 1. Período */}
            <section className="space-y-4">
              <SectionHeader icon={Calendar}>1. Período de Análise</SectionHeader>
              <div className="flex flex-wrap items-end gap-6 bg-muted/30 p-4 rounded-lg border border-border">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Presets</Label>
                  <div className="inline-flex p-1 bg-muted rounded-lg gap-1 flex-wrap">
                    {PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => aplicarPreset(p)}
                        className={cn(
                          'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                          presetAtivo === p.id
                            ? 'bg-background shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <AnomesSelect
                    label="Período inicial"
                    value={filtros.anomes_ini}
                    onChange={(v) => setFiltros({ ...filtros, anomes_ini: v })}
                    className="w-56"
                    compact={false}
                  />
                  <AnomesSelect
                    label="Período final"
                    value={filtros.anomes_fim}
                    onChange={(v) => setFiltros({ ...filtros, anomes_fim: v })}
                    className="w-56"
                    compact={false}
                  />
                </div>
              </div>
            </section>

            {/* 2. Filtros */}
            <section className="space-y-4">
              <SectionHeader icon={Filter}>2. Filtros Adicionais</SectionHeader>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Unidade de Negócio</Label>
                  <Select
                    value={filtros.unidade_negocio}
                    onValueChange={(v) => setFiltros({ ...filtros, unidade_negocio: v as UnidadeNegocio })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONSOLIDADO">Consolidado</SelectItem>
                      <SelectItem value="GENIUS">GENIUS</SelectItem>
                      <SelectItem value="ESTRUTURAL ZORTEA">ESTRUTURAL ZORTEA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Cliente (cód)</Label>
                  <Input placeholder="Opcional" value={drillCliente} onChange={(e) => setDrillCliente(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Revenda (cód)</Label>
                  <Input placeholder="Opcional" value={drillRevenda} onChange={(e) => setDrillRevenda(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Estado (UF)</Label>
                  <Input placeholder="Opcional" maxLength={2} value={drillEstado} onChange={(e) => setDrillEstado(e.target.value.toUpperCase())} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Produto (cód)</Label>
                  <Input placeholder="Opcional" value={drillProduto} onChange={(e) => setDrillProduto(e.target.value)} />
                </div>
              </div>
            </section>

            {/* 3 + 4 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              <section className="md:col-span-4 space-y-4">
                <SectionHeader icon={FileText}>3. Nível de Detalhe</SectionHeader>
                <div className="space-y-3">
                  {([
                    { v: 'curto' as const, title: 'Executivo curto', desc: 'KPIs + 2 gráficos + IA' },
                    { v: 'completo' as const, title: 'Completo', desc: 'Todos os blocos + tabela' },
                  ]).map((opt) => {
                    const ativo = nivel === opt.v;
                    return (
                      <label
                        key={opt.v}
                        className={cn(
                          'flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                          ativo
                            ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/10'
                            : 'border-border bg-background hover:bg-muted/50',
                        )}
                      >
                        <input
                          type="radio"
                          name="nivel"
                          className="mt-0.5 w-4 h-4 accent-primary"
                          checked={ativo}
                          onChange={() => setNivel(opt.v)}
                        />
                        <div>
                          <p className={cn('text-sm font-medium', ativo ? 'text-primary' : 'text-foreground')}>{opt.title}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </section>

              <section className="md:col-span-8 space-y-4">
                <SectionHeader icon={LayoutGrid}>4. Blocos do Relatório</SectionHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {blocosCatalogo.map((b) => {
                    const ativo = blocos[b.k];
                    const Icon = b.icon;
                    return (
                      <button
                        key={b.k}
                        type="button"
                        onClick={() => toggleBloco(b.k)}
                        className={cn(
                          'flex items-center gap-3 p-3 border rounded-lg text-left transition-all',
                          ativo
                            ? 'border-primary/40 bg-background ring-1 ring-primary/10 shadow-sm'
                            : 'border-border bg-background hover:border-primary/30',
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 flex items-center justify-center rounded',
                          ativo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className={cn('text-sm font-medium flex-1', ativo ? 'text-foreground' : 'text-muted-foreground')}>
                          {b.l}
                        </span>
                        <div className={cn(
                          'w-4 h-4 rounded-full flex items-center justify-center border',
                          ativo ? 'bg-primary border-primary' : 'border-border',
                        )}>
                          {ativo && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>

          <div className="px-8 py-5 bg-muted/30 border-t border-border flex justify-end gap-3">
            <Button variant="ghost" onClick={() => navigate('/bi/comercial')}>Cancelar</Button>
            <Button onClick={() => setEtapa('preview')}>
              <Sparkles className="h-4 w-4 mr-2" />
              Gerar relatório
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ===== Preview =====
  return (
    <div className="space-y-4">
      {/* Toolbar (escondida na impressão) */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" onClick={() => setEtapa('wizard')}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Editar filtros
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportarPdf}>
            <Printer className="h-4 w-4 mr-2" /> Exportar PDF (Imprimir)
          </Button>
          <Button variant="outline" size="sm" onClick={exportarPptx} disabled={exportandoPptx || isLoading}>
            {exportandoPptx ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
            Exportar PPTX
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="print:hidden">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Documento */}
      <div id="rel-doc" className="rel-doc bg-white text-slate-900 mx-auto shadow">
        <header className="rel-header">
          <div>
            <h1 className="rel-titulo">Relatório Executivo de Faturamento</h1>
            <p className="rel-subtitulo">
              Período {filtrosFinais.anomes_ini} – {filtrosFinais.anomes_fim} • Unidade: {filtrosFinais.unidade_negocio}
            </p>
          </div>
          <div className="rel-data">
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        </header>

        {isLoading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando dados…
          </div>
        )}

        {!isLoading && (
          <>
            {blocos.kpis && <KpisBloco dados={dados} filtros={filtrosFinais} />}
            {blocos.evolucao && <EvolucaoBloco dados={dados} filtros={filtrosFinais} />}
            {blocos.rankings && <RankingsBloco dados={dados} filtros={filtrosFinais} />}
            {blocos.margem && <MargemImpostosBloco dados={dados} filtros={filtrosFinais} />}
            {blocos.comentariosIa && (
              <ComentariosIaBloco comentarios={comentarios} loading={iaLoading} error={iaError} />
            )}
            {blocos.tabela && <TabelaAnaliticaBloco dados={dados} filtros={filtrosFinais} />}
          </>
        )}

        <footer className="rel-footer">
          Sapiens Control Center · {new Date().toLocaleString('pt-BR')}
        </footer>
      </div>
    </div>
  );
}
