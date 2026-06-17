import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronRight, Flag, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  fetchDreDrill,
  DRE_DRILL_LABELS,
  type DreDrillParams,
  type DreDrillResponse,
  type DreDrillRow,
  type DreDrillTipo,
} from '@/lib/bi/dreDrillApi';
import { formatCurrency } from '@/components/bi/utils/formatters';
import { isLinhaCalculada, componentesDaLinha } from '@/lib/bi/dreReabrir';
import { DreExcecaoModal } from './DreExcecaoModal';
import { DreClassificarModal } from './DreClassificarModal';
import { DreCriarRegraDeparaModal } from './DreCriarRegraDeparaModal';

interface Level extends DreDrillParams {
  /** Cache do resultado para evitar refetch ao navegar pela pilha. */
  result?: DreDrillResponse;
  /** Para REABRIR: descrição amigável da linha calculada. */
  reabrirLabel?: string;
}

export interface DreDrillDrawerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  stack: Level[];
  onPush: (next: Level) => void;
  onPop: () => void;
  onGoTo: (index: number) => void;
  /** Lista de códigos de linha (para selecionar destino na exceção). */
  codigosLinha: string[];
  /** Descrição amigável por código_linha (origem -> label). */
  descricoesLinha?: Record<string, string>;
}

const fmtSigned = (v: number | null | undefined) => {
  if (v == null || Number.isNaN(Number(v))) return '-';
  const n = Number(v);
  if (n < 0) return `(${formatCurrency(Math.abs(n))})`;
  return formatCurrency(n);
};

export function DreDrillDrawer({
  open, onOpenChange, stack, onPush, onPop, onGoTo, codigosLinha, descricoesLinha,
}: DreDrillDrawerProps) {
  const current = stack[stack.length - 1];

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [data, setData] = useState<DreDrillResponse | null>(current?.result ?? null);

  const [modal, setModal] = useState<{ open: boolean; row: DreDrillRow | null }>({
    open: false, row: null,
  });
  const [modalClass, setModalClass] = useState<{ open: boolean; row: DreDrillRow | null }>({
    open: false, row: null,
  });
  const [modalRegra, setModalRegra] = useState<{ open: boolean; row: DreDrillRow | null }>({
    open: false, row: null,
  });

  const fetchAtual = useCallback(async () => {
    if (!current) return;
    if (current.tipo_drill === 'REABRIR') {
      // Para REABRIR não bate na API: vamos chamar a própria API para cada componente.
      setLoading(true);
      setErro(null);
      try {
        const componentes = componentesDaLinha(current.codigo_linha);
        const calls = await Promise.all(
          componentes.map(async (cod) => {
            const r = await fetchDreDrill({
              ...current,
              codigo_linha: cod,
              tipo_drill: 'CONTA_CONTABIL', // basta somar todos os lançamentos da linha
            }).catch(() => null);
            const total = (r?.rows ?? []).reduce(
              (acc, row) => acc + (Number(row.vl_realizado) || 0),
              0,
            );
            return {
              chave: cod,
              descricao: descricoesLinha?.[cod] ?? cod,
              vl_realizado: total,
            } as DreDrillRow;
          }),
        );
        setData({
          tipo_drill: 'REABRIR',
          codigo_linha: current.codigo_linha,
          periodo: {
            ano: current.ano,
            mes_ini: current.mes_ini,
            mes_fim: current.mes_fim,
            anomes_referente: current.anomes_referente ?? null,
          },
          unidade: current.unidade ?? null,
          columns: [
            { key: 'descricao', label: 'Componente', format: 'text' },
            { key: 'vl_realizado', label: 'Realizado', format: 'currency' },
          ],
          rows: calls,
          total: calls.reduce((s, r) => s + (Number(r.vl_realizado) || 0), 0),
        });
      } catch (e: any) {
        setErro(String(e?.message ?? e));
      } finally {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    setErro(null);
    try {
      const r = await fetchDreDrill(current);
      setData(r);
    } catch (e: any) {
      setErro(String(e?.message ?? e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [current, descricoesLinha]);

  useEffect(() => {
    if (!open || !current) return;
    if (current.result) {
      setData(current.result);
      return;
    }
    void fetchAtual();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stack.length]);

  const showNav = stack.length > 1;

  const chips = useMemo(() => {
    if (!current) return [];
    const out: { label: string; value: string }[] = [
      { label: 'Linha', value: descricoesLinha?.[current.codigo_linha] ?? current.codigo_linha },
      { label: 'Período', value: `${current.ano}/${current.mes_ini}-${current.mes_fim}` },
    ];
    if (current.anomes_referente) out.push({ label: 'Mês', value: String(current.anomes_referente) });
    if (current.unidade && current.unidade.toUpperCase() !== 'TODOS') {
      out.push({ label: 'Unidade', value: current.unidade });
    }
    out.push({ label: 'Drill', value: DRE_DRILL_LABELS[current.tipo_drill] });
    return out;
  }, [current, descricoesLinha]);

  const rows: DreDrillRow[] = useMemo(
    () => (Array.isArray(data?.rows) ? data!.rows : []),
    [data],
  );
  const columns = useMemo(
    () => (Array.isArray(data?.columns) ? data!.columns : []),
    [data],
  );
  const hasRows = rows.length > 0;

  const totalRodape = useMemo(() => {
    if (data?.total != null) return data.total;
    return rows.reduce((s, r) => s + (Number(r?.vl_realizado) || 0), 0);
  }, [data, rows]);

  const drillEmComponente = (cod: string) => {
    const proximoTipo: DreDrillTipo = isLinhaCalculada(cod) ? 'REABRIR' : 'LANCAMENTO';
    onPush({
      ano: current!.ano,
      mes_ini: current!.mes_ini,
      mes_fim: current!.mes_fim,
      anomes_referente: current!.anomes_referente ?? null,
      codigo_linha: cod,
      tipo_drill: proximoTipo,
      unidade: current!.unidade,
    });
  };

  if (!current) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl xl:max-w-6xl p-0 flex flex-col">
          <SheetHeader className="px-4 md:px-6 py-3 md:py-4 border-b space-y-2">
            {showNav && (
              <div className="flex items-center gap-1 -ml-1 -mt-1 pr-8 min-w-0">
                <Button variant="ghost" size="sm" onClick={onPop} className="h-7 px-2 text-xs shrink-0">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline ml-1">Voltar</span>
                </Button>
                <nav className="flex items-center gap-1 overflow-x-auto min-w-0">
                  {stack.map((lv, i) => {
                    const isLast = i === stack.length - 1;
                    const label = `${DRE_DRILL_LABELS[lv.tipo_drill]} — ${descricoesLinha?.[lv.codigo_linha] ?? lv.codigo_linha}`;
                    return (
                      <div key={i} className="flex items-center gap-1 shrink-0">
                        {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
                        {isLast ? (
                          <span className="text-xs font-medium truncate max-w-[260px]">{label}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onGoTo(i)}
                            className="text-xs text-muted-foreground hover:text-foreground hover:underline truncate max-w-[200px]"
                          >
                            {label}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>
            )}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <SheetTitle className="text-base md:text-lg">
                  Drill — {DRE_DRILL_LABELS[current.tipo_drill]}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {descricoesLinha?.[current.codigo_linha] ?? current.codigo_linha}
                </SheetDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAtual} disabled={loading}>
                <RefreshCw className={cn('h-3.5 w-3.5 mr-1', loading && 'animate-spin')} />
                Recarregar
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {chips.map((c, i) => (
                <Badge key={i} variant="secondary" className="text-[11px] font-normal">
                  <span className="text-muted-foreground mr-1">{c.label}:</span>
                  <span className="font-medium">{c.value}</span>
                </Badge>
              ))}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-auto px-3 md:px-6 py-3 md:py-4">
            {loading && (
              <div className="text-center text-muted-foreground py-10 text-xs">Carregando drill...</div>
            )}
            {!loading && erro && (
              <div className="text-center text-destructive bg-destructive/10 rounded-md py-3 px-4 text-xs">
                {erro}
              </div>
            )}
            {!loading && !erro && data && !hasRows && (
              <div className="text-center text-muted-foreground py-10 text-xs">
                Sem registros para esta combinação.
              </div>
            )}
            {!loading && !erro && data && hasRows && (
              <div className="overflow-x-auto rounded-md border bg-card">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-muted-foreground sticky top-0">
                    <tr>
                      {columns.map((c) => (
                        <th
                          key={c.key}
                          className={cn(
                            'px-3 py-2 text-left whitespace-nowrap',
                            c.format === 'currency' && 'text-right',
                          )}
                        >
                          {c.label}
                        </th>
                      ))}
                      {current.tipo_drill === 'LANCAMENTO' && <th className="px-2 py-2 text-center w-64">Ações</th>}
                      {current.tipo_drill === 'REABRIR' && <th className="px-2 py-2 text-center w-10">Drill</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-t hover:bg-accent/40">
                        {columns.map((c) => {
                          const v = row?.[c.key];
                          const isCur = c.format === 'currency';
                          return (
                            <td
                              key={c.key}
                              className={cn(
                                'px-3 py-1.5 tabular-nums',
                                isCur && 'text-right',
                              )}
                            >
                              {isCur ? fmtSigned(Number(v ?? 0)) : (v ?? '-')}
                            </td>
                          );
                        })}
                        {current.tipo_drill === 'LANCAMENTO' && (
                          <td className="px-2 py-1.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[11px]"
                                onClick={() => setModal({ open: true, row })}
                                title="Marcar como exceção DRE"
                              >
                                <Flag className="h-3 w-3 mr-1" />
                                Exceção
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[11px]"
                                onClick={() => setModalClass({ open: true, row })}
                                title="Classificar lançamento na DRE"
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                Classificar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[11px]"
                                onClick={() => setModalRegra({ open: true, row })}
                                title="Criar regra de classificação (conta + centro de custos)"
                              >
                                <Wand2 className="h-3 w-3 mr-1" />
                                Criar regra
                              </Button>
                            </div>
                          </td>
                        )}
                        {current.tipo_drill === 'REABRIR' && (
                          <td className="px-2 py-1.5 text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[11px]"
                              onClick={() => drillEmComponente(String(row.chave ?? ''))}
                            >
                              Detalhar
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 border-t">
                    <tr>
                      <td colSpan={Math.max(1, columns.length - 1)} className="px-3 py-2 text-right font-semibold">
                        Total
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {fmtSigned(totalRodape)}
                      </td>
                      {(current.tipo_drill === 'LANCAMENTO' || current.tipo_drill === 'REABRIR') && (
                        <td />
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {modal.open && modal.row && (
        <DreExcecaoModal
          open={modal.open}
          onOpenChange={(o) => setModal((s) => ({ ...s, open: o }))}
          codigoLinhaOrigem={current.codigo_linha}
          codigosLinha={codigosLinha}
          lancamento={{
            nr_lancamento: modal.row.nr_lancamento ?? String(modal.row.chave ?? ''),
            nr_lote: modal.row.nr_lote,
            nr_documento: modal.row.nr_documento,
            cd_conta: modal.row.cd_conta,
            cd_cencus: modal.row.cd_cencus,
            cd_origem: modal.row.cd_origem,
            cd_transacao: modal.row.cd_transacao,
            ds_historico: modal.row.ds_historico,
            anomes_referente: modal.row.anomes_referente ?? current.anomes_referente ?? undefined,
            vl_realizado: Number(modal.row.vl_realizado) || 0,
          }}
          onSaved={() => {
            toast.success('Exceção registrada. Recarregue a DRE para refletir o valor.');
            fetchAtual();
          }}
        />
      )}

      {modalClass.open && modalClass.row && (
        <DreClassificarModal
          open={modalClass.open}
          onOpenChange={(o) => setModalClass((s) => ({ ...s, open: o }))}
          codigoLinhaOrigem={current.codigo_linha}
          periodo={{
            ano: current.ano,
            mes_ini: current.mes_ini,
            mes_fim: current.mes_fim,
            unidade: current.unidade,
          }}
          lancamento={{
            anomes_referente: modalClass.row.anomes_referente ?? current.anomes_referente ?? null,
            nr_lancamento: modalClass.row.nr_lancamento ?? String(modalClass.row.chave ?? ''),
            nr_lote: modalClass.row.nr_lote ?? null,
            nr_documento: modalClass.row.nr_documento ?? null,
            cd_mascara: (modalClass.row as any).cd_mascara ?? null,
            cd_conta_contabil: modalClass.row.cd_conta ?? (modalClass.row as any).cd_conta_contabil ?? null,
            cd_centro_custos: modalClass.row.cd_cencus ?? (modalClass.row as any).cd_centro_custos ?? null,
            cd_centro_custos_3: (modalClass.row as any).cd_centro_custos_3 ?? null,
            cd_origem_lcto: modalClass.row.cd_origem ?? (modalClass.row as any).cd_origem_lcto ?? null,
            cd_tns: modalClass.row.cd_transacao ?? (modalClass.row as any).cd_tns ?? null,
            ds_historico: modalClass.row.ds_historico ?? null,
            vl_realizado: Number(modalClass.row.vl_realizado) || 0,
          }}
          onSaved={() => {
            toast.success('Classificação registrada. Recarregue a DRE para refletir o impacto.');
            fetchAtual();
          }}
        />
      )}

      {modalRegra.open && modalRegra.row && (
        <DreCriarRegraDeparaModal
          open={modalRegra.open}
          onOpenChange={(o) => setModalRegra((s) => ({ ...s, open: o }))}
          lancamento={{
            cd_conta_contabil: String(
              modalRegra.row.cd_conta ?? (modalRegra.row as any).cd_conta_contabil ?? '',
            ),
            cd_centro_custos: String(
              modalRegra.row.cd_cencus ?? (modalRegra.row as any).cd_centro_custos ?? '',
            ),
            cd_mascara_atual: (modalRegra.row as any).cd_mascara ?? null,
            cd_mascara_sugerida: (modalRegra.row as any).cd_mascara_sugerida ?? null,
            ds_historico: modalRegra.row.ds_historico ?? null,
            vl_realizado: Number(modalRegra.row.vl_realizado) || 0,
            linha_origem: current.codigo_linha,
          }}
          onSaved={() => {
            fetchAtual();
          }}
        />
      )}
    </>
  );
}
