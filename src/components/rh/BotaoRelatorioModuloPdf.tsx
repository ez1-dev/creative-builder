import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ModuloPdf, type ModuloRh, type Insights } from "./pdf/ModuloPdf";

type DadosProp =
  | React.ComponentProps<typeof ModuloPdf>["dados"];

interface Props {
  modulo: ModuloRh;
  titulo: string;
  dados: DadosProp | null | undefined;
  filtros?: { anomes_ini?: string; anomes_fim?: string; codemp?: number | string; outros?: Record<string, string> };
  /** payload enviado à edge function rh-ai-insights */
  iaPayload: Record<string, unknown>;
  /** Callback opcional para buscar dados do período anterior (folha/turnover/absenteísmo). */
  carregarAnterior?: () => Promise<any>;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary";
  label?: string;
}

function makeFilename(modulo: ModuloRh, filtros?: Props["filtros"]) {
  const base = `rh_${modulo.replace(/-/g, "_")}`;
  if (filtros?.anomes_ini && filtros?.anomes_fim) {
    return `${base}_${filtros.anomes_ini}_${filtros.anomes_fim}.pdf`;
  }
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${base}_${stamp}.pdf`;
}

export function BotaoRelatorioModuloPdf({
  modulo,
  titulo,
  dados,
  filtros,
  iaPayload,
  carregarAnterior,
  disabled,
  size = "sm",
  variant = "outline",
  label = "Relatório PDF (IA)",
}: Props) {
  const [loading, setLoading] = useState(false);

  async function gerar() {
    if (!dados) {
      toast.error("Aguarde os dados carregarem antes de gerar o PDF.");
      return;
    }
    setLoading(true);
    try {
      // Busca IA e período anterior em paralelo
      const [iaResp, anteriorResp] = await Promise.allSettled([
        supabase.functions.invoke("rh-ai-insights", { body: { modulo, payload: iaPayload } }),
        carregarAnterior ? carregarAnterior() : Promise.resolve(null),
      ]);

      let ia: Insights | null = null;
      if (iaResp.status === "fulfilled") {
        const { data, error } = iaResp.value as any;
        if (error) {
          console.warn("[RelatorioPdf] IA erro:", error);
          toast.warning("PDF será gerado sem análise IA (falha no gateway).");
        } else if ((data as any)?.error) {
          console.warn("[RelatorioPdf] IA erro:", (data as any).error);
          toast.warning((data as any).error);
        } else {
          ia = data as Insights;
        }
      } else {
        console.warn("[RelatorioPdf] IA rejected:", iaResp.reason);
        toast.warning("PDF será gerado sem análise IA.");
      }

      // Injeta anterior no dados quando aplicável
      let dadosFinal = dados;
      if (anteriorResp.status === "fulfilled" && anteriorResp.value && "tipo" in dadosFinal) {
        const t = (dadosFinal as any).tipo as string;
        if (t === "resumo-folha" || t === "turnover" || t === "absenteismo") {
          dadosFinal = { ...(dadosFinal as any), anterior: anteriorResp.value };
        }
      }

      const blob = await pdf(
        <ModuloPdf modulo={modulo} titulo={titulo} filtros={filtros} dados={dadosFinal} ia={ia} />,
      ).toBlob();
      const filename = makeFilename(modulo, filtros);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Relatório PDF gerado!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Falha ao gerar PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={gerar} disabled={disabled || loading || !dados} size={size} variant={variant}>
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
      {label}
    </Button>
  );
}
