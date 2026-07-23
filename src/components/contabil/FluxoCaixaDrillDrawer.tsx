import { useEffect, useMemo, useState } from 'react';
import { Loader2, AlertTriangle, ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  fetchDiretoDrill, fetchProjecaoDrill,
  type DiretoDrillParams, type DiretoDrillResponse,
  type ProjecaoDrillParams, type ProjecaoDrillResponse,
  type IndiretoDrillPtr,
} from '@/lib/contabil/fluxoCaixaApi';
import { DrillAglutinadorTree } from './DrillAglutinadorTree';
import { DrillDrawer, type DrillArgs } from '@/components/dre-studio/DrillDrawer';

// ============================================================
// Tipos de contexto que a página passa para o drawer
// ============================================================

export type FCDrillContext =
  | {
      modo: 'direto';
      titulo: string;
      params: DiretoDrillParams;
    }
  | {
      modo: 'projecao';
      titulo: string;
      subTitulo?: string;
      params: ProjecaoDrillParams;
    }
  | {
      modo: 'indireto';
      titulo: string;
      ptr: IndiretoDrillPtr;
      anomesIni: number;
      anomesFim: number;
      codemp?: number;
      codfil?: number;
    };

export interface FluxoCaixaDrillDrawerProps {
  context: FCDrillContext | null;
  onClose: () => void;
}

// ============================================================
// Componente principal
// ============================================================

export function FluxoCaixaDrillDrawer({ context, onClose }: FluxoCaixaDrillDrawerProps) {
  const [razaoArgs, setRazaoArgs] = useState<DrillArgs | null>(null);
  const open = !!context;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          {context && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {context.titulo}
                </SheetTitle>
                {context.modo === 'projecao' && context.subTitulo && (
                  <SheetDescription className="text-xs">{context.subTitulo}</SheetDescription>
                )}
              </SheetHeader>

              <div className="mt-4">
                {context.modo === 'direto' && <DiretoDrillBody params={context.params} />}
                {context.modo === 'projecao' && <ProjecaoDrillBody params={context.params} />}
                {context.modo === 'indireto' && (
                  <IndiretoDrillBody
                    ptr={context.ptr}
                    anomesIni={context.anomesIni}
                    anomesFim={context.anomesFim}
                    codemp={context.codemp ?? 1}
                    codfil={context.codfil}
                    onOpenRazao={(args) => setRazaoArgs({
                      modeloId: '',
                      linhaId: '',
                      linhaDescricao: args.descricao ?? `Conta ${args.ctared}`,
                      ctared: args.ctared,
                      clacta: args.clacta ?? null,
                      contaDescricao: args.descricao ?? null,
                      anomes_ini: context.anomesIni,
                      anomes_fim: context.anomesFim,
                      codemp: context.codemp ?? 1,
                      codfil: context.codfil,
                      tipoModelo: 'DRE',
                    })}
                  />
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <DrillDrawer open={!!razaoArgs} onOpenChange={(o) => !o && setRazaoArgs(null)} args={razaoArgs} />
    </>
  );
}

// ============================================================
// DIRETO — lançamentos de caixa
// ============================================================

function DiretoDrillBody({ params }: { params: DiretoDrillParams }) {
  const [limite, setLimite] = useState<number>(params.limite ?? 500);
  const [data, setData] = useState<DiretoDrillResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true); setErro(null);
    fetchDiretoDrill({ ...params, limite })
      .then((r) => { if (!ctrl.signal.aborted) setData(r); })
      .catch((e) => { if (!ctrl.signal.aborted) setErro(e?.message || 'Falha ao carregar lançamentos.'); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [params, limite]);

  const soma = useMemo(
    () => (data?.lancamentos || []).reduce((acc, l) => acc + (Number(l.valor) || 0), 0),
    [data],
  );

  if (loading && !data) return <LoadingBox />;
  if (erro) return <ErroBox msg={erro} />;
  if (!data) return null;

  const truncado = !!data.truncado;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">Origem: {params.origem}</Badge>
        <Badge variant="outline">
          {params.anomes_ini} – {params.anomes_fim}
        </Badge>
        <span className="text-muted-foreground">
          {data.total_lancamentos.toLocaleString('pt-BR')} lançamentos
        </span>
        <span className="ml-auto font-semibold tabular-nums">Soma exibida: {formatCurrency(soma)}</span>
      </div>

      {truncado && (
        <Alert className="border-[hsl(var(--warning))]/50 bg-[hsl(var(--warning))]/5 py-2">
          <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
          <AlertTitle className="text-xs">Lista truncada</AlertTitle>
          <AlertDescription className="text-xs flex items-center gap-2">
            <span>Exibindo os primeiros {limite.toLocaleString('pt-BR')} de {data.total_lancamentos.toLocaleString('pt-BR')}.</span>
            <Button size="sm" variant="outline" onClick={() => setLimite((l) => l * 2)}>
              Aumentar limite
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 sticky top-0 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Data</th>
                <th className="text-left px-3 py-2">Conta caixa</th>
                <th className="text-center px-3 py-2">Tipo</th>
                <th className="text-right px-3 py-2">Valor</th>
                <th className="text-left px-3 py-2">Histórico</th>
                <th className="text-left px-3 py-2">Usuário</th>
              </tr>
            </thead>
            <tbody>
              {data.lancamentos.map((l, i) => (
                <tr key={`${l.lancamento}-${i}`} className="border-t border-border/60 hover:bg-muted/30">
                  <td className="px-3 py-1.5 tabular-nums whitespace-nowrap">{l.data}</td>
                  <td className="px-3 py-1.5 whitespace-nowrap">{l.conta_caixa ?? '—'}</td>
                  <td className="px-3 py-1.5 text-center">
                    {l.tipo === 'E' ? (
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-[10px]">
                        <ArrowUpRight className="h-3 w-3 mr-0.5" /> E
                      </Badge>
                    ) : l.tipo === 'S' ? (
                      <Badge variant="destructive" className="text-[10px]">
                        <ArrowDownRight className="h-3 w-3 mr-0.5" /> S
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">{l.tipo ?? '—'}</Badge>
                    )}
                  </td>
                  <td className={cn('px-3 py-1.5 text-right tabular-nums font-medium',
                    l.tipo === 'S' && 'text-destructive')}>
                    {formatCurrency(l.valor)}
                  </td>
                  <td className="px-3 py-1.5 max-w-[320px] truncate">
                    {l.historico ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">{l.historico}</span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md text-xs">{l.historico}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{l.usuario ?? '—'}</td>
                </tr>
              ))}
              {data.lancamentos.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Nenhum lançamento no período.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PROJEÇÃO — títulos abertos
// ============================================================

function ProjecaoDrillBody({ params }: { params: ProjecaoDrillParams }) {
  const [data, setData] = useState<ProjecaoDrillResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [agrupar, setAgrupar] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true); setErro(null);
    fetchProjecaoDrill(params)
      .then((r) => { if (!ctrl.signal.aborted) setData(r); })
      .catch((e) => { if (!ctrl.signal.aborted) setErro(e?.message || 'Falha ao carregar títulos.'); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [params]);

  const grupos = useMemo(() => {
    if (!agrupar || !data) return null;
    const map = new Map<string, { parceiro: string; titulos: typeof data.titulos; total: number }>();
    for (const t of data.titulos) {
      const k = String(t.parceiro_codigo ?? t.parceiro ?? '—');
      const g = map.get(k) ?? { parceiro: t.parceiro || `#${k}`, titulos: [], total: 0 };
      g.titulos.push(t);
      g.total += Number(t.valor_aberto) || 0;
      map.set(k, g);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [agrupar, data]);

  if (loading && !data) return <LoadingBox />;
  if (erro) return <ErroBox msg={erro} />;
  if (!data) return null;

  const badgeCor = params.tipo === 'receber' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className={badgeCor}>
          {params.tipo === 'receber' ? 'A receber' : 'A pagar'}
        </Badge>
        {params.vencidos && (
          <Badge className="bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]">Vencidos</Badge>
        )}
        {(params.venc_ini || params.venc_fim) && (
          <Badge variant="outline">{params.venc_ini ?? '…'} → {params.venc_fim ?? '…'}</Badge>
        )}
        <span className="text-muted-foreground">
          {data.total_titulos.toLocaleString('pt-BR')} títulos
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant={agrupar ? 'default' : 'outline'} onClick={() => setAgrupar((v) => !v)}>
            Agrupar por parceiro
          </Button>
          <span className="font-semibold tabular-nums">Total: {formatCurrency(data.total)}</span>
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
          {!agrupar ? (
            <table className="w-full text-xs">
              <thead className="bg-muted/40 sticky top-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Título</th>
                  <th className="text-left px-3 py-2">Parceiro</th>
                  <th className="text-left px-3 py-2">Vencimento</th>
                  <th className="text-right px-3 py-2">Valor aberto</th>
                </tr>
              </thead>
              <tbody>
                {data.titulos.map((t, i) => (
                  <tr key={`${t.titulo}-${i}`} className="border-t border-border/60 hover:bg-muted/30">
                    <td className="px-3 py-1.5 tabular-nums whitespace-nowrap">{t.titulo}</td>
                    <td className="px-3 py-1.5">
                      <span className="text-muted-foreground mr-1">{t.parceiro_codigo ?? ''}</span>
                      {t.parceiro ?? '—'}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums whitespace-nowrap">{t.vencimento}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                      {formatCurrency(t.valor_aberto)}
                    </td>
                  </tr>
                ))}
                {data.titulos.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Sem títulos.</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <div className="divide-y divide-border/60">
              {(grupos || []).map((g, i) => (
                <details key={i} className="group">
                  <summary className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-muted/30">
                    <span className="text-sm font-medium">{g.parceiro}</span>
                    <span className="text-xs text-muted-foreground">
                      {g.titulos.length} títulos ·
                      <strong className="ml-1 text-foreground tabular-nums">{formatCurrency(g.total)}</strong>
                    </span>
                  </summary>
                  <table className="w-full text-xs bg-muted/10">
                    <tbody>
                      {g.titulos.map((t, j) => (
                        <tr key={`${t.titulo}-${j}`} className="border-t border-border/40">
                          <td className="px-3 py-1.5 tabular-nums w-32">{t.titulo}</td>
                          <td className="px-3 py-1.5 tabular-nums w-32">{t.vencimento}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{formatCurrency(t.valor_aberto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INDIRETO — aglutinador ou razão
// ============================================================

function IndiretoDrillBody({
  ptr, anomesIni, anomesFim, codemp, codfil, onOpenRazao,
}: {
  ptr: IndiretoDrillPtr;
  anomesIni: number; anomesFim: number;
  codemp: number; codfil?: number;
  onOpenRazao: (a: { ctared: number; clacta?: string | null; descricao?: string | null }) => void;
}) {
  if (ptr.tipo === 'aglutinador' && ptr.codagl) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Aglutinador <strong className="text-foreground">#{ptr.codagl}</strong>
          {ptr.descricao ? ` — ${ptr.descricao}` : ''}
        </div>
        <DrillAglutinadorTree
          codagl={ptr.codagl}
          descricao={ptr.descricao}
          params={{ anomes_ini: anomesIni, anomes_fim: anomesFim, codemp, codfil }}
          onOpenRazao={onOpenRazao}
        />
      </div>
    );
  }

  if (ptr.tipo === 'razao' && ptr.contas?.length) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Contas contábeis relacionadas — clique para abrir o razão.
        </div>
        <div className="rounded-md border divide-y">
          {ptr.contas.map((c, i) => (
            <button
              key={`${c.ctared}-${i}`}
              onClick={() => onOpenRazao(c)}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/30 text-sm"
            >
              <span>
                <span className="text-muted-foreground mr-2">{c.clacta ?? c.ctared}</span>
                {c.descricao ?? `Conta ${c.ctared}`}
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <ErroBox msg="Este item não tem drill disponível." />;
}

// ============================================================
// Helpers visuais
// ============================================================

function LoadingBox() {
  return (
    <div className="flex items-center justify-center py-10 text-sm text-muted-foreground gap-2">
      <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
    </div>
  );
}
function ErroBox({ msg }: { msg: string }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Dados indisponíveis</AlertTitle>
      <AlertDescription className="text-xs">{msg}</AlertDescription>
    </Alert>
  );
}

// ============================================================
// Utilitário: transformar `periodo` (AAAA-MM ou AAAA-Www) em datas
// ============================================================

export function periodoParaDatas(periodo: string): { venc_ini: string; venc_fim: string } | null {
  const mMes = /^(\d{4})-(\d{2})$/.exec(periodo);
  if (mMes) {
    const y = Number(mMes[1]); const m = Number(mMes[2]);
    const last = new Date(y, m, 0).getDate();
    const mm = String(m).padStart(2, '0');
    return {
      venc_ini: `${y}-${mm}-01`,
      venc_fim: `${y}-${mm}-${String(last).padStart(2, '0')}`,
    };
  }
  const mSem = /^(\d{4})-W(\d{2})$/.exec(periodo);
  if (mSem) {
    // ISO week → segunda-feira a domingo
    const y = Number(mSem[1]); const w = Number(mSem[2]);
    const jan4 = new Date(Date.UTC(y, 0, 4));
    const jan4Dow = jan4.getUTCDay() || 7;
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - (jan4Dow - 1) + (w - 1) * 7);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { venc_ini: iso(monday), venc_fim: iso(sunday) };
  }
  return null;
}
