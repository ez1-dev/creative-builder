import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceiroTreeTable } from '@/components/erp/FinanceiroTreeTable';
import {
  ID_TITULO_975462S1,
  respostaComRateios,
  respostaSemRateios,
} from '@/test/fixtures/contasPagarArvore975462S1';

describe('FinanceiroTreeTable — título 975462S-1', () => {
  it('com rateios: expande e mostra linhas RATEIO com CCU/% sem aviso', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    const { rerender } = render(
      <FinanceiroTreeTable
        dados={respostaComRateios.dados}
        expandidos={new Set()}
        onToggle={onToggle}
      />,
    );

    // Aviso de "sem rateios" NÃO deve aparecer quando o título tem filhos.
    expect(screen.queryByText(/sem rateios cadastrados/i)).toBeNull();

    // Botão de expandir é renderizado para o título.
    const expandBtn = screen.getByRole('button', { name: /expandir/i });
    await user.click(expandBtn);
    expect(onToggle).toHaveBeenCalledWith(ID_TITULO_975462S1);

    // Re-render como se estivesse expandido — agora vemos as 2 linhas RATEIO.
    rerender(
      <FinanceiroTreeTable
        dados={respostaComRateios.dados}
        expandidos={new Set([ID_TITULO_975462S1])}
        onToggle={onToggle}
      />,
    );

    expect(screen.getAllByText(/rateio/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('1.01.001')).toBeInTheDocument();
    expect(screen.getByText('2.02.010')).toBeInTheDocument();
    expect(screen.getByText('ADMINISTRATIVO')).toBeInTheDocument();
    expect(screen.getByText('PRODUCAO')).toBeInTheDocument();
    expect(screen.getByText(/60[,.]00%/)).toBeInTheDocument();
    expect(screen.getByText(/40[,.]00%/)).toBeInTheDocument();
  });

  it('sem rateios: exibe aviso e não renderiza botão de expandir', () => {
    const onToggle = vi.fn();
    render(
      <FinanceiroTreeTable
        dados={respostaSemRateios.dados}
        expandidos={new Set()}
        onToggle={onToggle}
      />,
    );

    expect(screen.getByText(/sem rateios cadastrados/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /expandir|recolher/i })).toBeNull();

    // O título 975462S-1 ainda aparece na grid.
    const linhaTitulo = screen.getByText(/975462S-1/i).closest('tr');
    expect(linhaTitulo).not.toBeNull();
    expect(within(linhaTitulo as HTMLElement).getByText(/título/i)).toBeInTheDocument();
  });
});
