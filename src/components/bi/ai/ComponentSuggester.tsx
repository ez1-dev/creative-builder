import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Copy, Check, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Recommendation {
  component: string;
  reason: string;
  section: string;
}
interface Suggestion {
  analysis: string;
  recommendations: Recommendation[];
  skeletonJsx: string;
}

export function ComponentSuggester({ onJumpToSection }: { onJumpToSection?: (section: string) => void }) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Suggestion | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const submit = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('biblioteca-bi-suggest', {
        body: { description },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as Suggestion);
    } catch (e: any) {
      toast({ title: 'Erro ao gerar sugestões', description: e?.message ?? 'Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const copyJsx = () => {
    if (!result?.skeletonJsx) return;
    navigator.clipboard.writeText(result.skeletonJsx);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          Assistente de Composição — IA sugere componentes para seu módulo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={3}
          placeholder="Ex: dashboard de RH com headcount por filial, turnover mensal e absenteísmo por departamento. Quero ver mapa do Brasil e ranking de filiais."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="text-xs"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={loading || !description.trim()}>
            {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
            Analisar e sugerir
          </Button>
        </div>

        {result && (
          <div className="space-y-3 border-t pt-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Análise</div>
              <p className="text-xs">{result.analysis}</p>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Componentes recomendados ({result.recommendations.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {result.recommendations.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onJumpToSection?.(r.section)}
                    className="text-left rounded-md border bg-card p-2 hover:border-primary transition group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-[11px] font-semibold text-primary">{r.component}</code>
                      <Badge variant="outline" className="text-[9px]">{r.section}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">{r.reason}</p>
                    <div className="flex items-center gap-1 text-[10px] text-primary mt-1 opacity-0 group-hover:opacity-100 transition">
                      Ver exemplo <ArrowRight className="h-2.5 w-2.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {result.skeletonJsx && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Esqueleto JSX</div>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={copyJsx}>
                    {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </Button>
                </div>
                <pre className="text-[10px] bg-muted/50 border rounded-md p-2 overflow-x-auto max-h-64">
                  <code>{result.skeletonJsx}</code>
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
