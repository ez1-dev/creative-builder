// Helpers para normalizar a narrativa da IA e detectar truncamento.

const TITULOS_CONHECIDOS = [
  'resumo',
  'rentabilidade',
  'liquidez',
  'endividamento',
  'capital de giro',
  'prazos',
  'ciclo operacional',
  'ciclo financeiro',
  'ebitda',
  'riscos',
  'recomendacoes',
  'recomendações',
  'conclusao',
  'conclusão',
  'analise executiva',
  'análise executiva',
];

const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * Normaliza a narrativa: transforma linhas curtas de título ("Resumo",
 * "Rentabilidade", "**EBITDA**") em headings markdown `## ...` para que o
 * ReactMarkdown consiga estilizá-las como seções.
 */
export function normalizarNarrativa(texto: string): string {
  if (!texto) return '';
  const linhas = texto.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const trimmed = linha.trim();
    if (!trimmed) { out.push(''); continue; }
    // Já é heading? Mantém.
    if (/^#{1,6}\s/.test(trimmed)) { out.push(linha); continue; }
    // Linha curta em **negrito** puro → heading.
    const boldMatch = trimmed.match(/^\*\*(.+?)\*\*[:.]?$/);
    if (boldMatch && boldMatch[1].length <= 60) {
      out.push(`## ${boldMatch[1].trim()}`);
      continue;
    }
    // Linha curta que bate com um dos títulos conhecidos → heading.
    const semPontuacao = trimmed.replace(/[:.\-–—]+$/, '').trim();
    if (semPontuacao.length <= 60) {
      const n = norm(semPontuacao);
      const bate = TITULOS_CONHECIDOS.some(
        (t) => n === t || n.startsWith(`${t} `) || n.startsWith(`${t}(`),
      );
      if (bate) {
        out.push(`## ${semPontuacao}`);
        continue;
      }
    }
    out.push(linha);
  }
  // Garante linha em branco antes de cada heading (para o markdown fechar o parágrafo anterior).
  const final: string[] = [];
  for (let i = 0; i < out.length; i++) {
    const l = out[i];
    if (i > 0 && /^##\s/.test(l) && final[final.length - 1]?.trim()) {
      final.push('');
    }
    final.push(l);
  }
  return final.join('\n');
}

/**
 * Heurística para detectar se a narrativa foi cortada. Retorna `true` quando
 * o `finish_reason` for `length` OU quando o texto termina de forma incompleta
 * (sem pontuação final e com palavra provavelmente incompleta).
 */
export function narrativaTruncada(
  texto: string,
  finishReason?: string | null,
): boolean {
  if (finishReason === 'length') return true;
  if (!texto) return false;
  const t = texto.trim();
  const ultimoChar = t.slice(-1);
  if (/[.!?)"'\]»›]$/.test(ultimoChar)) return false;
  // Última "palavra" curta / colada — provável truncamento.
  const ultimaPalavra = t.split(/\s+/).pop() ?? '';
  if (ultimaPalavra.length <= 3) return true;
  // Terminou em letra sem pontuação → truncado.
  return /[A-Za-zÀ-ÿ0-9,;:]/.test(ultimoChar);
}
