## Adicionar modo PDF (vetor/raster) na impressão de OPs

### 1. `src/lib/producao/opImpressaoPdfJob.ts`
- Adicionar `export type PdfJobModoPdfDesenho = "vetor" | "raster";`
- Em `PdfJobPayload`, adicionar campos opcionais:
  - `modo_pdf_desenho?: PdfJobModoPdfDesenho;`
  - `qualidade?: PdfJobQualidade;` (alias)
- Em `criarPdfJob`, montar body com:
  ```ts
  const qualidade = payload.qualidade_desenhos ?? payload.qualidade ?? "normal";
  const body = {
    ...payload,
    qualidade,
    qualidade_desenhos: qualidade,
    dpi: payload.dpi ?? QUALIDADE_DPI[qualidade],
    modo_pdf_desenho: payload.modo_pdf_desenho ?? "vetor",
  };
  ```
- Em `PdfJobStatus`, adicionar `modo_pdf_desenho?: PdfJobModoPdfDesenho | null;`

### 2. `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`
- Novo state: `const [modoPdfDesenho, setModoPdfDesenho] = useState<"vetor" | "raster">("vetor");`
- Passar `modo_pdf_desenho: modoPdfDesenho` na chamada `pdfJob.iniciar({...})`.
- Adicionar `<Select>` ao lado do seletor de qualidade do botão "Gerar PDF completo com desenhos" com opções:
  - `vetor` → "PDF vetorial — recomendado" (padrão)
  - `raster` → "Imagem/cache — compatibilidade"
  - `disabled={pdfJob.isBusy}`, largura `w-[260px]`, altura `h-8`, texto `text-xs`.
- Atualizar labels do seletor de qualidade existente para:
  - "Imagens: rápida (120 DPI)"
  - "Imagens: normal (150 DPI)"
  - "Imagens: alta (200 DPI)"

### Fora de escopo
- Fluxo "Imprimir visualização" (intocado).
- `useImpressaoPdfJob` (não precisa expor `modo_pdf_desenho`; é passado direto no payload).
- Backend, endpoints, autenticação, filtros de OP.

### Verificação
- Confirmar que o body POST `/api/producao/ordem-producao/impressao/pdf-job` contém `modo_pdf_desenho: "vetor"` por padrão e `"raster"` quando selecionado.
