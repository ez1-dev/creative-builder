import { describe, it, expect } from 'vitest';
import { avaliarSessoes, type Rule, type SessaoSeniorEval } from '../seniorRules';

const sessao = (over: Partial<SessaoSeniorEval>): SessaoSeniorEval => ({
  numsec: 1,
  usuario_senior: 'JOAO',
  computador: 'PC1',
  cod_modulo: 'M',
  modulo: 'Manufatura',
  minutos_conectado: 30,
  ...over,
});

const ruleForaHorario: Rule = {
  rule_key: 'fora_horario',
  enabled: true,
  params: { dias_semana: [0, 6], hora_inicio_bloqueio: 22, hora_fim_bloqueio: 6 },
};
const ruleOcioso: Rule = {
  rule_key: 'ocioso_sem_modulo',
  enabled: true,
  params: { minutos_sem_modulo: 30, modulos_considerados_ociosos: ['', 'All', '-'] },
};
const ruleLonga: Rule = {
  rule_key: 'sessao_longa',
  enabled: true,
  params: { horas_maximo: 12 },
};

describe('avaliarSessoes', () => {
  it('cai no sábado independente da hora', () => {
    const sab = new Date('2026-05-02T14:00:00');
    const r = avaliarSessoes([sessao({})], [ruleForaHorario], [], sab);
    expect(r).toHaveLength(1);
    expect(r[0].rule_key).toBe('fora_horario');
  });

  it('cai na terça às 23h pelo horário', () => {
    const ter = new Date('2026-04-28T23:30:00');
    const r = avaliarSessoes([sessao({})], [ruleForaHorario], [], ter);
    expect(r).toHaveLength(1);
  });

  it('NÃO cai na terça às 14h', () => {
    const ter = new Date('2026-04-28T14:00:00');
    const r = avaliarSessoes([sessao({})], [ruleForaHorario], [], ter);
    expect(r).toHaveLength(0);
  });

  it('regra ocioso: pega cod_modulo vazio com 30+ min', () => {
    const ter = new Date('2026-04-28T14:00:00');
    const r = avaliarSessoes(
      [sessao({ cod_modulo: '', minutos_conectado: 45 })],
      [ruleOcioso],
      [],
      ter,
    );
    expect(r).toHaveLength(1);
    expect(r[0].rule_key).toBe('ocioso_sem_modulo');
  });

  it('regra ocioso: ignora se cod_modulo="M"', () => {
    const ter = new Date('2026-04-28T14:00:00');
    const r = avaliarSessoes(
      [sessao({ cod_modulo: 'M', minutos_conectado: 600 })],
      [ruleOcioso],
      [],
      ter,
    );
    expect(r).toHaveLength(0);
  });

  it('regra sessao_longa: 13h dispara, 11h não', () => {
    const ter = new Date('2026-04-28T14:00:00');
    const r1 = avaliarSessoes([sessao({ minutos_conectado: 13 * 60 })], [ruleLonga], [], ter);
    const r2 = avaliarSessoes([sessao({ minutos_conectado: 11 * 60 })], [ruleLonga], [], ter);
    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(0);
  });

  it('whitelist protege RENATO mesmo no domingo', () => {
    const dom = new Date('2026-05-03T10:00:00');
    const r = avaliarSessoes(
      [sessao({ usuario_senior: 'RENATO' }), sessao({ usuario_senior: 'JOAO' })],
      [ruleForaHorario],
      ['RENATO'],
      dom,
    );
    expect(r).toHaveLength(1);
    expect(r[0].sessao.usuario_senior).toBe('JOAO');
  });

  it('não desconecta o próprio usuário logado', () => {
    const dom = new Date('2026-05-03T10:00:00');
    const r = avaliarSessoes(
      [sessao({ usuario_senior: 'MARIA' })],
      [ruleForaHorario],
      [],
      dom,
      'maria',
    );
    expect(r).toHaveLength(0);
  });

  it('regra desligada nunca dispara', () => {
    const dom = new Date('2026-05-03T10:00:00');
    const r = avaliarSessoes(
      [sessao({})],
      [{ ...ruleForaHorario, enabled: false }],
      [],
      dom,
    );
    expect(r).toHaveLength(0);
  });
});
