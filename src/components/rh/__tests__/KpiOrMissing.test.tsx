import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiOrMissing } from "../KpiOrMissing";

describe("KpiOrMissing - cards Custo Total / Benefícios / Rescisões", () => {
  const cards = [
    { title: "Custo Total", field: "custo_total" },
    { title: "Benefícios", field: "beneficios" },
    { title: "Rescisões", field: "rescisoes" },
  ];

  describe.each(cards)("$title", ({ title, field }) => {
    it('exibe "Campo pendente na API" quando missing=true e value=null', () => {
      render(<KpiOrMissing title={title} field={field} value={undefined} missing={true} />);
      expect(screen.getByText(title)).toBeInTheDocument();
      expect(screen.getByText("Campo pendente na API")).toBeInTheDocument();
    });

    it("exibe o valor formatado em BRL quando a API retorna número", () => {
      render(<KpiOrMissing title={title} field={field} value={12345.67} missing={false} />);
      expect(screen.getByText(title)).toBeInTheDocument();
      expect(screen.queryByText("Campo pendente na API")).not.toBeInTheDocument();
      // KpiCard usa formatCurrency (pt-BR / BRL). O separador de milhar é ".", decimal ",".
      // O símbolo "R$" pode vir com NBSP; buscamos por trecho estável.
      expect(screen.getByText(/12\.345,67/)).toBeInTheDocument();
    });

    it("exibe R$ 0,00 quando a API retorna explicitamente 0 (não pendente)", () => {
      render(<KpiOrMissing title={title} field={field} value={0} missing={false} />);
      expect(screen.queryByText("Campo pendente na API")).not.toBeInTheDocument();
      expect(screen.getByText(/0,00/)).toBeInTheDocument();
    });
  });
});
