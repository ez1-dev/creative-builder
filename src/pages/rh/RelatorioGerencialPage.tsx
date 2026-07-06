import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { RhPageHeader } from "@/components/rh/RhPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileDown, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  coletarDadosConsolidados,
  gerarAnaliseIa,
  periodoAnterior,
  type DadosConsolidados,
  type RelatorioIa,
} from "@/lib/rh/relatorio";
import { RelatorioPdf } from "@/components/rh/pdf/RelatorioPdf";

function currentAnoMes(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function addMonthsStr(anomes: string, n: number): string {
  const y = parseInt(anomes.slice(0, 4), 10);
  const m = parseInt(anomes.slice(4, 6), 10);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12).toString().padStart(4, "0")}${((total % 12) + 1).toString().padStart(2, "0")}`;
}
const fmtAnoMes = (v: string) => (/^\d{6}$/.test(v) ? `${v.slice(4, 6)}/${v.slice(0, 4)}` : v);

export default function RelatorioGerencialPage() {
  const hoje = currentAnoMes();
  const inicioDefault = addMonthsStr(hoje, -5);
  const [anomesIni, setAnomesIni] = useState(inicioDefault);
  const [anomesFim, setAnomesFim] = useState(hoje);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<string>("");
  const [dados, setDados] = useState<DadosConsolidados | null>(null);
  const [ia, setIa] = useState<RelatorioIa | null>(null);
  const [iaError, setIaError] = useState<string | null>(null);

  const anterior = periodoAnterior(anomesIni, anomesFim);

  async function gerar() {
    if (!/^\d{6}$/.test(anomesIni) || !/^\d{6}$/.test(anomesFim)) {
      toast.error("Informe período no formato AAAAMM.");
      return;
    }
    if (anomesIni > anomesFim) {
      toast.error("Período inicial não pode ser maior que o final.");
      return;
    }
    setLoading(true);
    setDados(null);
    setIa(null);
    setIaError(null);
    try {
      setStep("Coletando dados dos 6 módulos de RH...");
      const d = await coletarDadosConsolidados(anomesIni, anomesFim, 1);
      setDados(d);

      setStep("Gerando análise IA (diagnóstico, riscos, recomendações, alertas)...");
      let analise: RelatorioIa | null = null;
      try {
        analise = await gerarAnaliseIa(d);
        setIa(analise);
      } catch (e: any) {
        console.error(e);
        setIaError(e?.message ?? "Falha ao gerar análise IA.");
        toast.warning("PDF será gerado sem análise IA (falha no gateway).");
      }

      setStep("Renderizando PDF...");
      const blob = await pdf(<RelatorioPdf dados={d} ia={analise} />).toBlob();
      const fn = `rh_relatorio_gerencial_${anomesIni}_${anomesFim}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fn;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Relatório gerado com sucesso!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Falha ao gerar relatório.");
    } finally {
      setLoading(false);
      setStep("");
    }
  }

  async function regenerarIa() {
    if (!dados) return;
    setLoading(true);
    setIaError(null);
    try {
      setStep("Regenerando análise IA...");
      const analise = await gerarAnaliseIa(dados);
      setIa(analise);
      toast.success("Análise IA atualizada. Gere o PDF novamente para incorporar.");
    } catch (e: any) {
      setIaError(e?.message ?? "Falha ao gerar análise IA.");
      toast.error(e?.message ?? "Falha ao gerar análise IA.");
    } finally {
      setLoading(false);
      setStep("");
    }
  }

  async function baixarPdf() {
    if (!dados) return;
    setLoading(true);
    try {
      const blob = await pdf(<RelatorioPdf dados={dados} ia={ia} />).toBlob();
      const fn = `rh_relatorio_gerencial_${anomesIni}_${anomesFim}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fn;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <RhPageHeader title="Relatório Gerencial de RH" subtitle="Consolidado dos 6 módulos com análise IA e alertas priorizados" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Configurar período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="ini">Período inicial (AAAAMM)</Label>
              <Input id="ini" value={anomesIni} onChange={(e) => setAnomesIni(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="202601" />
            </div>
            <div>
              <Label htmlFor="fim">Período final (AAAAMM)</Label>
              <Input id="fim" value={anomesFim} onChange={(e) => setAnomesFim(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="202606" />
            </div>
            <div className="flex items-end">
              <Button onClick={gerar} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                Gerar Relatório PDF
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Período atual: <strong>{fmtAnoMes(anomesIni)}</strong> a <strong>{fmtAnoMes(anomesFim)}</strong> · Comparativo automático: <strong>{fmtAnoMes(anterior.ini)}</strong> a <strong>{fmtAnoMes(anterior.fim)}</strong>
          </p>
          {loading && step && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {step}
            </div>
          )}
        </CardContent>
      </Card>

      {iaError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Análise IA indisponível</AlertTitle>
          <AlertDescription>{iaError}</AlertDescription>
        </Alert>
      )}

      {dados && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Prévia do relatório
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <StatMini label="Custo Folha" value={dados.resumo_folha.atual?.kpis?.custo_total ?? 0} money />
              <StatMini label="Headcount" value={dados.quadro.atual.total} />
              <StatMini label="Contratos Exp." value={dados.contratos_experiencia.atual?.kpis?.qtde_contratos ?? 0} />
              <StatMini label="Férias Vencidas" value={dados.ferias.atual?.kpis?.ferias_vencidas ?? 0} />
              <StatMini label="Turnover %" value={dados.turnover.atual?.kpis?.taxa_rotatividade_pct ?? 0} pct />
              <StatMini label="Absenteísmo %" value={dados.absenteismo.atual?.kpis?.taxa_absenteismo_pct ?? 0} pct />
            </div>

            {ia && (
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Sumário Executivo (IA)</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {ia.sumario_executivo.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2">Alertas Priorizados ({ia.alertas.length})</h4>
                  <div className="space-y-2">
                    {ia.alertas.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 border-l-2 pl-3 py-1" style={{ borderColor: a.severidade === "CRITICO" ? "hsl(var(--destructive))" : a.severidade === "ALTO" ? "hsl(35 90% 45%)" : "hsl(var(--primary))" }}>
                        <Badge variant={a.severidade === "CRITICO" ? "destructive" : "secondary"}>{a.severidade}</Badge>
                        <div className="text-sm">
                          <div className="font-medium">{a.titulo} <span className="text-muted-foreground font-normal">· {a.secao}</span></div>
                          <div className="text-xs text-muted-foreground">Impacto: {a.impacto}</div>
                          <div className="text-xs text-muted-foreground">Ação: {a.acao}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={regenerarIa} disabled={loading}>
                <Sparkles className="h-4 w-4 mr-2" />
                Regenerar análise IA
              </Button>
              <Button onClick={baixarPdf} disabled={loading}>
                <FileDown className="h-4 w-4 mr-2" />
                Baixar PDF novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatMini({ label, value, money, pct }: { label: string; value: number; money?: boolean; pct?: boolean }) {
  const fmt = money
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value)
    : pct
      ? `${value.toFixed(2)}%`
      : new Intl.NumberFormat("pt-BR").format(value);
  return (
    <div className="rounded border p-2 bg-muted/30">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="font-semibold text-primary">{fmt}</div>
    </div>
  );
}
