import { useState } from 'react';
import { Play, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { publicarModelo, simularModelo } from '@/lib/bi/dreConfigApi';
import type { DreModelo, SimulacaoLinha } from '@/lib/bi/dreConfigTypes';

interface Props {
  modelo: DreModelo;
  onPublicado: () => void;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function SimulacaoTab({ modelo, onPublicado }: Props) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mesIni, setMesIni] = useState(1);
  const [mesFim, setMesFim] = useState(hoje.getMonth() + 1);
  const [unidade, setUnidade] = useState<string>('TODAS');
  const [linhas, setLinhas] = useState<SimulacaoLinha[]>([]);
  const [loading, setLoading] = useState(false);
  const [simulado, setSimulado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const simular = async () => {
    setLoading(true); setErro(null);
    try {
      const r = await simularModelo({
        modelo_id: modelo.id, ano, mes_ini: mesIni, mes_fim: mesFim,
        unidade: unidade === 'TODAS' ? null : unidade,
      });
      setLinhas(r);
      setSimulado(true);
    } catch (e: any) {
      setErro(e?.message ?? String(e));
      setLinhas([]);
    } finally { setLoading(false); }
  };

  const publicar = async () => {
    if (!simulado) { toast({ title: 'Rode a simulação antes de publicar' }); return; }
    if (!confirm(`Publicar modelo "${modelo.nome}"? Isto substitui o modelo ativo da DRE.`)) return;
    try {
      await publicarModelo(modelo.id);
      toast({ title: 'Modelo publicado' });
      onPublicado();
    } catch (e: any) {
      toast({ title: 'Erro ao publicar', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 flex-wrap">
        <div><Label>Ano</Label><Input type="number" className="w-24" value={ano} onChange={e => setAno(Number(e.target.value))} /></div>
        <div><Label>Mês ini</Label><Input type="number" min={1} max={12} className="w-20" value={mesIni} onChange={e => setMesIni(Number(e.target.value))} /></div>
        <div><Label>Mês fim</Label><Input type="number" min={1} max={12} className="w-20" value={mesFim} onChange={e => setMesFim(Number(e.target.value))} /></div>
        <div>
          <Label>Unidade</Label>
          <Select value={unidade} onValueChange={setUnidade}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS">Todas</SelectItem>
              <SelectItem value="GENIUS">GENIUS</SelectItem>
              <SelectItem value="MATRIZ">MATRIZ</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={simular} disabled={loading}><Play className="mr-1 h-4 w-4" />{loading ? 'Simulando…' : 'Simular'}</Button>
        <Button onClick={publicar} disabled={!simulado} variant="default"><Send className="mr-1 h-4 w-4" />Publicar modelo</Button>
      </div>

      {erro && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          {erro}
          <div className="mt-1 text-muted-foreground">Endpoint esperado: <code>POST /api/bi/contabilidade/dre/simular</code></div>
        </div>
      )}

      <div className="rounded-md border max-h-[520px] overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 sticky top-0 text-left">
            <tr>
              <th className="p-2">Código</th>
              <th className="p-2">Descrição</th>
              <th className="p-2 text-right">Realizado</th>
              <th className="p-2 text-right">Orçado</th>
              <th className="p-2 text-right">Diferença</th>
              <th className="p-2 text-right">%</th>
              <th className="p-2 text-right">Qtd lcto</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(l => (
              <tr key={l.codigo_linha} className="border-t">
                <td className="p-2 font-mono">{l.codigo_linha}</td>
                <td className="p-2" style={{ paddingLeft: 8 + ((l.nivel ?? 1) - 1) * 14 }}>{l.descricao}</td>
                <td className="p-2 text-right font-mono">{fmt(l.realizado)}</td>
                <td className="p-2 text-right font-mono">{fmt(l.orcado)}</td>
                <td className="p-2 text-right font-mono">{fmt(l.diferenca)}</td>
                <td className="p-2 text-right font-mono">{l.pct == null ? '—' : `${l.pct.toFixed(1)}%`}</td>
                <td className="p-2 text-right font-mono">{l.qtd_lancamentos ?? 0}</td>
              </tr>
            ))}
            {!linhas.length && !loading && (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Rode a simulação para ver os valores por linha.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
