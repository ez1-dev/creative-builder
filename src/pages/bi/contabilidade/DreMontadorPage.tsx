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
import { ArrowUpDown, ChevronDown, ChevronRight, Link2, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { montarAnomes } from '@/lib/bi/dreDinamicaApi';
import {
  fetchPlanoContasDinamica,
  vincularContasDinamica,
  type PlanoContaErp,
  type VincularContasPayloadConta,
} from '@/lib/bi/dreMontadorApi';
import {
  listarModelosFastApi,
  listarLinhasFastApi,
  desativarLinha,
  type MontadorModelo,
  type MontadorLinha,
} from '@/lib/bi/dreMontadorModelosApi';
import ModeloFormDialog from '@/components/bi/contabilidade/ModeloFormDialog';
import LinhaFormDialog from '@/components/bi/contabilidade/LinhaFormDialog';

const MESES = [
  { v: 1, n: 'Jan' }, { v: 2, n: 'Fev' }, { v: 3, n: 'Mar' }, { v: 4, n: 'Abr' },
  { v: 5, n: 'Mai' }, { v: 6, n: 'Jun' }, { v: 7, n: 'Jul' }, { v: 8, n: 'Ago' },
  { v: 9, n: 'Set' }, { v: 10, n: 'Out' }, { v: 11, n: 'Nov' }, { v: 12, n: 'Dez' },
];

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

type SortKey = 'mascara' | 'nivel' | 'conta' | 'qtd' | 'valor';
type SortDir = 'asc' | 'desc';

const contaKey = (c: PlanoContaErp) => `${c.cd_mascara}||${c.cd_conta_contabil}`;

export default function DreMontadorPage() {
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mesIni, setMesIni] = useState(1);
  const [mesFim, setMesFim] = useState(now.getMonth() + 1);

  const [modelos, setModelos] = useState<MontadorModelo[]>([]);
  const [modeloId, setModeloId] = useState<string>('');
  const [modeloDialogOpen, setModeloDialogOpen] = useState(false);
  const [editandoModelo, setEditandoModelo] = useState<MontadorModelo | null>(null);

  const [linhas, setLinhas] = useState<MontadorLinha[]>([]);
  const [linhaSelecionada, setLinhaSelecionada] = useState<MontadorLinha | null>(null);
  const [linhaDialogOpen, setLinhaDialogOpen] = useState(false);
  const [editandoLinha, setEditandoLinha] = useState<MontadorLinha | null>(null);
  const [loadingLinhas, setLoadingLinhas] = useState(false);

  const [contas, setContas] = useState<PlanoContaErp[]>([]);
  const [contasSelecionadas, setContasSelecionadas] = useState<Set<string>>(new Set());
  const [centrosSelecionados, setCentrosSelecionados] = useState<Map<string, Set<string>>>(new Map());
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [loadingContas, setLoadingContas] = useState(false);

  const [busca, setBusca] = useState('');

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modeloAtual = useMemo(() => modelos.find((m) => m.id === modeloId) ?? null, [modelos, modeloId]);

  const carregarModelos = async (selecionarId?: string) => {
    try {
      const arr = await listarModelosFastApi();
      setModelos(arr);
      const escolhido = selecionarId ?? modeloId;
      if (escolhido && arr.find((m) => m.id === escolhido)) {
        setModeloId(escolhido);
      } else {
        const def = arr.find((m) => m.padrao) ?? arr[0];
        if (def) setModeloId(def.id);
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao carregar modelos.');
    }
  };

  useEffect(() => { carregarModelos(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const carregarLinhas = async () => {
    if (!modeloId) { setLinhas([]); return; }
    setLoadingLinhas(true);
    try {
      const data = await listarLinhasFastApi(modeloId);
      setLinhas(data.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao carregar linhas.');
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
        empresa_id: '1',
        somente_resultado: true,
        q: busca || undefined,
      });
      setContas(arr);
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao carregar plano de contas.');
    } finally {
      setLoadingContas(false);
    }
  };

  useEffect(() => {
    if (mesFim < mesIni) return;
    carregarLinhas();
    carregarContas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, mesIni, mesFim, modeloId]);

  useEffect(() => {
    const t = setTimeout(() => { carregarContas(); }, 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const toggleConta = (k: string) => {
    setContasSelecionadas((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });
    // Se desmarcou a conta, limpa também os centros selecionados dela
    setCentrosSelecionados((prev) => {
      if (!prev.has(k)) return prev;
      if (contasSelecionadas.has(k)) {
        const n = new Map(prev);
        n.delete(k);
        return n;
      }
      return prev;
    });
  };

  const toggleCentroCusto = (contaK: string, cdCentro: string) => {
    // Marcar um centro implica marcar a conta
    setContasSelecionadas((prev) => {
      if (prev.has(contaK)) return prev;
      const n = new Set(prev);
      n.add(contaK);
      return n;
    });
    setCentrosSelecionados((prev) => {
      const n = new Map(prev);
      const set = new Set(n.get(contaK) ?? []);
      if (set.has(cdCentro)) set.delete(cdCentro);
      else set.add(cdCentro);
      if (set.size === 0) n.delete(contaK);
      else n.set(contaK, set);
      return n;
    });
  };

  const marcarTodosCentros = (contaK: string, ccs: { cd_centro_custos: string }[]) => {
    setCentrosSelecionados((prev) => {
      const n = new Map(prev);
      n.delete(contaK); // "todos" = vazio
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

  const excluirLinha = async (l: MontadorLinha) => {
    if (!confirm(`Excluir a linha "${l.codigo_linha}"?`)) return;
    try {
      await desativarLinha(l.id);
      toast.success('Linha excluída.');
      if (linhaSelecionada?.id === l.id) setLinhaSelecionada(null);
      await carregarLinhas();
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao excluir linha.');
    }
  };

  const vincular = async () => {
    if (!modeloId) { toast.error('Selecione um modelo da DRE.'); return; }
    if (!linhaSelecionada) { toast.error('Selecione uma linha da DRE.'); return; }
    if (contasSelecionadas.size === 0) { toast.error('Selecione ao menos uma conta.'); return; }

    setVinculando(true);
    try {
      const escolhidas = contasOrdenadas.filter((c) => contasSelecionadas.has(contaKey(c)));
      const contas: VincularContasPayloadConta[] = escolhidas.map((c) => {
        const base: VincularContasPayloadConta = tipoRegra === 'MASCARA_CONTA'
          ? { cd_mascara: c.cd_mascara }
          : { cd_conta_contabil: c.cd_conta_contabil };
        const set = centrosSelecionados.get(contaKey(c));
        if (set && set.size > 0) {
          base.centros_custo = Array.from(set).map((cd) => ({ cd_centro_custos: cd }));
        }
        return base;
      });
      const payload = {
        modelo_id: modeloId,
        linha_id: linhaSelecionada.id,
        tipo_regra: tipoRegra,
        operador: (tipoRegra === 'MASCARA_CONTA' ? 'COMECA_COM' : 'IGUAL') as 'COMECA_COM' | 'IGUAL',
        sinal: (sinal === '-1' ? -1 : 1) as 1 | -1,
        prioridade,
        contas,
      };
      const r = await vincularContasDinamica(payload);
      toast.success(`Vinculadas: ${r.criados} · Ignoradas (duplicadas): ${r.ignorados_por_duplicidade}`);
      setContasSelecionadas(new Set());
      setCentrosSelecionados(new Map());
      await carregarContas();
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao vincular contas.');
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
                  Crie modelo e linhas, depois vincule contas/máscaras do ERP.
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
                  <div className="flex items-center gap-1">
                    <Select value={modeloId} onValueChange={setModeloId}>
                      <SelectTrigger className="w-64"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {modelos.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nome}{m.padrao ? ' (padrão)' : ''}
                          </SelectItem>
                        ))}
                        {!modelos.length && <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum modelo</div>}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditandoModelo(null); setModeloDialogOpen(true); }}
                      title="Novo modelo"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setEditandoModelo(modeloAtual); setModeloDialogOpen(true); }}
                      disabled={!modeloAtual}
                      title="Editar modelo"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button variant="outline" onClick={() => { carregarLinhas(); carregarContas(); }} disabled={loadingLinhas || loadingContas}>
                  {(loadingLinhas || loadingContas) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Recarregar
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-12 gap-4">
          {/* ====== Linhas da DRE ====== */}
          <Card className="col-span-12 lg:col-span-5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  Linhas da DRE
                  {loadingLinhas && <Loader2 className="h-4 w-4 animate-spin" />}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setEditandoLinha(null); setLinhaDialogOpen(true); }}
                  disabled={!modeloId}
                >
                  <Plus className="h-4 w-4 mr-1" /> Nova linha
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[70vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr className="text-left">
                      <th className="py-2 px-2 w-12">Ord.</th>
                      <th className="py-2 px-2">Código / Descrição</th>
                      <th className="py-2 px-2 w-24">Tipo</th>
                      <th className="py-2 px-2 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((l) => {
                      const selected = linhaSelecionada?.id === l.id;
                      return (
                        <tr
                          key={l.id}
                          onClick={() => setLinhaSelecionada(l)}
                          className={`border-b cursor-pointer transition-colors ${
                            selected ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-muted/40'
                          }`}
                        >
                          <td className="py-1.5 px-2 text-xs text-muted-foreground">{l.ordem}</td>
                          <td className="py-1.5 px-2">
                            <div className="flex flex-col">
                              <span className="font-mono text-xs text-muted-foreground">{l.codigo_linha}</span>
                              <span>{l.descricao}</span>
                              {l.formula && <span className="text-[10px] font-mono text-muted-foreground">f({l.formula})</span>}
                            </div>
                          </td>
                          <td className="py-1.5 px-2">
                            <Badge variant="outline" className="text-[10px]">{l.tipo_linha}</Badge>
                          </td>
                          <td className="py-1.5 px-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditandoLinha(l); setLinhaDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => excluirLinha(l)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!loadingLinhas && linhas.length === 0 && (
                      <tr><td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
                        {modeloId ? 'Nenhuma linha. Clique em "Nova linha".' : 'Selecione ou crie um modelo.'}
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
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="max-h-[55vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr className="text-left">
                      <th className="py-2 px-1 w-6"></th>
                      <th className="py-2 px-2 w-8">
                        <Checkbox
                          checked={contasOrdenadas.length > 0 && contasSelecionadas.size === contasOrdenadas.length}
                          onCheckedChange={toggleSelecionarTodos}
                        />
                      </th>
                      <SortableTh label="Máscara" k="mascara" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
                      <SortableTh label="Nív." k="nivel" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
                      <SortableTh label="Conta" k="conta" sortBy={sortBy} sortDir={sortDir} onClick={toggleSort} />
                      <th className="py-2 px-2">Nome</th>
                      <th className="py-2 px-2 text-right">CCs</th>
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
                      const isOpen = expandidos.has(k);
                      const toggleExpand = () => {
                        setExpandidos((prev) => {
                          const next = new Set(prev);
                          if (next.has(k)) next.delete(k); else next.add(k);
                          return next;
                        });
                      };
                      return (
                        <FragmentRow
                          key={k}
                          conta={c}
                          sel={sel}
                          ccs={ccs}
                          isOpen={isOpen}
                          centrosMarcados={centrosSelecionados.get(k) ?? new Set()}
                          onToggleExpand={toggleExpand}
                          onToggleSel={() => toggleConta(k)}
                          onToggleCentro={(cd) => toggleCentroCusto(k, cd)}
                          onMarcarTodosCentros={() => marcarTodosCentros(k, ccs)}
                        />
                      );
                    })}
                    {!loadingContas && contasOrdenadas.length === 0 && (
                      <tr><td colSpan={10} className="py-8 text-center text-muted-foreground text-sm">
                        Nenhuma conta encontrada.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>

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

      <ModeloFormDialog
        open={modeloDialogOpen}
        onOpenChange={setModeloDialogOpen}
        modelo={editandoModelo}
        onSaved={(m) => { carregarModelos(m.id); }}
      />
      {modeloId && (
        <LinhaFormDialog
          open={linhaDialogOpen}
          onOpenChange={setLinhaDialogOpen}
          modeloId={modeloId}
          linha={editandoLinha}
          onSaved={() => { carregarLinhas(); }}
        />
      )}
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

function FragmentRow({
  conta,
  sel,
  ccs,
  isOpen,
  centrosMarcados,
  onToggleExpand,
  onToggleSel,
  onToggleCentro,
  onMarcarTodosCentros,
}: {
  conta: PlanoContaErp;
  sel: boolean;
  ccs: PlanoContaErp['centros_custo'];
  isOpen: boolean;
  centrosMarcados: Set<string>;
  onToggleExpand: () => void;
  onToggleSel: () => void;
  onToggleCentro: (cdCentro: string) => void;
  onMarcarTodosCentros: () => void;
}) {
  const nome = conta.ds_conta || conta.ds_mascara;
  const todosCentros = centrosMarcados.size === 0;
  return (
    <>
      <tr className={`border-b hover:bg-muted/40 ${sel ? 'bg-primary/5' : ''}`}>
        <td className="py-1 px-1">
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-0.5 rounded hover:bg-muted text-muted-foreground"
            aria-label={isOpen ? 'Recolher' : 'Expandir'}
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="py-1 px-2">
          <Checkbox checked={sel} onCheckedChange={onToggleSel} />
        </td>
        <td className="py-1 px-2 font-mono text-xs">{conta.cd_mascara || '—'}</td>
        <td className="py-1 px-2">
          <Badge variant="outline" className="text-[10px]">N{conta.nivel ?? 0}</Badge>
        </td>
        <td className="py-1 px-2 font-mono text-xs">{conta.cd_conta_contabil || '—'}</td>
        <td className="py-1 px-2 max-w-[260px]">
          {nome ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block truncate cursor-help">{nome}</span>
              </TooltipTrigger>
              <TooltipContent><span className="text-xs">{nome}</span></TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs text-muted-foreground italic">—</span>
          )}
        </td>
        <td className="py-1 px-2 text-right text-xs">
          {(conta.qtd_centros ?? ccs.length) === 0
            ? <span className="text-muted-foreground">—</span>
            : <Badge variant="outline" className="text-[10px]">{conta.qtd_centros ?? ccs.length} CC</Badge>}
        </td>
        <td className="py-1 px-2 text-right">{conta.qtd_lancamentos}</td>
        <td className={`py-1 px-2 text-right font-mono ${conta.valor_total < 0 ? 'text-destructive' : ''}`}>
          {BRL.format(conta.valor_total)}
        </td>
        <td className="py-1 px-2">
          {conta.ja_vinculada ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="cursor-help">Vinculada</Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-0.5">
                  {conta.linhas_vinculadas.length
                    ? conta.linhas_vinculadas.map((ln, i) => <div key={i} className="font-mono">{ln}</div>)
                    : <div>Vinculada (sem detalhes)</div>}
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
      </tr>
      {isOpen && (
        <tr className="border-b bg-muted/30">
          <td colSpan={10} className="py-2 px-6">
            {ccs.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">
                Sem centro de custo no período.
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-1 px-2">Centro de custo</th>
                    <th className="py-1 px-2">Descrição</th>
                    <th className="py-1 px-2">Nível 3</th>
                    <th className="py-1 px-2 text-right">Qtd.</th>
                    <th className="py-1 px-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {ccs.map((cc, i) => (
                    <tr key={i} className="border-b border-border/40 last:border-0">
                      <td className="py-1 px-2 font-mono">{cc.cd_centro_custos || '—'}</td>
                      <td className="py-1 px-2">{cc.ds_centro_custos || '—'}</td>
                      <td className="py-1 px-2 font-mono">{cc.cd_centro_custos_3 || '—'}</td>
                      <td className="py-1 px-2 text-right">{cc.qtd_lancamentos}</td>
                      <td className={`py-1 px-2 text-right font-mono ${cc.valor_total < 0 ? 'text-destructive' : ''}`}>
                        {BRL.format(cc.valor_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
