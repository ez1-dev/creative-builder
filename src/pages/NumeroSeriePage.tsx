import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/erp/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/erp/DataTable';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Hash, Link2, Eraser, Radio } from 'lucide-react';
import { formatDate } from '@/lib/format';

interface ContextoNumeroSerie {
  codigo_empresa: number;
  numero_pedido: number;
  item_pedido: number;
  numero_op: number;
  origem_op: string;
  codigo_produto: string;
  derivacao: string;
  descricao_produto: string;
  codagp: string;
  numero_serie_atual: string;
  numero_serie_vinculada_op?: string;
  vinculo_op_confere_numero_serie?: boolean;
}

interface NumeroSerieItem {
  ordem: number;
  numero_serie: string;
  derivacao_cadastro: string;
  data_geracao: string;
  hora_geracao: number;
  ativo: string;
  status: string;
  pedido_reservado: number;
  item_reservado: number;
}

interface ProximosResponse {
  codigo_produto: string;
  derivacao: string;
  modo_consulta: string;
  total_registros: number;
  sugestao: NumeroSerieItem | null;
  dados: NumeroSerieItem[];
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'LIVRE': return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300">LIVRE</Badge>;
    case 'RESERVADO': return <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300">RESERVADO</Badge>;
    case 'INATIVO': return <Badge variant="outline" className="bg-muted text-muted-foreground">INATIVO</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

const columns: Column<NumeroSerieItem>[] = [
  { key: '_select', header: '', render: (_v, _row) => <Radio className="h-4 w-4 text-primary cursor-pointer" /> },
  { key: 'ordem', header: 'Ordem', align: 'center' },
  { key: 'numero_serie', header: 'Número de Série' },
  { key: 'derivacao_cadastro', header: 'Deriv. Cadastro' },
  { key: 'data_geracao', header: 'Data Geração', render: (v) => formatDate(v) },
  { key: 'hora_geracao', header: 'Hora', render: (v) => v ? String(v).padStart(6, '0').replace(/(\d{2})(\d{2})(\d{2})/, '$1:$2:$3') : '-' },
  { key: 'ativo', header: 'Ativo', align: 'center' },
  { key: 'status', header: 'Status', render: (v) => statusBadge(v) },
  { key: 'pedido_reservado', header: 'Pedido Reserv.', render: (v) => v && v !== 0 ? v : '-' },
  { key: 'item_reservado', header: 'Item Reserv.', render: (v) => v && v !== 0 ? v : '-' },
];

export default function NumeroSeriePage() {
  const [filters, setFilters] = useState({
    numero_pedido: '', item_pedido: '', numero_op: '',
    codigo_produto: '', derivacao: '', numero_serie_manual: '',
  });
  const [contexto, setContexto] = useState<ContextoNumeroSerie | null>(null);
  const [dados, setDados] = useState<NumeroSerieItem[]>([]);
  const [selecionado, setSelecionado] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingReserva, setLoadingReserva] = useState(false);

  const buscarContexto = useCallback(async () => {
    const { numero_pedido, item_pedido, numero_op, codigo_produto } = filters;
    if (!numero_op && !numero_pedido) {
      // If product is filled, go straight to proximos
      if (codigo_produto.trim()) {
        await buscarProximos(codigo_produto.trim(), filters.derivacao.trim());
        return;
      }
      toast.error('Informe a OP ou o Pedido + Item para buscar o contexto.');
      return;
    }

    setLoading(true);
    try {
      const params: Record<string, any> = { codigo_empresa: 1 };
      if (numero_op) params.numero_op = Number(numero_op);
      if (numero_pedido) params.numero_pedido = Number(numero_pedido);
      if (item_pedido) params.item_pedido = Number(item_pedido);

      const result = await api.get<{ contexto: ContextoNumeroSerie }>('/api/numero-serie/contexto', params);
      setContexto(result.contexto);

      const produto = result.contexto?.codigo_produto?.trim();
      if (produto) {
        setFilters(f => ({ ...f, codigo_produto: produto, derivacao: result.contexto?.derivacao || '' }));
        await buscarProximos(produto, result.contexto?.derivacao || '');
      }
      toast.success('Contexto carregado com sucesso.');
    } catch (e: any) {
      toast.error(e.message);
      setContexto(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const buscarProximos = async (codigoProduto?: string, derivacao?: string) => {
    const produto = (codigoProduto || filters.codigo_produto).trim();
    const deriv = (derivacao ?? filters.derivacao).trim();
    if (!produto) {
      toast.error('Informe ou carregue o produto para consultar os próximos números de série.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.get<ProximosResponse>('/api/numero-serie/proximos', {
        codigo_produto: produto, derivacao: deriv, codigo_empresa: 1, limite: 40,
      });
      setDados(result.dados || []);
      if (result.sugestao?.numero_serie) {
        setSelecionado(result.sugestao.numero_serie);
      }
      const modoMsg = result.modo_consulta === 'produto_todas_derivacoes' ? ' (consulta ampliada para todas as derivações)' : '';
      toast.success(`${result.total_registros} registro(s) encontrados.${modoMsg}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const reservar = async (forcarVinculo: boolean = false) => {
    const numeroPedido = filters.numero_pedido || String(contexto?.numero_pedido || '');
    const itemPedido = filters.item_pedido || String(contexto?.item_pedido || '');
    const numeroSerie = forcarVinculo ? filters.numero_serie_manual.trim().toUpperCase() : selecionado;

    if (!numeroPedido || !itemPedido) {
      toast.error('Pedido e item do pedido são necessários para reservar.');
      return;
    }
    if (!numeroSerie) {
      toast.error(forcarVinculo ? 'Informe o número de série manual.' : 'Selecione um número de série.');
      return;
    }

    setLoadingReserva(true);
    try {
      const body: Record<string, any> = {
        codigo_empresa: 1,
        numero_pedido: Number(numeroPedido),
        item_pedido: Number(itemPedido),
        numero_serie: numeroSerie,
        forcar_vinculo: forcarVinculo,
        atualizar_e000cse: true,
      };
      const numeroOp = filters.numero_op || String(contexto?.numero_op || '');
      if (numeroOp && Number(numeroOp) > 0) body.numero_op = Number(numeroOp);

      const result = await api.post<{ mensagem: string; contexto: ContextoNumeroSerie; numero_serie: string }>('/api/numero-serie/reservar', body);
      toast.success(result.mensagem);
      setContexto(result.contexto);
      setSelecionado(result.numero_serie || numeroSerie);
      if (result.numero_serie) {
        setFilters(f => ({ ...f, numero_serie_manual: result.numero_serie }));
      }
      // Refresh list
      await buscarProximos();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingReserva(false);
    }
  };

  const limpar = () => {
    setFilters({ numero_pedido: '', item_pedido: '', numero_op: '', codigo_produto: '', derivacao: '', numero_serie_manual: '' });
    setContexto(null);
    setDados([]);
    setSelecionado('');
  };

  const ctxField = (label: string, value: any) => (
    <div className="space-y-0.5">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <p className="text-sm font-mono">{value || '-'}</p>
    </div>
  );

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="Reserva Nº de Série"
        description="Vincule e reserve números de série (GS) em pedidos e OPs"
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div><Label className="text-xs">Pedido</Label><Input type="number" value={filters.numero_pedido} onChange={e => setFilters(f => ({ ...f, numero_pedido: e.target.value }))} className="h-8 text-xs" placeholder="Ex.: 123456" /></div>
            <div><Label className="text-xs">Item do Pedido</Label><Input type="number" value={filters.item_pedido} onChange={e => setFilters(f => ({ ...f, item_pedido: e.target.value }))} className="h-8 text-xs" placeholder="Ex.: 1" /></div>
            <div><Label className="text-xs">OP</Label><Input type="number" value={filters.numero_op} onChange={e => setFilters(f => ({ ...f, numero_op: e.target.value }))} className="h-8 text-xs" placeholder="Ex.: 100234" /></div>
            <div><Label className="text-xs">Produto</Label><Input value={filters.codigo_produto} onChange={e => setFilters(f => ({ ...f, codigo_produto: e.target.value }))} className="h-8 text-xs" placeholder="Preenchido ao buscar contexto" /></div>
            <div><Label className="text-xs">Derivação</Label><Input value={filters.derivacao} onChange={e => setFilters(f => ({ ...f, derivacao: e.target.value }))} className="h-8 text-xs" placeholder="Opcional" /></div>
            <div><Label className="text-xs">Nº Série Manual</Label><Input value={filters.numero_serie_manual} onChange={e => setFilters(f => ({ ...f, numero_serie_manual: e.target.value }))} className="h-8 text-xs" placeholder="Ex.: GS-11705" /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={buscarContexto} disabled={loading}><Search className="mr-1 h-3.5 w-3.5" />Buscar Contexto</Button>
            <Button size="sm" variant="secondary" onClick={() => buscarProximos()} disabled={loading}><Hash className="mr-1 h-3.5 w-3.5" />Buscar Próximos</Button>
            <Button size="sm" variant="secondary" onClick={() => reservar(false)} disabled={loadingReserva || !selecionado}><Link2 className="mr-1 h-3.5 w-3.5" />Reservar Selecionado</Button>
            <Button size="sm" variant="secondary" onClick={() => reservar(true)} disabled={loadingReserva}><Link2 className="mr-1 h-3.5 w-3.5" />Vincular GS Informado</Button>
            <Button size="sm" variant="outline" onClick={limpar}><Eraser className="mr-1 h-3.5 w-3.5" />Limpar</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Ao informar a OP ou pedido + item, o contexto e os próximos números de série são carregados. Você também pode informar um GS manualmente.
          </p>
        </CardContent>
      </Card>

      {/* Context card */}
      {contexto && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Contexto do Pedido / OP</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              {ctxField('Pedido', contexto.numero_pedido)}
              {ctxField('Item', contexto.item_pedido)}
              {ctxField('OP', contexto.numero_op || '-')}
              {ctxField('Origem OP', contexto.origem_op)}
              {ctxField('Produto', contexto.codigo_produto)}
              {ctxField('Derivação', contexto.derivacao)}
              {ctxField('CODAGP', contexto.codagp)}
              {ctxField('Série Atual', contexto.numero_serie_atual)}
              {ctxField('Série Vinculada OP', contexto.numero_serie_vinculada_op)}
              {ctxField('Confere?', contexto.vinculo_op_confere_numero_serie ? '✅ Sim' : '—')}
            </div>
            <div className="mt-2">
              {ctxField('Descrição', contexto.descricao_produto)}
            </div>
            {selecionado && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Série selecionada:</span>
                <Badge variant="default">{selecionado}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data table */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Próximos Números de Série</CardTitle>
          <p className="text-xs text-muted-foreground">Consulta a USU_T075SEP. Clique na linha para selecionar.</p>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4">
          <DataTable
            columns={columns}
            data={dados}
            loading={loading}
            emptyMessage="Nenhuma consulta realizada."
            rowClassName={(row) =>
              row.numero_serie === selecionado
                ? 'bg-primary/10 hover:bg-primary/15'
                : row.status === 'LIVRE'
                  ? 'hover:bg-muted/50 cursor-pointer'
                  : row.status === 'INATIVO'
                    ? 'opacity-50'
                    : 'cursor-pointer'
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
