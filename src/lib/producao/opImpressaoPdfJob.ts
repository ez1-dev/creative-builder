import { api } from "@/lib/api";

export interface PdfJobOpRef {
  codemp: number;
  codori: string;
  numorp: number;
}

export type PdfJobQualidade = "rapida" | "normal" | "alta";

export type PdfJobModoPdfDesenho = "vetor" | "raster";

/** Mapeamento canônico de qualidade → DPI usado para impressão A4. */
export const QUALIDADE_DPI: Record<PdfJobQualidade, number> = {
  rapida: 120,
  normal: 150,
  alta: 200,
};

export interface PdfJobPayload {
  ops: PdfJobOpRef[];
  incluir_desenhos: boolean;
  incluir_componentes: boolean;
  incluir_operacoes: boolean;
  /** "rapida" = 120 DPI | "normal" (default) = 150 DPI | "alta" = 200 DPI */
  qualidade_desenhos?: PdfJobQualidade;
  /** Alias aceito para `qualidade_desenhos`. */
  qualidade?: PdfJobQualidade;
  /** DPI explícito; quando enviado, prevalece sobre qualidade_desenhos no backend. */
  dpi?: number;
  /** "vetor" (default) preserva PDFs técnicos como vetor; "raster" rasteriza via cache. */
  modo_pdf_desenho?: PdfJobModoPdfDesenho;
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
  | "GRAVANDO_ARQUIVO"
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
  /** Duração em segundos por etapa já concluída. */
  tempos_por_etapa?: Record<string, number> | null;
  /** Segundos decorridos na etapa em andamento. */
  tempo_etapa_atual?: number | null;
  /** Segundos desde o início do job. */
  tempo_total?: number | null;
  modo_pdf_desenho?: PdfJobModoPdfDesenho | null;
}

const BASE = "/api/producao/ordem-producao/impressao/pdf-job";

export function criarPdfJob(payload: PdfJobPayload): Promise<PdfJobCreateResponse> {
  const qualidade = payload.qualidade_desenhos ?? payload.qualidade ?? "normal";
  const body: PdfJobPayload = {
    ...payload,
    qualidade,
    qualidade_desenhos: qualidade,
    dpi: payload.dpi ?? QUALIDADE_DPI[qualidade],
    modo_pdf_desenho: payload.modo_pdf_desenho ?? "vetor",
  };
  return api.post<PdfJobCreateResponse>(BASE, body as unknown as Record<string, any>);
}

export function consultarPdfJob(jobId: string): Promise<PdfJobStatus> {
  return api.get<PdfJobStatus>(`${BASE}/${encodeURIComponent(jobId)}/status`);
}

export function urlDownloadPdfJob(jobId: string): string {
  return api.getExportUrl(`${BASE}/${encodeURIComponent(jobId)}/download`);
}
