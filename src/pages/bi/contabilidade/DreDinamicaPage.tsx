import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  fetchDreDinamica,
  type DreDinamicaLinha,
  type DreDinamicaResponse,
} from '@/lib/bi/dreDinamicaApi';
import { listarModelos } from '@/lib/bi/dreConfigApi';
import type { DreModelo } from '@/lib/bi/dreConfigTypes';

const MESES = [
  { v: 1, n: 'Jan' }, { v: 2, n: 'Fev' }, { v: 3, n: 'Mar' }, { v: 4, n: 'Abr' },
  { v: 5, n: 'Mai' }, { v: 6, n: 'Jun' }, { v: 7, n: 'Jul' }, { v: 8, n: 'Ago' },
  { v: 9, n: 'Set' }, { v: 10, n: 'Out' }, { v: 11, n: 'Nov' }, { v: 12, n: 'Dez' },
];

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function formatBRL(v: number): string {
  return BRL.format(v ?? 0);
}

const MODELO_PADRAO = '__padrao__';

export default function DreDinamicaPage() {
  const now = new Date();
  const anoAtual = now.getFullYear();
  const mesAtual = now.getMonth() + 1;

  const [ano, setAno] = useState<number>(anoAtual);
  const [mesIni, setMesIni] = useState<number>(1);
  const [mesFim, setMesFim] = useState<number>(mesAtual);
  const [modeloId, setModeloId] = useState<string>(MODELO_PADRAO);
  const [modelos, setModelos] = useState<DreModelo[]>([]);
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<DreDinamicaResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const anosDisponiveis = useMemo(() => {
    const arr: number[] = [];
    for (let a = anoAtual + 1; a >= 2020; a--) arr.push(a);
    return arr;
  }, [anoAtual]);

  useEffect(() => {
    (async () => {
      try {
        const arr = await listarModelos();
        setModelos(arr);
      } catch (e) {
        console.warn('[DRE DINAMICA] falha ao carregar modelos', e);
      }
    })();
  }, []);

  const carregar = async () => {
    if (mesFim < mesIni) {
      toast({
        title: 'Período inválido',
        description: 'O mês final deve ser maior ou igual ao mês inicial.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const data = await fetchDreDinamica({
        ano,
        mes_ini: mesIni,
        mes_fim: mesFim,
        modelo_id: modeloId === MODELO_PADRAO ? null : modeloId,
      });
      setResp(data);
    } catch (e: any) {
      console.error('[DRE DINAMICA] erro:', e);
      setErro(e?.message ?? 'Erro ao carregar DRE Dinâmica.');
      setResp(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const linhasOrdenadas = useMemo<DreDinamicaLinha[]>(() => {
    const arr = [...(resp?.dados ?? [])];
    arr.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    return arr;
  }, [resp]);

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>DRE Dinâmica Gerencial</CardTitle>
              <p className="text-xs text-muted-foreground">
                Demonstrativo gerencial gerado a partir do modelo configurado no Cloud.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Ano</label>
                <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {anosDisponiveis.map((a) => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Mês inicial</label>
                <Select value={String(mesIni)} onValueChange={(v) => setMesIni(Number(v))}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m) => (
                      <SelectItem key={m.v} value={String(m.v)}>{m.n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Mês final</label>
                <Select value={String(mesFim)} onValueChange={(v) => setMesFim(Number(v))}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m) => (
                      <SelectItem key={m.v} value={String(m.v)}>{m.n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Modelo</label>
                <Select value={modeloId} onValueChange={setModeloId}>
                  <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MODELO_PADRAO}>Padrão (sem modelo)</SelectItem>
                    {modelos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome} — v{m.versao} ({m.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={carregar} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Recalcular DRE
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {erro && (
            <Alert variant="destructive" className="mb-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}

          {!loading && !erro && linhasOrdenadas.length === 0 && (
            <Alert className="mb-3 border-yellow-500/50 text-yellow-900 dark:text-yellow-100">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma linha retornada. Verifique se existe modelo ativo, linhas ativas e regras cadastradas.
              </AlertDescription>
            </Alert>
          )}

          {linhasOrdenadas.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-3">Descrição</th>
                    <th className="py-2 px-3 w-32">Tipo</th>
                    <th className="py-2 px-3 w-48 text-right">Realizado</th>
                  </tr>
                </thead>
                <tbody>
                  {linhasOrdenadas.map((linha) => {
                    const isBold =
                      linha.tipo_linha === 'TOTAL' ||
                      linha.tipo_linha === 'CALCULO' ||
                      linha.flag_negrito === true;
                    const indent = Math.max((linha.nivel ?? 1) - 1, 0) * 16;
                    const valor = Number(linha.realizado ?? 0);
                    const valorClass =
                      valor < 0 ? 'text-destructive' : isBold ? 'text-foreground' : 'text-foreground';
                    return (
                      <tr
                        key={linha.codigo_linha}
                        className={`border-b last:border-b-0 hover:bg-muted/40 ${isBold ? 'bg-muted/30 font-semibold' : ''}`}
                      >
                        <td className="py-1.5 px-3">
                          <div style={{ paddingLeft: indent }} className="flex items-center gap-2">
                            <span>{linha.descricao}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {linha.codigo_linha}
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 px-3">
                          <Badge variant="outline" className="text-[10px]">
                            {linha.tipo_linha}
                          </Badge>
                        </td>
                        <td className={`py-1.5 px-3 text-right font-mono ${valorClass}`}>
                          {formatBRL(valor)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {resp && (
            <div className="mt-3 text-xs text-muted-foreground flex flex-wrap gap-4">
              <span>Período: {resp.anomes_ini} → {resp.anomes_fim}</span>
              <span>Modelo: {resp.modelo_id ?? '(padrão)'}</span>
              <span>Linhas: {resp.dados.length}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
