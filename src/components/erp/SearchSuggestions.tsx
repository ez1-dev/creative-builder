import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { SearchSuggestion } from '@/hooks/useUserSuggestions';

interface Props {
  suggestions: SearchSuggestion[];
  onPick: (s: SearchSuggestion) => void;
}

export function SearchSuggestions({ suggestions, onPick }: Props) {
  if (!suggestions.length) return null;
  return (
    <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Sugestões para você
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(s)}
            className="text-left"
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
      <p className="text-[10px] text-muted-foreground">
        Baseado nas suas pesquisas recentes nesta tela.
      </p>
    </div>
  );
}
