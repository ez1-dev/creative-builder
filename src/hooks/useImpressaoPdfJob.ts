import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  consultarPdfJob,
  criarPdfJob,
  urlDownloadPdfJob,
  type PdfJobPayload,
  type PdfJobStatus,
} from "@/lib/producao/opImpressaoPdfJob";

export type PdfJobUiStatus = "IDLE" | "CRIANDO" | "PROCESSANDO" | "CONCLUIDO" | "ERRO";

export interface UseImpressaoPdfJob {
  status: PdfJobUiStatus;
  jobId: string | null;
  progresso: number | null;
  mensagem: string | null;
  erro: string | null;
  downloadUrl: string | null;
  quantidadeOps: number | null;
  tamanhoBytes: number | null;
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
        // Primeira consulta imediata
        await pollOnce(res.job_id);
        if (!mountedRef.current) return;
        // Inicia polling apenas se ainda está em andamento
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

  return {
    status,
    jobId,
    progresso: info?.progresso ?? null,
    mensagem: info?.mensagem ?? null,
    erro,
    downloadUrl,
    quantidadeOps: info?.quantidade_ops ?? null,
    tamanhoBytes: info?.tamanho_bytes ?? null,
    iniciar,
    cancelar,
    isBusy: status === "CRIANDO" || status === "PROCESSANDO",
  };
}
