export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://api-erp-renato.ngrok.app";

export const CODEMP = 1;
export const CODFIL = 1;

// IDs dos modelos oficiais usados na conciliação DRE × Balanço Senior.
export const MODELO_DRE_OFICIAL_ID = "5c02760f-d85a-4808-a1a4-7eb071b02f5d";
export const MODELO_BALANCO_OFICIAL_ID = "e1140124-f9db-464f-abfc-d73622ee3eb7";

