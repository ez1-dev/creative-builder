import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { ArrowUpDown, Link2, Loader2, RefreshCw } from 'lucide-react';
import { fetchDreDinamica, type DreDinamicaLinha, montarAnomes } from '@/lib/bi/dreDinamicaApi';
import {
  fetchPlanoContasDinamica,
  vincularContasDinamica,
  resolverLinhaId,
  type PlanoContaErp,
} from '@/lib/bi/dreMontadorApi';
import { listarModelos } from '@/lib/bi/dreConfigApi';
import type { DreModelo } from '@/lib/bi/dreConfigTypes';

const MESES = [
  { v: 1, n: 'Jan' }, { v: 2, n: 'Fev' }, { v: 3, n: 'Mar' }, { v: 4, n: 'Abr' },
  { v: 5, n: 'Mai' }, { v: 6, n: 'Jun' }, { v: 7, n: 'Jul' }, { v: 8, n: 'Ago' },
  { v: 9, n: 'Set' }, { v: 10, n: 'Out' }, { v: 11, n: 'Nov' }, { v: 12, n: 'Dez' },
];

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type SortKey = 'mascara' | 'nivel' | 'conta' | 'qtd' | 'valor';
type SortDir = 'asc' | 'desc';
type FiltroVinculo = 'todas' | 'nao_vinculadas' | 'vinculadas';

const contaKey = (c: PlanoContaErp) => `${c.cd_mascara}||${c.cd_conta_contabil}`;

export default function DreMontadorPage() {
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mesIni, setMesIni] = useState(1);
  const [mesFim, setMesFim] = useState(now.getMonth() + 1);
  const [modelos, setModelos] = useState<DreModelo[]>([]);
  const [modeloId, setModeloId] = useState<string>('');

  const [linhas, setLinhas] = useState<DreDinamicaLinha[]>([]);
  const [linhaSelecionada, setLinhaSelecionada] = useState<DreDinamicaLinha | null>(null);
  const [loadingLinhas, setLoadingLinhas] = useState(false);

  const [contas, setContas] = useState<PlanoContaErp[]>([]);
  const [contasSelecionadas, setContasSelecionadas] = useState<Set<string>>(new Set());
  const [loadingContas, setLoadingContas] = useState(false);

  const [busca, setBusca] = useState('');
  const [filtroVinculo, setFiltroVinculo] = useState<FiltroVinculo>('todas');
  const [limite, setLimite] = useState<number | 'all'>('all');

  const [sortBy, setSortBy] = useState<SortKey>('valor');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [tipoRegra, setTipoRegra] = useState<'MASCARA_CONTA' | 'CONTA_CONTABIL'>('MASCARA_CONTA');
  const [sinal, setSinal] = useState<'1' | '-1'>('1');
  const [prioridade, setPrioridade] = useState(100);
  const [vinculando, setVinculando] = useState(false);

  const anosDisponiveis = useMemo(() => {
    const arr: number[] = [];
    for (let a = now.getFullYear() + 1; a >= 2020; a--) arr.push(a);
    return arr;
  }, [now]);

  // carrega modelos
  useEffect(() => {
    (async () => {
      try {
        const arr = await listarModelos();
        setModelos(arr);
        const def = arr.find((m) => m.status === 'rascunho') ?? arr[0];
        if (def && !modeloId) setModeloId(def.id);
      } catch (e) {
        console.warn('[MONTADOR DRE] modelos falhou', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carregarLinhas = async () => {
    setLoadingLinhas(true);
    try {
      const data = await fetchDreDinamica({
        ano, mes_ini: mesIni, mes_fim: mesFim,
        modelo_id: modeloId || null,
      });
      setLinhas(data.dados);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao carregar linhas da DRE');
    } finally {
      setLoadingLinhas(false);
    }
  };

  const carregarContas = async () => {
    setLoadingContas(true);
    try {
      const arr = await fetchPlanoContasDinamica({
        anomes_ini: montarAnomes(ano, mesIni),
        anomes_fim: montarAnomes(ano, mesFim),
        modelo_id: modeloId || null,
        busca: busca || undefined,
        somente_nao_vinculadas: filtroVinculo === 'nao_vinculadas' || undefined,
        somente_vinculadas: filtroVinculo === 'vinculadas' || undefined,
        limite: limite === 'all' ? undefined : limite,
      });
      setContas(arr);
      console.log('[MONTADOR DRE] contas recebidas:', arr.length);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao carregar plano de contas');
    } finally {
      setLoadingContas(false);
    }
  };

  const recarregarTudo = async () => {
    await Promise.all([carregarLinhas(), carregarContas()]);
  };

  useEffect(() => {
    if (mesFim < mesIni) return;
    recarregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, mesIni, mesFim, modeloId]);

  // debounce filtros de contas
  useEffect(() => {
    const t = setTimeout(() => { carregarContas(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, filtroVinculo, limite]);

  const selecionarLinha = (l: DreDinamicaLinha) => {
    setLinhaSelecionada(l);
    console.log('[MONTADOR DRE] linha selecionada:', l);
  };

  const toggleConta = (k: string) => {
    setContasSelecionadas((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });
  };

  const contasOrdenadas = useMemo(() => {
    const arr = [...contas];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'mascara': cmp = a.cd_mascara.localeCompare(b.cd_mascara); break;
        case 'nivel': cmp = (a.nivel ?? 0) - (b.nivel ?? 0); break;
        case 'conta': cmp = a.cd_conta_contabil.localeCompare(b.cd_conta_contabil); break;
        case 'qtd': cmp = a.qtd_lancamentos - b.qtd_lancamentos; break;
        case 'valor': cmp = a.valor_total - b.valor_total; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [contas, sortBy, sortDir]);

  const diag = useMemo(() => {
    if (!contas.length) return { semNome: false, semValor: false };
    return {
      semNome: contas.every((c) => !c.ds_conta),
      semValor: contas.every((c) => c.valor_total === 0),
    };
  }, [contas]);

  const toggleSort = (k: SortKey) => {
    if (sortBy === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(k); setSortDir(k === 'valor' || k === 'qtd' ? 'desc' : 'asc'); }
  };

  const toggleSelecionarTodos = () => {
    if (contasSelecionadas.size === contasOrdenadas.length) {
      setContasSelecionadas(new Set());
    } else {
      setContasSelecionadas(new Set(contasOrdenadas.map(contaKey)));
    }
  };

  const vincular = async () => {
    if (!modeloId) { toast.error('Selecione um modelo da DRE.'); return; }
    if (!linhaSelecionada) { toast.error('Selecione uma linha da DRE.'); return; }
    if (contasSelecionadas.size === 0) { toast.error('Selecione ao menos uma conta.'); return; }

    setVinculando(true);
    try {
      const linhaId = await resolverLinhaId(modeloId, linhaSelecionada.codigo_linha);
      if (!linhaId) {
        toast.error(`Não foi possível resolver o id técnico da linha ${linhaSelecionada.codigo_linha}.`);
        return;
      }
      const escolhidas = contasOrdenadas.filter((c) => contasSelecionadas.has(contaKey(c)));
      console.log('[MONTADOR DRE] contas selecionadas:', escolhidas);

      const payload = {
        modelo_id: modeloId,
        linha_id: linhaId,
        tipo_regra: tipoRegra,
        operador: (tipoRegra === 'MASCARA_CONTA' ? 'COMECA_COM' : 'IGUAL') as 'COMECA_COM' | 'IGUAL',
        sinal: (sinal === '-1' ? -1 : 1) as 1 | -1,
        prioridade,
        contas: escolhidas.map((c) => ({
          cd_mascara: c.cd_mascara,
          cd_conta_contabil: c.cd_conta_contabil,
        })),
      };

      await vincularContasDinamica(payload);
      toast.success('Contas vinculadas com sucesso.');
      setContasSelecionadas(new Set());
      await recarregarTudo();
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao vincular contas');
    } finally {
      setVinculando(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <CardTitle>Montador da DRE Gerencial</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Selecione uma linha à esquerda e vincule contas/máscaras do ERP à direita.
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Ano</label>
                  <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {anosDisponiveis.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Mês ini.</label>
                  <Select value={String(mesIni)} onValueChange={(v) => setMesIni(Number(v))}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESES.map((m) => <SelectItem key={m.v} value={String(m.v)}>{m.n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Mês fim</label>
                  <Select value={String(mesFim)} onValueChange={(v) => setMesFim(Number(v))}>
                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MESES.map((m) => <SelectItem key={m.v} value={String(m.v)}>{m.n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Modelo</label>
                  <Select value={modeloId} onValueChange={setModeloId}>
                    <SelectTrigger className="w-64"><SelectValue placeholder="Selecione um modelo" /></SelectTrigger>
                    <SelectContent>
                      {modelos.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nome} — v{m.versao} ({m.status})
                        </SelectItem>
                      ))}
                      {!modelos.length && <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum modelo</div>}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={recarregarTudo} disabled={loadingLinhas || loadingContas}>
                  {(loadingLinhas || loadingContas) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Recarregar tudo
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-12 gap-4">
          {/* ====== Linhas da DRE ====== */}
          <Card className="col-span-12 lg:col-span-5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                Linhas da DRE
                {loadingLinhas && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[70vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr className="text-left">
                      <th className="py-2 px-2 w-12">Ord.</th>
                      <th className="py-2 px-2 w-14">Nív.</th>
                      <th className="py-2 px-2">Descrição</th>
                      <th className="py-2 px-2 w-24">Tipo</th>
                      <th className="py-2 px-2 w-32 text-right">Realizado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((l) => {
                      const selected = linhaSelecionada?.codigo_linha === l.codigo_linha;
                      const indent = Math.max((l.nivel ?? 1) - 1, 0) * 14;
                      const isBold = l.tipo_linha === 'TOTAL' || l.tipo_linha === 'CALCULO' || l.flag_negrito === true;
                      const valor = Number(l.realizado ?? 0);
                      return (
                        <tr
                          key={l.codigo_linha}
                          onClick={() => selecionarLinha(l)}
                          className={`border-b cursor-pointer transition-colors ${
                            selected ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-muted/40'
                          } ${isBold ? 'font-semibold' : ''}`}
                        >
                          <td className="py-1.5 px-2 text-xs text-muted-foreground">{l.ordem}</td>
                          <td className="py-1.5 px-2">
                            <Badge variant="outline" className="text-[10px]">N{l.nivel ?? 1}</Badge>
                          </td>
                          <td className="py-1.5 px-2">
                            <div style={{ paddingLeft: indent }} className="flex items-center gap-2">
                              <span>{l.descricao}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{l.codigo_linha}</span>
                            </div>
                          </td>
                          <td className="py-1.5 px-2">
                            <Badge variant="outline" className="text-[10px]">{l.tipo_linha}</Badge>
                          </td>
                          <td className={`py-1.5 px-2 text-right font-mono ${valor < 0 ? 'text-destructive' : ''}`}>
                            {BRL.format(valor)}
                          </td>
                        </tr>
                      );
                    })}
                    {!loadingLinhas && linhas.length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                        Nenhuma linha. Verifique modelo e período.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ====== Contas do ERP ====== */}
          <Card className="col-span-12 lg:col-span-7">
            <CardHeader className="pb-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Contas disponíveis do ERP
                  {loadingContas && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {contasSelecionadas.size} selecionada(s) de {contasOrdenadas.length}
                </span>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <Input
                  placeholder="Buscar máscara ou conta..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="w-64"
                />
                <Select value={filtroVinculo} onValueChange={(v) => setFiltroVinculo(v as FiltroVinculo)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    <SelectItem value="nao_vinculadas">Somente não vinculadas</SelectItem>
                    <SelectItem value="vinculadas">Somente vinculadas</SelectItem>
                  </SelectContent>
                </Select>
                <div>
                  <label className="text-xs text-muted-foreground">Limite</label>
                  <Select value={String(limite)} onValueChange={(v) => setLimite(v === 'all' ? 'all' : Number(v))}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {[50, 100, 250, 500, 1000].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            {(diag.semNome || diag.semValor) && (
              <div className="mx-4 mb-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                {diag.semNome && <div>Backend não está retornando <code className="font-mono">ds_conta</code>. Ajuste o endpoint <code className="font-mono">/plano-contas</code> para incluir a descrição da conta.</div>}
                {diag.semValor && <div>Valores zerados — verifique se o endpoint agrega <code className="font-mono">bi_vm_lanc_contabil</code> no período selecionado.</div>}
              </div>
            )}
            <CardContent className="p-0">
              <div className="max-h-[55vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr className="text-left">
                      <th className="py-2 px-2 w-8">
                        <Checkbox
                          checked={contasOrdenadas.length > 0 && contasSelecionadas.size === contasOrdenadas.length}
                          onCheckedChange={toggleSelecionarTodos}
                        />
                      </th>
                      <SortableTh label="Máscara" k="mascara" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
                      <SortableTh label="Nív." k="nivel" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
                      <SortableTh label="Conta" k="conta" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
                      <th className="py-2 px-2">Nome da conta</th>
                      <th className="py-2 px-2">Centros de custo</th>
                      <SortableTh label="Qtd." k="qtd" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} align="right" />
                      <SortableTh label="Valor" k="valor" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} align="right" />
                      <th className="py-2 px-2 w-40">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contasOrdenadas.map((c) => {
                      const k = contaKey(c);
                      const sel = contasSelecionadas.has(k);
                      const ccs = c.centros_custo ?? [];
                      const ccsHead = ccs.slice(0, 2);
                      const ccsExtra = ccs.length - ccsHead.length;
                      return (
                        <tr key={k} className={`border-b hover:bg-muted/40 ${sel ? 'bg-primary/5' : ''}`}>
                          <td className="py-1 px-2">
                            <Checkbox checked={sel} onCheckedChange={() => toggleConta(k)} />
                          </td>
                          <td className="py-1 px-2 font-mono text-xs">{c.cd_mascara || '—'}</td>
                          <td className="py-1 px-2">
                            <Badge variant="outline" className="text-[10px]">N{c.nivel ?? 0}</Badge>
                          </td>
                          <td className="py-1 px-2 font-mono text-xs">{c.cd_conta_contabil || '—'}</td>
                          <td className="py-1 px-2 max-w-[260px]">
                            {c.ds_conta ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="block truncate cursor-help">{c.ds_conta}</span>
                                </TooltipTrigger>
                                <TooltipContent><span className="text-xs">{c.ds_conta}</span></TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-muted-foreground italic" title="Backend não retornou ds_conta">{c.cd_mascara || '—'}</span>
                            )}
                          </td>
                          <td className="py-1 px-2">
                            {ccs.length === 0 ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {ccsHead.map((cc, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] font-mono">
                                    {cc.cd_centro_custo}{cc.ds_centro_custo ? ` · ${cc.ds_centro_custo}` : ''}
                                  </Badge>
                                ))}
                                {ccsExtra > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="secondary" className="text-[10px] cursor-help">+{ccsExtra}</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="text-xs space-y-0.5 max-w-xs">
                                        {ccs.map((cc, i) => (
                                          <div key={i} className="font-mono">
                                            {cc.cd_centro_custo}{cc.ds_centro_custo ? ` · ${cc.ds_centro_custo}` : ''}
                                            <span className="text-muted-foreground"> — {BRL.format(cc.valor)} ({cc.qtd})</span>
                                          </div>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-1 px-2 text-right">{c.qtd_lancamentos}</td>
                          <td className={`py-1 px-2 text-right font-mono ${c.valor_total < 0 ? 'text-destructive' : ''}`}>
                            {BRL.format(c.valor_total)}
                          </td>
                          <td className="py-1 px-2">
                            {c.ja_vinculada ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="cursor-help">Vinculada</Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs space-y-0.5">
                                    {c.linhas_vinculadas.length
                                      ? c.linhas_vinculadas.map((ln, i) => <div key={i} className="font-mono">{ln}</div>)
                                      : <div>Vinculada (sem detalhes)</div>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {!loadingContas && contasOrdenadas.length === 0 && (
                      <tr><td colSpan={9} className="py-8 text-center text-muted-foreground text-sm">
                        Nenhuma conta encontrada.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Rodapé de ação */}
              <div className="border-t p-3 bg-muted/30 flex flex-wrap items-end gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo de vínculo</Label>
                  <Select value={tipoRegra} onValueChange={(v) => setTipoRegra(v as any)}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MASCARA_CONTA">MASCARA_CONTA</SelectItem>
                      <SelectItem value="CONTA_CONTABIL">CONTA_CONTABIL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Sinal</Label>
                  <RadioGroup value={sinal} onValueChange={(v) => setSinal(v as '1' | '-1')} className="flex gap-3 h-9 items-center">
                    <div className="flex items-center gap-1">
                      <RadioGroupItem value="1" id="s-pos" />
                      <Label htmlFor="s-pos" className="text-sm">+1 Somar</Label>
                    </div>
                    <div className="flex items-center gap-1">
                      <RadioGroupItem value="-1" id="s-neg" />
                      <Label htmlFor="s-neg" className="text-sm">-1 Inverter</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Prioridade</Label>
                  <Input
                    type="number"
                    value={prioridade}
                    onChange={(e) => setPrioridade(Number(e.target.value) || 100)}
                    className="w-24"
                  />
                </div>
                <div className="ml-auto flex flex-col items-end gap-1">
                  {linhaSelecionada ? (
                    <span className="text-xs text-muted-foreground">
                      Linha: <Badge variant="secondary" className="font-mono">{linhaSelecionada.codigo_linha}</Badge>
                    </span>
                  ) : (
                    <span className="text-xs text-destructive">Nenhuma linha selecionada</span>
                  )}
                  <Button
                    onClick={vincular}
                    disabled={vinculando || !linhaSelecionada || contasSelecionadas.size === 0 || !modeloId}
                  >
                    {vinculando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                    Vincular contas à linha selecionada
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}

function SortableTh({
  label, k, sortBy, sortDir, onClick, align = 'left',
}: {
  label: string;
  k: SortKey;
  sortBy: SortKey;
  sortDir: SortDir;
  onClick: (k: SortKey) => void;
  align?: 'left' | 'right';
}) {
  const active = sortBy === k;
  return (
    <th className={`py-2 px-2 cursor-pointer select-none ${align === 'right' ? 'text-right' : ''}`} onClick={() => onClick(k)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? 'opacity-100' : 'opacity-40'}`} />
        {active && <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </span>
    </th>
  );
}
