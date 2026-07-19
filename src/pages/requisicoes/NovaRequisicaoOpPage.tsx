import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/erp/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertTriangle, Search, RefreshCw, ArrowLeft, ArrowRight, Truck, PackageSearch,
  Info as InfoIcon, Loader2, CheckCircle2,
} from 'lucide-react';

import { useQuery } from '@tanstack/react-query';
import { useOpConsulta, useSidWriteEnabled } from '@/hooks/requisicoes';
import { requisicoesApi, IntegracaoDesabilitadaError } from '@/services/requisicoesApi';
import type { TipoAtendimentoOP, ComponenteOP } from '@/types/requisicoes';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOpcoesImpressaoOp } from '@/hooks/useOpcoesImpressaoOp';
import type { OpcaoOp } from '@/lib/producao/opcoesImpressao';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { RequisicaoStepper } from '@/components/requisicoes/RequisicaoStepper';
import { IntegracaoStatusChip } from '@/components/requisicoes/IntegracaoStatusChip';
import { ResumoRequisicaoLateral } from '@/components/requisicoes/ResumoRequisicaoLateral';
import { OpSearchList } from '@/components/requisicoes/OpSearchList';
import { cn } from '@/lib/utils';

type SaldoFilter = 'todos' | 'com' | 'sem';

const PAGE_SIZE = 25;

export default function NovaRequisicaoOpPage() {
  const nav = useNavigate();
  const { isAdmin } = useUserPermissions();

  // step
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // busca
  const [codori, setCodori] = useState('');
  const [numorp, setNumorp] = useState('');
  const [opLabel, setOpLabel] = useState('');
  const [buscar, setBuscar] = useState<{ codori: string; numorp: string } | undefined>();

  // seleção
  const [sel, setSel] = useState<Record<number, number>>({});
  const [justif, setJustif] = useState<Record<number, string>>({});
  const [obs, setObs] = useState<Record<number, string>>({});
  // depósito de origem escolhido pelo usuário (seqcmp -> coddep)
  const [depositosPorItem, setDepositosPorItem] = useState<Record<number, number>>({});
  const [rascunhoDisponivel, setRascunhoDisponivel] = useState(false);


  // atendimento
  const [tipo, setTipo] = useState<TipoAtendimentoOP>('TRANSFERIR');
  const [depositoDestino, setDepositoDestino] = useState('');
  const [obsGeral, setObsGeral] = useState('');
  const [dataNecessaria, setDataNecessaria] = useState('');

  // envio
  const [enviando, setEnviando] = useState(false);
  const [pendenteIntegr, setPendenteIntegr] = useState<string | null>(null);

  // filtros tabela
  const [filtroTxt, setFiltroTxt] = useState('');
  const [saldoFilter, setSaldoFilter] = useState<SaldoFilter>('todos');
  const [soPendentes, setSoPendentes] = useState(false);
  const [page, setPage] = useState(1);

  const op = useOpConsulta(buscar?.codori, buscar?.numorp);
  const sidWrite = useSidWriteEnabled();
  const { searchOps } = useOpcoesImpressaoOp();

  // Lookup de depósitos (cacheado) — usado apenas para o seletor por item quando
  // o componente vem sem depósito de origem (precisa_deposito=true).
  const depositosQuery = useQuery({
    queryKey: ['requisicoes', 'lookup', 'depositos'],
    queryFn: () => requisicoesApi.buscarDepositos({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });
  const depositosOpcoes = depositosQuery.data ?? [];

  // Pré-seleciona depósito 1 para itens que precisam
  useEffect(() => {
    const comps = op.data?.componentes ?? [];
    if (comps.length === 0) return;
    setDepositosPorItem((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const c of comps) {
        if (c.precisa_deposito && next[c.seqcmp] == null) {
          next[c.seqcmp] = 1;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [op.data]);


  useEffect(() => { searchOps('', { cod_emp: '1', sit_orp: 'A' }).catch(() => {}); }, [searchOps]);
  const fetchOps = (q: string) => searchOps(q, { cod_emp: '1', sit_orp: 'A' });

  const podeRequisitar = op.data?.pode_requisitar ?? false;

  // Avança automaticamente ao carregar componentes suficientes? Mantemos o usuário no passo 1
  // para permitir revisar o "Resumo da OP" antes de prosseguir.


  const handleSelectOp = (o: OpcaoOp | null) => {
    if (!o) {
      setCodori(''); setNumorp(''); setOpLabel(''); setBuscar(undefined);
      return;
    }
    const co = String(o.cod_ori ?? '').trim();
    const no = String(o.num_orp ?? '').trim();
    setCodori(co);
    setNumorp(no);
    setOpLabel(
      o.label ||
      [[co, no].filter(Boolean).join(' / '), o.produto, o.descricao_produto].filter(Boolean).join(' - '),
    );
    if (co && no) {
      setBuscar({ codori: co, numorp: no });
      toast({ title: `OP ${co}/${no} selecionada`, description: 'Consultando dados da ordem…' });
    }
  };


  const consultarManual = () => {
    if (!codori.trim() || !numorp.trim()) return;
    setBuscar({ codori: codori.trim(), numorp: numorp.trim() });
  };

  const trocarOp = () => {
    setBuscar(undefined);
    setCodori(''); setNumorp(''); setOpLabel('');
    setSel({}); setJustif({}); setObs({});
    setStep(1);
  };

  // Componentes filtrados/paginados
  const componentesFiltrados = useMemo<ComponenteOP[]>(() => {
    const arr = op.data?.componentes ?? [];
    const q = filtroTxt.trim().toLowerCase();
    return arr.filter((c) => {
      if (q && !`${c.codcmp} ${c.descricao ?? ''}`.toLowerCase().includes(q)) return false;
      if (saldoFilter === 'com' && !(c.quantidade_disponivel > 0)) return false;
      if (saldoFilter === 'sem' && c.quantidade_disponivel > 0) return false;
      if (soPendentes && !(c.quantidade_requisitada < c.quantidade_prevista)) return false;
      return true;
    });
  }, [op.data, filtroTxt, saldoFilter, soPendentes]);

  const totalPages = Math.max(1, Math.ceil(componentesFiltrados.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const componentesPagina = useMemo(
    () => componentesFiltrados.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE),
    [componentesFiltrados, pageSafe],
  );
  useEffect(() => { setPage(1); }, [filtroTxt, saldoFilter, soPendentes, op.data]);

  const itensSelecionados = useMemo(
    () => Object.entries(sel)
      .filter(([, q]) => Number(q) > 0)
      .map(([seq, q]) => ({ seqcmp: Number(seq), quantidade: Number(q) })),
    [sel],
  );

  // Componente vem incompleto do backend?
  const componenteInvalido = (c: ComponenteOP | undefined): string | null => {
    if (!c) return 'Componente não encontrado na OP.';
    if (!c.codcmp && !c.componente) return 'codcmp ausente';
    if (c.codetg == null || c.codetg === ('' as any)) return 'codetg ausente';
    if (!c.unidade) return 'unidade de medida ausente';
    return null;
  };

  // Depósito escolhido pelo usuário (ou o que veio do backend)
  const depositoEscolhido = (c: ComponenteOP | undefined): number | null => {
    if (!c) return null;
    if (depositosPorItem[c.seqcmp] != null) return depositosPorItem[c.seqcmp];
    return c.deposito ?? null;
  };

  const itensInvalidos = useMemo(() => {
    const comps = op.data?.componentes ?? [];
    const out: { seqcmp: number; codcmp?: string; motivo: string }[] = [];
    for (const it of itensSelecionados) {
      const c = comps.find((x) => x.seqcmp === it.seqcmp);
      const motivo = componenteInvalido(c);
      if (motivo) out.push({ seqcmp: it.seqcmp, codcmp: c?.componente ?? c?.codcmp, motivo });
    }
    return out;
  }, [itensSelecionados, op.data]);

  // Itens selecionados que ainda não têm depósito de origem definido
  const itensSemDeposito = useMemo(() => {
    const comps = op.data?.componentes ?? [];
    const out: { seqcmp: number; codigo: string }[] = [];
    for (const it of itensSelecionados) {
      const c = comps.find((x) => x.seqcmp === it.seqcmp);
      if (!c) continue;
      if (depositoEscolhido(c) == null) {
        out.push({ seqcmp: it.seqcmp, codigo: c.componente ?? c.codcmp ?? String(c.seqcmp) });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itensSelecionados, op.data, depositosPorItem]);

  // Estatísticas
  const stats = useMemo(() => {
    const comps = op.data?.componentes ?? [];
    let qtdTotal = 0, comSaldo = 0, semSaldo = 0, acima = 0;
    for (const it of itensSelecionados) {
      const c = comps.find((x) => x.seqcmp === it.seqcmp);
      qtdTotal += it.quantidade;
      if (!c) continue;
      if (c.quantidade_disponivel > 0) comSaldo++; else semSaldo++;
      if (it.quantidade > c.quantidade_disponivel) acima++;
    }
    return {
      opLabel: op.data ? `OP ${op.data.codori}/${op.data.numorp}` : '',
      qtdItens: itensSelecionados.length,
      qtdTotal,
      comSaldo,
      semSaldo,
      acimaNecessidade: acima,
      tipoAtendimentoLabel: tipo === 'TRANSFERIR' ? 'Transferir p/ depósito' : 'Baixar direto na OP',
      depositoDestino: tipo === 'TRANSFERIR' ? depositoDestino : undefined,
      integracaoOnline: sidWrite.enabled,
    };
  }, [op.data, itensSelecionados, tipo, depositoDestino, sidWrite.enabled]);

  // Validações
  const justificativasFaltando = useMemo(() => {
    const comps = op.data?.componentes ?? [];
    return itensSelecionados.some((it) => {
      const c = comps.find((x) => x.seqcmp === it.seqcmp);
      return c && it.quantidade > c.quantidade_disponivel && !justif[it.seqcmp]?.trim();
    });
  }, [itensSelecionados, op.data, justif]);

  const canStep2To3 = itensSelecionados.length > 0 && !justificativasFaltando && itensInvalidos.length === 0;
  const canStep3To4 = tipo === 'BAIXAR_DIRETO' || (tipo === 'TRANSFERIR' && Boolean(depositoDestino.trim()));
  const canContinue =
    step === 1 ? Boolean(op.data && podeRequisitar) :
    step === 2 ? canStep2To3 :
    step === 3 ? canStep3To4 : true;

  const stepsDef = [
    { id: 1, label: 'Selecionar OP', enabled: true },
    { id: 2, label: 'Selecionar componentes', enabled: Boolean(op.data && podeRequisitar) },
    { id: 3, label: 'Definir atendimento', enabled: canStep2To3 && Boolean(op.data && podeRequisitar) },
    { id: 4, label: 'Revisar e enviar', enabled: canStep2To3 && canStep3To4 && Boolean(op.data && podeRequisitar) },
  ];

  // Payload builder
  const buildPayload = () => {
    if (!op.data) return null;
    return {
      tipo: 'OP' as const,
      codemp: op.data.codemp,
      codfil: op.data.codfil,
      data_necessaria: dataNecessaria || undefined,
      observacao: obsGeral || undefined,
      itens: itensSelecionados.map((it) => {
        const comp = op.data!.componentes.find((c) => c.seqcmp === it.seqcmp)!;
        const depOrigem = depositoEscolhido(comp);
        return {
          seq: it.seqcmp,
          codemp: op.data!.codemp,
          codfil: op.data!.codfil,
          codori: op.data!.codori,
          numorp: op.data!.numorp,
          codetg: comp.codetg,
          seqcmp: comp.seqcmp,
          codcmp: comp.componente ?? comp.codcmp,
          codder: comp.codder,
          unidade: comp.unidade,
          quantidade: it.quantidade,
          deposito_origem: depOrigem,
          deposito_destino: tipo === 'TRANSFERIR' ? (depositoDestino ? Number(depositoDestino) : null) : null,
          tipo_atendimento_op: tipo,
          observacao: obs[it.seqcmp] || undefined,
          justificativa_excesso: it.quantidade > comp.quantidade_disponivel ? (justif[it.seqcmp] ?? '') : undefined,
        };
      }),
    };
  };

  // ---------------- Rascunho LOCAL (localStorage) ----------------
  const rascunhoKey = buscar ? `requisicoes:rascunho:${buscar.codori}:${buscar.numorp}` : null;

  useEffect(() => {
    if (!rascunhoKey) { setRascunhoDisponivel(false); return; }
    setRascunhoDisponivel(Boolean(localStorage.getItem(rascunhoKey)));
  }, [rascunhoKey]);

  const salvarRascunho = () => {
    if (!rascunhoKey) return;
    if (itensSelecionados.length === 0) {
      toast({ title: 'Nada a salvar', description: 'Selecione ao menos um componente antes de salvar o rascunho.', variant: 'destructive' });
      return;
    }
    const dump = {
      salvo_em: new Date().toISOString(),
      codori: buscar!.codori,
      numorp: buscar!.numorp,
      tipo,
      depositoDestino,
      obsGeral,
      dataNecessaria,
      sel,
      justif,
      obs,
      depositosPorItem,
    };
    try {
      localStorage.setItem(rascunhoKey, JSON.stringify(dump));
      setRascunhoDisponivel(true);
      toast({ title: 'Rascunho salvo neste navegador', description: 'O rascunho fica apenas no seu computador — o servidor ainda não persiste requisições em aberto.' });
    } catch {
      toast({ title: 'Não foi possível salvar o rascunho local', variant: 'destructive' });
    }
  };

  const restaurarRascunho = () => {
    if (!rascunhoKey) return;
    const raw = localStorage.getItem(rascunhoKey);
    if (!raw) return;
    try {
      const dump = JSON.parse(raw);
      setTipo(dump.tipo ?? 'TRANSFERIR');
      setDepositoDestino(dump.depositoDestino ?? '');
      setObsGeral(dump.obsGeral ?? '');
      setDataNecessaria(dump.dataNecessaria ?? '');
      setSel(dump.sel ?? {});
      setJustif(dump.justif ?? {});
      setObs(dump.obs ?? {});
      setDepositosPorItem(dump.depositosPorItem ?? {});
      toast({ title: 'Rascunho restaurado' });
    } catch {
      toast({ title: 'Rascunho local corrompido', variant: 'destructive' });
    }
  };

  const descartarRascunho = () => {
    if (!rascunhoKey) return;
    localStorage.removeItem(rascunhoKey);
    setRascunhoDisponivel(false);
    toast({ title: 'Rascunho local descartado' });
  };

  const enviar = async () => {
    const payload = buildPayload();
    if (!payload || payload.itens.length === 0) return;
    if (itensInvalidos.length > 0) {
      const inv = itensInvalidos[0];
      toast({
        title: 'Componente com dados incompletos',
        description: `${inv.codcmp ?? `seq ${inv.seqcmp}`}: ${inv.motivo}. Não é possível enviar ao ERP até o backend devolver o componente completo.`,
        variant: 'destructive',
      });
      return;
    }
    if (itensSemDeposito.length > 0) {
      toast({
        title: 'Escolha o depósito de origem',
        description: `Escolha o depósito de origem do componente ${itensSemDeposito[0].codigo} antes de enviar.`,
        variant: 'destructive',
      });
      return;
    }
    setEnviando(true); setPendenteIntegr(null);
    try {
      const criada = await requisicoesApi.criar(payload as any);
      try {
        await requisicoesApi.enviar(criada.id);
      } catch (err) {
        if (err instanceof IntegracaoDesabilitadaError) {
          setPendenteIntegr(err.detail ?? null);
        } else {
          throw err;
        }
      }
      toast({ title: 'Requisição criada', description: `Nº ${criada.numero}` });
      // Envio bem-sucedido → descarta rascunho local para não confundir na próxima entrada
      if (rascunhoKey) { localStorage.removeItem(rascunhoKey); setRascunhoDisponivel(false); }
      nav(`/requisicoes/${encodeURIComponent(criada.id)}`);
    } catch (err: any) {
      toast({ title: 'Não foi possível criar a requisição', description: err?.message ?? 'Erro desconhecido', variant: 'destructive' });
    } finally {
      setEnviando(false);
    }
  };

  const handleContinue = () => {
    if (!canContinue) return;
    setStep((s) => (Math.min(4, s + 1) as 1 | 2 | 3 | 4));
  };
  const handleBack = () => setStep((s) => (Math.max(1, s - 1) as 1 | 2 | 3 | 4));

  // Renderers
  const renderStep1 = () => (
    <Card className="shadow-sm h-full">
      <CardContent className="p-4">
        <Tabs defaultValue="buscar" className="flex h-full flex-col">
          <TabsList>
            <TabsTrigger value="buscar"><Search className="mr-1 h-3.5 w-3.5" /> Buscar OP</TabsTrigger>
            <TabsTrigger value="manual">Informar manualmente</TabsTrigger>
          </TabsList>

          <TabsContent value="buscar" className="mt-3 flex-1 space-y-2">
            <OpSearchList
              fetcher={fetchOps}
              onSelect={handleSelectOp}
              selectedKey={codori && numorp ? `${codori}-${numorp}` : undefined}
              loading={op.isFetching}
            />
            {buscar && op.isFetching && (
              <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Consultando OP {buscar.codori}/{buscar.numorp}…</span>
              </div>
            )}
            {buscar && !op.isFetching && op.isError && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Falha ao consultar OP {buscar.codori}/{buscar.numorp}.</span>
                <Button size="sm" variant="outline" className="ml-auto h-6 px-2 text-xs" onClick={() => op.refetch()}>Tentar novamente</Button>
              </div>
            )}
            {buscar && !op.isFetching && op.data && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>OP {op.data.codori}/{op.data.numorp} carregada.</span>
              </div>
            )}
          </TabsContent>


          <TabsContent value="manual" className="mt-3">
            <div className="grid gap-3">
              <div>
                <div className="flex items-center gap-1">
                  <Label>Origem da OP</Label>
                  {isAdmin && (
                    <Tooltip>
                      <TooltipTrigger asChild><InfoIcon className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>Campo CODORI</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <Input value={codori} onChange={(e) => { setCodori(e.target.value); setOpLabel(''); }} placeholder="Ex.: 100" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <Label>Número da OP</Label>
                  {isAdmin && (
                    <Tooltip>
                      <TooltipTrigger asChild><InfoIcon className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                      <TooltipContent>Campo NUMORP</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <Input value={numorp} onChange={(e) => { setNumorp(e.target.value); setOpLabel(''); }} placeholder="Ex.: 65958" />
              </div>
              <Button onClick={consultarManual} disabled={!codori || !numorp || op.isFetching} className="w-full">
                {op.isFetching ? (
                  <><RefreshCw className="mr-1 h-4 w-4 animate-spin" /> Consultando…</>
                ) : op.isError && buscar ? (
                  <><RefreshCw className="mr-1 h-4 w-4" /> Tentar novamente</>
                ) : (
                  <><Search className="mr-1 h-4 w-4" /> Buscar OP</>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );


  const renderResumoOp = () => {
    if (op.isLoading) {
      return (
        <Card className="shadow-sm"><CardContent className="space-y-2 p-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-24 w-full" />
        </CardContent></Card>
      );
    }
    if (op.isError && buscar) {
      return (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>Não foi possível consultar a OP. Verifique os dados informados.</span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => op.refetch()}>Tentar novamente</Button>
        </div>
      );
    }
    if (!op.data) return null;
    const saldo = (op.data.quantidade_prevista ?? 0) - (op.data.quantidade_produzida ?? 0);
    return (
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">OP {op.data.codori}/{op.data.numorp}</h3>
              <Badge variant="outline" className={cn(
                podeRequisitar
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-destructive/40 bg-destructive/10 text-destructive',
              )}>
                Situação: {op.data.situacao_desc ?? op.data.situacao}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={trocarOp}>Trocar OP</Button>
              <Button variant="outline" size="sm" onClick={() => op.refetch()} disabled={op.isFetching}>
                <RefreshCw className={cn('mr-1 h-4 w-4', op.isFetching && 'animate-spin')} /> Atualizar dados
              </Button>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            <Field label="Produto final" value={op.data.produto_final} />
            <Field label="Descrição" value={op.data.descricao} className="sm:col-span-2" />
            <Field label="Derivação" value={op.data.derivacao} />
            <Field label="Projeto/Obra" value={op.data.projeto_obra} />
            <Field label="Centro de custo" value={op.data.centro_custo} />
            <Field label="Qtd. prevista" value={op.data.quantidade_prevista} />
            <Field label="Qtd. produzida" value={op.data.quantidade_produzida} />
            <Field label="Saldo da OP" value={op.data.saldo ?? saldo} />
          </dl>

          {op.data.pode_requisitar === false && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                {op.data.motivo_bloqueio ?? 'Esta OP não permite requisição no momento.'}
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    );
  };

  const rowToneClass = (c: ComponenteOP) => {
    if (c.quantidade_utilizada >= c.quantidade_prevista && c.quantidade_prevista > 0)
      return 'border-l-muted-foreground/30';
    if (c.quantidade_disponivel <= 0) return 'border-l-destructive';
    const pendente = Math.max(0, c.quantidade_prevista - c.quantidade_requisitada - c.quantidade_transferida);
    if (c.quantidade_disponivel < pendente) return 'border-l-amber-500';
    return 'border-l-emerald-500';
  };

  const renderStep2 = () => (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filtroTxt}
              onChange={(e) => setFiltroTxt(e.target.value)}
              placeholder="Pesquisar por código ou descrição"
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <FiltroToggle active={saldoFilter === 'com'} onClick={() => setSaldoFilter(saldoFilter === 'com' ? 'todos' : 'com')}>Com saldo</FiltroToggle>
            <FiltroToggle active={saldoFilter === 'sem'} onClick={() => setSaldoFilter(saldoFilter === 'sem' ? 'todos' : 'sem')}>Sem saldo</FiltroToggle>
            <FiltroToggle active={soPendentes} onClick={() => setSoPendentes(!soPendentes)}>Somente pendentes</FiltroToggle>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {componentesFiltrados.length} de {op.data?.componentes.length ?? 0} componentes
          </div>
        </div>

        <div className="overflow-auto rounded-md border" style={{ maxHeight: '60vh' }}>
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/70 backdrop-blur">
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox
                    checked={componentesPagina.length > 0 && componentesPagina.every((c) => (sel[c.seqcmp] ?? 0) > 0)}
                    onCheckedChange={(v) => {
                      setSel((s) => {
                        const next = { ...s };
                        for (const c of componentesPagina) {
                          next[c.seqcmp] = v ? Math.max(1, c.quantidade_disponivel) : 0;
                        }
                        return next;
                      });
                    }}
                    disabled={!podeRequisitar}
                  />
                </TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Seq</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Estágio</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Componente</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Descrição</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Deriv.</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">UM</TableHead>
                <TableHead className="text-xs uppercase tracking-wide w-40">Dep. origem</TableHead>
                <TableHead className="text-xs uppercase tracking-wide">Trans.</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-right">Prev.</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-right">Util.</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-right">Req.</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-right">Transf.</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-right">Disponível</TableHead>
                <TableHead className="text-xs uppercase tracking-wide text-right">Saldo fís.</TableHead>
                <TableHead className="text-xs uppercase tracking-wide w-36">A solicitar</TableHead>
                <TableHead className="text-xs uppercase tracking-wide w-40">Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {componentesPagina.map((c) => {
                const qtd = sel[c.seqcmp] ?? 0;
                const excede = qtd > c.quantidade_disponivel;
                const selecionado = qtd > 0;
                const invMotivo = componenteInvalido(c);
                return (
                  <TableRow
                    key={c.seqcmp}
                    className={cn(
                      'border-l-4',
                      rowToneClass(c),
                      selecionado && 'bg-primary/5',
                      invMotivo && 'opacity-70',
                    )}
                  >
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Checkbox
                              checked={selecionado}
                              onCheckedChange={(v) =>
                                setSel((s) => ({ ...s, [c.seqcmp]: v ? Math.max(1, c.quantidade_disponivel) : 0 }))
                              }
                              disabled={!podeRequisitar || !!invMotivo}
                            />
                          </span>
                        </TooltipTrigger>
                        {invMotivo && (
                          <TooltipContent>Componente incompleto ({invMotivo}). Recarregue a OP ou contate o backend.</TooltipContent>
                        )}
                      </Tooltip>
                    </TableCell>
                    <TableCell>{c.seqcmp}</TableCell>
                    <TableCell>{c.codetg}</TableCell>
                    <TableCell className="font-mono text-xs">{c.componente ?? c.codcmp}</TableCell>
                    <TableCell className="text-sm">{c.descricao ?? '—'}</TableCell>
                    <TableCell>{c.derivacao ?? c.codder ?? '—'}</TableCell>
                    <TableCell>{c.unidade ?? '—'}</TableCell>
                    <TableCell>
                      {c.precisa_deposito ? (
                        <Select
                          value={depositosPorItem[c.seqcmp] != null ? String(depositosPorItem[c.seqcmp]) : ''}
                          onValueChange={(v) =>
                            setDepositosPorItem((prev) => ({ ...prev, [c.seqcmp]: Number(v) }))
                          }
                          disabled={!podeRequisitar}
                        >
                          <SelectTrigger
                            className={cn(
                              'h-8 text-xs',
                              selecionado && depositosPorItem[c.seqcmp] == null && 'border-destructive',
                            )}
                          >
                            <SelectValue placeholder={depositosQuery.isLoading ? 'Carregando…' : 'Escolher'} />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {depositosOpcoes.map((d) => (
                              <SelectItem key={d.codigo} value={String(d.codigo)}>
                                {d.codigo} — {d.descricao || '(sem descrição)'}
                              </SelectItem>
                            ))}
                            {depositosOpcoes.length === 0 && (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                {depositosQuery.isLoading ? 'Carregando depósitos…' : 'Nenhum depósito disponível.'}
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm">{c.deposito ?? '—'}</span>
                      )}
                    </TableCell>
                    <TableCell>{c.transacao ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.quantidade_prevista}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.quantidade_utilizada}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.quantidade_requisitada}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.quantidade_transferida}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{c.qtd_disponivel_requisitar ?? c.quantidade_disponivel}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.saldo_fisico ?? '—'}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.001"
                        value={qtd || ''}
                        onChange={(e) => setSel((s) => ({ ...s, [c.seqcmp]: Number(e.target.value) || 0 }))}
                        disabled={!podeRequisitar}
                        className={cn('h-8', excede && 'border-destructive focus-visible:ring-destructive')}
                      />
                      {excede && (
                        <>
                          <Input
                            className="mt-1 h-8"
                            placeholder="Justificativa (necessária aprovação)"
                            value={justif[c.seqcmp] ?? ''}
                            onChange={(e) => setJustif((j) => ({ ...j, [c.seqcmp]: e.target.value }))}
                          />
                          <p className="mt-0.5 text-[10px] text-destructive">Excede o disponível — requer aprovação.</p>
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8"
                        value={obs[c.seqcmp] ?? ''}
                        onChange={(e) => setObs((o) => ({ ...o, [c.seqcmp]: e.target.value }))}
                        placeholder="—"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {componentesPagina.length === 0 && (
                <TableRow>
                  <TableCell colSpan={16} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum componente com estes filtros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="mt-2 flex items-center justify-end gap-2 text-sm">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe <= 1}>Anterior</Button>
            <span className="text-muted-foreground">Página {pageSafe} de {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageSafe >= totalPages}>Próxima</Button>
          </div>
        )}

        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <Legend color="border-emerald-500" label="Saldo suficiente" />
          <Legend color="border-amber-500" label="Saldo parcial" />
          <Legend color="border-destructive" label="Sem saldo" />
          <Legend color="border-primary bg-primary/10" label="Selecionado" />
          <Legend color="border-muted-foreground/30" label="Já atendido" />
        </div>
      </CardContent>
    </Card>
  );

  const primeiroDepositoOrigem = useMemo(() => {
    const comps = op.data?.componentes ?? [];
    for (const it of itensSelecionados) {
      const c = comps.find((x) => x.seqcmp === it.seqcmp);
      if (c?.deposito != null) return String(c.deposito);
    }
    return '—';
  }, [itensSelecionados, op.data]);

  const renderStep3 = () => (
    <Card className="shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div>
          <Label className="text-sm font-semibold">Tipo de atendimento</Label>
          <p className="text-xs text-muted-foreground">Escolha como o material sairá do estoque.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <TipoCard
            active={tipo === 'TRANSFERIR'}
            onClick={() => setTipo('TRANSFERIR')}
            icon={<Truck className="h-5 w-5" />}
            title="Transferir para depósito produtivo"
            description="O material será transferido para o depósito produtivo. O consumo da OP ocorrerá posteriormente."
          />
          <TipoCard
            active={tipo === 'BAIXAR_DIRETO'}
            onClick={() => setTipo('BAIXAR_DIRETO')}
            icon={<PackageSearch className="h-5 w-5" />}
            title="Baixar diretamente na OP"
            description="O material será consumido diretamente pela Ordem de Produção."
          />
        </div>

        <div className="rounded-md border bg-muted/30 p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Depósito de origem" value={primeiroDepositoOrigem} />
            <Field label="Itens selecionados" value={stats.qtdItens} />
            <Field label="Quantidade total" value={stats.qtdTotal} />
          </div>

          {tipo === 'TRANSFERIR' && (
            <div className="mt-3 max-w-xs">
              <Label>Depósito de destino</Label>
              <Input
                value={depositoDestino}
                onChange={(e) => setDepositoDestino(e.target.value)}
                placeholder="Ex.: 21"
              />
            </div>
          )}

          <div className="mt-3">
            <Label>Observação geral</Label>
            <Input value={obsGeral} onChange={(e) => setObsGeral(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep4 = () => {
    const comps = op.data?.componentes ?? [];
    return (
      <Card className="shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div>
            <h3 className="text-lg font-semibold">Revisão</h3>
            <p className="text-xs text-muted-foreground">Confira os dados antes de enviar ao ERP.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="OP" value={stats.opLabel} />
            <Field label="Situação" value={op.data?.situacao} />
            <Field label="Tipo de atendimento" value={stats.tipoAtendimentoLabel} />
            {tipo === 'TRANSFERIR' && <Field label="Depósito destino" value={depositoDestino} />}
            <Field label="Itens" value={stats.qtdItens} />
            <Field label="Quantidade total" value={stats.qtdTotal} />
          </div>

          <div className="max-w-xs">
            <Label>Data necessária</Label>
            <Input type="date" value={dataNecessaria} onChange={(e) => setDataNecessaria(e.target.value)} />
          </div>

          <div className="overflow-auto rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs uppercase tracking-wide">Componente</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Descrição</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide text-right">Quantidade</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Dep. origem</TableHead>
                  <TableHead className="text-xs uppercase tracking-wide">Justificativa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itensSelecionados.map((it) => {
                  const c = comps.find((x) => x.seqcmp === it.seqcmp);
                  const inv = componenteInvalido(c);
                  return (
                    <TableRow key={it.seqcmp} className={cn(inv && 'bg-destructive/5')}>
                      <TableCell className="font-mono text-xs">
                        {c?.codcmp}
                        {inv && (
                          <Badge variant="destructive" className="ml-2 align-middle text-[10px]">Dados incompletos</Badge>
                        )}
                      </TableCell>
                      <TableCell>{c?.descricao ?? (inv ? <span className="text-destructive text-xs">{inv}</span> : '—')}</TableCell>
                      <TableCell className="text-right tabular-nums">{it.quantidade} {c?.unidade ?? ''}</TableCell>
                      <TableCell>{c?.deposito ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{justif[it.seqcmp] || '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {itensInvalidos.length > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <div className="font-medium">Não é possível enviar: {itensInvalidos.length} componente(s) sem dados-chave.</div>
              <div className="text-xs mt-1">
                O backend não devolveu <code>codetg</code>, <code>codcmp</code>, <code>unidade</code> ou <code>depósito</code> para os itens marcados. Clique em <b>Atualizar dados</b> no topo ou peça ao suporte do backend para corrigir a consulta desta OP.
              </div>
            </div>
          )}

          {!sidWrite.enabled && itensInvalidos.length === 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
              A integração com o ERP está desabilitada. A requisição será salva como pendente de integração.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={salvarRascunho} disabled={enviando}>Salvar rascunho</Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button onClick={enviar} disabled={!sidWrite.enabled || enviando}>
                      {enviando ? 'Enviando…' : 'Enviar requisição'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {!sidWrite.enabled && sidWrite.reason && (
                  <TooltipContent>{sidWrite.reason}</TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const sidebar = (
    <aside className="md:sticky md:top-4 md:self-start">
      <ResumoRequisicaoLateral
        stats={stats}
        step={step}
        canContinue={canContinue}
        canEnviar={sidWrite.enabled && itensSelecionados.length > 0 && itensSemDeposito.length === 0 && itensInvalidos.length === 0}
        enviando={enviando}
        onContinue={handleContinue}
        onBack={handleBack}
        onCancel={() => nav('/requisicoes')}
        onSalvarRascunho={salvarRascunho}
        onEnviar={enviar}
      />
    </aside>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 pb-24 md:pb-4">
      <PageHeader
        title="Nova requisição — com OP"
        description="Consulte uma Ordem de Produção, selecione os componentes e defina como o material será atendido."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <RequisicaoStepper steps={stepsDef} current={step} onGo={(id) => setStep(id as 1 | 2 | 3 | 4)} />
        </div>
        <IntegracaoStatusChip detail={pendenteIntegr ?? undefined} />
      </div>

      {step === 1 ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_320px]">
          <div className="min-w-0">{renderStep1()}</div>
          <div className="min-w-0">
            {(buscar || op.isLoading) ? renderResumoOp() : (
              <Card className="flex h-full min-h-[320px] items-center justify-center border-dashed shadow-none">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  <PackageSearch className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  Selecione uma OP à esquerda para ver o resumo aqui.
                </CardContent>
              </Card>
            )}
          </div>
          {sidebar}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4 min-w-0">
            {op.data && (
              <>
                {renderResumoOp()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {step === 2 && (
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={handleBack}>
                      <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
                    </Button>
                    <Button onClick={handleContinue} disabled={!canContinue}>
                      Continuar <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                )}
                {step === 3 && (
                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={handleBack}>
                      <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
                    </Button>
                    <Button onClick={handleContinue} disabled={!canContinue}>
                      Continuar <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
          {sidebar}
        </div>
      )}
    </div>
  );
}


function Field({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value ?? '—'}</div>
    </div>
  );
}

function FiltroToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs transition',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

function TipoCard({ active, onClick, icon, title, description }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 text-left transition',
        active ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30' : 'hover:bg-muted/50',
      )}
    >
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn('inline-block h-3 w-3 rounded-sm border-l-4', color)} />
      {label}
    </span>
  );
}
