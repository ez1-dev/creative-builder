/**
 * Envoltório seguro para qualquer geração de título (IA ou outro async).
 * Nunca propaga exception nem retorna vazio — sempre devolve o fallback.
 *
 * Uso:
 *   const titulo = await safeTitle(() => gerarTituloComIA(payload), 'Validação BI Faturamento');
 */
export async function safeTitle(
  fn: () => Promise<string | null | undefined>,
  fallback: string,
): Promise<string> {
  try {
    const t = await fn();
    return (t && t.trim()) || fallback;
  } catch (err) {
    console.warn('[safeTitle] falha ao gerar título, usando fallback:', err);
    return fallback;
  }
}
