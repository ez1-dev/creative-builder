// Helpers para mapear respostas de endpoints agregados em estruturas para a lib.
export interface BucketLike {
  [k: string]: any;
  valor?: number;
}

export function mapBucket<T extends BucketLike>(
  rows: T[] | undefined | null,
  labelKey: keyof T,
  valueKey: keyof T = 'valor' as keyof T,
): Array<{ label: string; valor: number; raw: T }> {
  return (rows || []).map((r) => ({
    label: String(r[labelKey] ?? '—'),
    valor: Number(r[valueKey] ?? 0),
    raw: r,
  }));
}
