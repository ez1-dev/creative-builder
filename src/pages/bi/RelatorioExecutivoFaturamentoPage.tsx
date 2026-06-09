import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileSpreadsheet, Printer, Sparkles, ChevronLeft, Loader2, FileText } from 'lucide-react';
import { PageHeader } from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  ComentariosIaBloco, TabelaAnaliticaBloco,
} from '@/components/bi/relatorio-executivo/RelatorioBlocos';
import { gerarRelatorioPptx } from '@/components/bi/relatorio-executivo/exportPptx';
import './relatorio.css';

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
    return (
      <div className="space-y-4">
        <PageHeader
          title="Relatório Executivo de Faturamento"
          description="Monte um relatório executivo com KPIs, gráficos, rankings e comentários gerados por IA."
          icon={FileText}
        />

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Período */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">1. Período</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESETS.map((p) => (
                  <Button key={p.id} variant="outline" size="sm" onClick={() => aplicarPreset(p)}>{p.label}</Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <div>
                  <Label className="text-xs text-muted-foreground">Início (AAAAMM)</Label>
                  <Input value={filtros.anomes_ini} onChange={(e) => setFiltros({ ...filtros, anomes_ini: e.target.value })} maxLength={6} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Fim (AAAAMM)</Label>
                  <Input value={filtros.anomes_fim} onChange={(e) => setFiltros({ ...filtros, anomes_fim: e.target.value })} maxLength={6} />
                </div>
              </div>
            </div>

            {/* Unidade + drills */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">2. Filtros</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl">
                <div>
                  <Label className="text-xs text-muted-foreground">Unidade de Negócio</Label>
                  <Select value={filtros.unidade_negocio} onValueChange={(v) => setFiltros({ ...filtros, unidade_negocio: v as UnidadeNegocio })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONSOLIDADO">Consolidado</SelectItem>
                      <SelectItem value="GENIUS">GENIUS</SelectItem>
                      <SelectItem value="ESTRUTURAL ZORTEA">ESTRUTURAL ZORTEA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cliente (cód)</Label>
                  <Input value={drillCliente} onChange={(e) => setDrillCliente(e.target.value)} placeholder="opcional" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Revenda (cód)</Label>
                  <Input value={drillRevenda} onChange={(e) => setDrillRevenda(e.target.value)} placeholder="opcional" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Estado (UF)</Label>
                  <Input value={drillEstado} onChange={(e) => setDrillEstado(e.target.value.toUpperCase())} placeholder="opcional" maxLength={2} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Produto (cód)</Label>
                  <Input value={drillProduto} onChange={(e) => setDrillProduto(e.target.value)} placeholder="opcional" />
                </div>
              </div>
            </div>

            {/* Nível */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">3. Nível de detalhe</Label>
              <RadioGroup value={nivel} onValueChange={(v) => setNivel(v as NivelDetalhe)} className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="curto" id="nivel-curto" />
                  <Label htmlFor="nivel-curto" className="cursor-pointer">Executivo curto (KPIs + 2 gráficos + IA)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="completo" id="nivel-completo" />
                  <Label htmlFor="nivel-completo" className="cursor-pointer">Completo (todos os blocos + tabela)</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Blocos */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">4. Blocos do relatório</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { k: 'kpis' as const, l: 'Visão geral (KPIs)' },
                  { k: 'evolucao' as const, l: 'Evolução mensal + Meta' },
                  { k: 'rankings' as const, l: 'Rankings (Revenda, Estado, Obra)' },
                  { k: 'margem' as const, l: 'Margem e Impostos' },
                  { k: 'comentariosIa' as const, l: 'Comentários por IA' },
                  { k: 'tabela' as const, l: 'Tabela analítica final' },
                ].map((b) => (
                  <label key={b.k} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={blocos[b.k]} onCheckedChange={() => toggleBloco(b.k)} />
                    {b.l}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => navigate('/bi/comercial')}>Cancelar</Button>
              <Button onClick={() => setEtapa('preview')}>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar relatório
              </Button>
            </div>
          </CardContent>
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
