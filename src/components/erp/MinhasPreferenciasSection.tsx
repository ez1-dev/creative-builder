import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2, Sparkles, History, Star, Bot, RotateCcw } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserSuggestions';
import { useAiAssistantPrefs } from '@/hooks/useAiAssistantPrefs';
import { toast } from 'sonner';

const MODULE_LABELS: Record<string, string> = {
  estoque: 'Consulta de Estoque',
  'painel-compras': 'Painel de Compras',
  'onde-usa': 'Onde Usa',
  'compras-produto': 'Compras / Custos do Produto',
  'engenharia-producao': 'Engenharia x Produção',
  'contas-pagar': 'Contas a Pagar',
  'contas-receber': 'Contas a Receber',
  'notas-recebimento': 'NF Recebimento',
  'auditoria-tributaria': 'Auditoria Tributária',
  'sugestao-min-max': 'Sugestão Min/Max',
  'estoque-min-max': 'Estoque Min/Max',
};

function summarize(filters: Record<string, any>) {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(filters || {})) {
    if (v === null || v === undefined || v === '') continue;
    parts.push(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
  }
  return parts.join(' • ') || '(sem filtros)';
}

export function MinhasPreferenciasSection() {
  const { data, loading, clearHistory } = useUserPreferences();
  const { prefs, setAutoOpenEnabled, resetPanelPositions } = useAiAssistantPrefs();
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    setClearing(true);
    try {
      await clearHistory();
      toast.success('Histórico limpo. O assistente vai começar a aprender do zero.');
    } catch {
      toast.error('Não foi possível limpar o histórico.');
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Carregando preferências...
        </CardContent>
      </Card>
    );
  }

  const hasFavorites = data && data.favoriteModules.length > 0;
  const hasFilters =
    data && Object.keys(data.frequentFilters || {}).length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Como o assistente está aprendendo com você
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            O assistente memoriza apenas <strong>suas próprias pesquisas</strong> nos últimos 30 dias para
            sugerir filtros frequentes e responder coisas como "qual filtro usei ontem?". Esses dados são
            privados — nenhum outro usuário (nem administradores) vê suas pesquisas individuais.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-primary" />
              Módulos favoritos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasFavorites ? (
              <p className="text-sm text-muted-foreground">
                Ainda não há histórico suficiente. Use o sistema normalmente e essa lista será preenchida
                automaticamente.
              </p>
            ) : (
              <ul className="space-y-2">
                {data!.favoriteModules.map((m) => (
                  <li
                    key={m.module}
                    className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
                  >
                    <span>{MODULE_LABELS[m.module] || m.module}</span>
                    <Badge variant="secondary">{m.count} buscas</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-primary" />
              Filtros frequentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasFilters ? (
              <p className="text-sm text-muted-foreground">
                Realize algumas pesquisas para que o assistente identifique padrões.
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(data!.frequentFilters)
                  .slice(0, 5)
                  .map(([mod, list]) => (
                    <div key={mod}>
                      <div className="text-xs font-medium mb-1">
                        {MODULE_LABELS[mod] || mod}
                      </div>
                      <ul className="space-y-1">
                        {list.slice(0, 3).map((f, i) => (
                          <li
                            key={i}
                            className="text-[11px] text-muted-foreground border rounded px-2 py-1 flex items-center justify-between gap-2"
                          >
                            <span className="truncate">{summarize(f.filters)}</span>
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              {f.count}x
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privacidade</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Você pode apagar todo o histórico aprendido a qualquer momento.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={clearing}>
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar meu histórico
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Limpar histórico de pesquisas?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todas as suas buscas memorizadas e preferências aprendidas serão apagadas. Esta ação
                  não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear}>Limpar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
