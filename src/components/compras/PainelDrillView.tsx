import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ArrowLeft, X, ChevronDown } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/format';

type Nivel =
  | 'projeto_macro'
  | 'numero_projeto'
  | 'centro_custo'
  | 'tipo_despesa_calc'
  | 'mes_competencia_calc'
  | 'fantasia_fornecedor'
  | 'numero_oc'
  | 'codigo_item';

const NIVEIS: { key: Nivel; label: string }[] = [
  { key: 'projeto_macro', label: 'Projeto Macro' },
  { key: 'numero_projeto', label: 'Projeto' },
  { key: 'centro_custo', label: 'Centro de Custo' },
  { key: 'tipo_despesa_calc', label: 'Tipo de Despesa' },
  { key: 'mes_competencia_calc', label: 'Mês' },
  { key: 'fantasia_fornecedor', label: 'Fornecedor' },
  { key: 'numero_oc', label: 'OC' },
  { key: 'codigo_item', label: 'Item' },
];

type Step = { nivel: Nivel; chave: string; label: string };

interface Props {
  dados: any[];
}

export function PainelDrillView({ dados }: Props) {
  const [stack, setStack] = useState<Step[]>([]);

  const filtrados = useMemo(() => {
    return dados.filter((d) =>
      stack.every((s) => String(d[s.nivel] ?? '') === s.chave)
    );
  }, [dados, stack]);

  const nivelAtualIdx = stack.length;
  const nivelAtual = NIVEIS[nivelAtualIdx];

  const grupos = useMemo(() => {
    if (!nivelAtual) return [];
    const map = new Map<string, { label: string; comprado: number; pendente: number; ocs: Set<any>; itens: number }>();
    filtrados.forEach((d) => {
      const chave = String(d[nivelAtual.key] ?? '—');
      const cur = map.get(chave) || { label: chave, comprado: 0, pendente: 0, ocs: new Set(), itens: 0 };
      cur.comprado += d.valor_liquido || 0;
      cur.pendente += (d.saldo_pendente || 0) * (d.preco_unitario || 0);
      if (d.numero_oc != null) cur.ocs.add(d.numero_oc);
      cur.itens += 1;
      map.set(chave, cur);
    });
    return [...map.entries()]
      .map(([chave, v]) => ({ chave, label: v.label, comprado: v.comprado, pendente: v.pendente, qtdOcs: v.ocs.size, qtdItens: v.itens }))
      .sort((a, b) => b.comprado - a.comprado);
  }, [filtrados, nivelAtual]);

  const totals = useMemo(() => ({
    comprado: grupos.reduce((s, g) => s + g.comprado, 0),
    pendente: grupos.reduce((s, g) => s + g.pendente, 0),
    qtdItens: grupos.reduce((s, g) => s + g.qtdItens, 0),
  }), [grupos]);

  const drillIn = (g: { chave: string; label: string }) => {
    if (!nivelAtual) return;
    setStack((s) => [...s, { nivel: nivelAtual.key, chave: g.chave, label: g.label }]);
  };

  const goTo = (idx: number) => setStack((s) => s.slice(0, idx));

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card p-2">
        <button
          type="button"
          onClick={() => goTo(0)}
          className="rounded px-2 py-1 text-xs font-medium hover:bg-accent"
        >
          Início
        </button>
        {stack.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <button
              type="button"
              onClick={() => goTo(i + 1)}
              className="rounded px-2 py-1 text-xs hover:bg-accent"
              title={`${NIVEIS.find((n) => n.key === s.nivel)?.label}: ${s.label}`}
            >
              <span className="text-muted-foreground">{NIVEIS.find((n) => n.key === s.nivel)?.label}:</span>{' '}
              <span className="font-medium">{s.label}</span>
            </button>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setStack((s) => s.slice(0, -1))} disabled={stack.length === 0}>
            <ArrowLeft className="mr-1 h-3 w-3" /> Voltar nível
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setStack([])} disabled={stack.length === 0}>
            <X className="mr-1 h-3 w-3" /> Limpar drill
          </Button>
        </div>
      </div>

      {/* Header do nível atual */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <div>
          Agrupando por: <span className="font-semibold text-foreground">{nivelAtual?.label ?? 'Detalhe'}</span>
          {' · '}
          {grupos.length} {grupos.length === 1 ? 'grupo' : 'grupos'}
          {' · '}
          {filtrados.length} linhas
        </div>
        <div>
          Total comprado: <span className="font-semibold text-foreground">{formatCurrency(totals.comprado)}</span>
          {' · '}
          Pendente: <span className="font-semibold text-foreground">{formatCurrency(totals.pendente)}</span>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">{nivelAtual?.label ?? 'Detalhe'}</th>
              <th className="px-3 py-2 text-right">Valor Comprado</th>
              <th className="px-3 py-2 text-right">Valor Pendente</th>
              <th className="px-3 py-2 text-right">Qtd OCs</th>
              <th className="px-3 py-2 text-right">Qtd Itens</th>
              <th className="px-3 py-2 text-center w-10"></th>
            </tr>
          </thead>
          <tbody>
            {grupos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Nenhum dado para os filtros aplicados.</td>
              </tr>
            )}
            {grupos.map((g) => {
              const podeDrill = nivelAtualIdx < NIVEIS.length - 1;
              return (
                <tr
                  key={g.chave}
                  className={`border-t ${podeDrill ? 'cursor-pointer hover:bg-accent/40' : ''}`}
                  onClick={() => podeDrill && drillIn(g)}
                >
                  <td className="px-3 py-2 font-medium">{g.label || '—'}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(g.comprado)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(g.pendente)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(g.qtdOcs, 0)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(g.qtdItens, 0)}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">
                    {podeDrill ? <ChevronDown className="inline h-3 w-3 -rotate-90" /> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
