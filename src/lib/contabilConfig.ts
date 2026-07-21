export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://api-erp-renato.ngrok.app";

export const CODEMP = 1;
export const CODFIL = 1;

// Os modelos oficiais (DRE Padrão e Balanço Padrão) são resolvidos exclusivamente pelo endpoint
// `GET /api/contabil/configuracao` — ver `useContabilConfiguracao`. Não manter UUIDs fixos aqui.
