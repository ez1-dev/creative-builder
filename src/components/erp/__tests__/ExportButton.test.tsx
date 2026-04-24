import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportButton } from '@/components/erp/ExportButton';

const ORIGINAL_FETCH = global.fetch;

describe('ExportButton — contrato Genius (preserva keys vazias)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // jsdom não tem URL.createObjectURL
    (global.URL as any).createObjectURL = vi.fn(() => 'blob:mock');
    (global.URL as any).revokeObjectURL = vi.fn();
    fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Disposition': 'attachment; filename="x.xlsx"' }),
      blob: async () => new Blob(['x']),
    })) as unknown as ReturnType<typeof vi.fn>;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it('omite numorp/codori vazios e usa apenas nomes do contrato novo', async () => {
    render(
      <ExportButton
        endpoint="/api/export/apontamentos-producao"
        params={{
          data_ini: '2025-01-01',
          data_fim: '2025-01-31',
          numorp: undefined,
          codori: undefined,
          codpro: 'ABC',
          somente_acima_8h: 0,
          somente_discrepancia: 1,
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/api/export/apontamentos-producao');
    // numorp/codori vazios NÃO devem aparecer na URL
    expect(url).not.toMatch(/[?&]numorp=/);
    expect(url).not.toMatch(/[?&]codori=/);
    expect(url).toContain('codpro=ABC');
    expect(url).toContain('somente_acima_8h=0');
    expect(url).toContain('somente_discrepancia=1');
    // não deve enviar nomes legados
    expect(url).not.toContain('numero_op=');
    expect(url).not.toContain('origem=');
    expect(url).not.toContain('codigo_produto=');
    expect(url).not.toContain('somente_maior_8h=');
  });
});
