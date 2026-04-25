import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportButton } from '@/components/erp/ExportButton';

const ORIGINAL_FETCH = global.fetch;

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { toast } from 'sonner';

describe('ExportButton — alternância de endpoint para Modo Árvore', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
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
    vi.clearAllMocks();
  });

  it('chama o endpoint legado quando modo árvore está desligado', async () => {
    render(
      <ExportButton
        endpoint="/api/export/contas-pagar"
        params={{ status_titulo: 'A_VENCER' }}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/api/export/contas-pagar?');
    expect(url).not.toContain('/api/export/contas-pagar-arvore');
    expect(url).toContain('status_titulo=A_VENCER');
  });

  it('chama o endpoint de árvore quando modo árvore está ligado', async () => {
    render(
      <ExportButton
        endpoint="/api/export/contas-pagar-arvore"
        params={{ status_titulo: 'A_VENCER', modo_arvore: true }}
        label="Exportar Excel (Árvore)"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /árvore/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/api/export/contas-pagar-arvore?');
    expect(url).toContain('status_titulo=A_VENCER');
    expect(url).toContain('modo_arvore=true');
  });

  it('exibe toast amigável quando o endpoint de árvore retorna 404', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers(),
      blob: async () => new Blob([]),
    } as any);
    render(
      <ExportButton
        endpoint="/api/export/contas-pagar-arvore"
        params={{}}
        label="Exportar Excel (Árvore)"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /árvore/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    const msg = (toast.error as any).mock.calls[0][0];
    expect(String(msg)).toMatch(/árvore ainda não disponível|backend-export-contas-pagar-arvore/i);
  });

  it('exibe toast amigável quando o endpoint de árvore retorna 501', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 501,
      headers: new Headers(),
      blob: async () => new Blob([]),
    } as any);
    render(
      <ExportButton
        endpoint="/api/export/contas-pagar-arvore"
        params={{}}
        label="Exportar Excel (Árvore)"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /árvore/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
