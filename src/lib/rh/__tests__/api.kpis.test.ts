import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

import { api } from "@/lib/api";
import { fetchResumoFolhaDashboard } from "../api";

const params = { anomes_ini: "202601", anomes_fim: "202606", codemp: 1 };

describe("fetchResumoFolhaDashboard - mapeamento de custo_total / beneficios / rescisoes", () => {
  beforeEach(() => {
    (api.get as any).mockReset();
  });

  it("marca os três como pendentes quando vêm null", async () => {
    (api.get as any).mockResolvedValueOnce({
      kpis: {
        provento: 100, desconto: 20, total_liquido: 80,
        custo_total: null, beneficios: null, rescisoes: null,
        inss_total: 10, hora_extra: 5, provisoes: 3, custo_ferias: 2, fgts: 1,
      },
    });
    const r = await fetchResumoFolhaDashboard(params);
    expect(r._missing_kpis).toEqual(expect.arrayContaining(["custo_total", "beneficios", "rescisoes"]));
    expect(r._missing_kpis).not.toEqual(expect.arrayContaining(["provento", "desconto", "total_liquido"]));
  });

  it("expõe os valores numéricos quando a API entrega números", async () => {
    (api.get as any).mockResolvedValueOnce({
      kpis: {
        provento: 100, desconto: 20, total_liquido: 80,
        custo_total: 1234.56, beneficios: 789.01, rescisoes: 42,
        inss_total: 10, hora_extra: 5, provisoes: 3, custo_ferias: 2, fgts: 1,
      },
    });
    const r = await fetchResumoFolhaDashboard(params);
    expect(r.kpis.custo_total).toBe(1234.56);
    expect(r.kpis.beneficios).toBe(789.01);
    expect(r.kpis.rescisoes).toBe(42);
    expect(r._missing_kpis).not.toEqual(expect.arrayContaining(["custo_total", "beneficios", "rescisoes"]));
  });

  it('trata a string "campo_pendente" como pendente', async () => {
    (api.get as any).mockResolvedValueOnce({
      kpis: {
        custo_total: "campo_pendente",
        beneficios: "campo_pendente",
        rescisoes: "campo_pendente",
      },
    });
    const r = await fetchResumoFolhaDashboard(params);
    expect(r._missing_kpis).toEqual(expect.arrayContaining(["custo_total", "beneficios", "rescisoes"]));
    expect(r.kpis.custo_total).toBe(0);
  });
});
