import { api } from "@/lib/api";

export interface PdfJobOpRef {
  codemp: number;
  codori: string;
  numorp: number;
}

export interface PdfJobPayload {
  ops: PdfJobOpRef[];
  incluir_desenhos: boolean;
  incluir_componentes: boolean;
  incluir_operacoes: boolean;
}

export interface PdfJobCreateResponse {
  job_id: string;
}

export type PdfJobStatusValue = "PENDENTE" | "PROCESSANDO" | "CONCLUIDO" | "ERRO";

export interface PdfJobStatus {
  job_id: string;
  status: PdfJobStatusValue;
  progresso?: number | null;
  mensagem?: string | null;
  erro?: string | null;
  quantidade_ops?: number | null;
  tamanho_bytes?: number | null;
}

const BASE = "/api/producao/ordem-producao/impressao/pdf-job";

export function criarPdfJob(payload: PdfJobPayload): Promise<PdfJobCreateResponse> {
  return api.post<PdfJobCreateResponse>(BASE, payload as unknown as Record<string, any>);
}

export function consultarPdfJob(jobId: string): Promise<PdfJobStatus> {
  return api.get<PdfJobStatus>(`${BASE}/${encodeURIComponent(jobId)}/status`);
}

export function urlDownloadPdfJob(jobId: string): string {
  return api.getExportUrl(`${BASE}/${encodeURIComponent(jobId)}/download`);
}
