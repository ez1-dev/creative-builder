import { useState } from 'react';
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
import { requisicoesApi, IntegracaoDesabilitadaError } from '@/services/requisicoesApi';
import { IntegracaoOfflineBanner } from '@/components/requisicoes/IntegracaoOfflineBanner';
import { useSidWriteEnabled } from '@/hooks/requisicoes';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { TipoRequisicao, PrioridadeRequisicao } from '@/types/requisicoes';

interface Linha {
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
  codcmp: '', descricao: '', unidade: '',
  quantidade: 0, deposito_origem: '', deposito_destino: '',
  lote: '', observacao: '',
});

export default function NovaRequisicaoAvulsaPage() {
  const nav = useNavigate();
  const [tipo, setTipo] = useState<TipoRequisicao>('CONSUMO');
  const [prioridade, setPrioridade] = useState<PrioridadeRequisicao>('NORMAL');
  const [codemp, setCodemp] = useState('1');
  const [codfil, setCodfil] = useState('1');
  const [setor, setSetor] = useState('');
  const [cc, setCc] = useState('');
  const [projeto, setProjeto] = useState('');
  const [fase, setFase] = useState('');
  const [dataNecessaria, setDataNecessaria] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [obs, setObs] = useState('');
  const [linhas, setLinhas] = useState<Linha[]>([linhaVazia()]);
  const [busy, setBusy] = useState(false);
  const [pendenteIntegr, setPendenteIntegr] = useState<string | null>(null);
  const sidWrite = useSidWriteEnabled();



  const setLinha = (i: number, patch: Partial<Linha>) =>
    setLinhas((arr) => arr.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLinha = () => setLinhas((arr) => [...arr, linhaVazia()]);
  const delLinha = (i: number) => setLinhas((arr) => arr.filter((_, idx) => idx !== i));

  const submit = async (enviar: boolean) => {
    const itensValidos = linhas.filter((l) => l.codcmp.trim() && l.quantidade > 0);
    if (itensValidos.length === 0) {
      toast({ title: 'Adicione ao menos um item válido', variant: 'destructive' });
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
        centro_custo: cc || null,
        projeto: projeto || null,
        fase: fase || null,
        justificativa: justificativa || null,
        observacoes: obs || null,
        itens: itensValidos.map((l, i) => ({
          seq: i + 1,
          codcmp: l.codcmp,
          descricao: l.descricao || null,
          unidade: l.unidade || null,
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nova requisição — sem OP"
        description="Consumo interno, manutenção, qualidade, administrativo ou transferência entre depósitos."
      />

      {pendenteIntegr !== null && <IntegracaoOfflineBanner detail={pendenteIntegr || undefined} />}

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <div>
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
          <div>
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
          <div>
            <Label>Empresa</Label>
            <Input value={codemp} onChange={(e) => setCodemp(e.target.value)} />
          </div>
          <div>
            <Label>Filial</Label>
            <Input value={codfil} onChange={(e) => setCodfil(e.target.value)} />
          </div>
          <div>
            <Label>Setor</Label>
            <Input value={setor} onChange={(e) => setSetor(e.target.value)} />
          </div>
          <div>
            <Label>Centro de custo</Label>
            <Input value={cc} onChange={(e) => setCc(e.target.value)} />
          </div>
          <div>
            <Label>Projeto/Obra</Label>
            <Input value={projeto} onChange={(e) => setProjeto(e.target.value)} />
          </div>
          <div>
            <Label>Fase</Label>
            <Input value={fase} onChange={(e) => setFase(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Data necessária</Label>
            <Input type="datetime-local" value={dataNecessaria} onChange={(e) => setDataNecessaria(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Justificativa</Label>
            <Input value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Motivo da requisição (opcional em CONSUMO, obrigatório em EMERGENCIAL)" />
          </div>
          <div className="md:col-span-4">
            <Label>Observações</Label>
            <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Componente (CODCMP)</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>UM</TableHead>
              <TableHead className="text-right w-24">Qtd</TableHead>
              <TableHead className="w-24">Dep. orig.</TableHead>
              <TableHead className="w-24">Dep. dest.</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Obs.</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((l, i) => (
              <TableRow key={i}>
                <TableCell><Input value={l.codcmp} onChange={(e) => setLinha(i, { codcmp: e.target.value })} className="h-8 font-mono text-xs" /></TableCell>
                <TableCell><Input value={l.descricao} onChange={(e) => setLinha(i, { descricao: e.target.value })} className="h-8" /></TableCell>
                <TableCell><Input value={l.unidade} onChange={(e) => setLinha(i, { unidade: e.target.value })} className="h-8 w-14" /></TableCell>
                <TableCell><Input type="number" step="0.001" value={l.quantidade} onChange={(e) => setLinha(i, { quantidade: Number(e.target.value) || 0 })} className="h-8 text-right" /></TableCell>
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
        <Button onClick={() => submit(true)} disabled={busy}>
          {busy ? 'Enviando…' : 'Criar e enviar'}
        </Button>
      </div>
    </div>
  );
}
