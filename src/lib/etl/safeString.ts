/** Helpers defensivos para evitar `Cannot read properties of undefined (reading 'toLowerCase')`. */
export const safeLower = (v: unknown) => String(v ?? '').toLowerCase();
export const safeUpper = (v: unknown) => String(v ?? '').toUpperCase();
