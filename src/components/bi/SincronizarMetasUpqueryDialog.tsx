import { useEffect, useId, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, RefreshCcw } from 'lucide-react';

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import {
  sincronizarMetasUpquery,
  type SyncMetasUpqueryResponse,
} from '@/lib/bi/metasFaturamentoApi';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  defaultAnomesIni: string; // YYYYMM
  defaultAnomesFim: string;
  onSuccess?: (resp: SyncMetasUpqueryResponse) => void;
}

const currency = (v: number) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function maskAnomes(v: string): string {
  return v.replace(/[^0-9]/g, '').slice(0, 6);
}
function displayAnomes(v: string): string {
  if (!v) return '';
  return `${v.slice(0, 4)}${v.length > 4 ? '-' + v.slice(4, 6) : ''}`;
}

export function SincronizarMetasUpqueryDialog({
  open, onOpenChange, defaultAnomesIni, defaultAnomesFim, onSuccess,
}: Props) {
  const uid = useId();
  const [ini, setIni] = useState(defaultAnomesIni);
  const [fim, setFim] = useState(defaultAnomesFim);
  const [resp, setResp] = useState<SyncMetasUpqueryResponse | null>(null);

  useEffect(() => {
    if (open) {
      setIni(defaultAnomesIni);
      setFim(defaultAnomesFim);
      setResp(null);
    }
  }, [open, defaultAnomesIni, defaultAnomesFim]);

  const mutation = useMutation({
    mutationFn: () =>
      sincronizarMetasUpquery({ anomes_ini: ini, anomes_fim: fim, origem: 'UPQUERY_VM_FATURAMENTO' }),
    onSuccess: (r) => {
      setResp(r);
      if (r.ok) {
        toast.success('Metas sincronizadas a partir da UpQuery');
        onSuccess?.(r);
      } else {
        toast.error('Não foi possível sincronizar as metas da UpQuery.');
      }
    },
    onError: (e: any) => {
      toast.error(e?.message || 'Falha ao sincronizar metas');
      setResp({
        ok: false,
        status: 0,
        error: e?.message ?? 'Erro desconhecido',
        periodo: { anomes_ini: ini, anomes_fim: fim, origem: 'UPQUERY_VM_FATURAMENTO' },
      });
    },
  });

  const valid = /^\d{6}$/.test(ini) && /^\d{6}$/.test(fim) && ini <= fim;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!mutation.isPending) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-4 w-4" /> Sincronizar metas da UpQuery
          </DialogTitle>
          <DialogDescription>
            Importa as metas oficiais da UpQuery para o período informado. Metas importadas
            prevalecem sobre metas cadastradas manualmente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`${uid}-ini`}>Anomês inicial</Label>
            <Input
              id={`${uid}-ini`}
              value={displayAnomes(ini)}
              onChange={(e) => setIni(maskAnomes(e.target.value))}
              placeholder="YYYY-MM"
              disabled={mutation.isPending}
            />
          </div>
          <div>
            <Label htmlFor={`${uid}-fim`}>Anomês final</Label>
            <Input
              id={`${uid}-fim`}
              value={displayAnomes(fim)}
              onChange={(e) => setFim(maskAnomes(e.target.value))}
              placeholder="YYYY-MM"
              disabled={mutation.isPending}
            />
          </div>
        </div>

        {mutation.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Sincronizando metas da UpQuery...
          </div>
        )}

        {resp && !resp.ok && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs">
            <div className="font-semibold text-destructive">Não foi possível sincronizar as metas da UpQuery.</div>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
              <div><b>Status HTTP:</b> {resp.status || '—'}</div>
              <div><b>Período:</b> {displayAnomes(resp.periodo.anomes_ini)} → {displayAnomes(resp.periodo.anomes_fim)}</div>
              <div className="col-span-2"><b>Mensagem:</b> {resp.error || '—'}</div>
            </div>
          </div>
        )}

        {resp && resp.ok && resp.data && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 text-xs">
              <Badge variant="secondary">Linhas detalhe: {resp.data.linhas_detalhe ?? 0}</Badge>
              <Badge variant="secondary">Linhas resumo: {resp.data.linhas_resumo ?? 0}</Badge>
              <Badge variant="outline">
                Período: {displayAnomes(resp.periodo.anomes_ini)} → {displayAnomes(resp.periodo.anomes_fim)}
              </Badge>
            </div>

            {Array.isArray(resp.data.totais_por_mes) && resp.data.totais_por_mes.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Totais por mês</div>
                <div className="max-h-40 overflow-y-auto rounded border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr><th className="px-2 py-1 text-left">Anomês</th><th className="px-2 py-1 text-right">Meta</th></tr>
                    </thead>
                    <tbody>
                      {resp.data.totais_por_mes.map((r) => (
                        <tr key={r.anomes_emissao} className="border-t">
                          <td className="px-2 py-1 font-mono">{displayAnomes(String(r.anomes_emissao))}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{currency(Number(r.vl_meta))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {Array.isArray(resp.data.totais_por_unidade) && resp.data.totais_por_unidade.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Totais por unidade</div>
                <div className="rounded border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr><th className="px-2 py-1 text-left">Unidade</th><th className="px-2 py-1 text-right">Meta</th></tr>
                    </thead>
                    <tbody>
                      {resp.data.totais_por_unidade.map((r) => (
                        <tr key={r.unidade_negocio} className="border-t">
                          <td className="px-2 py-1">{r.unidade_negocio}</td>
                          <td className="px-2 py-1 text-right tabular-nums">{currency(Number(r.vl_meta))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Fechar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>
            {mutation.isPending ? (
              <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Sincronizando…</>
            ) : (
              <><RefreshCcw className="mr-1 h-4 w-4" /> Sincronizar</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
