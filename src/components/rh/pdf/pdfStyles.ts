import { StyleSheet } from "@react-pdf/renderer";

// Paleta corporativa azul (mapeamento manual — react-pdf não lê CSS vars)
export const PDF_COLORS = {
  primary: "#0F3B77",
  primarySoft: "#E8F0FB",
  accent: "#2563EB",
  text: "#0F172A",
  muted: "#475569",
  border: "#CBD5E1",
  bg: "#FFFFFF",
  bgSoft: "#F8FAFC",
  danger: "#B91C1C",
  warn: "#B45309",
  info: "#1D4ED8",
  success: "#15803D",
};

export const pdfStyles = StyleSheet.create({
  page: { paddingTop: 42, paddingBottom: 56, paddingHorizontal: 40, fontSize: 10, color: PDF_COLORS.text, fontFamily: "Helvetica" },
  coverPage: { padding: 0, backgroundColor: PDF_COLORS.primary, color: "#FFFFFF" },
  coverInner: { flex: 1, padding: 60, justifyContent: "space-between" },
  coverTitle: { fontSize: 28, fontWeight: "bold", color: "#FFFFFF" },
  coverSubtitle: { fontSize: 14, color: "#DBEAFE", marginTop: 6 },
  coverBadge: { fontSize: 10, letterSpacing: 2, color: "#93C5FD" },
  coverMeta: { fontSize: 11, color: "#DBEAFE", marginTop: 4 },

  sectionTitle: { fontSize: 16, fontWeight: "bold", color: PDF_COLORS.primary, marginBottom: 6, marginTop: 4 },
  sectionSubtitle: { fontSize: 9, color: PDF_COLORS.muted, marginBottom: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, marginVertical: 8 },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  kpiCard: { width: "31%", padding: 8, backgroundColor: PDF_COLORS.bgSoft, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: PDF_COLORS.primary, marginBottom: 6, marginRight: "2%" },
  kpiLabel: { fontSize: 8, color: PDF_COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  kpiValue: { fontSize: 13, fontWeight: "bold", color: PDF_COLORS.primary, marginTop: 2 },
  kpiDelta: { fontSize: 8, marginTop: 2 },
  deltaUp: { color: PDF_COLORS.success },
  deltaDown: { color: PDF_COLORS.danger },
  deltaFlat: { color: PDF_COLORS.muted },

  h3: { fontSize: 11, fontWeight: "bold", color: PDF_COLORS.text, marginTop: 8, marginBottom: 4 },
  h4: { fontSize: 10, fontWeight: "bold", color: PDF_COLORS.primary, marginTop: 6, marginBottom: 3 },
  p: { fontSize: 9.5, color: PDF_COLORS.text, lineHeight: 1.4 },
  bulletRow: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 10, fontSize: 9.5, color: PDF_COLORS.primary },
  bulletText: { flex: 1, fontSize: 9.5, color: PDF_COLORS.text, lineHeight: 1.4 },

  table: { marginTop: 4, borderTopWidth: 1, borderTopColor: PDF_COLORS.border },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: PDF_COLORS.border, paddingVertical: 4 },
  tableRowHead: { backgroundColor: PDF_COLORS.primarySoft },
  th: { fontSize: 8.5, fontWeight: "bold", color: PDF_COLORS.primary, paddingHorizontal: 4 },
  td: { fontSize: 9, color: PDF_COLORS.text, paddingHorizontal: 4 },

  alertRow: { flexDirection: "row", marginBottom: 5, borderLeftWidth: 3, paddingLeft: 6, paddingVertical: 3, backgroundColor: PDF_COLORS.bgSoft, borderRadius: 2 },
  alertBadge: { fontSize: 8, fontWeight: "bold", color: "#FFFFFF", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 2, marginRight: 6 },
  alertTitle: { fontSize: 10, fontWeight: "bold", color: PDF_COLORS.text },
  alertBody: { fontSize: 9, color: PDF_COLORS.muted, marginTop: 1 },

  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 8, color: PDF_COLORS.muted, borderTopWidth: 1, borderTopColor: PDF_COLORS.border, paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  headerBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: PDF_COLORS.primary },
  headerTitle: { fontSize: 11, fontWeight: "bold", color: PDF_COLORS.primary },
  headerMeta: { fontSize: 8, color: PDF_COLORS.muted },
});

export function sevColor(sev: string) {
  if (sev === "CRITICO") return PDF_COLORS.danger;
  if (sev === "ALTO") return PDF_COLORS.warn;
  return PDF_COLORS.info;
}

export const fmtBRL = (n: number | undefined | null) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(n ?? 0));

export const fmtNum = (n: number | undefined | null, d = 0) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(n ?? 0));

export const fmtPct = (n: number | undefined | null, d = 1) =>
  `${fmtNum(n, d)}%`;

export const fmtAnoMes = (v?: string | number | null) => {
  if (!v) return "-";
  const s = String(v);
  if (!/^\d{6}$/.test(s)) return s;
  return `${s.slice(4, 6)}/${s.slice(0, 4)}`;
};
