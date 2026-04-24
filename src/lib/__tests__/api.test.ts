import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api } from '@/lib/api';

const ORIGINAL_FETCH = global.fetch;

function mockFetchOnce(response: { ok: boolean; status?: number; body?: any }) {
  const fn = vi.fn(async (_url: string) => ({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    headers: new Headers(),
    json: async () => response.body ?? {},
  })) as unknown as typeof fetch;
  global.fetch = fn;
  return fn as unknown as ReturnType<typeof vi.fn>;
}

function lastUrl(fn: ReturnType<typeof vi.fn>): string {
  const call = fn.mock.calls[fn.mock.calls.length - 1];
  return String(call[0]);
}

describe('ApiClient.get — query string builder', () => {
  beforeEach(() => {
    api.setToken(null);
  });
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it('omite chaves vazias por padrão', async () => {
    const fn = mockFetchOnce({ ok: true, body: { dados: [] } });
    await api.get('/api/test', { a: 'x', b: '', c: null, d: undefined });
    const url = lastUrl(fn);
    expect(url).toContain('a=x');
    expect(url).not.toContain('b=');
    expect(url).not.toContain('c=');
    expect(url).not.toContain('d=');
  });

  it('preserva chaves vazias listadas em keepEmpty (contrato Genius)', async () => {
    const fn = mockFetchOnce({ ok: true, body: { dados: [] } });
    await api.get(
      '/api/apontamentos-producao',
      { numorp: '', codori: '', codpro: 'X' },
      { keepEmpty: ['numorp', 'codori'] },
    );
    const url = lastUrl(fn);
    expect(url).toMatch(/[?&]numorp=(&|$)/);
    expect(url).toMatch(/[?&]codori=(&|$)/);
    expect(url).toContain('codpro=X');
  });

  it('mantém valor 0 (falsy mas válido, ex.: somente_acima_8h)', async () => {
    const fn = mockFetchOnce({ ok: true, body: { dados: [] } });
    await api.get('/api/test', { somente_acima_8h: 0, somente_discrepancia: 1 });
    const url = lastUrl(fn);
    expect(url).toContain('somente_acima_8h=0');
    expect(url).toContain('somente_discrepancia=1');
  });
});

describe('ApiClient — formatação de erros 422 do FastAPI', () => {
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it('formata detail array como string legível, sem [object Object]', async () => {
    mockFetchOnce({
      ok: false,
      status: 422,
      body: {
        detail: [
          { loc: ['query', 'numorp'], msg: 'Field required', type: 'missing' },
          { loc: ['query', 'codori'], msg: 'Field required', type: 'missing' },
        ],
      },
    });
    let caught: any;
    try {
      await api.get('/api/apontamentos-producao', {});
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeDefined();
    const msg = String(caught.message);
    expect(msg).not.toContain('[object Object]');
    expect(msg).toContain('numorp');
    expect(msg).toContain('codori');
    expect(msg).toContain('Field required');
  });
});
