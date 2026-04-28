import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { ErpConnectionAlert, useErpReady } from '@/components/erp/ErpConnectionAlert';
import { PageHeader } from '@/components/erp/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/erp/DataTable';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Hash, Link2, Eraser, Radio, Unlink, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatDate } from '@/lib/format';
import { useAiPageContext } from '@/hooks/useAiPageContext';

interface ContextoNumeroSerie {
  codigo_empresa: number;
  numero_pedido: number;
  item_pedido: number;
  numero_op: number;
  origem_op: string;
  origem_pedido?: string;
  origens_conferem?: boolean;
  codigo_produto: string;
  derivacao: string;
  descricao_produto: string;
  codagp: string;
  numero_serie_atual: string;
  numero_serie_vinculada_op?: string;
  pedido_vinculado_op?: number;
  item_vinculado_op?: number;
  situacao_vinculo_op?: string;
  vinculo_op_confere_numero_serie?: boolean;
}

type EscopoDesvinculo = 'item_pedido' | 'vinculo_op';

interface CandidatoDesvinculo {
  id: string;
  escopo: EscopoDesvinculo;
  numero_serie: string;
  numero_pedido: number;
  item_pedido: number;
  origem_label: string;
  descricao: string;
  limpar_e000cse: boolean;
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
    numero_pedido: '', item_pedido: '', numero_op: '', origem_op: '',
    codigo_produto: '', derivacao: '', numero_serie_manual: '',
  });
  const [contexto, setContexto] = useState<ContextoNumeroSerie | null>(null);
  const [dados, setDados] = useState<NumeroSerieItem[]>([]);
  const [selecionado, setSelecionado] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingReserva, setLoadingReserva] = useState(false);
  const [loadingDesvincular, setLoadingDesvincular] = useState(false);
  const [confirmDesvincularOpen, setConfirmDesvincularOpen] = useState(false);
  const [candidatoSelecionadoId, setCandidatoSelecionadoId] = useState<string>('');

  const erpReady = useErpReady();

  useAiPageContext({
    title: 'Reserva Nº de Série',
    filters,
    kpis: contexto ? {
      'Pedido': contexto.numero_pedido,
      'Item': contexto.item_pedido,
      'OP': contexto.numero_op || '-',
      'Produto': contexto.codigo_produto,
      'Série Atual': contexto.numero_serie_atual || '-',
    } : undefined,
    summary: dados.length
      ? `${dados.length} números de série listados${selecionado ? `; selecionado: ${selecionado}` : ''}`
      : undefined,
  });


  const buscarContexto = useCallback(async () => {
    if (!erpReady) { toast.error('Conexão ERP não disponível.'); return; }
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
      setFilters(f => ({
        ...f,
        origem_op: result.contexto?.origem_op || '',
        ...(produto ? { codigo_produto: produto, derivacao: result.contexto?.derivacao || '' } : {}),
      }));
      if (produto) {
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

  const candidatosDesvinculo: CandidatoDesvinculo[] = (() => {
    const lista: CandidatoDesvinculo[] = [];
    const manual = filters.numero_serie_manual.trim().toUpperCase();

    // A — GS no item do pedido (E000CSE)
    if (contexto?.numero_serie_atual && contexto.numero_pedido && contexto.item_pedido) {
      lista.push({
        id: `item-${contexto.numero_serie_atual}`,
        escopo: 'item_pedido',
        numero_serie: contexto.numero_serie_atual,
        numero_pedido: contexto.numero_pedido,
        item_pedido: contexto.item_pedido,
        origem_label: 'Item do pedido (E000CSE)',
        descricao: `Pedido ${contexto.numero_pedido} / Item ${contexto.item_pedido} — limpa o nº de série do item`,
        limpar_e000cse: true,
      });
    }

    // B — GS reservado para a OP (USU_T075SEP) — só se for diferente do A
    if (
      contexto?.numero_serie_vinculada_op &&
      contexto.numero_serie_vinculada_op !== contexto.numero_serie_atual &&
      contexto.pedido_vinculado_op &&
      contexto.item_vinculado_op
    ) {
      lista.push({
        id: `op-${contexto.numero_serie_vinculada_op}`,
        escopo: 'vinculo_op',
        numero_serie: contexto.numero_serie_vinculada_op,
        numero_pedido: contexto.pedido_vinculado_op,
        item_pedido: contexto.item_vinculado_op,
        origem_label: 'Vínculo da OP (USU_T075SEP)',
        descricao: `Pedido ${contexto.pedido_vinculado_op} / Item ${contexto.item_vinculado_op} — libera reserva da OP`,
        limpar_e000cse: false,
      });
    }

    // C — GS digitado manualmente (não está em A nem B)
    if (manual && !lista.some(c => c.numero_serie === manual)) {
      const numPed = Number(filters.numero_pedido || contexto?.numero_pedido || 0);
      const itemPed = Number(filters.item_pedido || contexto?.item_pedido || 0);
      if (numPed && itemPed) {
        lista.push({
          id: `manual-${manual}`,
          escopo: 'item_pedido',
          numero_serie: manual,
          numero_pedido: numPed,
          item_pedido: itemPed,
          origem_label: 'GS informado manualmente',
          descricao: `Pedido ${numPed} / Item ${itemPed}`,
          limpar_e000cse: true,
        });
      }
    }

    return lista;
  })();

  const candidatoEfetivo =
    candidatosDesvinculo.find(c => c.id === candidatoSelecionadoId) ||
    candidatosDesvinculo[0] ||
    null;

  const abrirConfirmDesvincular = () => {
    if (candidatosDesvinculo.length === 0) {
      toast.error('Nenhum vínculo de GS encontrado para desvincular.');
      return;
    }
    setCandidatoSelecionadoId(candidatosDesvinculo[0].id);
    setConfirmDesvincularOpen(true);
  };

  const desvincular = async () => {
    if (!candidatoEfetivo) {
      toast.error('Selecione um vínculo para desvincular.');
      return;
    }

    setLoadingDesvincular(true);
    try {
      const body: Record<string, any> = {
        codigo_empresa: 1,
        numero_pedido: candidatoEfetivo.numero_pedido,
        item_pedido: candidatoEfetivo.item_pedido,
        numero_serie: candidatoEfetivo.numero_serie,
        escopo: candidatoEfetivo.escopo,
        limpar_e000cse: candidatoEfetivo.limpar_e000cse,
      };
      const numeroOp = filters.numero_op || String(contexto?.numero_op || '');
      if (numeroOp && Number(numeroOp) > 0) body.numero_op = Number(numeroOp);

      const result = await api.post<{ mensagem: string; contexto: ContextoNumeroSerie; numero_serie_removido: string }>(
        '/api/numero-serie/desvincular',
        body,
      );
      toast.success(result.mensagem || `Vínculo do ${candidatoEfetivo.numero_serie} removido.`);
      if (result.contexto) setContexto(result.contexto);
      setSelecionado('');
      setFilters(f => ({ ...f, numero_serie_manual: '' }));
      await buscarProximos();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingDesvincular(false);
      setConfirmDesvincularOpen(false);
    }
  };

  const limpar = () => {
    setFilters({ numero_pedido: '', item_pedido: '', numero_op: '', origem_op: '', codigo_produto: '', derivacao: '', numero_serie_manual: '' });
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
      <ErpConnectionAlert />
      <PageHeader
        title="Reserva Nº de Série"
        description="Vincule e reserve números de série (GS) em pedidos e OPs"
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            <div><Label className="text-xs">Pedido</Label><Input type="number" value={filters.numero_pedido} onChange={e => setFilters(f => ({ ...f, numero_pedido: e.target.value }))} className="h-8 text-xs" placeholder="Ex.: 123456" /></div>
            <div><Label className="text-xs">Item do Pedido</Label><Input type="number" value={filters.item_pedido} onChange={e => setFilters(f => ({ ...f, item_pedido: e.target.value }))} className="h-8 text-xs" placeholder="Ex.: 1" /></div>
            <div><Label className="text-xs">OP</Label><Input type="number" value={filters.numero_op} onChange={e => setFilters(f => ({ ...f, numero_op: e.target.value }))} className="h-8 text-xs" placeholder="Ex.: 100234" /></div>
            <div><Label className="text-xs">Origem OP</Label><Input value={filters.origem_op} readOnly tabIndex={-1} className="h-8 text-xs bg-muted/50 font-mono" placeholder="Auto ao buscar contexto" /></div>
            <div><Label className="text-xs">Produto</Label><Input value={filters.codigo_produto} onChange={e => setFilters(f => ({ ...f, codigo_produto: e.target.value }))} className="h-8 text-xs" placeholder="Preenchido ao buscar contexto" /></div>
            <div><Label className="text-xs">Derivação</Label><Input value={filters.derivacao} onChange={e => setFilters(f => ({ ...f, derivacao: e.target.value }))} className="h-8 text-xs" placeholder="Opcional" /></div>
            <div><Label className="text-xs">Nº Série Manual</Label><Input value={filters.numero_serie_manual} onChange={e => setFilters(f => ({ ...f, numero_serie_manual: e.target.value }))} className="h-8 text-xs" placeholder="Ex.: GS-11705" /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={buscarContexto} disabled={loading}><Search className="mr-1 h-3.5 w-3.5" />Buscar Contexto</Button>
            <Button size="sm" variant="secondary" onClick={() => buscarProximos()} disabled={loading}><Hash className="mr-1 h-3.5 w-3.5" />Buscar Próximos</Button>
            <Button size="sm" variant="secondary" onClick={() => reservar(false)} disabled={loadingReserva || !selecionado}><Link2 className="mr-1 h-3.5 w-3.5" />Reservar Selecionado</Button>
            <Button size="sm" variant="secondary" onClick={() => reservar(true)} disabled={loadingReserva}><Link2 className="mr-1 h-3.5 w-3.5" />Vincular GS Informado</Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={abrirConfirmDesvincular}
              disabled={loadingDesvincular || candidatosDesvinculo.length === 0}
              title="Remove o vínculo do GS no pedido/OP (use para corrigir vínculos errados)"
            >
              <Unlink className="mr-1 h-3.5 w-3.5" />Desvincular GS
            </Button>
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
            onRowClick={(row) => {
              if (row.status !== 'INATIVO') {
                setSelecionado(row.numero_serie);
              }
            }}
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

      <AlertDialog open={confirmDesvincularOpen} onOpenChange={setConfirmDesvincularOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar desvínculo de Nº de Série</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>Esta ação removerá o vínculo do GS abaixo. Use somente para corrigir um vínculo feito errado.</p>

                {candidatosDesvinculo.length > 1 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Existem {candidatosDesvinculo.length} vínculos. Selecione qual desvincular:
                    </p>
                    <RadioGroup
                      value={candidatoSelecionadoId}
                      onValueChange={setCandidatoSelecionadoId}
                      className="space-y-2"
                    >
                      {candidatosDesvinculo.map((c) => (
                        <label
                          key={c.id}
                          htmlFor={c.id}
                          className="flex items-start gap-3 rounded-md border bg-muted/40 p-3 cursor-pointer hover:bg-muted/60"
                        >
                          <RadioGroupItem value={c.id} id={c.id} className="mt-0.5" />
                          <div className="flex-1 space-y-1">
                            <div className="font-mono text-sm font-semibold">{c.numero_serie}</div>
                            <div className="text-xs text-muted-foreground">{c.origem_label}</div>
                            <div className="text-xs">{c.descricao}</div>
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                ) : candidatoEfetivo ? (
                  <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs space-y-1">
                    <div><span className="text-muted-foreground">GS:</span> <strong>{candidatoEfetivo.numero_serie}</strong></div>
                    <div><span className="text-muted-foreground">Origem:</span> {candidatoEfetivo.origem_label}</div>
                    <div><span className="text-muted-foreground">Pedido:</span> {candidatoEfetivo.numero_pedido} / Item {candidatoEfetivo.item_pedido}</div>
                    <div><span className="text-muted-foreground">OP:</span> {contexto?.numero_op || '-'} {contexto?.origem_op ? `(${contexto.origem_op})` : ''}</div>
                    <div><span className="text-muted-foreground">Produto:</span> {contexto?.codigo_produto || '-'} / {contexto?.derivacao || '-'}</div>
                  </div>
                ) : null}

                <p className="text-xs text-muted-foreground">
                  {candidatoEfetivo?.escopo === 'vinculo_op'
                    ? 'A reserva da OP será liberada. O nº de série do item do pedido NÃO será alterado.'
                    : 'O GS voltará para o status LIVRE e o nº de série do item do pedido será limpo.'}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingDesvincular}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); desvincular(); }}
              disabled={loadingDesvincular}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loadingDesvincular ? 'Desvinculando...' : 'Confirmar desvínculo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
