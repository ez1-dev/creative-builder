import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api } from '@/lib/api';
import {
  buildAuditoriaListParams,
  buildAuditoriaExportParams,
} from '@/pages/AuditoriaApontamentoGeniusPage';

/**
 * Teste de integração leve: simula o clique em "Pesquisar" da tela
 * AuditoriaApontamentoGeniusPage com OP e Origem vazios, executando o mesmo
 * caminho de código que a página usa (buildAuditoriaListParams + api.get).
 *
 * Em vez de montar o componente inteiro (2.6k linhas, com Sheets, Combobox,
 * AiPageContext, etc.), exercemos o contrato real: a URL que sai para o
 * backend e o tratamento da resposta paginada com 3 apontamentos.
 */

const ORIGINAL_FETCH = global.fetch;

const respostaMock = {
  pagina: 1,
  tamanho_pagina: 100,
  total_registros: 3,
  total_paginas: 1,
  dados: [
    {
      numero_op: '1001', nome_operador: 'JOAO', codigo_produto: 'PA',
      descricao_produto: 'Produto A', origem: '110', hora_inicial: '08:00',
      hora_final: '12:00', horas_realizadas: 240, status_movimento: 'FECHADO',
      data_movimento: '2025-01-10', sitorp: 'A',
    },
    {
      numero_op: '2002', nome_operador: 'MARIA', codigo_produto: 'PB',
      descricao_produto: 'Produto B', origem: '120', hora_inicial: '13:00',
      hora_final: '17:00', horas_realizadas: 240, status_movimento: 'FECHADO',
      data_movimento: '2025-01-11', sitorp: 'F',
    },
    {
      numero_op: '3003', nome_operador: 'JOSE', codigo_produto: 'PC',
      descricao_produto: 'Produto C', origem: '130', hora_inicial: '08:00',
      hora_final: '11:00', horas_realizadas: 180, status_movimento: 'FECHADO',
      data_movimento: '2025-01-12', sitorp: 'A',
    },
  ],
  resumo: { total_registros: 3, total_discrepancias: 0, maior_total_dia_operador: 240 },
};

describe('Auditoria Genius — Pesquisar com OP/Origem vazios retorna todos os apontamentos', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    api.setToken(null);
    fetchMock = vi.fn(async (_url: string) => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => respostaMock,
    })) as unknown as ReturnType<typeof vi.fn>;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it('envia request sem numorp/codori, com data_ini/data_fim e demais filtros, e recebe os 3 apontamentos', async () => {
    const filters = {
      data_ini: '2025-01-01',
      data_fim: '2025-01-31',
      numop: '',
      codori: '',
      codpro: 'PA',
      operador: 'JOAO',
      status_op: 'F',
      somente_discrepancia: false,
      somente_acima_8h: false,
    };

    const params = buildAuditoriaListParams(filters, 1, 100);
    const resp = await api.get<typeof respostaMock>('/api/apontamentos-producao', params);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/api/apontamentos-producao');
    expect(url).toContain('data_ini=2025-01-01');
    expect(url).toContain('data_fim=2025-01-31');
    expect(url).toContain('codpro=PA');
    expect(url).toContain('operador=JOAO');
    expect(url).toContain('status_op=FINALIZADO');
    expect(url).toContain('somente_discrepancia=0');
    expect(url).toContain('somente_acima_8h=0');
    // OP e Origem vazios NÃO devem aparecer na URL
    expect(url).not.toMatch(/[?&]numorp=/);
    expect(url).not.toMatch(/[?&]codori=/);
    // Nomes legados também não
    expect(url).not.toContain('numero_op=');
    expect(url).not.toContain('origem=');
    expect(url).not.toContain('codigo_produto=');

    // Resposta com todos os apontamentos do período é refletida
    expect(resp.total_registros).toBe(3);
    expect(resp.dados).toHaveLength(3);
    expect(resp.dados.map((d) => d.numero_op)).toEqual(['1001', '2002', '3003']);
  });

  it('exportação com OP/Origem vazios também não envia numorp/codori', async () => {
    const filters = {
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
    const exp = buildAuditoriaExportParams(filters);
    await api.get('/api/export/apontamentos-producao', exp);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/api/export/apontamentos-producao');
    expect(url).toContain('data_ini=2025-01-01');
    expect(url).toContain('data_fim=2025-01-31');
    expect(url).toContain('status_op=TODOS');
    expect(url).not.toMatch(/[?&]numorp=/);
    expect(url).not.toMatch(/[?&]codori=/);
    expect(url).not.toMatch(/[?&]pagina=/);
    expect(url).not.toMatch(/[?&]tamanho_pagina=/);
  });

  it('preencher só OP filtra por numorp; Origem permanece omitida', async () => {
    const filters = {
      data_ini: '2025-01-01',
      data_fim: '2025-01-31',
      numop: '12345',
      codori: '',
      codpro: '',
      operador: '',
      status_op: '',
      somente_discrepancia: false,
      somente_acima_8h: false,
    };
    const params = buildAuditoriaListParams(filters, 1, 100);
    await api.get('/api/apontamentos-producao', params);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('numorp=12345');
    expect(url).not.toMatch(/[?&]codori=/);
  });
});
