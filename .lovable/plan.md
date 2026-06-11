## Objetivo

Hoje a tela de **Impressão de Ordem de Produção** mostra apenas "Gerando PDF completo com desenhos. Aguarde…" sem feedback de etapa nem de OPs processadas. O backend vai passar a expor progresso por etapa e o frontend precisa consumir isso, mostrar barra de progresso e permitir escolher a qualidade dos desenhos (150 ou 200 DPI). A renderização de desenhos no navegador continua proibida durante a geração — toda a montagem permanece no backend.

## Escopo desta entrega (somente frontend + docs)

1. Ampliar contrato do status do job (novos campos opcionais).
2. UI do bloco de progresso na página de impressão.
3. Seletor de qualidade dos desenhos enviado ao backend.
4. Atualizar `docs/backend-impressao-op-pdf-job.md` com as novas regras (cache A4, etapas, qualidade, sem HTTP interno).

Backend (FastAPI) **não** é tocado aqui — apenas documentado. Implementação de cache, ThreadPool e geração via `reportlab`/`img2pdf` ficam por conta do time da API.

## Mudanças por arquivo

### `src/lib/producao/opImpressaoPdfJob.ts`
- `PdfJobPayload` ganha campo opcional `qualidade_desenhos: "normal" | "alta"` (default `"alta"` = 200 DPI; `"normal"` = 150 DPI).
- `PdfJobStatus` ganha campos opcionais já previstos pelo backend novo:
  - `etapa?: "BUSCANDO_OPS" | "BUSCANDO_COMPONENTES" | "BUSCANDO_OPERACOES" | "LOCALIZANDO_DESENHOS" | "NORMALIZANDO_DESENHOS" | "MONTANDO_PDF" | "CONCLUIDO"`
  - `total_ops?: number | null`
  - `processadas?: number | null`
  - `percentual?: number | null` (0..100, alternativa ao `progresso` 0..1; usar o que vier).

### `src/hooks/useImpressaoPdfJob.ts`
- Expor no retorno: `etapa`, `totalOps`, `processadas`, `percentual` (derivados de `info`).
- Manter compat: se `percentual` ausente, calcular a partir de `processadas`/`total_ops`; se nada vier, cair no `progresso` antigo.
- Sem mudança no polling de 3s nem em `iniciar`/`cancelar`.

### `src/pages/producao/ImpressaoOrdemProducaoPage.tsx`

Bloco hoje em ~linhas 1103–1141 (botão "Gerar PDF completo com desenhos" + estado `pdfJob.isBusy`):

- Quando `pdfJob.isBusy`, substituir o texto simples por um card compacto com:
  - Ícone `Loader2` + título **"Gerando PDF completo com desenhos"**.
  - Linha de **etapa atual** traduzida (`labelEtapa(etapa)` → "Buscando ordens", "Buscando componentes", "Buscando operações", "Localizando desenhos", "Normalizando desenhos", "Montando PDF", "Concluído"). Fallback: `pdfJob.mensagem` ou "Processando…".
  - **Barra de progresso** (`<Progress value={pct} />` de `@/components/ui/progress`) com `pct` derivado de `percentual ?? Math.round((progresso ?? 0) * 100)`.
  - Linha secundária: **"X de Y OPs"** quando `processadas` e `totalOps` existirem.
  - Linha terciária opcional: `mensagem` do backend, quando ela acrescentar info (ex.: "Normalizando desenho 87 de 244").
  - Texto auxiliar fixo: *"Os desenhos não serão renderizados no navegador. O PDF é gerado no servidor."*
- Estados `IDLE`/`ERRO`/`CONCLUIDO` continuam como hoje (botão "Gerar…", `Alert` de erro com mensagem do campo `erro`, botão **Baixar PDF** + **Gerar novo**).
- Acima do botão "Gerar PDF completo com desenhos", adicionar `Select` compacto **"Qualidade dos desenhos"** com opções **Alta (200 DPI)** e **Normal (150 DPI)** — estado local `qualidadePdf`, default `"alta"`. Esse valor é enviado em `pdfJob.iniciar({...qualidade_desenhos: qualidadePdf})`. Não afeta a visualização em tela.
- `imprimirTodas` (`window.print` em massa) continua desabilitado quando `pdfJob.isBusy`, sem outras mudanças.

### `docs/backend-impressao-op-pdf-job.md`
Atualizar para refletir o contrato novo:

- **POST** body aceita opcional `qualidade_desenhos: "normal" | "alta"` (default `"alta"`). Mapeia para 150 ou 200 DPI no normalizador A4.
- **Recomendações de performance** (informativas, não normativas):
  - Cache em disco dos JPGs A4 normalizados, chave `nome_arquivo + mtime + size + pagina + dpi`; segunda geração reaproveita.
  - Backend lê os desenhos direto do filesystem (`PASTA_DESENHOS_OP_PADRAO`), **não** via HTTP interno em `/desenho/impressao-a4/pagina`.
  - Normalização em paralelo com `ThreadPoolExecutor(max_workers=4)`.
  - Montagem do PDF via `reportlab`/`img2pdf` (imagens A4 já prontas, sem HTML pesado).
- **GET status** passa a poder retornar:
  ```json
  {
    "job_id": "...",
    "status": "PROCESSANDO",
    "etapa": "NORMALIZANDO_DESENHOS",
    "total_ops": 244,
    "processadas": 87,
    "percentual": 35,
    "mensagem": "Normalizando desenhos 87 de 244",
    "erro": null
  }
  ```
  `progresso` (0..1) continua aceito para compat; frontend prioriza `percentual`. Etapas válidas: `BUSCANDO_OPS`, `BUSCANDO_COMPONENTES`, `BUSCANDO_OPERACOES`, `LOCALIZANDO_DESENHOS`, `NORMALIZANDO_DESENHOS`, `MONTANDO_PDF`, `CONCLUIDO`.

## Fora de escopo

- Implementar cache A4, ThreadPool, `reportlab`/`img2pdf` no FastAPI.
- Mudar visualização em tela ou impressão de OP única (`window.print`).
- Cancelamento server-side do job ou histórico persistido.
