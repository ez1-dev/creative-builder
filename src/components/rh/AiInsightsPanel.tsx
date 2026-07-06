import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, Lightbulb, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type RhAiModulo =
  | "resumo-folha"
  | "quadro-colaboradores"
  | "contratos-experiencia"
  | "ferias"
  | "turnover";

interface Insights {
  diagnostico: string[];
  riscos: string[];
  recomendacoes: string[];
  gerado_em?: string;
}

interface Props {
  modulo: RhAiModulo;
  payload: unknown;
  ready?: boolean;
  className?: string;
}

// Cache em memória (sessão) por hash do payload
const memCache = new Map<string, Insights>();

function hashKey(modulo: string, payload: unknown): string {
  try {
    return `${modulo}:${JSON.stringify(payload)}`;
  } catch {
    return `${modulo}:__`;
  }
}

export function AiInsightsPanel({ modulo, payload, ready = true, className }: Props) {
  const key = useMemo(() => hashKey(modulo, payload), [modulo, payload]);
  const [data, setData] = useState<Insights | null>(() => memCache.get(key) ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  async function run(force = false) {
    if (!force && memCache.has(key)) {
      setData(memCache.get(key)!);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: resp, error: fnErr } = await supabase.functions.invoke("rh-ai-insights", {
        body: { modulo, payload },
      });
      if (fnErr) throw fnErr;
      if ((resp as any)?.error) throw new Error((resp as any).error);
      const parsed = resp as Insights;
      memCache.set(key, parsed);
      setData(parsed);
    } catch (e: any) {
      setError(e?.message || "Falha ao gerar análise da IA.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready) return;
    if (memCache.has(key)) {
      setData(memCache.get(key)!);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      run(false);
    }, 400);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  const geradoEm = data?.gerado_em
    ? new Date(data.gerado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : null;

  return (
    <Card className={cn("mt-4 border-primary/20", className)}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1.5 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base">Análise da IA</CardTitle>
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Analisando dados do quadro..."
                : geradoEm
                ? `Gerada em ${geradoEm}`
                : "Aguardando dados..."}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => run(true)}
          disabled={loading || !ready}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1.5" />
          )}
          Regenerar
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InsightCard
              title="Diagnóstico"
              icon={<Activity className="h-4 w-4" />}
              tone="primary"
              items={data?.diagnostico}
              loading={loading && !data}
            />
            <InsightCard
              title="Riscos"
              icon={<AlertTriangle className="h-4 w-4" />}
              tone="warning"
              items={data?.riscos}
              loading={loading && !data}
            />
            <InsightCard
              title="Recomendações"
              icon={<Lightbulb className="h-4 w-4" />}
              tone="success"
              items={data?.recomendacoes}
              loading={loading && !data}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightCard({
  title,
  icon,
  tone,
  items,
  loading,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "primary" | "warning" | "success";
  items?: string[];
  loading?: boolean;
}) {
  const toneCls =
    tone === "warning"
      ? "border-l-[hsl(var(--warning))] bg-[hsl(var(--warning))]/5 text-[hsl(var(--warning))]"
      : tone === "success"
      ? "border-l-[hsl(var(--success))] bg-[hsl(var(--success))]/5 text-[hsl(var(--success))]"
      : "border-l-primary bg-primary/5 text-primary";
  return (
    <div className={cn("rounded-md border border-border border-l-4 p-3", toneCls.split(" ")[0], toneCls.split(" ")[1])}>
      <div className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide mb-2", toneCls.split(" ")[2])}>
        {icon}
        {title}
      </div>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>
      ) : items && items.length > 0 ? (
        <ul className="space-y-1.5 text-sm text-foreground">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2 leading-snug">
              <span className="text-muted-foreground">•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Sem observações.</p>
      )}
    </div>
  );
}
