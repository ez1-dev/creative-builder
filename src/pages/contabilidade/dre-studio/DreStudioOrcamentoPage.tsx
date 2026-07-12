import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DreHealthBanner } from '@/components/dre-studio/DreHealthBanner';
import { DreFilters, type DreStudioFilters } from '@/components/dre-studio/DreFilters';
import {
  useDreStudioModelo, useOrcamento, useGravarOrcamento,
} from '@/hooks/contabil/useDreStudio';
import { currentAnomes, anomesToLabel } from '@/lib/contabil/anomes';
import { toast } from 'sonner';
import { Save, Copy, Split, RotateCcw, Landmark } from 'lucide-react';

const MESES = Array.from({ length: 12 }, (_, i) => i + 1);

export default function DreStudioOrcamentoPage() {
  const ano = Math.floor(currentAnomes() / 100);
  const [filters, setFilters] = useState<DreStudioFilters>({
    codemp: 1, codfil: 1, modelo_id: null,
    anomes_ini: ano * 100 + 1, anomes_fim: ano * 100 + 12, codccu: null,
  });
  const modeloQ = useDreStudioModelo(filters.modelo_id ?? undefined);
  const orcQ = useOrcamento({
    modelo_id: filters.modelo_id ?? '',
    codemp: filters.codemp, codfil: filters.codfil ?? undefined,
    anomes_ini: filters.anomes_ini, anomes_fim: filters.anomes_fim,
  }, !!filters.modelo_id);
  const gravar = useGravarOrcamento();

  // Estado local editável: por linhaId x mes → valor
  const [drafts, setDrafts] = useState<Record<string, Record<number, number>>>({});

  const linhas = useMemo(
    () => (modeloQ.data?.linhas ?? []).filter((l) => l.tipo_linha === 'ANALITICA' && l.exibir),
    [modeloQ.data],
  );

  const getValor = (linhaId: string, mes: number): number => {
    const d = drafts[linhaId]?.[mes];
    if (d !== undefined) return d;
    const anomes = ano * 100 + mes;
    const it = (orcQ.data ?? []).find((o) => o.linha_id === linhaId && Number(o.anomes) === anomes);
    return Number(it?.valor_orcado ?? 0);
  };
  const setValor = (linhaId: string, mes: number, valor: number) => {
    setDrafts((s) => ({ ...s, [linhaId]: { ...(s[linhaId] ?? {}), [mes]: valor } }));
  };
  const copiarProximos = (linhaId: string, mes: number) => {
    const v = getValor(linhaId, mes);
    const next = { ...(drafts[linhaId] ?? {}) };
    for (let m = mes + 1; m <= 12; m++) next[m] = v;
    setDrafts((s) => ({ ...s, [linhaId]: next }));
  };
  const distribuirAnual = (linhaId: string) => {
    const raw = prompt('Valor anual a distribuir igualmente:');
    if (!raw) return;
    const anual = Number(raw.replace(',', '.'));
    if (!Number.isFinite(anual)) { toast.error('Valor inválido.'); return; }
    const mensal = anual / 12;
    const next: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) next[m] = mensal;
    setDrafts((s) => ({ ...s, [linhaId]: next }));
  };
  const limparRascunho = (linhaId: string) => {
    setDrafts((s) => { const n = { ...s }; delete n[linhaId]; return n; });
  };

  const salvarLinha = async (linhaId: string) => {
    if (!filters.modelo_id) return;
    const draft = drafts[linhaId];
    if (!draft) { toast.info('Nada a salvar.'); return; }
    const meses = Object.keys(draft).map(Number);
    let ok = 0, fail = 0;
    for (const mes of meses) {
      const anomes = ano * 100 + mes;
      const valor = Number(draft[mes]);
      if (!Number.isFinite(valor)) continue;
      try {
        await gravar.mutateAsync({
          modelo_id: filters.modelo_id,
          linha_id: linhaId,
          codemp: filters.codemp,
          codfil: filters.codfil ?? 1,
          codccu: filters.codccu ?? null,
          anomes,
          valor_orcado: valor,
        });
        ok++;
      } catch (e: any) { fail++; toast.error(`${anomesToLabel(anomes)}: ${e?.message ?? 'falha'}`); }
    }
    if (ok) { toast.success(`${ok} valor(es) gravados.`); limparRascunho(linhaId); orcQ.refetch(); }
    if (!ok && !fail) toast.info('Nada a salvar.');
  };

  const rowTotal = (linhaId: string) => {
    let s = 0;
    for (let m = 1; m <= 12; m++) s += getValor(linhaId, m);
    return s;
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-semibold flex items-center gap-2"><Landmark className="h-5 w-5" /> DRE Studio — Orçamento</h1>
      <DreHealthBanner />
      <DreFilters value={filters} onChange={setFilters} onApply={() => orcQ.refetch()} />

      {!filters.modelo_id && (
        <Card className="p-6 text-sm text-muted-foreground">Selecione um modelo para lançar orçamento.</Card>
      )}

      {filters.modelo_id && linhas.length === 0 && !modeloQ.isFetching && (
        <Card className="p-6 text-sm text-muted-foreground">Este modelo não possui linhas analíticas para receber orçamento.</Card>
      )}

      {filters.modelo_id && linhas.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card border-b z-10">
                <tr>
                  <th className="sticky left-0 bg-card px-2 py-2 text-left min-w-[220px]">Linha</th>
                  {MESES.map((m) => <th key={m} className="px-2 py-2 text-right">{anomesToLabel(ano * 100 + m)}</th>)}
                  <th className="px-2 py-2 text-right">Total</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.id} className="border-b hover:bg-muted/20">
                    <td className="sticky left-0 bg-card px-2 py-1">
                      <div className="font-medium truncate">{l.descricao}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{l.codigo}</div>
                    </td>
                    {MESES.map((m) => (
                      <td key={m} className="p-1">
                        <div className="flex items-center gap-0.5">
                          <Input
                            type="number"
                            step="0.01"
                            className="h-7 w-24 text-right tabular-nums px-1"
                            value={getValor(l.id, m) || ''}
                            onChange={(e) => setValor(l.id, m, Number(e.target.value) || 0)}
                          />
                          <button className="text-muted-foreground hover:text-foreground p-0.5" title="Copiar para próximos meses" type="button"
                            onClick={() => copiarProximos(l.id, m)}>
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    ))}
                    <td className="px-2 py-1 text-right tabular-nums font-medium">{fmt(rowTotal(l.id))}</td>
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-1">
                        <button title="Distribuir anual" onClick={() => distribuirAnual(l.id)} className="text-muted-foreground hover:text-foreground p-1">
                          <Split className="h-3 w-3" />
                        </button>
                        <button title="Limpar rascunho" onClick={() => limparRascunho(l.id)} className="text-muted-foreground hover:text-destructive p-1">
                          <RotateCcw className="h-3 w-3" />
                        </button>
                        <Button size="sm" variant="ghost" className="h-6 gap-1" onClick={() => salvarLinha(l.id)}>
                          <Save className="h-3 w-3" /> Salvar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
