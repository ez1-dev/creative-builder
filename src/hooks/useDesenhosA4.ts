import { useEffect, useState } from 'react';
import type { OpDesenho } from '@/lib/producao/opImpressao';
import {
  prepararDesenhosParaImpressao,
  type OpDesenhoPaginaA4Carregada,
  type OpDesenhoErro,
} from '@/lib/producao/opDesenhosA4';

export interface UseDesenhosA4Result {
  paginas: OpDesenhoPaginaA4Carregada[];
  errors: OpDesenhoErro[];
  loading: boolean;
}

export function useDesenhosA4(desenhos: OpDesenho[] | undefined): UseDesenhosA4Result {
  const key = JSON.stringify(
    (desenhos ?? []).map((d) => [
      (d as any).cache_key ?? d.nome_arquivo,
      (d as any).url_manifest_a4,
      d.url_impressao,
      d.url,
    ]),
  );
  const [state, setState] = useState<UseDesenhosA4Result>({
    paginas: [],
    errors: [],
    loading: false,
  });

  useEffect(() => {
    const lista = desenhos ?? [];
    if (lista.length === 0) {
      setState({ paginas: [], errors: [], loading: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    prepararDesenhosParaImpressao(lista)
      .then((r) => {
        if (cancelled) return;
        setState({ paginas: r.paginas, errors: r.errors, loading: false });
      })
      .catch((e) => {
        if (cancelled) return;
        setState({
          paginas: [],
          errors: [{ desenho: lista[0], message: e?.message ?? 'Falha' }],
          loading: false,
        });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
