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
  const fallback = (): OpDesenhoPaginaA4[] => [
    {
      pagina: 1,
      url: desenho.url_impressao || desenho.url || '',
      mime_type: desenho.mime_type || 'application/pdf',
      nome_arquivo: desenho.nome_arquivo,
    },
  ];

  if (!manifestUrl) return fallback();

  try {
    const response = await fetchComToken(manifestUrl);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.warn(
        '[OP A4] Falha ao carregar manifest de',
        desenho.nome_arquivo,
        `HTTP ${response.status}`,
        text,
        '— usando fallback',
      );
      return fallback();
    }
    const manifest = await response.json();
    const paginas: any[] = manifest?.paginas ?? [];
    if (!paginas.length) {
      console.warn(
        '[OP A4] Manifest sem páginas para',
        desenho.nome_arquivo,
        '— usando fallback',
      );
      return fallback();
    }
    return paginas.map((p) => ({
      pagina: p.pagina,
      url: p.url,
      mime_type: p.mime_type || 'image/jpeg',
      nome_arquivo: desenho.nome_arquivo,
    }));
  } catch (err) {
    console.warn(
      '[OP A4] Erro ao carregar manifest de',
      desenho.nome_arquivo,
      err,
      '— usando fallback',
    );
    return fallback();
  }
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
    let paginas: OpDesenhoPaginaA4[] = [];
    try {
      paginas = await carregarManifestDesenhoA4(desenho);
    } catch (e: any) {
      console.error('[OP A4] Falha ao preparar desenho', desenho?.nome_arquivo, e);
      errors.push({ desenho, message: e?.message ?? 'Falha ao carregar manifest' });
      continue;
    }
    for (const pagina of paginas) {
      if (!pagina.url) {
        console.error('[OP A4] Página sem URL para', desenho?.nome_arquivo, pagina);
        errors.push({ desenho, message: 'Página sem URL' });
        continue;
      }
      try {
        const loaded = await carregarPaginaDesenhoA4(pagina, desenho);
        paginasFinais.push({
          ...pagina,
          mime_type: loaded.mime_type ?? pagina.mime_type,
          blobUrl: loaded.blobUrl,
          desenho,
        });
      } catch (e: any) {
        console.error(
          '[OP A4] Falha ao carregar página',
          pagina.pagina,
          'do desenho',
          desenho?.nome_arquivo,
          e,
        );
        errors.push({ desenho, message: e?.message ?? 'Falha ao baixar página' });
      }
    }
  }

  return { paginas: paginasFinais, errors };
}

