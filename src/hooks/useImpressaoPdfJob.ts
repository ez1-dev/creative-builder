import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  consultarPdfJob,
  criarPdfJob,
  urlDownloadPdfJob,
  type PdfJobEtapa,
  type PdfJobPayload,
  type PdfJobStatus,
} from "@/lib/producao/opImpressaoPdfJob";

type PdfJobDesenhosResumo = NonNullable<PdfJobStatus["desenhos_resumo"]>;
type PdfJobPastaDesenhos = NonNullable<PdfJobStatus["pasta_desenhos"]>;

export type PdfJobUiStatus = "IDLE" | "CRIANDO" | "PROCESSANDO" | "CONCLUIDO" | "ERRO";

export interface UseImpressaoPdfJob {
  status: PdfJobUiStatus;
  jobId: string | null;
  progresso: number | null;
  percentual: number | null;
  etapa: PdfJobEtapa | null;
  totalOps: number | null;
  processadas: number | null;
  mensagem: string | null;
  erro: string | null;
  downloadUrl: string | null;
  quantidadeOps: number | null;
  tamanhoBytes: number | null;
  temposPorEtapa: Record<string, number> | null;
  tempoEtapaAtual: number | null;
  tempoTotal: number | null;
  avisos: string[] | null;
  desenhosResumo: PdfJobDesenhosResumo | null;
  pastaDesenhos: PdfJobPastaDesenhos | null;
  iniciar: (payload: PdfJobPayload) => Promise<void>;
  cancelar: () => void;
  isBusy: boolean;
}

const POLL_MS = 3000;

export function useImpressaoPdfJob(): UseImpressaoPdfJob {
  const [status, setStatus] = useState<PdfJobUiStatus>("IDLE");
  const [jobId, setJobId] = useState<string | null>(null);
  const [info, setInfo] = useState<PdfJobStatus | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const stopPolling = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  const pollOnce = useCallback(
    async (id: string) => {
      try {
        const res = await consultarPdfJob(id);
        if (!mountedRef.current) return;
        setInfo(res);
        if (res.status === "CONCLUIDO") {
          stopPolling();
          setStatus("CONCLUIDO");
        } else if (res.status === "ERRO") {
          stopPolling();
          setErro(res.erro || res.mensagem || "Falha ao gerar PDF.");
          setStatus("ERRO");
          toast.error(res.erro || res.mensagem || "Falha ao gerar PDF.");
        } else {
          setStatus("PROCESSANDO");
        }
      } catch (e: any) {
        if (!mountedRef.current) return;
        stopPolling();
        const msg = e?.message || "Falha ao consultar status do PDF.";
        setErro(msg);
        setStatus("ERRO");
        toast.error(msg);
      }
    },
    [stopPolling],
  );

  const iniciar = useCallback(
    async (payload: PdfJobPayload) => {
      stopPolling();
      setErro(null);
      setInfo(null);
      setJobId(null);
      setStatus("CRIANDO");
      try {
        const res = await criarPdfJob(payload);
        if (!mountedRef.current) return;
        if (!res?.job_id) {
          throw new Error("Resposta inválida do backend (sem job_id).");
        }
        setJobId(res.job_id);
        setStatus("PROCESSANDO");
        await pollOnce(res.job_id);
        if (!mountedRef.current) return;
        if (timerRef.current === null) {
          timerRef.current = window.setInterval(() => {
            pollOnce(res.job_id);
          }, POLL_MS);
        }
      } catch (e: any) {
        if (!mountedRef.current) return;
        const msg = e?.message || "Falha ao iniciar geração do PDF.";
        setErro(msg);
        setStatus("ERRO");
        toast.error(msg);
      }
    },
    [pollOnce, stopPolling],
  );

  const cancelar = useCallback(() => {
    stopPolling();
    setStatus("IDLE");
    setJobId(null);
    setInfo(null);
    setErro(null);
  }, [stopPolling]);

  const downloadUrl = status === "CONCLUIDO" && jobId ? urlDownloadPdfJob(jobId) : null;

  const percentual = useMemo<number | null>(() => {
    if (!info) return null;
    if (typeof info.percentual === "number") {
      return Math.max(0, Math.min(100, Math.round(info.percentual)));
    }
    if (
      typeof info.processadas === "number" &&
      typeof info.total_ops === "number" &&
      info.total_ops > 0
    ) {
      return Math.max(0, Math.min(100, Math.round((info.processadas / info.total_ops) * 100)));
    }
    if (typeof info.progresso === "number") {
      return Math.max(0, Math.min(100, Math.round(info.progresso * 100)));
    }
    return null;
  }, [info]);

  return {
    status,
    jobId,
    progresso: info?.progresso ?? null,
    percentual,
    etapa: (info?.etapa as PdfJobEtapa | undefined) ?? null,
    totalOps: info?.total_ops ?? null,
    processadas: info?.processadas ?? null,
    mensagem: info?.mensagem ?? null,
    erro,
    downloadUrl,
    quantidadeOps: info?.quantidade_ops ?? info?.total_ops ?? null,
    tamanhoBytes: info?.tamanho_bytes ?? null,
    temposPorEtapa: info?.tempos_por_etapa ?? null,
    tempoEtapaAtual: info?.tempo_etapa_atual ?? null,
    tempoTotal: info?.tempo_total ?? null,
    iniciar,
    cancelar,
    isBusy: status === "CRIANDO" || status === "PROCESSANDO",
  };
}
