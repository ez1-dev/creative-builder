import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { SearchSuggestion } from '@/hooks/useUserSuggestions';

interface AnalyticalSuggestion {
  label: string;
  prompt: string;
}

interface Props {
  moduleKey: string | null;
  moduleLabel?: string;
  filterSuggestions: SearchSuggestion[];
  onPickFilter: (s: SearchSuggestion) => void;
  onPickPrompt: (prompt: string) => void;
}

const ANALYTICAL_BY_MODULE: Record<string, AnalyticalSuggestion[]> = {
  estoque: [
    { label: 'Top 10 maior saldo', prompt: 'Quais os 10 produtos com maior saldo em estoque hoje?' },
    { label: 'Itens sem giro', prompt: 'Quais produtos estão com saldo positivo mas sem movimentação recente?' },
  ],
  'painel-compras': [
    { label: 'OCs mais antigas em aberto', prompt: 'Quais as 10 ordens de compra mais antigas ainda em aberto?' },
    { label: 'Top fornecedores do mês', prompt: 'Quais os 5 fornecedores com maior volume de compras este mês?' },
  ],
  'compras-produto': [
    { label: 'Produtos mais comprados', prompt: 'Quais os 10 produtos mais comprados nos últimos 90 dias?' },
  ],
  'contas-pagar': [
    { label: 'Maior título em aberto', prompt: 'Quais os 10 títulos a pagar com maior valor em aberto?' },
    { label: 'Vencendo nos próximos 7 dias', prompt: 'Quais títulos a pagar vencem nos próximos 7 dias?' },
  ],
  'contas-receber': [
    { label: 'Maiores recebíveis em aberto', prompt: 'Quais os 10 maiores títulos a receber em aberto?' },
  ],
  'notas-recebimento': [
    { label: 'NFs recentes', prompt: 'Quais as 10 últimas notas fiscais de entrada recebidas?' },
  ],
  'engenharia-producao': [
    { label: 'OPs com horas acima do previsto', prompt: 'Quais ordens de produção têm horas apontadas acima do previsto?' },
  ],
};

export function AiProactiveBanner({
  moduleKey,
  moduleLabel,
  filterSuggestions,
  onPickFilter,
  onPickPrompt,
}: Props) {
  const analytics = (moduleKey && ANALYTICAL_BY_MODULE[moduleKey]) || [];
  if (filterSuggestions.length === 0 && analytics.length === 0) return null;

  return (
    <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Olá! Posso ajudar{moduleLabel ? ` em ${moduleLabel}` : ''}:
      </div>

      {filterSuggestions.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Filtros que você costuma usar
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filterSuggestions.map((s, i) => (
              <button
                key={`f-${i}`}
                type="button"
                onClick={() => onPickFilter(s)}
                title={`Aplicado ${s.count}x recentemente`}
              >
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition text-[11px] font-normal"
                >
                  {s.label}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {analytics.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Perguntas rápidas
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analytics.map((a, i) => (
              <button key={`a-${i}`} type="button" onClick={() => onPickPrompt(a.prompt)}>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-accent transition text-[11px] font-normal"
                >
                  {a.label}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
