import { describe, it, expect, afterEach, vi } from 'vitest';
import { api } from '@/lib/api';
import {
  construirMapaFilhos,
  flattenArvore,
  type LinhaArvoreFinanceira,
} from '@/lib/treeFinanceiro';
import {
  ID_TITULO_975462S1,
  respostaComRateios,
  respostaSemRateios,
} from '@/test/fixtures/contasPagarArvore975462S1';

const ORIGINAL_FETCH = global.fetch;

function mockFetchOnce(body: unknown) {
  const fn = vi.fn(async () => ({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => body,
  })) as unknown as typeof fetch;
  global.fetch = fn;
  return fn as unknown as ReturnType<typeof vi.fn>;
}

describe('contrato /api/contas-pagar-arvore — título 975462S-1', () => {
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  // Cenário A: estado atual reportado pelo backend (regressão).
  // Mantido como skip — vira o "TODO" rastreável para o fix descrito em
  // docs/backend-contas-centro-custo-projeto.md (problema 3 — rateios ausentes).
  it.skip(
    '[backend bug] hoje retorna apenas TÍTULO sem RATEIO (possui_filhos=false)',
    async () => {
      mockFetchOnce(respostaSemRateios);
      const resp = await api.get<typeof respostaSemRateios>(
        '/api/contas-pagar-arvore',
        { numero_titulo: '975462S-1', pagina: 1, tamanho_pagina: 100 },
      );
      expect(resp.dados.some((l) => l.tipo_linha === 'RATEIO')).toBe(true);
    },
  );

  it('cenário esperado pós-fix: TÍTULO + linhas RATEIO ligadas pelo codigo_pai', async () => {
    mockFetchOnce(respostaComRateios);

    const resp = await api.get<typeof respostaComRateios>(
      '/api/contas-pagar-arvore',
      { numero_titulo: '975462S-1', pagina: 1, tamanho_pagina: 100 },
    );

    const titulo = resp.dados.find((l) => l.tipo_linha === 'TITULO');
    const rateios = resp.dados.filter((l) => l.tipo_linha === 'RATEIO');

    expect(titulo).toBeDefined();
    expect(titulo!.id_linha).toBe(ID_TITULO_975462S1);
    expect(titulo!.possui_filhos).toBe(true);

    expect(rateios.length).toBeGreaterThanOrEqual(2);
    for (const r of rateios) {
      expect(r.codigo_pai).toBe(ID_TITULO_975462S1);
      expect(r.nivel).toBe(1);
      expect(r.codigo_centro_custo).toBeTruthy();
      expect(r.origem_rateio).toBe('E075RAT');
      expect(typeof r.percentual_rateio).toBe('number');
      expect(typeof r.valor_rateado).toBe('number');
    }

    const somaPct = rateios.reduce((s, r) => s + (r.percentual_rateio || 0), 0);
    expect(Math.round(somaPct)).toBe(100);
  });

  it('flattenArvore expande os RATEIOs imediatamente abaixo do TÍTULO', () => {
    const dados = respostaComRateios.dados as LinhaArvoreFinanceira[];
    const mapa = construirMapaFilhos(dados);
    expect(mapa.get(ID_TITULO_975462S1)?.length).toBe(2);

    const colapsado = flattenArvore(dados, new Set());
    expect(colapsado).toHaveLength(1);
    expect(colapsado[0].tipo_linha).toBe('TITULO');

    const expandido = flattenArvore(dados, new Set([ID_TITULO_975462S1]));
    expect(expandido.map((l) => l.tipo_linha)).toEqual([
      'TITULO',
      'RATEIO',
      'RATEIO',
    ]);
    expect(expandido[1].codigo_pai).toBe(ID_TITULO_975462S1);
    expect(expandido[2].codigo_pai).toBe(ID_TITULO_975462S1);
  });
});
