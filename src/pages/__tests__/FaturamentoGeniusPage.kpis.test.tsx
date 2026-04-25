import { describe, it, expect } from 'vitest';
import { subtractOutros, kpisFromPorRevenda } from '../FaturamentoGeniusPage';

describe('FaturamentoGeniusPage — KPIs', () => {
  const kpisBackend = {
    valor_total: 200_000,
    valor_bruto: 210_000,
    valor_devolucao: 1_000,
    valor_custo: 100_000,
    valor_comissao: 5_000,
    valor_impostos: 30_000,
    fat_liquido: 169_000,
    margem_bruta: 69_000,
    margem_percentual: 40.83,
    quantidade_notas: 100,
    quantidade_pedidos: 80,
    quantidade_clientes: 25,
    quantidade_produtos: 60,
    quantidade_revendas: 5,
  };

  const porRevenda = [
    { revenda: 'GENIUS', valor_total: 191_603, valor_devolucao: 821, valor_custo: 90_000, valor_impostos: 27_370, valor_bruto: 200_000, valor_comissao: 4_500, quantidade_notas: 92, quantidade_pedidos: 75, quantidade_clientes: 25, quantidade_produtos: 50 },
    { revenda: 'OUTROS', valor_total: 8_397, valor_devolucao: 179, valor_custo: 10_000, valor_impostos: 2_630, valor_bruto: 10_000, valor_comissao: 500, quantidade_notas: 8, quantidade_pedidos: 5, quantidade_clientes: 0, quantidade_produtos: 10 },
  ];

  it('subtractOutros remove a linha OUTROS dos totais agregados', () => {
    const out = subtractOutros(kpisBackend, porRevenda);
    expect(out.valor_total).toBeCloseTo(191_603, 2);
    expect(out.valor_devolucao).toBeCloseTo(821, 2);
    expect(out.valor_custo).toBeCloseTo(90_000, 2);
    expect(out.valor_impostos).toBeCloseTo(27_370, 2);
    // fat_liquido = 191603 - 821 - 27370 = 163412
    expect(out.fat_liquido).toBeCloseTo(163_412, 2);
    // margem_bruta = 163412 - 90000 = 73412
    expect(out.margem_bruta).toBeCloseTo(73_412, 2);
    expect(out.quantidade_revendas).toBe(4);
  });

  it('subtractOutros é no-op quando não há linha OUTROS', () => {
    const out = subtractOutros(kpisBackend, [porRevenda[0]]);
    expect(out).toEqual(kpisBackend);
  });

  it('subtractOutros tolera kpis nulo', () => {
    expect(subtractOutros(null, porRevenda)).toBeNull();
  });

  it('kpisFromPorRevenda soma apenas a revenda filtrada (GENIUS Mar/2026)', () => {
    // Cenário: agregado backend traz GENIUS + 2 outras marcas; usuário filtra "GENIUS".
    const porRevendaFiltrada = [
      { revenda: 'GENIUS', valor_total: 191_603, valor_devolucao: 821, valor_custo: 90_000, valor_impostos: -27_370, valor_bruto: 200_000, valor_comissao: 4_500, quantidade_notas: 25, quantidade_pedidos: 25, quantidade_clientes: 14, quantidade_produtos: 50 },
    ];
    const out = kpisFromPorRevenda(porRevendaFiltrada);
    // Targets oficiais Genius Mar/2026
    expect(out.valor_total).toBeCloseTo(191_603, 2);
    expect(out.valor_devolucao).toBeCloseTo(821, 2);
    expect(out.valor_impostos).toBeCloseTo(-27_370, 2);
    // fat_liq = 191603 - 821 - |−27370| = 163412 (target oficial 161.674 difere por descontos comerciais)
    expect(out.fat_liquido).toBeCloseTo(163_412, 2);
    expect(out.quantidade_revendas).toBe(1);
  });

  it('kpisFromPorRevenda lida com lista vazia', () => {
    const out = kpisFromPorRevenda([]);
    expect(out.valor_total).toBe(0);
    expect(out.fat_liquido).toBe(0);
    expect(out.quantidade_revendas).toBe(0);
  });
});
