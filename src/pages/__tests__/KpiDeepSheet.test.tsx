import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KpiDeepSheet } from "../AuditoriaApontamentoGeniusPage";

// Mock ResizeObserver (radix dependency in jsdom)
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver || ResizeObserverMock;

// Suprimir warnings do radix em jsdom
if (!(Element.prototype as any).hasPointerCapture) {
  (Element.prototype as any).hasPointerCapture = () => false;
  (Element.prototype as any).releasePointerCapture = () => {};
  (Element.prototype as any).scrollIntoView = () => {};
}

// 2 OPs:
//  - OP "1001": SEM hora_inicial -> dispara inconsistência (sem_inicio)
//  - OP "2002": linha totalmente consistente
const linhasMock = [
  {
    numero_op: "1001",
    nome_operador: "JOAO",
    descricao_produto: "Produto A",
    codigo_produto: "PA",
    origem: "100",
    hora_inicial: "",
    hora_final: "10:00",
    horas_realizadas: 60,
    total_horas_dia_operador: 60,
    status_movimento: "SEM_APONTAMENTO",
    data_movimento: "2025-01-10",
    sitorp: "A",
  },
  {
    numero_op: "2002",
    nome_operador: "MARIA",
    descricao_produto: "Produto B",
    codigo_produto: "PB",
    origem: "200",
    hora_inicial: "08:00",
    hora_final: "10:00",
    horas_realizadas: 120,
    total_horas_dia_operador: 120,
    status_movimento: "FECHADO",
    data_movimento: "2025-01-10",
    sitorp: "F",
  },
];

type Kind = React.ComponentProps<typeof KpiDeepSheet>["kind"];

function Harness({ kind, initialSomente = false }: { kind: Kind; initialSomente?: boolean }) {
  const [open, setOpen] = useState(true);
  const [somente, setSomente] = useState(initialSomente);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<"inconsist" | "horas" | "apt" | "op">("inconsist");
  const [opExp, setOpExp] = useState<string | null>(null);

  return (
    <TooltipProvider>
      <KpiDeepSheet
        open={open}
        onOpenChange={setOpen}
        kind={kind}
        linhas={linhasMock}
        somenteInconsist={somente}
        setSomenteInconsist={setSomente}
        busca={busca}
        setBusca={setBusca}
        ordem={ordem}
        setOrdem={setOrdem}
        opExpandida={opExp}
        setOpExpandida={setOpExp}
        discrepanciasParciais={false}
        totalRegistros={2}
        paginaCarregada={2}
        onAbrirDrawerOp={vi.fn()}
        onFiltrarGridPorOp={vi.fn()}
      />
    </TooltipProvider>
  );
}

describe("KpiDeepSheet — toggle 'Só c/ inconsistência'", () => {
  describe("Drills de problema (toggle deve ficar oculto)", () => {
    it("acima8h: oculta toggle e exibe hint", () => {
      render(<Harness kind={{ kind: "acima8h" }} />);
      expect(screen.queryByLabelText(/Só c\/ inconsist/i)).toBeNull();
      expect(
        screen.getByText(/Recorte já contém apenas linhas com inconsistência deste tipo/i),
      ).toBeInTheDocument();
    });

    it("semInicio: oculta toggle e exibe hint", () => {
      render(<Harness kind={{ kind: "semInicio" }} />);
      expect(screen.queryByLabelText(/Só c\/ inconsist/i)).toBeNull();
      expect(
        screen.getByText(/Recorte já contém apenas linhas com inconsistência deste tipo/i),
      ).toBeInTheDocument();
    });

    it.each(["semFim", "fimMenorInicio", "discrepancias", "abaixo5min"] as const)(
      "%s: oculta toggle",
      (k) => {
        render(<Harness kind={{ kind: k } as Kind} />);
        expect(screen.queryByLabelText(/Só c\/ inconsist/i)).toBeNull();
      },
    );
  });

  describe("Drills neutros (toggle deve aparecer e funcionar)", () => {
    it("total: toggle visível, hint ausente, filtra ao ativar", async () => {
      const user = userEvent.setup();
      render(<Harness kind={{ kind: "total" }} />);

      const toggle = screen.getByLabelText(/Só c\/ inconsist/i);
      expect(toggle).toBeInTheDocument();
      expect(
        screen.queryByText(/Recorte já contém apenas linhas com inconsistência deste tipo/i),
      ).toBeNull();

      // Inicial: as 2 OPs aparecem
      expect(screen.getByText("1001")).toBeInTheDocument();
      expect(screen.getByText("2002")).toBeInTheDocument();

      // Ativa o filtro -> só OP 1001 (com inconsistência) permanece
      await user.click(toggle);
      expect(screen.getByText("1001")).toBeInTheDocument();
      expect(screen.queryByText("2002")).toBeNull();
    });

    it("status (A): toggle visível e filtra OPs sem inconsistência", async () => {
      const user = userEvent.setup();
      render(<Harness kind={{ kind: "status", letra: "A" }} />);

      const toggle = screen.getByLabelText(/Só c\/ inconsist/i);
      expect(toggle).toBeInTheDocument();

      expect(screen.getByText("1001")).toBeInTheDocument();
      expect(screen.getByText("2002")).toBeInTheDocument();

      await user.click(toggle);
      expect(screen.getByText("1001")).toBeInTheDocument();
      expect(screen.queryByText("2002")).toBeNull();
    });

    it.each(["emAndamento", "finalizadas", "maiorTotalDia"] as const)(
      "%s: toggle visível",
      (k) => {
        render(<Harness kind={{ kind: k } as Kind} />);
        expect(screen.getByLabelText(/Só c\/ inconsist/i)).toBeInTheDocument();
        expect(
          screen.queryByText(/Recorte já contém apenas linhas com inconsistência deste tipo/i),
        ).toBeNull();
      },
    );
  });
});
