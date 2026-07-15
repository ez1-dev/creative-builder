import { describe, it, expect } from 'vitest';
import { parseOrEmpty } from '../_utils';
import { FaturamentoGeniusResponseSchema, EMPTY_FATURAMENTO } from '../comercial';
import { PainelComprasResponseSchema, EMPTY_COMPRAS } from '../compras';
import { DreResumoResponseSchema, EMPTY_DRE, ContasResponseSchema, EMPTY_CONTAS } from '../financeiro';
import { EstoqueMinMaxResponseSchema, EMPTY_ESTOQUE } from '../estoque';
import { TurnoverResponseSchema, EMPTY_TURNOVER } from '../rh';

describe('dashboardGeral schemas', () => {
  it('devolve fallback quando data é null/undefined', () => {
    const r = parseOrEmpty(FaturamentoGeniusResponseSchema, null, EMPTY_FATURAMENTO, 't');
    expect(r.data).toEqual(EMPTY_FATURAMENTO);
    expect(r.partial).toBe(false);
  });

  it('normaliza aliases de faturamento (fat_liquido → valor_total)', () => {
    const raw = {
      kpis: { fat_liquido: '1.234,56', meta: 2000, qtd_notas: '10' },
      por_revenda: [{ nome: 'A', valor: '500,00' }],
    };
    const r = parseOrEmpty(FaturamentoGeniusResponseSchema, raw, EMPTY_FATURAMENTO, 't');
    expect(r.partial).toBe(false);
    expect(r.data.kpis.valor_total).toBeCloseTo(1234.56);
    expect(r.data.kpis.meta_faturamento).toBe(2000);
    expect(r.data.kpis.quantidade_notas).toBe(10);
    expect(r.data.por_revenda[0].valor_total).toBe(500);
  });

  it('normaliza compras com campos parciais', () => {
    const raw = { kpis: { valor_liquido_total: '10000' }, graficos: {} };
    const r = parseOrEmpty(PainelComprasResponseSchema, raw, EMPTY_COMPRAS, 't');
    expect(r.data.kpis.valor_comprado).toBe(10000);
    expect(r.data.graficos.por_mes).toEqual([]);
  });

  it('normaliza DRE com alias resultado', () => {
    const raw = { totais: { receita: 100, resultado: 20 } };
    const r = parseOrEmpty(DreResumoResponseSchema, raw, EMPTY_DRE, 't');
    expect(r.data.totais.receita_operacional).toBe(100);
    expect(r.data.totais.resultado_dre).toBe(20);
  });

  it('contas: alias valor_original_total → valor_aberto_total', () => {
    const raw = { resumo: { valor_original_total: 500 } };
    const r = parseOrEmpty(ContasResponseSchema, raw, EMPTY_CONTAS, 't');
    expect(r.data.resumo.valor_aberto_total).toBe(500);
  });

  it('estoque: resumo com defaults', () => {
    const r = parseOrEmpty(EstoqueMinMaxResponseSchema, { dados: [], resumo: { abaixo_minimo: 3 } }, EMPTY_ESTOQUE, 't');
    expect(r.data.resumo.abaixo_minimo).toBe(3);
    expect(r.data.resumo.ok).toBe(0);
  });

  it('turnover: alias admissoes → admitidos', () => {
    const raw = { kpis: { admissoes: 5, demissoes: 2, turnover_pct: '4,5' }, por_mes: [] };
    const r = parseOrEmpty(TurnoverResponseSchema, raw, EMPTY_TURNOVER, 't');
    expect(r.data.kpis.admitidos).toBe(5);
    expect(r.data.kpis.demitidos).toBe(2);
    expect(r.data.kpis.taxa_rotatividade_pct).toBe(4.5);
  });
});
