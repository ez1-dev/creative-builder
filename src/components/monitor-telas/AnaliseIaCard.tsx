import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Lightbulb, RefreshCw, Sparkles, Stethoscope } from 'lucide-react';
import { formatDateTimeBR } from '@/lib/format';
import { gerarAnaliseMonitorTelas, type AnaliseIaResultado } from '@/lib/monitorTelasIaApi';
import type {
  TelemetriaOrigem, TelemetriaResumo, TelemetriaRankingRow,
  TelemetriaPorDiaRow, TelemetriaNaoUtilizadaRow,
} from '@/lib/navegacaoTelemetriaApi';

interface Props {
  origem: TelemetriaOrigem;
  filtros: { dias: number; modulo: string; usuario_filtro: string };
  resumo: TelemetriaResumo | null;
  porDia: TelemetriaPorDiaRow[];
  ranking: TelemetriaRankingRow[];
  naoUtilizadas: TelemetriaNaoUtilizadaRow[];
  disabled?: boolean;
}

export function AnaliseIaCard({ origem, filtros, resumo, porDia, ranking, naoUtilizadas, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnaliseIaResultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  const semDados =
    (resumo?.total_acessos ?? 0) === 0 &&
    ranking.length === 0 &&
    porDia.length === 0 &&
    naoUtilizadas.length === 0;

  const gerar = async () => {
    setLoading(true); setError(null);
    try {
      const r = await gerarAnaliseMonitorTelas({ origem, filtros, resumo, porDia, ranking, naoUtilizadas });
      setResult(r);
    } catch (e: any) {
      setError(e?.message ?? 'Falha ao gerar análise');
    } finally {
      setLoading(false);
    }
  };

  const bloqueado = disabled || semDados;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Análise IA</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {result?.gerado_em && (
            <span className="text-[11px] text-muted-foreground">
              Gerado em {formatDateTimeBR(result.gerado_em)}
            </span>
          )}
          <Button
            size="sm"
            variant={result ? 'outline' : 'default'}
            onClick={gerar}
            disabled={loading || bloqueado}
            title={bloqueado ? 'Sem dados no período' : undefined}
            className="gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {result ? 'Gerar novamente' : 'Analisar com IA'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!result && !loading && !error && (
          <p className="text-xs text-muted-foreground">
            Gera diagnóstico, riscos e recomendações de melhoria a partir dos dados carregados,
            usando como referência a documentação oficial do Senior (Central de Ajuda, TDN, Senior X Platform)
            {origem === 'nativo' ? ' e a regra nativa GER-000CONCX01.' : '.'}
          </p>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && (
          <div className="grid gap-3 md:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        )}

        {result && !loading && (
          <div className="grid gap-3 md:grid-cols-3">
            <Bloco icon={<Stethoscope className="h-4 w-4 text-blue-600" />} titulo="Diagnóstico" items={result.diagnostico} />
            <Bloco icon={<AlertTriangle className="h-4 w-4 text-orange-600" />} titulo="Riscos" items={result.riscos} />
            <Bloco icon={<Lightbulb className="h-4 w-4 text-emerald-600" />} titulo="Recomendações" items={result.recomendacoes} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Bloco({ icon, titulo, items }: { icon: React.ReactNode; titulo: string; items: string[] }) {
  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {titulo}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sem itens.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((s, i) => (
            <li key={i} className="text-xs leading-snug">• {s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
