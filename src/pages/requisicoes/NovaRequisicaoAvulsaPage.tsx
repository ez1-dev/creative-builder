import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/erp/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  requisicoesApi,
  IntegracaoDesabilitadaError,
  type ComponenteLookup,
  type CentroCustoLookup,
  type ProjetoLookup,
} from '@/services/requisicoesApi';
import { IntegracaoOfflineBanner } from '@/components/requisicoes/IntegracaoOfflineBanner';
import { RemoteCombobox, highlight } from '@/components/requisicoes/RemoteCombobox';
import { useSidWriteEnabled } from '@/hooks/requisicoes';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { TipoRequisicao, PrioridadeRequisicao } from '@/types/requisicoes';

interface Linha {
  componente: ComponenteLookup | null;
  codcmp: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  deposito_origem: string;
  deposito_destino: string;
  lote: string;
  observacao: string;
}

const linhaVazia = (): Linha => ({
  componente: null,
  codcmp: '', descricao: '', unidade: '',
  quantidade: 0, deposito_origem: '', deposito_destino: '',
  lote: '', observacao: '',
});


// Tipos que exigem centro de custo (consumo interno, manutenção, administrativo, emergencial).
const CC_OBRIGATORIO: TipoRequisicao[] = ['CONSUMO', 'EMERGENCIAL'];

export default function NovaRequisicaoAvulsaPage() {
  const nav = useNavigate();
  const [tipo, setTipo] = useState<TipoRequisicao>('CONSUMO');
  const [prioridade, setPrioridade] = useState<PrioridadeRequisicao>('NORMAL');
  const [codemp, setCodemp] = useState('1');
  const [codfil, setCodfil] = useState('1');
  const [setor, setSetor] = useState('');
  const [cc, setCc] = useState<CentroCustoLookup | null>(null);
  const [projeto, setProjeto] = useState<ProjetoLookup | null>(null);
  const [fase, setFase] = useState('');
  const [dataNecessaria, setDataNecessaria] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [obs, setObs] = useState('');
  const [linhas, setLinhas] = useState<Linha[]>([linhaVazia()]);
  const [busy, setBusy] = useState(false);
  const [pendenteIntegr, setPendenteIntegr] = useState<string | null>(null);
  const sidWrite = useSidWriteEnabled();

  // Ao trocar a empresa, o CC deixa de ser válido
  useEffect(() => { setCc(null); }, [codemp]);

  const setLinha = (i: number, patch: Partial<Linha>) =>
    setLinhas((arr) => arr.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLinha = () => setLinhas((arr) => [...arr, linhaVazia()]);
  const delLinha = (i: number) => setLinhas((arr) => arr.filter((_, idx) => idx !== i));

  const aplicarComponente = (i: number, c: ComponenteLookup | null) => {
    if (!c) {
      setLinha(i, { componente: null, codcmp: '', descricao: '', unidade: '', deposito_origem: '', deposito_destino: '', lote: '' });
      return;
    }
    setLinha(i, {
      componente: c,
      codcmp: c.codigo,
      descricao: c.descricao,
      unidade: c.um,
      // Regra: limpar dados dependentes ao trocar o componente
      deposito_origem: '', deposito_destino: '', lote: '',
    });
  };

  const ccObrigatorio = CC_OBRIGATORIO.includes(tipo);
  const linhasValidas = useMemo(
    () => linhas.filter((l) => l.componente && l.codcmp.trim() && l.quantidade > 0),
    [linhas],
  );
  const temLinhaInvalida = linhas.some((l) => (l.codcmp || l.quantidade > 0) && !l.componente);


  const disableSubmit =
    busy ||
    linhasValidas.length === 0 ||
    temLinhaInvalida ||
    (ccObrigatorio && !cc);

  const submit = async (enviar: boolean) => {
    if (linhasValidas.length === 0) {
      toast({ title: 'Adicione ao menos um item válido', variant: 'destructive' });
      return;
    }
    if (temLinhaInvalida) {
      toast({ title: 'Selecione o produto da lista', description: 'Não é permitido digitar código manualmente.', variant: 'destructive' });
      return;
    }
    if (ccObrigatorio && !cc) {
      toast({ title: 'Centro de custo obrigatório', description: 'Este tipo de requisição exige centro de custo.', variant: 'destructive' });
      return;
    }
    setBusy(true); setPendenteIntegr(null);
    try {
      const payload = {
        tipo,
        codemp: Number(codemp),
        codfil: Number(codfil),
        setor: setor || null,
        prioridade,
        data_necessaria: dataNecessaria || null,
        centro_custo: cc?.codccu ?? null,
        centro_custo_descricao: cc?.desccu ?? null,
        projeto: projeto ? String(projeto.numprj) : null,
        projeto_descricao: projeto?.desprj ?? null,
        obra: projeto?.obra ?? null,
        fase: fase || projeto?.codfpj || null,
        justificativa: justificativa || null,
        observacoes: obs || null,
        itens: linhasValidas.map((l, i) => ({
          seq: i + 1,
          codcmp: l.codcmp,
          codder: l.codder || null,
          descricao: l.descricao || null,
          unidade: l.unidade || null,
          codfam: l.codfam || null,
          quantidade: l.quantidade,
          deposito_origem: l.deposito_origem ? Number(l.deposito_origem) : null,
          deposito_destino: l.deposito_destino ? Number(l.deposito_destino) : null,
          lote: l.lote || null,
          observacao: l.observacao || null,
        })),
      };
      const criada = await requisicoesApi.criar(payload as any);
      if (enviar) {
        try { await requisicoesApi.enviar(criada.id); }
        catch (err) {
          if (err instanceof IntegracaoDesabilitadaError) setPendenteIntegr(err.detail ?? null);
          else throw err;
        }
      }
      toast({ title: enviar ? 'Requisição criada e enviada' : 'Rascunho salvo', description: `Nº ${criada.numero}` });
      nav(`/requisicoes/${encodeURIComponent(criada.id)}`);
    } catch (err: any) {
      toast({ title: 'Não foi possível salvar', description: err?.message ?? 'Erro desconhecido', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const empresaNum = Number(codemp) || undefined;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nova requisição — sem OP"
        description="Consumo interno, manutenção, qualidade, administrativo ou transferência entre depósitos."
      />

      {pendenteIntegr !== null && <IntegracaoOfflineBanner detail={pendenteIntegr || undefined} force />}
      <IntegracaoOfflineBanner />

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-12">
          <div className="md:col-span-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoRequisicao)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CONSUMO">Consumo</SelectItem>
                <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                <SelectItem value="DEVOLUCAO">Devolução</SelectItem>
                <SelectItem value="EMERGENCIAL">Emergencial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Prioridade</Label>
            <Select value={prioridade} onValueChange={(v) => setPrioridade(v as PrioridadeRequisicao)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BAIXA">Baixa</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="ALTA">Alta</SelectItem>
                <SelectItem value="URGENTE">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Empresa</Label>
            <Input value={codemp} onChange={(e) => setCodemp(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Filial</Label>
            <Input value={codfil} onChange={(e) => setCodfil(e.target.value)} />
          </div>
          <div className="md:col-span-4">
            <Label>Setor</Label>
            <Input value={setor} onChange={(e) => setSetor(e.target.value)} />
          </div>

          <div className="md:col-span-6">
            <Label>
              Centro de custo{ccObrigatorio && <span className="ml-0.5 text-destructive">*</span>}
            </Label>
            <RemoteCombobox<CentroCustoLookup>
              value={cc}
              onSelect={setCc}
              fetcher={(q) => requisicoesApi.buscarCentrosCusto({ q })}
              getKey={(i) => i.codccu}
              getLabel={(i) => `${i.codccu} — ${i.desccu}`}
              renderItem={(i, q) => (
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-semibold">{highlight(i.codccu, q)}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {highlight(i.desccu, q)}
                    {i.abreviacao ? ` · ${i.abreviacao}` : ''}
                  </span>
                </div>
              )}
              placeholder="Buscar centro de custo por código ou descrição"
            />
            {ccObrigatorio && !cc && (
              <p className="mt-1 text-[11px] text-destructive">Obrigatório para este tipo de requisição.</p>
            )}
          </div>

          <div className="md:col-span-4">
            <Label>Projeto / obra</Label>
            <RemoteCombobox<ProjetoLookup>
              value={projeto}
              onSelect={setProjeto}
              fetcher={(q) => requisicoesApi.buscarProjetos({ q })}
              getKey={(i) => String(i.numprj)}
              getLabel={(i) => `${i.numprj} — ${i.desprj ?? ''}`.trim()}
              renderItem={(i, q) => (
                <div className="flex flex-col">
                  <span className="text-xs font-semibold">
                    <span className="font-mono">{highlight(String(i.numprj), q)}</span>
                    {' — '}
                    {highlight(i.desprj ?? '', q)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {i.abreviacao ? `${i.abreviacao}` : ''}
                    {i.abreviacao && i.situacao_desc ? ' · ' : ''}
                    {i.situacao_desc ?? ''}
                  </span>
                </div>
              )}
              placeholder="Buscar projeto ou obra"
              unavailableMessage="A busca de projetos ainda não foi disponibilizada pela API."
            />
          </div>


          <div className="md:col-span-2">
            <Label>Fase</Label>
            <Input value={fase} onChange={(e) => setFase(e.target.value)} readOnly={!!projeto?.codfpj} placeholder={projeto?.codfpj ? '' : 'Opcional'} />
          </div>

          <div className="md:col-span-4">
            <Label>Data necessária</Label>
            <Input type="datetime-local" value={dataNecessaria} onChange={(e) => setDataNecessaria(e.target.value)} />
          </div>
          <div className="md:col-span-8">
            <Label>Justificativa</Label>
            <Input value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Motivo da requisição (opcional em CONSUMO, obrigatório em EMERGENCIAL)" />
          </div>
          <div className="md:col-span-12">
            <Label>Observações</Label>
            <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[280px]">Produto / componente</TableHead>
              <TableHead className="min-w-[220px]">Descrição</TableHead>
              <TableHead className="w-20">Deriv.</TableHead>
              <TableHead className="w-16">UM</TableHead>
              <TableHead className="w-24 text-right">Qtd</TableHead>
              <TableHead className="w-24">Dep. orig.</TableHead>
              <TableHead className="w-24">Dep. dest.</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Obs.</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l, i) => (
              <TableRow key={i} className={l.codcmp && !l.produto ? 'bg-destructive/5' : undefined}>
                <TableCell>
                  <RemoteCombobox<ProdutoLookup>
                    value={l.produto}
                    onSelect={(p) => aplicarProduto(i, p)}
                    fetcher={(q) => requisicoesApi.buscarProdutos({ q, codemp: empresaNum, incluir_derivacoes: true })}
                    getKey={(p) => p.codpro}
                    getLabel={(p) => `${p.codpro} — ${p.despro}`}
                    renderItem={(p, q) => (
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">
                          <span className="font-mono">{highlight(p.codpro, q)}</span>
                          {' — '}
                          {highlight(p.despro, q)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {p.codfam && <>Família: {p.codfam}{p.desfam ? ` (${p.desfam})` : ''} · </>}
                          Unidade: {p.unimed ?? '—'}
                          {p.codder && <> · Deriv.: {p.codder}</>}
                        </span>
                      </div>
                    )}
                    placeholder="Buscar produto por código ou descrição"
                    popoverWidth={460}
                  />
                </TableCell>
                <TableCell>
                  <Input value={l.descricao} readOnly placeholder="—" className="h-8 bg-muted/40" />
                </TableCell>
                <TableCell>
                  <Input value={l.codder} readOnly placeholder="—" className="h-8 bg-muted/40" />
                </TableCell>
                <TableCell>
                  <Input value={l.unidade} readOnly placeholder="—" className="h-8 w-14 bg-muted/40" />
                </TableCell>
                <TableCell>
                  <Input type="number" step="0.001" value={l.quantidade || ''} onChange={(e) => setLinha(i, { quantidade: Number(e.target.value) || 0 })} className="h-8 text-right" />
                </TableCell>
                <TableCell><Input value={l.deposito_origem} onChange={(e) => setLinha(i, { deposito_origem: e.target.value })} className="h-8" /></TableCell>
                <TableCell><Input value={l.deposito_destino} onChange={(e) => setLinha(i, { deposito_destino: e.target.value })} className="h-8" /></TableCell>
                <TableCell><Input value={l.lote} onChange={(e) => setLinha(i, { lote: e.target.value })} className="h-8" /></TableCell>
                <TableCell><Input value={l.observacao} onChange={(e) => setLinha(i, { observacao: e.target.value })} className="h-8" /></TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => delLinha(i)} disabled={linhas.length === 1}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t p-2">
          <Button size="sm" variant="ghost" onClick={addLinha}><Plus className="mr-1 h-4 w-4" /> Adicionar item</Button>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => submit(false)} disabled={busy}>Salvar rascunho</Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button onClick={() => submit(true)} disabled={disableSubmit || !sidWrite.enabled}>
                {busy ? 'Enviando…' : 'Criar e enviar'}
              </Button>
            </span>
          </TooltipTrigger>
          {!sidWrite.enabled && sidWrite.reason && <TooltipContent>{sidWrite.reason}</TooltipContent>}
        </Tooltip>
      </div>
    </div>
  );
}
