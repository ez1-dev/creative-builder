import { api } from "@/lib/api";

export interface PdfJobOpRef {
  codemp: number;
  codori: string;
  numorp: number;
}

export type PdfJobQualidade = "normal" | "alta";

export interface PdfJobPayload {
  ops: PdfJobOpRef[];
  incluir_desenhos: boolean;
  incluir_componentes: boolean;
  incluir_operacoes: boolean;
  /** "alta" = 200 DPI (default no backend) | "normal" = 150 DPI */
  qualidade_desenhos?: PdfJobQualidade;
}

export interface PdfJobCreateResponse {
  job_id: string;
}

export type PdfJobStatusValue = "PENDENTE" | "PROCESSANDO" | "CONCLUIDO" | "ERRO";

export type PdfJobEtapa =
  | "BUSCANDO_OPS"
  | "BUSCANDO_COMPONENTES"
  | "BUSCANDO_OPERACOES"
  | "LOCALIZANDO_DESENHOS"
  | "NORMALIZANDO_DESENHOS"
  | "MONTANDO_PDF"
  | "CONCLUIDO";

export interface PdfJobStatus {
  job_id: string;
  status: PdfJobStatusValue;
  /** 0..1 — formato legado, opcional. */
  progresso?: number | null;
  /** 0..100 — preferido quando disponível. */
  percentual?: number | null;
  etapa?: PdfJobEtapa | null;
  total_ops?: number | null;
  processadas?: number | null;
  mensagem?: string | null;
  erro?: string | null;
  tamanho_bytes?: number | null;
  quantidade_ops?: number | null;
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
