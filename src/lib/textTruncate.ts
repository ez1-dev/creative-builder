/**
 * Trunca um texto para exibição em linha única, com "…" ao final quando
 * ultrapassa o limite. Preserva o texto original para uso em tooltip.
 */
export function truncateLabel(text: string | null | undefined, max = 40): string {
  const s = String(text ?? "").trim();
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}
