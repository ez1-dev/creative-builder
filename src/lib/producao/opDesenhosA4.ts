import { api, getApiUrl } from '@/lib/api';
import type { OpDesenho } from './opImpressao';

export interface OpDesenhoPaginaA4 {
  pagina: number;
  url: string;
  mime_type?: string;
  nome_arquivo?: string;
}

export interface OpDesenhoPaginaA4Carregada extends OpDesenhoPaginaA4 {
  blobUrl: string;
  desenho: OpDesenho;
}

export interface OpDesenhoErro {
  desenho: OpDesenho;
  message: string;
}

export interface PreparoDesenhosResult {
  paginas: OpDesenhoPaginaA4Carregada[];
  errors: OpDesenhoErro[];
}

const desenhoBlobCache = new Map<string, { blobUrl: string; mime_type?: string }>();

export function fetchComToken(url: string): Promise<Response> {
  const headers: Record<string, string> = { 'ngrok-skip-browser-warning': 'true' };
  const token = api.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const finalUrl = /^https?:\/\//i.test(url)
    ? url
    : `${getApiUrl()}${url.startsWith('/') ? '' : '/'}${url}`;
  return fetch(finalUrl, { headers, cache: 'no-store' });
}

export async function carregarManifestDesenhoA4(
  desenho: OpDesenho,
): Promise<OpDesenhoPaginaA4[]> {
  const manifestUrl = (desenho as any).url_manifest_a4 as string | undefined;
  if (manifestUrl) {
    const response = await fetchComToken(manifestUrl);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Erro ao carregar manifest do desenho: ${response.status} - ${text}`);
    }
    const manifest = await response.json();
    const paginas: any[] = manifest?.paginas ?? [];
    return paginas.map((p) => ({
      pagina: p.pagina,
      url: p.url,
      mime_type: p.mime_type || 'image/jpeg',
      nome_arquivo: desenho.nome_arquivo,
    }));
  }
  return [
    {
      pagina: 1,
      url: desenho.url_impressao || desenho.url || '',
      mime_type: 'image/jpeg',
      nome_arquivo: desenho.nome_arquivo,
    },
  ];
}

function chaveCache(desenho: OpDesenho, pagina: OpDesenhoPaginaA4): string {
  const id = (desenho as any).cache_key ?? desenho.nome_arquivo ?? '';
  return `${id}::${pagina.pagina}::${pagina.url}`;
}

export async function carregarPaginaDesenhoA4(
  pagina: OpDesenhoPaginaA4,
  desenho: OpDesenho,
): Promise<{ blobUrl: string; mime_type?: string }> {
  const chave = chaveCache(desenho, pagina);
  const cached = desenhoBlobCache.get(chave);
  if (cached) return cached;

  const response = await fetchComToken(pagina.url);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Erro ao carregar página A4 do desenho: ${response.status} - ${text}`,
    );
  }
  const blob = await response.blob();
  const item = {
    blobUrl: URL.createObjectURL(blob),
    mime_type: pagina.mime_type || blob.type,
  };
  desenhoBlobCache.set(chave, item);
  return item;
}

export async function prepararDesenhosParaImpressao(
  desenhos: OpDesenho[],
): Promise<PreparoDesenhosResult> {
  const paginasFinais: OpDesenhoPaginaA4Carregada[] = [];
  const errors: OpDesenhoErro[] = [];

  for (const desenho of desenhos || []) {
    try {
      const paginas = await carregarManifestDesenhoA4(desenho);
      for (const pagina of paginas) {
        if (!pagina.url) continue;
        try {
          const loaded = await carregarPaginaDesenhoA4(pagina, desenho);
          paginasFinais.push({
            ...pagina,
            mime_type: loaded.mime_type ?? pagina.mime_type,
            blobUrl: loaded.blobUrl,
            desenho,
          });
        } catch (e: any) {
          errors.push({ desenho, message: e?.message ?? 'Falha ao baixar página' });
        }
      }
    } catch (e: any) {
      errors.push({ desenho, message: e?.message ?? 'Falha ao carregar manifest' });
    }
  }

  return { paginas: paginasFinais, errors };
}
