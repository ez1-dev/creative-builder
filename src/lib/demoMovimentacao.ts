// Dados de exemplo para a tela /sugestao-min-max enquanto o backend FastAPI
// não publica os endpoints reais. Gera movimentação plausível e calcula
// um resumo coerente com as fórmulas documentadas em
// docs/backend-sugestao-minmax.md.

export interface DemoMovimentacao {
  codemp: number;
  codpro: string;
  despro: string;
  codder: string;
  coddep: string;
  data_movimento: string;
  tipo_movimento: 'ENT' | 'SAI';
  transacao: string;
  deposito: string;
  quantidade: number;
  documento: string;
  fornecedor: string | null;
  origem: string;
  saldo_atual: number;
  consumo_medio: number;
  minimo_sugerido: number;
  maximo_sugerido: number;
  lead_time_dias: number;
  status: string;
}

const PRODUTOS = [
  { codpro: 'PRD-0001', despro: 'Parafuso M8 x 30mm Inox', coddep: '001', codder: '01', saldo: 320, consumoDia: 8 },
  { codpro: 'PRD-0002', despro: 'Chapa Aço 1020 - 2mm', coddep: '001', codder: '01', saldo: 12, consumoDia: 1.2 },
  { codpro: 'PRD-0003', despro: 'Tinta Epóxi Cinza 18L', coddep: '002', codder: '01', saldo: 45, consumoDia: 0.6 },
  { codpro: 'PRD-0004', despro: 'Cabo Flexível 2,5mm² 100m', coddep: '003', codder: '01', saldo: 8, consumoDia: 0.4 },
  { codpro: 'PRD-0005', despro: 'Rolamento 6203 ZZ', coddep: '001', codder: '01', saldo: 180, consumoDia: 2.5 },
  { codpro: 'PRD-0006', despro: 'Óleo Lubrificante ISO 68 20L', coddep: '002', codder: '01', saldo: 22, consumoDia: 0.3 },
  { codpro: 'PRD-0007', despro: 'Disco de Corte 7" Inox', coddep: '001', codder: '01', saldo: 95, consumoDia: 3.1 },
  { codpro: 'PRD-0008', despro: 'Solda MIG ER70S-6 1,2mm 15kg', coddep: '002', codder: '01', saldo: 5, consumoDia: 0.2 },
];

const FORNECEDORES = ['Distribuidora Alfa Ltda', 'Indústria Beta S.A.', 'Comercial Gama EIRELI', 'Importadora Delta'];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export interface DemoResponse {
  pagina: number;
  tamanho_pagina: number;
  total_registros: number;
  total_paginas: number;
  dados: DemoMovimentacao[];
  resumo: {
    saldo_atual_total: number;
    consumo_90d: number;
    consumo_180d: number;
    lead_time_medio_dias: number;
    minimo_sugerido_total: number;
    maximo_sugerido_total: number;
  };
}

/**
 * Gera ~30 linhas fictícias de movimentação dos últimos 180 dias para demo.
 */
export function gerarDemoMovimentacao(): DemoResponse {
  const dados: DemoMovimentacao[] = [];
  let saldoAtualTotal = 0;
  let consumo90 = 0;
  let consumo180 = 0;
  let minTotal = 0;
  let maxTotal = 0;
  let ltSum = 0;
  let ltCount = 0;

  for (const p of PRODUTOS) {
    const leadTime = 10 + Math.floor(Math.random() * 15); // 10–25 dias
    const consumoMensal = p.consumoDia * 30;
    const seguranca = p.consumoDia * 0.5 * leadTime;
    const minimo = +(p.consumoDia * leadTime + seguranca).toFixed(2);
    const lote = +consumoMensal.toFixed(2);
    const maximo = +(minimo + lote).toFixed(2);

    saldoAtualTotal += p.saldo;
    minTotal += minimo;
    maxTotal += maximo;
    ltSum += leadTime;
    ltCount++;

    // 2 entradas + 2 saídas espalhadas no histórico
    const eventos = [
      { dias: 170, tipo: 'ENT' as const, qtd: lote, doc: 'NF 10' + p.codpro.slice(-3) + '0' },
      { dias: 130, tipo: 'SAI' as const, qtd: +(p.consumoDia * 30).toFixed(2), doc: 'REQ-' + p.codpro.slice(-3) + '1' },
      { dias: 80, tipo: 'ENT' as const, qtd: lote, doc: 'NF 10' + p.codpro.slice(-3) + '2' },
      { dias: 30, tipo: 'SAI' as const, qtd: +(p.consumoDia * 30).toFixed(2), doc: 'REQ-' + p.codpro.slice(-3) + '3' },
    ];

    for (const ev of eventos) {
      if (ev.tipo === 'SAI') {
        consumo180 += ev.qtd;
        if (ev.dias <= 90) consumo90 += ev.qtd;
      }
      dados.push({
        codemp: 1,
        codpro: p.codpro,
        despro: p.despro,
        codder: p.codder,
        coddep: p.coddep,
        data_movimento: isoDaysAgo(ev.dias),
        tipo_movimento: ev.tipo,
        transacao: ev.tipo === 'ENT' ? '100' : '200',
        deposito: p.coddep,
        quantidade: ev.qtd,
        documento: ev.doc,
        fornecedor: ev.tipo === 'ENT' ? FORNECEDORES[Math.floor(Math.random() * FORNECEDORES.length)] : null,
        origem: 'DEMO',
        saldo_atual: p.saldo,
        consumo_medio: +p.consumoDia.toFixed(2),
        minimo_sugerido: minimo,
        maximo_sugerido: maximo,
        lead_time_dias: leadTime,
        status: p.saldo < minimo ? 'ABAIXO_MINIMO' : p.saldo > maximo ? 'ACIMA_MAXIMO' : 'ENTRE_MIN_E_MAX',
      });
    }
  }

  // Ordenar do mais recente pro mais antigo
  dados.sort((a, b) => b.data_movimento.localeCompare(a.data_movimento));

  return {
    pagina: 1,
    tamanho_pagina: dados.length,
    total_registros: dados.length,
    total_paginas: 1,
    dados,
    resumo: {
      saldo_atual_total: saldoAtualTotal,
      consumo_90d: +consumo90.toFixed(2),
      consumo_180d: +consumo180.toFixed(2),
      lead_time_medio_dias: ltCount ? +(ltSum / ltCount).toFixed(1) : 0,
      minimo_sugerido_total: +minTotal.toFixed(2),
      maximo_sugerido_total: +maxTotal.toFixed(2),
    },
  };
}

/**
 * A partir da movimentação demo, gera o array agrupado por (codpro, codder, coddep)
 * já no formato esperado pela tela em modo "sugestão".
 */
export function gerarDemoSugestao(): DemoResponse {
  const mov = gerarDemoMovimentacao();
  const map = new Map<string, DemoMovimentacao>();
  for (const r of mov.dados) {
    const k = `${r.codpro}|${r.codder}|${r.coddep}`;
    if (!map.has(k)) map.set(k, r);
  }
  const dados = Array.from(map.values()).map((r) => ({
    ...r,
    tipo_movimento: 'SAI' as const,
    quantidade: r.consumo_medio * 30,
    data_movimento: isoDaysAgo(0),
    documento: 'AGREGADO',
    fornecedor: null,
  }));
  return {
    ...mov,
    dados,
    total_registros: dados.length,
    tamanho_pagina: dados.length,
  };
}
