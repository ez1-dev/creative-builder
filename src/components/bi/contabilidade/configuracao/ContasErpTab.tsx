import { useState } from 'react';
import { Search, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { buscarPlanoContas, vincularContasComoRegras } from '@/lib/bi/dreConfigApi';
import type { ContaErp } from '@/lib/bi/dreConfigTypes';

interface Props {
  modeloId: string;
  codigoLinhaSelecionada: string | null;
  onAposVincular: () => void;
}

export function ContasErpTab({ modeloId, codigoLinhaSelecionada, onAposVincular }: Props) {
  const [busca, setBusca] = useState('');
  const [itens, setItens] = useState<ContaErp[]>([]);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tipo, setTipo] = useState<'CONTA_CONTABIL' | 'MASCARA_CONTA'>('CONTA_CONTABIL');

  const procurar = async () => {
    setLoading(true); setErro(null);
    try {
      const { itens } = await buscarPlanoContas(busca);
      setItens(itens);
      setSelecionadas(new Set());
    } catch (e: any) {
      setErro(e?.message ?? String(e));
      setItens([]);
    } finally { setLoading(false); }
  };

  const toggle = (cod: string) => {
    const n = new Set(selecionadas);
    n.has(cod) ? n.delete(cod) : n.add(cod);
    setSelecionadas(n);
  };

  const vincular = async () => {
    if (!codigoLinhaSelecionada) { toast({ title: 'Selecione uma linha na aba Estrutura', variant: 'destructive' }); return; }
    const contas = itens.filter(i => selecionadas.has(i.cd_conta));
    if (contas.length === 0) { toast({ title: 'Selecione ao menos uma conta' }); return; }
    try {
      const n = await vincularContasComoRegras({ modelo_id: modeloId, codigo_linha: codigoLinhaSelecionada, contas, tipo });
      toast({ title: `${n} regra(s) criada(s) em ${codigoLinhaSelecionada}` });
      setSelecionadas(new Set());
      onAposVincular();
    } catch (e: any) {
      toast({ title: 'Erro ao vincular', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">Buscar por máscara, reduzido ou descrição</label>
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && procurar()} placeholder="3.1, RECEITA, 12345..." />
        </div>
        <Button onClick={procurar} disabled={loading}><Search className="mr-1 h-4 w-4" />{loading ? 'Buscando…' : 'Buscar'}</Button>
        <div>
          <label className="text-xs text-muted-foreground">Vincular como</label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CONTA_CONTABIL">CONTA_CONTABIL (=)</SelectItem>
              <SelectItem value="MASCARA_CONTA">MASCARA_CONTA (LIKE)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={vincular} disabled={!selecionadas.size || !codigoLinhaSelecionada}>
          <Link2 className="mr-1 h-4 w-4" />Vincular à linha {codigoLinhaSelecionada ? `(${codigoLinhaSelecionada})` : ''}
        </Button>
      </div>

      {erro && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          {erro}
          <div className="mt-1 text-muted-foreground">Endpoint esperado: <code>GET /api/erp/plano-contas?busca=...</code></div>
        </div>
      )}

      <div className="rounded-md border max-h-[480px] overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 sticky top-0">
            <tr className="text-left">
              <th className="p-2 w-10"></th>
              <th className="p-2">Conta</th>
              <th className="p-2">Reduzido</th>
              <th className="p-2">Máscara</th>
              <th className="p-2">Descrição</th>
              <th className="p-2 w-16">Nível</th>
            </tr>
          </thead>
          <tbody>
            {itens.map(c => (
              <tr key={c.cd_conta} className="border-t hover:bg-accent/30">
                <td className="p-2"><Checkbox checked={selecionadas.has(c.cd_conta)} onCheckedChange={() => toggle(c.cd_conta)} /></td>
                <td className="p-2 font-mono">{c.cd_conta}</td>
                <td className="p-2 font-mono">{c.cd_reduzido ?? ''}</td>
                <td className="p-2 font-mono">{c.mascara}</td>
                <td className="p-2">{c.ds_conta}</td>
                <td className="p-2">{c.nivel ?? ''}</td>
              </tr>
            ))}
            {!itens.length && !loading && (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Faça uma busca para listar contas do ERP.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
