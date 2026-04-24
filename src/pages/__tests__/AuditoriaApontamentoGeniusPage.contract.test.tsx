import { describe, it, expect } from 'vitest';
import {
  buildAuditoriaListParams,
  buildAuditoriaExportParams,
  AUDITORIA_KEEP_EMPTY,
} from '@/pages/AuditoriaApontamentoGeniusPage';

const baseFilters = {
  data_ini: '2025-01-01',
  data_fim: '2025-01-31',
  numop: '',
  codori: '',
  codpro: '',
  operador: '',
  status_op: '',
  somente_discrepancia: false,
  somente_acima_8h: false,
};

describe('Auditoria Genius — contrato de params (listagem)', () => {
  it('omite numorp/codori quando vazios e usa nomes do backend novo', () => {
    const p = buildAuditoriaListParams(baseFilters, 1, 100);
    expect(p.numorp).toBeUndefined();
    expect(p.codori).toBeUndefined();
    expect(p).toHaveProperty('codpro', '');
    expect(p).toHaveProperty('somente_acima_8h', 0);
    // chaves legadas NÃO devem existir
    expect(p).not.toHaveProperty('numero_op');
    expect(p).not.toHaveProperty('origem');
    expect(p).not.toHaveProperty('codigo_produto');
    expect(p).not.toHaveProperty('somente_maior_8h');
  });

  it('mapeia numop → numorp como inteiro e converte booleans para 0/1', () => {
    const p = buildAuditoriaListParams(
      { ...baseFilters, numop: '12345', codori: '110', somente_acima_8h: true, somente_discrepancia: true },
      2,
      50,
    );
    expect(p.numorp).toBe(12345);
    expect(p.codori).toBe(110);
    expect(typeof p.numorp).toBe('number');
    expect(typeof p.codori).toBe('number');
    expect(p.somente_acima_8h).toBe(1);
    expect(p.somente_discrepancia).toBe(1);
    expect(p.pagina).toBe(2);
    expect(p.tamanho_pagina).toBe(50);
  });

  it('AUDITORIA_KEEP_EMPTY é vazio (backend novo trata numorp/codori como opcionais)', () => {
    expect([...AUDITORIA_KEEP_EMPTY]).toEqual([]);
  });
});

describe('Auditoria Genius — paridade listagem × exportação', () => {
  it('export = list sem pagina/tamanho_pagina, com mesmas chaves e valores', () => {
    const list = buildAuditoriaListParams(baseFilters, 1, 100);
    const exp = buildAuditoriaExportParams(baseFilters);
    const { pagina, tamanho_pagina, ...listRest } = list;
    expect(exp).toEqual(listRest);
    expect(exp).not.toHaveProperty('pagina');
    expect(exp).not.toHaveProperty('tamanho_pagina');
  });

  it('paridade preservada com filtros preenchidos', () => {
    const filters = {
      ...baseFilters,
      numop: '999',
      codori: '110',
      codpro: 'PRD-1',
      operador: 'JOAO',
      status_op: 'F',
      somente_acima_8h: true,
    };
    const list = buildAuditoriaListParams(filters, 3, 25);
    const exp = buildAuditoriaExportParams(filters);
    for (const k of Object.keys(exp) as (keyof typeof exp)[]) {
      expect(exp[k]).toEqual((list as any)[k]);
    }
  });
});
