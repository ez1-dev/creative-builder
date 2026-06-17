import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Loader2, Link2 } from 'lucide-react';
import { fetchPlanoContasDre, type PlanoContasItem } from '@/lib/bi/dreDinamicaApi';
import { vincularContasComoRegras } from '@/lib/bi/dreConfigApi';

interface Props {
  modeloId: string;
  codigoLinhaSelecionada: string | null;
  onAposVincular?: () => void;
}

export function PlanoContasTab({ modeloId, codigoLinhaSelecionada, onAposVincular }: Props) {
  const [itens, setItens] = useState<PlanoContasItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [sinal, setSinal] = useState<'1' | '-1'>('1');

  const carregar = async () => {
    setLoading(true);
    try {
      const arr = await fetchPlanoContasDre();
      setItens(arr);
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? 'Falha ao carregar plano de contas.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const filtrados = useMemo(() => {
    const b = busca.trim().toLowerCase();
    if (!b) return itens;
    return itens.filter((i) =>
      i.cd_mascara.toLowerCase().includes(b) || i.cd_conta_contabil.toLowerCase().includes(b)
    );
  }, [itens, busca]);

  const toggle = (key: string) => {
    setSelecionados((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  };

  const keyOf = (i: PlanoContasItem) => `${i.cd_mascara}||${i.cd_conta_contabil}`;

  const vincular = async (tipo: 'MASCARA_CONTA' | 'CONTA_CONTABIL') => {
    if (!codigoLinhaSelecionada) {
      toast({ title: 'Selecione uma linha', description: 'Escolha primeiro a linha da DRE na aba Linhas.', variant: 'destructive' });
      return;
    }
    const escolhidos = filtrados.filter((i) => selecionados.has(keyOf(i)));
    if (escolhidos.length === 0) {
      toast({ title: 'Nada selecionado', description: 'Selecione ao menos uma máscara ou conta.', variant: 'destructive' });
      return;
    }
    try {
      const contas = escolhidos.map((i) => ({
        cd_conta: i.cd_conta_contabil,
        mascara: i.cd_mascara,
        ds_conta: '',
      }));
      const n = await vincularContasComoRegras({
        modelo_id: modeloId,
        codigo_linha: codigoLinhaSelecionada,
        contas,
        tipo,
      });
      // Aplica sinal escolhido (vincularContasComoRegras grava 1 por padrão; reaplicar via update simples seria custoso).
      // O sinal padrão é 1; se o usuário escolheu -1, mostramos aviso para ajustar na aba Regras.
      toast({
        title: `Vinculadas ${n} regra(s)`,
        description: sinal === '-1'
          ? 'Sinal foi gravado como +1. Ajuste para -1 na aba Regras se necessário.'
          : 'Regras criadas em rascunho. Use a aba Regras para revisar.',
      });
      setSelecionados(new Set());
      onAposVincular?.();
    } catch (e: any) {
      toast({ title: 'Erro ao vincular', description: e?.message, variant: 'destructive' });
    }
  };

  const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <CardTitle className="text-base">Plano de Contas (Cloud)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Agregado de <code>bi_vm_lanc_contabil</code>. Selecione máscaras ou contas e vincule à linha selecionada.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Input placeholder="Buscar máscara ou conta..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-64" />
            <Button variant="outline" onClick={carregar} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Recarregar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-4 p-3 rounded-md bg-muted/40">
          <div className="text-sm">
            Linha selecionada:{' '}
            {codigoLinhaSelecionada
              ? <Badge variant="secondary" className="font-mono">{codigoLinhaSelecionada}</Badge>
              : <span className="text-muted-foreground italic">(nenhuma)</span>}
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Sinal</Label>
            <RadioGroup value={sinal} onValueChange={(v) => setSinal(v as '1' | '-1')} className="flex gap-3">
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="1" id="sinal-pos" />
                <Label htmlFor="sinal-pos" className="text-sm">+1</Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="-1" id="sinal-neg" />
                <Label htmlFor="sinal-neg" className="text-sm">-1</Label>
              </div>
            </RadioGroup>
          </div>
          <Button size="sm" onClick={() => vincular('MASCARA_CONTA')} disabled={!codigoLinhaSelecionada || selecionados.size === 0}>
            <Link2 className="h-4 w-4 mr-1" /> Vincular como Máscara
          </Button>
          <Button size="sm" variant="outline" onClick={() => vincular('CONTA_CONTABIL')} disabled={!codigoLinhaSelecionada || selecionados.size === 0}>
            <Link2 className="h-4 w-4 mr-1" /> Vincular como Conta
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">
            {selecionados.size} selecionado(s) de {filtrados.length}
          </span>
        </div>

        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background border-b">
              <tr className="text-left">
                <th className="py-2 px-2 w-8"></th>
                <th className="py-2 px-2">Máscara</th>
                <th className="py-2 px-2">Conta Contábil</th>
                <th className="py-2 px-2 text-right w-24">Qtde</th>
                <th className="py-2 px-2 text-right w-40">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((i) => {
                const k = keyOf(i);
                return (
                  <tr key={k} className="border-b hover:bg-muted/40">
                    <td className="py-1 px-2">
                      <Checkbox checked={selecionados.has(k)} onCheckedChange={() => toggle(k)} />
                    </td>
                    <td className="py-1 px-2 font-mono">{i.cd_mascara || '—'}</td>
                    <td className="py-1 px-2 font-mono">{i.cd_conta_contabil || '—'}</td>
                    <td className="py-1 px-2 text-right">{i.qtde}</td>
                    <td className="py-1 px-2 text-right font-mono">{fmt.format(i.total)}</td>
                  </tr>
                );
              })}
              {!loading && filtrados.length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Nenhum lançamento encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
