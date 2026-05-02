import { useState, useCallback, useMemo } from 'react';
import { api, PainelComprasResponse } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { FilterPanel } from '@/components/erp/FilterPanel';
import { DataTable, Column } from '@/components/erp/DataTable';
import { PaginationControl } from '@/components/erp/PaginationControl';
import { ExportButton } from '@/components/erp/ExportButton';
import { ComboboxFilter } from '@/components/erp/ComboboxFilter';
import { useErpOptions } from '@/hooks/useErpOptions';
import { useFornecedores } from '@/hooks/useFornecedores';
import { KPICard } from '@/components/erp/KPICard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown } from 'lucide-react';
import { formatNumber, formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ShoppingCart, AlertTriangle, TrendingUp, Package, DollarSign, Clock, Percent, FileText, Layers, Receipt } from 'lucide-react';
import { useAiFilters } from '@/hooks/useAiFilters';
import { useAiPageContext } from '@/hooks/useAiPageContext';
import { useSearchTracking } from '@/hooks/useSearchTracking';
import { VisualGate } from '@/components/VisualGate';

const COLORS = ['hsl(215,70%,45%)', 'hsl(142,70%,40%)', 'hsl(38,92%,50%)', 'hsl(0,72%,51%)', 'hsl(199,89%,48%)', 'hsl(280,60%,50%)', 'hsl(160,60%,40%)', 'hsl(30,80%,55%)'];

const SITUACOES_OPCOES: { value: string; label: string }[] = [
  { value: '1', label: 'Aberto Total' },
  { value: '2', label: 'Aberto Parcial' },
  { value: '3', label: 'Suspenso' },
  { value: '4', label: 'Liquidado' },
  { value: '5', label: 'Cancelado' },
  { value: '6', label: 'Aguard. Integração WMS' },
  { value: '7', label: 'Em Transmissão' },
  { value: '8', label: 'Prep. Análise/NF' },
  { value: '9', label: 'Não Fechado' },
];

const situacaoLabel = (s: number | string) => {
  const found = SITUACOES_OPCOES.find((o) => o.value === String(s));
  return found ? found.label : `Sit. ${s}`;
};

const baseColumns: Column<any>[] = [
  { key: 'numero_oc', header: 'Nº OC' },
  { key: 'codigo_item', header: 'Item' },
  { key: 'descricao_item', header: 'Descrição' },
  { key: 'tipo_item', header: 'Tipo' },
  { key: 'fantasia_fornecedor', header: 'Fornecedor' },
  { key: 'transacao', header: 'Transação' },
  { key: 'data_emissao', header: 'Emissão', render: (v) => formatDate(v) },
  { key: 'data_entrega', header: 'Entrega', render: (v) => formatDate(v) },
  { key: 'quantidade_pedida', header: 'Qtd. Pedida', align: 'right', render: (v) => formatNumber(v, 2) },
  { key: 'saldo_pendente', header: 'Saldo Pend.', align: 'right', render: (v) => formatNumber(v, 2) },
  { key: 'preco_unitario', header: 'Preço Unit.', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'percentual_desconto', header: '% Desc.', align: 'right', render: (v) => v ? `${formatNumber(v, 2)}%` : '-' },
  { key: 'valor_desconto_total', header: 'Vlr. Desconto', align: 'right' as const, render: (v: any) => formatCurrency(v) },
  { key: 'valor_liquido', header: 'Vlr. Líquido', align: 'right', render: (v) => formatCurrency(v) },
  { key: 'situacao_oc', header: 'Situação', render: (v) => situacaoLabel(v) },
  { key: 'numero_nf', header: 'Nº NF', render: (v: any) => v || '-' },
  { key: 'dias_atraso', header: 'Dias Atraso', align: 'right', render: (v) => v > 0 ? <span className="text-destructive font-semibold">{v}</span> : '-' },
];

export default function PainelComprasPage() {
  const [filters, setFilters] = useState<{
    codigo_item: string; descricao_item: string; fornecedor: string; numero_oc: string;
    numero_projeto: string; centro_custo: string; transacao: string; codigo_produto: string;
    valor_min: string; valor_max: string; tipo_item: string; tipo_oc: string;
    data_emissao_ini: string; data_emissao_fim: string; data_entrega_ini: string; data_entrega_fim: string;
    origem_material: string; familia: string; coddep: string; somente_pendentes: boolean;
    agrupar_por_fornecedor: boolean; situacao_oc: string[]; codigo_motivo_oc: string; observacao_oc: string;
    mostrar_valor_total_oc: boolean;
  }>({
    codigo_item: '', descricao_item: '', fornecedor: '', numero_oc: '',
    numero_projeto: '', centro_custo: '', transacao: '', codigo_produto: '',
    valor_min: '', valor_max: '', tipo_item: 'TODOS', tipo_oc: 'TODOS',
    data_emissao_ini: '', data_emissao_fim: '', data_entrega_ini: '', data_entrega_fim: '',
    origem_material: '', familia: '', coddep: '', somente_pendentes: true,
    agrupar_por_fornecedor: false, situacao_oc: [], codigo_motivo_oc: 'TODOS', observacao_oc: '',
    mostrar_valor_total_oc: false,
  });
  const [data, setData] = useState<PainelComprasResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState<'100' | '250' | '500' | '1000' | 'todos'>('100');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lista'>('dashboard');

  const erpReady = useErpReady();
  const { familias, origens, loading: optionsLoading } = useErpOptions(erpReady, data?.dados, { familiaKey: 'codigo_familia', origemKey: 'origem_material' });
  const { fornecedores: fornecedoresOptions, loading: fornecedoresLoading } = useFornecedores(erpReady, data?.dados);

  const trackSearch = useSearchTracking('painel-compras');

  const search = useCallback(async (page = 1) => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
    setLoading(true);
    try {
      const tamanhoNumerico = tamanhoPagina === 'todos' ? 100000 : Number(tamanhoPagina);
      const params: any = { ...filters, pagina: page, tamanho_pagina: tamanhoNumerico };
      if (params.valor_min) params.valor_min = parseFloat(params.valor_min);
      else delete params.valor_min;
      if (params.valor_max) params.valor_max = parseFloat(params.valor_max);
      else delete params.valor_max;
      // situacao_oc: backend aceita CSV (ex.: "1" ou "1,2,3").
      const situacoesSel: string[] = Array.isArray(params.situacao_oc) ? params.situacao_oc : [];
      if (situacoesSel.length > 0) params.situacao_oc = situacoesSel.join(',');
      else delete params.situacao_oc;
      if (!params.coddep) delete params.coddep;
      if (!params.tipo_item || params.tipo_item === 'TODOS') delete params.tipo_item;
      if (!params.tipo_oc || params.tipo_oc === 'TODOS') delete params.tipo_oc;
      if (!params.codigo_motivo_oc || params.codigo_motivo_oc === 'TODOS') delete params.codigo_motivo_oc;
      if (!params.observacao_oc) delete params.observacao_oc;
      const result = await api.get<PainelComprasResponse>('/api/painel-compras', params);

      // MITIGACAO_TIPO_ITEM: o backend ignora tipo_item=SERVICO (sem acento) e
      // devolve todos os registros. Filtramos apenas os `dados` da página corrente
      // (a tabela). NÃO mexemos em `resumo`/`graficos`, que vêm agregados pelo
      // backend sobre o filtro completo — alterá-los faria os KPIs refletirem só
      // a página atual. Remover quando o backend aplicar o patch descrito em
      // docs/backend-painel-compras-tipo-item.md.
      const tipoFiltro = filters.tipo_item;
      if (tipoFiltro && tipoFiltro !== 'TODOS' && Array.isArray((result as any)?.dados)) {
        const norm = (v: any) => String(v ?? '').toUpperCase().replace('Ç', 'C').trim();
        const alvo = norm(tipoFiltro);
        const originais = (result as any).dados as any[];
        const filtrados = originais.filter((d) => {
          const t = norm(d?.tipo_item);
          if (alvo === 'PRODUTO') return t === 'PRODUTO' || t === 'P';
          if (alvo === 'SERVICO') return t === 'SERVICO' || t === 'S';
          return true;
        });
        if (filtrados.length !== originais.length) {
          (result as any).dados = filtrados;
          console.warn(
            '[PainelCompras] Backend ignorou tipo_item=' + tipoFiltro +
            ' — aplicada mitigação client-side só na tabela. Removidas ' +
            (originais.length - filtrados.length) + ' linhas que não batiam com o filtro.'
          );
          if (!(window as any).__avisouTipoItemBackend) {
            (window as any).__avisouTipoItemBackend = true;
            toast.warning(
              'Filtro "Tipo Item" aplicado localmente na tabela — o backend ainda não distingue SERVICO sem acento. Os KPIs e gráficos continuam refletindo o agregado completo do backend.'
            );
          }
        }
      }


      setData(result);
      setPagina(page);
      if (page === 1) trackSearch(filters, (result as any)?.total_registros);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters, erpReady, trackSearch, tamanhoPagina]);

  useAiFilters('painel-compras', setFilters, () => search(1));

  useAiPageContext({
    title: 'Painel de Compras',
    module: 'painel-compras',
    filters,
    kpis: data && (data as any).resumo ? {
      'Total OCs': (data as any).resumo.total_ocs ?? '-',
      'Valor Líquido': formatCurrency((data as any).resumo.valor_liquido_total ?? 0),
      'Valor Pendente': formatCurrency((data as any).resumo.valor_pendente_total ?? 0),
      'Itens Atrasados': (data as any).resumo.itens_atrasados ?? 0,
    } : undefined,
    summary: data
      ? `${data.total_registros} linhas de OC; página ${pagina}/${data.total_paginas}`
      : undefined,
  });

  const clearFilters = () => { setFilters({
    codigo_item: '', descricao_item: '', fornecedor: '', numero_oc: '',
    numero_projeto: '', centro_custo: '', transacao: '', codigo_produto: '',
    valor_min: '', valor_max: '', tipo_item: 'TODOS', tipo_oc: 'TODOS',
    data_emissao_ini: '', data_emissao_fim: '', data_entrega_ini: '', data_entrega_fim: '',
    origem_material: '', familia: '', coddep: '', somente_pendentes: true,
    agrupar_por_fornecedor: false, situacao_oc: [], codigo_motivo_oc: 'TODOS', observacao_oc: '',
    mostrar_valor_total_oc: false,
  }); setData(null); setPagina(1); };

  const columns = useMemo(() => {
    const cols = [...baseColumns];
    if (filters.mostrar_valor_total_oc) {
      // Insert "Valor Total OC" after "Vlr. Líquido" (index 13)
      const insertIdx = cols.findIndex(c => c.key === 'situacao_oc');
      const valorTotalCol: Column<any> = { key: 'valor_total_oc', header: 'Valor Total OC', align: 'right', render: (v) => formatCurrency(v) };
      if (insertIdx >= 0) cols.splice(insertIdx, 0, valorTotalCol);
      else cols.push(valorTotalCol);
    }
    return cols;
  }, [filters.mostrar_valor_total_oc]);

  const chartData = useMemo(() => {
    if (data?.graficos) return data.graficos;
    if (!data?.dados?.length) return null;
    const dados = data.dados;

    // Top Fornecedores by valor_liquido
    const fornMap = new Map<string, number>();
    dados.forEach((d: any) => {
      const key = d.fantasia_fornecedor || 'Desconhecido';
      fornMap.set(key, (fornMap.get(key) || 0) + (d.valor_liquido || 0));
    });
    const top_fornecedores = [...fornMap.entries()]
      .map(([fantasia_fornecedor, valor_liquido_total]) => ({ fantasia_fornecedor, valor_liquido_total }))
      .sort((a, b) => b.valor_liquido_total - a.valor_liquido_total)
      .slice(0, 10);

    // Situação das OCs (qtd + valor líquido)
    const sitMap = new Map<number, { qtd: number; valor: number }>();
    dados.forEach((d: any) => {
      const s = d.situacao_oc ?? 0;
      const cur = sitMap.get(s) || { qtd: 0, valor: 0 };
      cur.qtd += 1;
      cur.valor += d.valor_liquido || 0;
      sitMap.set(s, cur);
    });
    const situacoes = [...sitMap.entries()].map(([situacao_oc, v]) => ({
      situacao_oc,
      quantidade_itens: v.qtd,
      valor_liquido_total: v.valor,
    }));

    // Produtos x Serviços (qtd + valor líquido)
    const tipoMap = new Map<string, { qtd: number; valor: number }>();
    dados.forEach((d: any) => {
      const t = d.tipo_item || 'Outros';
      const cur = tipoMap.get(t) || { qtd: 0, valor: 0 };
      cur.qtd += 1;
      cur.valor += d.valor_liquido || 0;
      tipoMap.set(t, cur);
    });
    const tipos = [...tipoMap.entries()].map(([tipo_item, v]) => ({
      tipo_item,
      quantidade_itens: v.qtd,
      valor_liquido_total: v.valor,
    }));

    // Top Famílias por valor líquido
    const famMap = new Map<string, number>();
    dados.forEach((d: any) => {
      const key = d.codigo_familia || 'Sem família';
      famMap.set(key, (famMap.get(key) || 0) + (d.valor_liquido || 0));
    });
    const familias = [...famMap.entries()]
      .map(([codigo_familia, valor_liquido_total]) => ({ codigo_familia, valor_liquido_total }))
      .sort((a, b) => b.valor_liquido_total - a.valor_liquido_total)
      .slice(0, 10);

    // Top Origens por valor líquido
    const origMap = new Map<string, number>();
    dados.forEach((d: any) => {
      const key = d.origem_material || 'Sem origem';
      origMap.set(key, (origMap.get(key) || 0) + (d.valor_liquido || 0));
    });
    const origens = [...origMap.entries()]
      .map(([origem, valor_liquido_total]) => ({ origem, valor_liquido_total }))
      .sort((a, b) => b.valor_liquido_total - a.valor_liquido_total)
      .slice(0, 10);

    // Entregas por mês
    const mesMap = new Map<string, { valor: number; itens: number }>();
    dados.forEach((d: any) => {
      if (!d.data_entrega) return;
      const periodo = String(d.data_entrega).substring(0, 7); // YYYY-MM
      const cur = mesMap.get(periodo) || { valor: 0, itens: 0 };
      cur.valor += d.valor_liquido || 0;
      cur.itens += 1;
      mesMap.set(periodo, cur);
    });
    const entregas_por_mes = [...mesMap.entries()]
      .map(([periodo_entrega, v]) => ({ periodo_entrega, valor_pendente_total: v.valor, quantidade_itens: v.itens }))
      .sort((a, b) => a.periodo_entrega.localeCompare(b.periodo_entrega));

    return { top_fornecedores, situacoes, tipos, familias, origens, entregas_por_mes };
  }, [data]);

  const kpis = useMemo(() => {
    if (data?.resumo) return data.resumo;
    if (!data?.dados || data.dados.length === 0) return null;
    const dados = data.dados;
    const uniqueOcs = new Set(dados.map((d: any) => d.numero_oc));
    const uniqueFornecedores = new Set(dados.map((d: any) => d.fantasia_fornecedor).filter(Boolean));
    const valorBruto = dados.reduce((s: number, d: any) => s + (d.valor_bruto || d.quantidade_pedida * d.preco_unitario || 0), 0);
    const valorLiquido = dados.reduce((s: number, d: any) => s + (d.valor_liquido || 0), 0);
    const valorDesconto = dados.reduce((s: number, d: any) => s + (d.valor_desconto_total || 0), 0);
    const valorPendente = dados.reduce((s: number, d: any) => s + ((d.saldo_pendente || 0) * (d.preco_unitario || 0)), 0);
    const itensPendentes = dados.filter((d: any) => (d.saldo_pendente || 0) > 0).length;
    const itensAtrasados = dados.filter((d: any) => (d.dias_atraso || 0) > 0).length;
    const ocsAtrasadas = new Set(dados.filter((d: any) => (d.dias_atraso || 0) > 0).map((d: any) => d.numero_oc)).size;
    const maiorAtraso = Math.max(0, ...dados.map((d: any) => d.dias_atraso || 0));
    const itensProduto = dados.filter((d: any) => d.tipo_item === 'PRODUTO' || d.tipo_item === 'P').length;
    const itensServico = dados.filter((d: any) => d.tipo_item === 'SERVICO' || d.tipo_item === 'S').length;
    const totalLinhas = dados.length;
    return {
      total_ocs: uniqueOcs.size,
      valor_bruto_total: valorBruto,
      valor_liquido_total: valorLiquido,
      valor_desconto_total: valorDesconto,
      total_fornecedores: uniqueFornecedores.size,
      valor_pendente_total: valorPendente,
      itens_pendentes: itensPendentes,
      itens_atrasados: itensAtrasados,
      ocs_atrasadas: ocsAtrasadas,
      maior_atraso_dias: maiorAtraso,
      ticket_medio_item: totalLinhas > 0 ? valorLiquido / totalLinhas : 0,
      impostos_totais: dados.reduce((s: number, d: any) => s + (d.impostos || 0), 0),
      total_linhas: totalLinhas,
      itens_produto: itensProduto,
      itens_servico: itensServico,
    };
  }, [data]);

  const drillDetails = useMemo(() => {
    if (!data?.dados?.length) return {} as Record<string, { label: string; value: string }[] | undefined>;
    const dados = data.dados;

    const topFornByField = (field: string, top = 10) => {
      const map = new Map<string, number>();
      dados.forEach((d: any) => {
        const key = d.fantasia_fornecedor || 'Desconhecido';
        map.set(key, (map.get(key) || 0) + (d[field] || 0));
      });
      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, top)
        .map(([label, val]) => ({ label: label.substring(0, 30), value: formatCurrency(val) }));
    };

    const topFornByCount = (filterFn: (d: any) => boolean, top = 10) => {
      const map = new Map<string, number>();
      dados.filter(filterFn).forEach((d: any) => {
        const key = d.fantasia_fornecedor || 'Desconhecido';
        map.set(key, (map.get(key) || 0) + 1);
      });
      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, top)
        .map(([label, val]) => ({ label: label.substring(0, 30), value: `${val} itens` }));
    };

    const valorBruto = topFornByField('valor_bruto');
    const desconto = topFornByField('valor_desconto_total');
    const impostos = topFornByField('impostos');
    const fornecedores = topFornByField('valor_liquido');
    const valorPendente = (() => {
      const map = new Map<string, number>();
      dados.forEach((d: any) => {
        const key = d.fantasia_fornecedor || 'Desconhecido';
        map.set(key, (map.get(key) || 0) + ((d.saldo_pendente || 0) * (d.preco_unitario || 0)));
      });
      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([label, val]) => ({ label: label.substring(0, 30), value: formatCurrency(val) }));
    })();
    const itensPendentes = topFornByCount((d: any) => (d.saldo_pendente || 0) > 0);
    const itensAtrasados = dados
      .filter((d: any) => (d.dias_atraso || 0) > 0)
      .sort((a: any, b: any) => (b.dias_atraso || 0) - (a.dias_atraso || 0))
      .slice(0, 10)
      .map((d: any) => ({ label: `OC ${d.numero_oc} - ${(d.descricao_item || '').substring(0, 20)}`, value: `${d.dias_atraso} dias` }));
    const ocsAtrasadas = (() => {
      const map = new Map<number, number>();
      dados.filter((d: any) => (d.dias_atraso || 0) > 0).forEach((d: any) => {
        const oc = d.numero_oc;
        map.set(oc, Math.max(map.get(oc) || 0, d.dias_atraso));
      });
      return [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([oc, dias]) => ({ label: `OC ${oc}`, value: `${dias} dias` }));
    })();
    const maiorAtraso = dados
      .filter((d: any) => (d.dias_atraso || 0) > 0)
      .sort((a: any, b: any) => (b.dias_atraso || 0) - (a.dias_atraso || 0))
      .slice(0, 5)
      .map((d: any) => ({ label: `OC ${d.numero_oc} - ${(d.descricao_item || '').substring(0, 20)}`, value: `${d.dias_atraso} dias` }));
    const totalLinhas = (() => {
      const sitMap = new Map<string, number>();
      dados.forEach((d: any) => {
        const key = situacaoLabel(d.situacao_oc);
        sitMap.set(key, (sitMap.get(key) || 0) + 1);
      });
      const produto = dados.filter((d: any) => d.tipo_item === 'PRODUTO' || d.tipo_item === 'P').length;
      const servico = dados.filter((d: any) => d.tipo_item === 'SERVICO' || d.tipo_item === 'S').length;
      const result: { label: string; value: string }[] = [
        { label: 'Produtos', value: String(produto) },
        { label: 'Serviços', value: String(servico) },
      ];
      [...sitMap.entries()].sort((a, b) => b[1] - a[1]).forEach(([label, val]) => {
        result.push({ label, value: String(val) });
      });
      return result;
    })();
    const total = dados.length;
    const prod = dados.filter((d: any) => d.tipo_item === 'PRODUTO' || d.tipo_item === 'P').length;
    const serv = dados.filter((d: any) => d.tipo_item === 'SERVICO' || d.tipo_item === 'S').length;
    const itensServico = total > 0 ? [
      { label: 'Serviços', value: `${serv} (${(serv / total * 100).toFixed(1)}%)` },
      { label: 'Produtos', value: `${prod} (${(prod / total * 100).toFixed(1)}%)` },
    ] : undefined;

    return { valorBruto, desconto, impostos, fornecedores, valorPendente, itensPendentes, itensAtrasados, ocsAtrasadas, maiorAtraso, totalLinhas, itensServico };
  }, [data]);

  const exportParams = useMemo(() => {
    const p: any = { ...filters };
    if (p.valor_min) p.valor_min = parseFloat(p.valor_min);
    else delete p.valor_min;
    if (p.valor_max) p.valor_max = parseFloat(p.valor_max);
    else delete p.valor_max;
    const sitsSel: string[] = Array.isArray(p.situacao_oc) ? p.situacao_oc : [];
    if (sitsSel.length > 0) p.situacao_oc = sitsSel.join(',');
    else delete p.situacao_oc;
    if (!p.coddep) delete p.coddep;
    if (!p.tipo_item || p.tipo_item === 'TODOS') delete p.tipo_item;
    if (!p.tipo_oc || p.tipo_oc === 'TODOS') delete p.tipo_oc;
    if (!p.codigo_motivo_oc || p.codigo_motivo_oc === 'TODOS') delete p.codigo_motivo_oc;
    if (!p.observacao_oc) delete p.observacao_oc;
    return p;
  }, [filters]);

  // Tooltip enriquecida para Pies (qtd + % + valor líquido)
  const PieRichTooltip = ({ active, payload, totals }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    const item = p.payload || {};
    const name = item.name ?? item.tipo_item ?? p.name;
    const qtd = item.quantidade_itens ?? p.value ?? 0;
    const valor = item.valor_liquido_total ?? 0;
    const pctQtd = totals.qtd > 0 ? (qtd / totals.qtd) * 100 : 0;
    const pctVal = totals.valor > 0 ? (valor / totals.valor) * 100 : 0;
    return (
      <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
        <div className="mb-1 font-semibold">{name}</div>
        <div className="text-muted-foreground">
          Itens: <span className="font-medium text-foreground">{qtd}</span> ({pctQtd.toFixed(1)}%)
        </div>
        <div className="text-muted-foreground">
          Valor líquido: <span className="font-medium text-foreground">{formatCurrency(valor)}</span> ({pctVal.toFixed(1)}%)
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">Clique para filtrar</div>
      </div>
    );
  };

  const tiposTotals = useMemo(() => {
    const list = chartData?.tipos ?? [];
    return {
      qtd: list.reduce((s: number, t: any) => s + (t.quantidade_itens || 0), 0),
      valor: list.reduce((s: number, t: any) => s + (t.valor_liquido_total || 0), 0),
    };
  }, [chartData]);

  const situacoesTotals = useMemo(() => {
    const list = chartData?.situacoes ?? [];
    return {
      qtd: list.reduce((s: number, t: any) => s + (t.quantidade_itens || 0), 0),
      valor: list.reduce((s: number, t: any) => s + (t.valor_liquido_total || 0), 0),
    };
  }, [chartData]);

  const handleDrillTipo = (slice: any) => {
    const raw = String(slice?.tipo_item ?? '').toUpperCase();
    let valor: 'PRODUTO' | 'SERVICO' | 'TODOS' = 'TODOS';
    if (raw === 'PRODUTO' || raw === 'P') valor = 'PRODUTO';
    else if (raw === 'SERVICO' || raw === 'S') valor = 'SERVICO';
    if (valor === 'TODOS') {
      toast.info('Sem código de tipo definido para drill-down nesta categoria.');
      return;
    }
    setFilters((f) => ({ ...f, tipo_item: valor }));
    setActiveTab('lista');
    setTimeout(() => search(1), 0);
  };

  const handleDrillSituacao = (slice: any) => {
    const sit = slice?.situacao_oc;
    if (sit === undefined || sit === null) return;
    setFilters((f) => ({ ...f, situacao_oc: [String(sit)] }));
    setActiveTab('lista');
    setTimeout(() => search(1), 0);
  };

  return (
    <div className="space-y-4 p-4">
      <ErpConnectionAlert />
      <PageHeader
        title="Painel de Compras"
        description="Dashboard e detalhamento de ordens de compra"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Label className="whitespace-nowrap text-xs text-muted-foreground">Registros:</Label>
              <Select
                value={tamanhoPagina}
                onValueChange={(v) => {
                  const novo = v as typeof tamanhoPagina;
                  setTamanhoPagina(novo);
                  if (novo === 'todos') {
                    toast.info('Carregando todos os registros do filtro — pode levar alguns segundos para muitos resultados.');
                  }
                  if (data) search(1);
                }}
              >
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1000</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ExportButton endpoint="/api/export/painel-compras" params={exportParams} />
          </div>
        }
      />
      <FilterPanel onSearch={() => search(1)} onClear={clearFilters}>
        <div><Label className="text-xs">Item</Label><Input value={filters.codigo_item} onChange={(e) => setFilters(f => ({ ...f, codigo_item: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Código Produto</Label><Input value={filters.codigo_produto} onChange={(e) => setFilters(f => ({ ...f, codigo_produto: e.target.value }))} className="h-8 text-xs" placeholder="Ex: 001.001" /></div>
        <div><Label className="text-xs">Descrição Item</Label><Input value={filters.descricao_item} onChange={(e) => setFilters(f => ({ ...f, descricao_item: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Fornecedor</Label><ComboboxFilter value={filters.fornecedor} onChange={(v) => setFilters(f => ({ ...f, fornecedor: v }))} options={fornecedoresOptions} placeholder="Buscar fornecedor..." loading={fornecedoresLoading} /></div>
        <div><Label className="text-xs">Nº OC</Label><Input value={filters.numero_oc} onChange={(e) => setFilters(f => ({ ...f, numero_oc: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Projeto</Label><Input value={filters.numero_projeto} onChange={(e) => setFilters(f => ({ ...f, numero_projeto: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Centro Custo</Label><Input value={filters.centro_custo} onChange={(e) => setFilters(f => ({ ...f, centro_custo: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Transação</Label><Input value={filters.transacao} onChange={(e) => setFilters(f => ({ ...f, transacao: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Emissão de</Label><Input type="date" value={filters.data_emissao_ini} onChange={(e) => setFilters(f => ({ ...f, data_emissao_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Emissão até</Label><Input type="date" value={filters.data_emissao_fim} onChange={(e) => setFilters(f => ({ ...f, data_emissao_fim: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Entrega de</Label><Input type="date" value={filters.data_entrega_ini} onChange={(e) => setFilters(f => ({ ...f, data_entrega_ini: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Entrega até</Label><Input type="date" value={filters.data_entrega_fim} onChange={(e) => setFilters(f => ({ ...f, data_entrega_fim: e.target.value }))} className="h-8 text-xs" /></div>
        <div><Label className="text-xs">Família</Label><ComboboxFilter value={filters.familia} onChange={(v) => setFilters(f => ({ ...f, familia: v }))} options={familias} placeholder="Família" loading={optionsLoading} /></div>
        <div><Label className="text-xs">Origem</Label><ComboboxFilter value={filters.origem_material} onChange={(v) => setFilters(f => ({ ...f, origem_material: v }))} options={origens} placeholder="Origem" loading={optionsLoading} /></div>
        <div><Label className="text-xs">Depósito</Label><Input value={filters.coddep} onChange={(e) => setFilters(f => ({ ...f, coddep: e.target.value }))} placeholder="Depósito" className="h-8 text-xs" /></div>
        <div>
          <Label className="text-xs">Situação da OC</Label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                title={filters.situacao_oc.map((v) => situacaoLabel(v)).join(', ') || 'Todas'}
              >
                <span className="truncate">
                  {filters.situacao_oc.length === 0
                    ? 'Todas'
                    : filters.situacao_oc.length === 1
                      ? situacaoLabel(filters.situacao_oc[0])
                      : `${filters.situacao_oc.length} selecionadas`}
                </span>
                <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() => setFilters((f) => ({ ...f, situacao_oc: SITUACOES_OPCOES.map((o) => o.value) }))}
                >
                  Selecionar todas
                </button>
                <button
                  type="button"
                  className="hover:text-foreground"
                  onClick={() => setFilters((f) => ({ ...f, situacao_oc: [] }))}
                >
                  Limpar
                </button>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {SITUACOES_OPCOES.map((opt) => {
                  const checked = filters.situacao_oc.includes(opt.value);
                  return (
                    <label
                      key={opt.value}
                      className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-accent"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const isChecked = !!v;
                          setFilters((f) => {
                            const cur = new Set(f.situacao_oc);
                            if (isChecked) cur.add(opt.value);
                            else cur.delete(opt.value);
                            const next = SITUACOES_OPCOES
                              .map((o) => o.value)
                              .filter((v) => cur.has(v));
                            const includesLiquidado = next.includes('4');
                            return {
                              ...f,
                              situacao_oc: next,
                              somente_pendentes: includesLiquidado ? false : f.somente_pendentes,
                            };
                          });
                        }}
                      />
                      <span className="truncate">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div>
          <Label className="text-xs">Desconto</Label>
          <Select value={filters.codigo_motivo_oc} onValueChange={(v) => setFilters(f => ({ ...f, codigo_motivo_oc: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="19">Com desconto</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Obs./Valor Desconto</Label><Input value={filters.observacao_oc} onChange={(e) => setFilters(f => ({ ...f, observacao_oc: e.target.value }))} placeholder="Pesquisar desconto..." className="h-8 text-xs" /></div>
        <div>
          <Label className="text-xs">Tipo Item</Label>
          <Select value={filters.tipo_item} onValueChange={(v) => setFilters(f => ({ ...f, tipo_item: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="PRODUTO">Produto</SelectItem>
              <SelectItem value="SERVICO">Serviço</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tipo OC</Label>
          <Select value={filters.tipo_oc} onValueChange={(v) => setFilters(f => ({ ...f, tipo_oc: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="NORMAL">Normal</SelectItem>
              <SelectItem value="MISTA">Mista</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox id="pendentes" checked={filters.somente_pendentes} onCheckedChange={(v) => setFilters(f => ({ ...f, somente_pendentes: !!v }))} />
          <Label htmlFor="pendentes" className="text-xs">Somente pendentes</Label>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Checkbox id="mostrarValorTotalOc" checked={filters.mostrar_valor_total_oc} onCheckedChange={(v) => setFilters(f => ({ ...f, mostrar_valor_total_oc: !!v }))} />
          <Label htmlFor="mostrarValorTotalOc" className="text-xs">Mostrar valor total da OC</Label>
        </div>
      </FilterPanel>

      {data && kpis && (
        <>
          {!data.resumo && tamanhoPagina !== 'todos' && data.total_paginas > 1 && (
            <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
              Atenção: o backend não retornou totais agregados. Os cards estão somando apenas a página atual ({data.dados.length} de {data.total_registros.toLocaleString('pt-BR')} registros). Selecione "Todos" no canto superior direito para ver os valores completos.
            </div>
          )}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Indicadores Financeiros</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
              <KPICard index={0} title="Total OCs" value={kpis.total_ocs} icon={<ShoppingCart className="h-5 w-5" />} tooltip="Quantidade total de Ordens de Compra" details={chartData?.situacoes?.map((s: any) => ({ label: situacaoLabel(s.situacao_oc), value: String(s.quantidade_itens) }))} />
              <KPICard index={1} title="Valor Bruto" value={formatCurrency(kpis.valor_bruto_total)} variant="default" icon={<DollarSign className="h-5 w-5" />} tooltip="Soma dos valores brutos antes de descontos" details={drillDetails.valorBruto} />
              <KPICard index={2} title="Desconto Total" value={formatCurrency(kpis.valor_desconto_total)} variant="warning" icon={<Percent className="h-5 w-5" />} tooltip="Soma de todos os descontos aplicados" details={drillDetails.desconto} />
              <KPICard index={3} title="Valor Líquido" value={formatCurrency(kpis.valor_liquido_total)} variant="info" icon={<TrendingUp className="h-5 w-5" />} tooltip="Valor bruto menos descontos" details={[{ label: 'Valor Bruto', value: formatCurrency(kpis.valor_bruto_total) }, { label: 'Descontos', value: formatCurrency(kpis.valor_desconto_total) }, { label: 'Valor Líquido', value: formatCurrency(kpis.valor_liquido_total) }]} />
              <KPICard index={4} title="Impostos Totais" value={formatCurrency(kpis.impostos_totais)} variant="default" icon={<Receipt className="h-5 w-5" />} tooltip="Soma de IPI, ICMS, ISS e outros impostos" details={drillDetails.impostos} />
              <KPICard index={5} title="Fornecedores" value={kpis.total_fornecedores} variant="default" icon={<Layers className="h-5 w-5" />} tooltip="Quantidade de fornecedores distintos" details={drillDetails.fornecedores} />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Indicadores de Pendência</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
              <KPICard index={6} title="Valor Pendente" value={formatCurrency(kpis.valor_pendente_total)} variant="warning" icon={<Clock className="h-5 w-5" />} tooltip="Valor total de itens ainda não recebidos" details={drillDetails.valorPendente} />
              <KPICard index={7} title="Itens Pendentes" value={kpis.itens_pendentes} variant="warning" icon={<Package className="h-5 w-5" />} tooltip="Quantidade de itens com saldo pendente de recebimento" details={drillDetails.itensPendentes} />
              <KPICard index={8} title="Itens Atrasados" value={kpis.itens_atrasados} variant="destructive" icon={<AlertTriangle className="h-5 w-5" />} tooltip="Itens cuja data de entrega já passou e ainda possuem saldo" details={drillDetails.itensAtrasados} />
              <KPICard index={9} title="OCs Atrasadas" value={kpis.ocs_atrasadas ?? '-'} variant="destructive" icon={<AlertTriangle className="h-5 w-5" />} tooltip="Quantidade de OCs com pelo menos um item atrasado" details={drillDetails.ocsAtrasadas} />
              <KPICard index={10} title="Maior Atraso" value={`${kpis.maior_atraso_dias} dias`} variant="destructive" icon={<Clock className="h-5 w-5" />} tooltip="Maior número de dias de atraso entre todos os itens pendentes" details={drillDetails.maiorAtraso} />
              <KPICard index={11} title="Ticket Médio/Item" value={formatCurrency(kpis.ticket_medio_item)} variant="info" icon={<TrendingUp className="h-5 w-5" />} tooltip="Valor líquido total dividido pelo número de itens" />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contagem de Itens</h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
              <KPICard index={12} title="Total Linhas" value={kpis.total_linhas ?? '-'} icon={<FileText className="h-5 w-5" />} tooltip="Total de linhas de itens nas ordens de compra" details={drillDetails.totalLinhas} />
              <KPICard index={13} title="Itens Produto" value={kpis.itens_produto ?? '-'} variant="info" icon={<Package className="h-5 w-5" />} tooltip="Quantidade de itens classificados como Produto" details={kpis.total_linhas ? [{ label: 'Produtos', value: `${kpis.itens_produto ?? 0} (${((kpis.itens_produto ?? 0) / kpis.total_linhas * 100).toFixed(1)}%)` }, { label: 'Serviços', value: `${kpis.itens_servico ?? 0} (${((kpis.itens_servico ?? 0) / kpis.total_linhas * 100).toFixed(1)}%)` }] : undefined} />
              <KPICard index={14} title="Itens Serviço" value={kpis.itens_servico ?? '-'} variant="success" icon={<Layers className="h-5 w-5" />} tooltip="Quantidade de itens classificados como Serviço" details={drillDetails.itensServico} />
            </div>
          </div>
        </>
      )}

      {data && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'dashboard' | 'lista')} className="w-full">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="lista">Lista Detalhada</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {chartData && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">Análises Gráficas</h3>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {chartData.top_fornecedores?.length > 0 && (
                    <VisualGate visualKey="compras.top-fornecedores">
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Top Fornecedores (Valor Líquido)</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData.top_fornecedores} layout="vertical">
                          <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <YAxis type="category" dataKey="fantasia_fornecedor" width={120} className="text-xs" tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor_liquido_total" fill="hsl(215,70%,45%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    </VisualGate>
                  )}

                  {chartData.situacoes?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-1 text-sm font-semibold">Situação das OCs</h3>
                      <p className="mb-2 text-[11px] text-muted-foreground">Clique em uma fatia para filtrar a Lista Detalhada</p>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={chartData.situacoes.map((s: any) => ({ ...s, name: situacaoLabel(s.situacao_oc) }))}
                            dataKey="quantidade_itens"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                            cursor="pointer"
                            onClick={(slice: any) => handleDrillSituacao(slice?.payload ?? slice)}
                          >
                            {chartData.situacoes.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<PieRichTooltip totals={situacoesTotals} />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {chartData.tipos?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-1 text-sm font-semibold">Produtos x Serviços</h3>
                      <p className="mb-2 text-[11px] text-muted-foreground">Clique em uma fatia para filtrar a Lista Detalhada</p>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={chartData.tipos}
                            dataKey="quantidade_itens"
                            nameKey="tipo_item"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                            cursor="pointer"
                            onClick={(slice: any) => handleDrillTipo(slice?.payload ?? slice)}
                          >
                            {chartData.tipos.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<PieRichTooltip totals={tiposTotals} />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {chartData.entregas_por_mes?.length > 0 && (
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Entregas por Mês (Itens por mês de entrega)</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData.entregas_por_mes}>
                          <XAxis dataKey="periodo_entrega" className="text-xs" tick={{ fontSize: 10 }} />
                          <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor_pendente_total" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {chartData.familias?.length > 0 && (
                    <VisualGate visualKey="compras.top-familias">
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Top Famílias por Valor Líquido</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData.familias} layout="vertical">
                          <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <YAxis type="category" dataKey="codigo_familia" width={100} className="text-xs" tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor_liquido_total" fill="hsl(142,70%,40%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    </VisualGate>
                  )}

                  {chartData.origens?.length > 0 && (
                    <VisualGate visualKey="compras.top-origens">
                    <div className="rounded-md border bg-card p-4">
                      <h3 className="mb-3 text-sm font-semibold">Top Origens por Valor Líquido</h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={chartData.origens} layout="vertical">
                          <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                          <YAxis type="category" dataKey="origem" width={100} className="text-xs" tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Bar dataKey="valor_liquido_total" fill="hsl(280,60%,50%)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    </VisualGate>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="lista" className="space-y-2">
            {tamanhoPagina === 'todos' && data.total_registros > 0 && (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Exibindo todos os {data.total_registros.toLocaleString('pt-BR')} registros do filtro — paginação desativada.
              </div>
            )}
            <DataTable columns={columns} data={data.dados} loading={loading} />
            {tamanhoPagina !== 'todos' && (
              <PaginationControl pagina={pagina} totalPaginas={data.total_paginas} totalRegistros={data.total_registros} onPageChange={(p) => search(p)} />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
