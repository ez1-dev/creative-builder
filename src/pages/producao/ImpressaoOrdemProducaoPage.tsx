import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Printer, FileDown, Search, Eraser, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useImpressaoOrdemProducao } from '@/hooks/useImpressaoOrdemProducao';
import { useOpcoesImpressaoOp } from '@/hooks/useOpcoesImpressaoOp';
import type { ImpressaoOpFiltros } from '@/lib/producao/opImpressao';
import type { OpcaoOp } from '@/lib/producao/opcoesImpressao';
import { OpPrintSheet } from '@/components/producao/OpPrintSheet';
import { OpPrintBatch } from '@/components/producao/OpPrintBatch';
import { SelectBuscavel, type SelectOption } from '@/components/producao/SelectBuscavel';
import { OpAutocomplete } from '@/components/producao/OpAutocomplete';
import { useAuth } from '@/contexts/AuthContext';
import { fetchImpressaoLote, type ImpressaoOpLoteResponse } from '@/lib/producao/opImpressaoLote';

const DEFAULT_EMPRESA = '1';

const EMPTY: ImpressaoOpFiltros = {
  cod_emp: DEFAULT_EMPRESA,
  cod_ori: '',
  num_orp: '',
  num_ped: '',
  rel_prd: '',
  sit_orp: '',
  listar_componentes: 'S',
  listar_desenho: 'N',
  cod_etg: '',
  cod_cre: '',
};

export default function ImpressaoOrdemProducaoPage() {
  const { displayName, erpUser } = useAuth();
  const [filtros, setFiltros] = useState<ImpressaoOpFiltros>(EMPTY);
  const [opLabel, setOpLabel] = useState<string>('');
  const [preview, setPreview] = useState(false);
  const [lastConsulta, setLastConsulta] = useState<ImpressaoOpFiltros | null>(null);
  const [lote, setLote] = useState<ImpressaoOpLoteResponse | null>(null);
  const [loteLoading, setLoteLoading] = useState(false);
  const { data, loading, error, fetchData, reset, retry } = useImpressaoOrdemProducao();
  const opcoes = useOpcoesImpressaoOp();

  useEffect(() => { void opcoes.reloadBase(DEFAULT_EMPRESA); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const set = <K extends keyof ImpressaoOpFiltros>(k: K, v: ImpressaoOpFiltros[K]) =>
    setFiltros((f) => ({ ...f, [k]: v }));

  const empresaOpts: SelectOption[] = opcoes.empresas.map((e: any) => ({
    value: String(e.value ?? e.codigo ?? e.cod_emp ?? ''),
    label: e.label || `${e.codigo ?? e.cod_emp}${e.descricao || e.nome_emp ? ' - ' + (e.descricao || e.nome_emp) : ''}`,
  }));
  const origemOpts: SelectOption[] = opcoes.origens.map((o: any) => ({
    value: String(o.value ?? o.codigo ?? o.cod_ori ?? ''),
    label: o.label || `${o.codigo ?? o.cod_ori}${o.descricao ? ' - ' + o.descricao : ''}`,
  }));
  const pedidoOpts: SelectOption[] = opcoes.pedidos.map((p: any) => ({
    value: String(p.value ?? p.num_ped ?? ''),
    label: p.label || String(p.num_ped ?? ''),
  }));
  const relatorioOpts: SelectOption[] = opcoes.relatoriosProducao.map((r: any) => ({
    value: String(r.value ?? r.rel_prd ?? ''),
    label: r.label || String(r.rel_prd ?? ''),
  }));
  const situacaoOpts: SelectOption[] = opcoes.situacoes
    .filter((s: any) => String(s?.sit_orp ?? '').toUpperCase() !== 'C')
    .map((s: any) => ({
      value: String(s.sit_orp ?? s.value ?? ''),
      label: s.label || `${s.sit_orp} - ${s.descricao ?? ''}`.trim(),
    }));
  const estagioOpts: SelectOption[] = opcoes.estagios.map((e: any) => ({
    value: String(e.value ?? e.codigo ?? e.cod_etg ?? ''),
    label: e.label || `${e.codigo ?? e.cod_etg}${e.descricao ? ' - ' + e.descricao : ''}`,
  }));
  const creOpts: SelectOption[] = opcoes.centrosRecurso.map((c: any) => ({
    value: String(c.value ?? c.codigo ?? c.cod_cre ?? ''),
    label: c.label || `${c.codigo ?? c.cod_cre}${c.descricao ? ' - ' + c.descricao : ''}`,
  }));

  const onChangeEmpresa = async (v: string) => {
    setFiltros({ ...EMPTY, cod_emp: v, listar_componentes: filtros.listar_componentes, listar_desenho: filtros.listar_desenho });
    setOpLabel('');
    setLote(null);
    try { await opcoes.reloadBase(v || DEFAULT_EMPRESA); }
    catch (e: any) { toast.error(e?.message || 'Falha ao carregar opções'); }
  };

  const onChangePedido = async (v: string) => {
    setFiltros((f) => ({ ...f, num_ped: v, rel_prd: '', cod_ori: '', num_orp: '', cod_etg: '', cod_cre: '' }));
    setOpLabel('');
    setLote(null);
    if (filtros.cod_emp && v) {
      try { await opcoes.reloadByPedido(filtros.cod_emp, v, filtros.sit_orp || undefined); }
      catch (e: any) { toast.error(e?.message || 'Falha ao carregar OPs do pedido'); }
    }
  };

  const onChangeRelatorio = async (v: string) => {
    setFiltros((f) => ({ ...f, rel_prd: v, num_ped: '', cod_ori: '', num_orp: '', cod_etg: '', cod_cre: '' }));
    setOpLabel('');
    setLote(null);
    if (filtros.cod_emp && v) {
      try { await opcoes.reloadByRelatorio(filtros.cod_emp, v, filtros.sit_orp || undefined); }
      catch (e: any) { toast.error(e?.message || 'Falha ao carregar OPs do relatório'); }
    }
  };

  const onChangeOrigem = async (v: string) => {
    setFiltros((f) => ({ ...f, cod_ori: v, num_orp: '', cod_etg: '', cod_cre: '' }));
    setOpLabel('');
    setLote(null);
    if (!filtros.cod_emp) return;
    if (String(v) === '100') {
      toast.error('Origem 100 não é permitida.');
      return;
    }
    try {
      if (v) {
        await opcoes.reloadByOrigem(filtros.cod_emp, v, {
          sit_orp: filtros.sit_orp || undefined,
          num_ped: filtros.num_ped || undefined,
          rel_prd: filtros.rel_prd || undefined,
        });
      } else if (filtros.num_ped) {
        await opcoes.reloadByPedido(filtros.cod_emp, filtros.num_ped, filtros.sit_orp || undefined);
      } else if (filtros.rel_prd) {
        await opcoes.reloadByRelatorio(filtros.cod_emp, filtros.rel_prd, filtros.sit_orp || undefined);
      } else if (filtros.sit_orp) {
        await opcoes.reloadBySituacao(filtros.cod_emp, filtros.sit_orp);
      } else {
        await opcoes.reloadBase(filtros.cod_emp);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao carregar OPs');
    }
  };

  const onChangeSituacao = async (v: string) => {
    setFiltros((f) => ({ ...f, sit_orp: v }));
    setLote(null);
    if (!filtros.cod_emp) return;
    try {
      if (filtros.cod_ori) {
        await opcoes.reloadByOrigem(filtros.cod_emp, filtros.cod_ori, {
          sit_orp: v || undefined,
          num_ped: filtros.num_ped || undefined,
          rel_prd: filtros.rel_prd || undefined,
        });
      } else if (filtros.num_ped) await opcoes.reloadByPedido(filtros.cod_emp, filtros.num_ped, v || undefined);
      else if (filtros.rel_prd) await opcoes.reloadByRelatorio(filtros.cod_emp, filtros.rel_prd, v || undefined);
      else if (v) await opcoes.reloadBySituacao(filtros.cod_emp, v);
      else await opcoes.reloadBase(filtros.cod_emp);
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao carregar OPs');
    }
  };


  const onSelectOp = async (op: OpcaoOp | null) => {
    if (!op) {
      setFiltros((f) => ({ ...f, num_orp: '', cod_etg: '', cod_cre: '' }));
      setOpLabel('');
      return;
    }
    const cod_emp = String(op.cod_emp ?? filtros.cod_emp ?? '');
    const cod_ori = String(op.cod_ori ?? filtros.cod_ori ?? '');
    const num_orp = String(op.num_orp ?? '');
    const num_ped = op.num_ped ? String(op.num_ped) : (filtros.num_ped || '');
    const rel_prd = op.rel_prd ? String(op.rel_prd) : (filtros.rel_prd || '');
    if (cod_ori === '100') {
      toast.error('Origem 100 não é permitida.');
      return;
    }
    if (String(op.sit_orp ?? '').toUpperCase() === 'C') {
      toast.error('OP cancelada não pode ser selecionada.');
      return;
    }
    setFiltros((f) => ({ ...f, cod_emp, cod_ori, num_orp, num_ped, rel_prd, cod_etg: '', cod_cre: '' }));
    setOpLabel(op.label || `${cod_ori} / ${num_orp}${op.produto ? ' - ' + op.produto : ''}${op.descricao_produto ? ' - ' + op.descricao_produto : ''}`);
    if (cod_emp && cod_ori && num_orp) {
      try { await opcoes.reloadOpContexto(cod_emp, cod_ori, num_orp); } catch (e: any) { toast.error(e?.message || 'Falha ao carregar estágios'); }
    }
  };

  const onChangeEstagio = async (v: string) => {
    setFiltros((f) => ({ ...f, cod_etg: v, cod_cre: '' }));
    if (filtros.cod_emp && filtros.cod_ori && filtros.num_orp) {
      try { await opcoes.reloadCres(filtros.cod_emp, filtros.cod_ori, filtros.num_orp, v || undefined); }
      catch (e: any) { toast.error(e?.message || 'Falha ao carregar centros de recurso'); }
    }
  };

  const searchOpsFetcher = useCallback(
    (q: string) => opcoes.searchOps(q, {
      cod_emp: filtros.cod_emp || undefined,
      cod_ori: filtros.cod_ori || undefined,
      num_ped: filtros.num_ped || undefined,
      rel_prd: filtros.rel_prd || undefined,
      sit_orp: filtros.sit_orp || undefined,
    }),
    [opcoes.searchOps, filtros.cod_emp, filtros.cod_ori, filtros.num_ped, filtros.rel_prd, filtros.sit_orp],
  );


  const consultar = async (override?: Partial<ImpressaoOpFiltros>) => {
    const eff = { ...filtros, ...(override || {}) };
    if (!eff.num_orp || !eff.cod_ori) {
      toast.info('Selecione uma Ordem de Produção.');
      return;
    }
    if (String(eff.cod_ori) === '100') {
      toast.error('Origem 100 não é permitida.');
      return;
    }
    if (!Number.isFinite(Number(eff.cod_emp)) || !Number.isFinite(Number(eff.num_orp))) {
      toast.error('Empresa e Nº O.P. devem ser numéricos.');
      return;
    }
    setLote(null);
    setLastConsulta({ ...eff });
    await fetchData(eff);
  };

  const limpar = () => {
    setFiltros({ ...EMPTY });
    setOpLabel('');
    setPreview(false);
    setLastConsulta(null);
    setLote(null);
    reset();
    void opcoes.reloadBase(DEFAULT_EMPRESA);
  };

  const imprimir = () => {
    if (!data?.cabecalho) { toast.info('Consulte uma O.P. antes de imprimir.'); return; }
    window.print();
  };

  const gerarPdf = () => {
    if (!data?.cabecalho) { toast.info('Consulte uma O.P. antes de gerar o PDF.'); return; }
    toast.info('Use "Salvar como PDF" no diálogo de impressão do navegador.');
    setTimeout(() => window.print(), 200);
  };

  // Lista de OPs (grid) — quando filtra por Pedido, Relatório OU Origem e não há OP escolhida
  const showGrid = useMemo(
    () => Boolean((filtros.num_ped || filtros.rel_prd || filtros.cod_ori) && !filtros.num_orp),
    [filtros.num_ped, filtros.rel_prd, filtros.cod_ori, filtros.num_orp],
  );

  const opsFiltradas = useMemo(() => {
    let list = opcoes.ops.filter(
      (o) => String(o.sit_orp ?? o.situacao ?? '').toUpperCase() !== 'C',
    );
    if (filtros.cod_ori) list = list.filter((o) => String(o.cod_ori ?? '') === filtros.cod_ori);
    return list;
  }, [opcoes.ops, filtros.cod_ori]);

  const pick = (...vals: any[]) => {
    for (const v of vals) if (v !== undefined && v !== null && v !== '') return v;
    return '';
  };

  const handleRowVisualizar = async (op: OpcaoOp) => {
    await onSelectOp(op);
    await consultar({
      cod_emp: String(op.cod_emp ?? filtros.cod_emp ?? ''),
      cod_ori: String(op.cod_ori ?? ''),
      num_orp: String(op.num_orp ?? ''),
    });
    setPreview(true);
  };

  const handleRowImprimir = async (op: OpcaoOp) => {
    await onSelectOp(op);
    await consultar({
      cod_emp: String(op.cod_emp ?? filtros.cod_emp ?? ''),
      cod_ori: String(op.cod_ori ?? ''),
      num_orp: String(op.num_orp ?? ''),
    });
    setTimeout(() => window.print(), 200);
  };

  const imprimirTodas = async () => {
    if (!filtros.cod_emp || (!filtros.num_ped && !filtros.rel_prd)) {
      toast.info('Selecione um Pedido ou um Relatório de Produção.');
      return;
    }
    setLoteLoading(true);
    try {
      const res = await fetchImpressaoLote({
        cod_emp: filtros.cod_emp,
        num_ped: filtros.num_ped || undefined,
        rel_prd: filtros.rel_prd || undefined,
        sit_orp: filtros.sit_orp || undefined,
        listar_componentes: (filtros.listar_componentes as 'S' | 'N') || 'S',
        listar_desenho: (filtros.listar_desenho as 'S' | 'N') || 'N',
      });
      if (!res.ordens.length) {
        toast.info('Nenhuma OP retornada para impressão.');
        return;
      }
      setLote(res);
      reset();
      toast.success(`Imprimindo ${res.quantidade_ops} OP(s)...`);
      setTimeout(() => window.print(), 300);
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao gerar impressão em lote.');
    } finally {
      setLoteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header — breadcrumb + command bar */}
      <div className="no-print flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>MCAP700.GER</span>
            <span className="text-muted-foreground/40">/</span>
            <span>Genius</span>
            <span className="text-muted-foreground/40">/</span>
            <span>Produção</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Impressão de Ordem de Produção
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => consultar()} disabled={loading} className="font-semibold shadow-sm">
            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-1.5 h-3.5 w-3.5" />}
            Consultar
          </Button>
          <div className="mx-1 hidden h-6 w-px bg-border md:block" />
          <Button size="sm" variant="outline" onClick={() => setPreview((p) => !p)} disabled={!data?.cabecalho}>
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            {preview ? 'Sair' : 'Visualizar'}
          </Button>
          <Button size="sm" variant="outline" onClick={imprimir}>
            <Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimir
          </Button>
          <Button size="sm" variant="outline" onClick={gerarPdf}>
            <FileDown className="mr-1.5 h-3.5 w-3.5" /> Gerar PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={limpar}
            className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Eraser className="mr-1.5 h-3.5 w-3.5" /> Limpar
          </Button>
        </div>
      </div>

      {!preview && (
        <Card className="no-print overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-wrap divide-y divide-border lg:flex-nowrap lg:divide-x lg:divide-y-0">
              {/* Grupo 1 — Origem e Destino */}
              <div className="min-w-[300px] flex-1 space-y-3 bg-muted/30 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Origem e Destino
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Empresa">
                    <SelectBuscavel value={filtros.cod_emp || ''} onChange={onChangeEmpresa} options={empresaOpts} placeholder="Empresa..." />
                  </Field>
                  <Field label="Pedido">
                    <SelectBuscavel value={filtros.num_ped || ''} onChange={onChangePedido} options={pedidoOpts} placeholder="Pedido..." disabled={!filtros.cod_emp} />
                  </Field>
                </div>
                <Field label="Relatório de Produção">
                  <SelectBuscavel value={filtros.rel_prd || ''} onChange={onChangeRelatorio} options={relatorioOpts} placeholder="Relatório..." disabled={!filtros.cod_emp} />
                </Field>
              </div>

              {/* Grupo 2 — Contexto da Produção */}
              <div className="min-w-[300px] flex-1 space-y-3 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Contexto da Produção
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Origem">
                    <SelectBuscavel value={filtros.cod_ori || ''} onChange={(v) => set('cod_ori', v)} options={origemOpts} placeholder="Origem..." disabled={!filtros.cod_emp} />
                  </Field>
                  <Field label="Situação">
                    <SelectBuscavel value={filtros.sit_orp || ''} onChange={onChangeSituacao} options={situacaoOpts} placeholder="Situação..." disabled={!filtros.cod_emp} />
                  </Field>
                  <Field label="Ordem de Produção">
                    <OpAutocomplete
                      value={filtros.num_orp || ''}
                      displayLabel={opLabel}
                      onSelect={onSelectOp}
                      fetcher={searchOpsFetcher}
                    />
                  </Field>
                  <Field label="Estágio">
                    <SelectBuscavel value={filtros.cod_etg || ''} onChange={onChangeEstagio} options={estagioOpts} placeholder="Estágio..." disabled={!filtros.num_orp} />
                  </Field>
                </div>
              </div>

              {/* Grupo 3 — Refinamento */}
              <div className="min-w-[260px] flex-1 space-y-3 p-4">
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Refinamento
                  </span>
                </div>
                <Field label="Centro de Recurso">
                  <SelectBuscavel value={filtros.cod_cre || ''} onChange={(v) => set('cod_cre', v)} options={creOpts} placeholder="Centro..." disabled={!filtros.num_orp} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Componentes">
                    <SimpleSN value={filtros.listar_componentes} onChange={(v) => set('listar_componentes', v)} />
                  </Field>
                  <Field label="Desenhos">
                    <SimpleSN value={filtros.listar_desenho} onChange={(v) => set('listar_desenho', v)} />
                  </Field>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showGrid && !preview && (
        <Card className="no-print">
          <CardContent className="p-0">
            {opcoes.loading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando ordens de produção...
              </div>
            ) : opsFiltradas.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhuma ordem de produção encontrada para os filtros selecionados.
              </div>
            ) : (
              <>
                {opsFiltradas.length > 1 && (
                  <div className="flex items-center justify-between gap-2 border-b p-3">
                    <span className="text-xs text-muted-foreground">{opsFiltradas.length} OPs encontradas</span>
                    <Button size="sm" onClick={imprimirTodas} disabled={loteLoading}>
                      {loteLoading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Printer className="mr-1 h-3 w-3" />}
                      Imprimir todas
                    </Button>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Origem</TableHead>
                        <TableHead>OP</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Rel. Produção</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Qtde</TableHead>
                        <TableHead>Un.</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead>Geração</TableHead>
                        <TableHead>Início Prev.</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {opsFiltradas.map((op, idx) => (
                        <TableRow key={`${op.cod_emp ?? ''}-${op.cod_ori ?? ''}-${op.num_orp ?? ''}-${idx}`}>
                          <TableCell>{op.cod_ori ?? ''}</TableCell>
                          <TableCell className="font-mono">{op.num_orp ?? ''}</TableCell>
                          <TableCell>{op.num_ped ?? ''}</TableCell>
                          <TableCell>{op.rel_prd ?? ''}</TableCell>
                          <TableCell>{pick(op.produto, op.cod_pro)}</TableCell>
                          <TableCell className="max-w-[280px] truncate">{pick(op.descricao_produto, op.descricao, op.des_pro)}</TableCell>
                          <TableCell className="text-right">{pick(op.quantidade, op.qtde, op.qtd_prevista)}</TableCell>
                          <TableCell>{pick(op.unidade, op.un, op.unidade_medida)}</TableCell>
                          <TableCell>{pick(op.situacao_descricao, op.situacao)}</TableCell>
                          <TableCell>{op.data_geracao ?? ''}</TableCell>
                          <TableCell>{op.inicio_previsto ?? ''}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleRowVisualizar(op)} title="Visualizar">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleRowImprimir(op)} title="Imprimir">
                                <Printer className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card className="no-print">
          <CardContent className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando ordem de produção...
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card className="no-print">
          <CardContent className="space-y-2 p-6 text-center">
            {/Not Found|404/i.test(error) ? (
              <>
                <p className="text-sm font-medium text-destructive">
                  Endpoint indisponível no backend (<code>/api/producao/ordem-producao/impressao</code>).
                </p>
                <p className="text-xs text-muted-foreground">
                  Solicite ao time de backend implementar conforme <code>docs/backend-impressao-ordem-producao.md</code>.
                </p>
              </>
            ) : (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
            <Button size="sm" variant="outline" onClick={retry}>Tentar novamente</Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && !data?.cabecalho && !lote && lastConsulta && (
        <Card className="no-print">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Ordem de produção não encontrada para Empresa {lastConsulta.cod_emp} / Origem {lastConsulta.cod_ori} / OP {lastConsulta.num_orp}.
          </CardContent>
        </Card>
      )}

      {!loading && !error && !data?.cabecalho && !lote && !lastConsulta && !showGrid && (
        <Card className="no-print">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Selecione um Pedido, Relatório de Produção ou uma OP e clique em Consultar.
          </CardContent>
        </Card>
      )}

      {lote && lote.ordens.length > 0 && (
        <OpPrintBatch ordens={lote.ordens} preview={preview} usuario={displayName ?? erpUser ?? null} />
      )}

      {!lote && data?.cabecalho && (
        <OpPrintSheet data={data} preview={preview} usuario={displayName ?? erpUser ?? null} />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function SimpleSN({ value, onChange }: { value: 'S' | 'N' | '' | undefined; onChange: (v: 'S' | 'N') => void }) {
  return (
    <Select value={value || 'N'} onValueChange={(v) => onChange(v as 'S' | 'N')}>
      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="S">Sim</SelectItem>
        <SelectItem value="N">Não</SelectItem>
      </SelectContent>
    </Select>
  );
}
