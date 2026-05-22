## Onda 6 — Consolidação do RelatorioPrintEngine

Objetivo: tornar o `RelatorioPrintEngine` o único caminho de impressão/PDF do sistema, eliminar dependência do backend para gerar PDF e remover o código legado de impressão da OP.

### 1. PDF da Impressão de OP via engine

- Adicionar botão **"Exportar PDF"** na `ImpressaoOrdemProducaoPage`, ao lado do "Imprimir visualização".
- Reaproveitar `opToPrintDocument(...)` + `exportPrintDocumentToPdf(...)` (já criados nas Ondas 3/5).
- Nome de arquivo: `OP_<cod_ori>_<num_orp>.pdf` (lote: `OPs_<n>_ordens_<timestamp>.pdf`).
- Mostrar `Loader2` no botão e `toast` em sucesso/erro.
- Funciona tanto para OP individual quanto para lote, e respeita o flag `quebrar_por_operacao`.

### 2. Exportação PDF do módulo Relatórios via engine (remover dependência do backend)

- Em `ReportPreview.exportar('pdf')`, parar de chamar `exportarRelatorio(id, 'pdf', ...)` no FastAPI.
- Substituir por: montar `genericReportToPrintDocument(...)` com os dados já em mão (`result.linhas`, `colunasExibir`, `layout`, `paramValues`) e chamar `exportPrintDocumentToPdf({ filename: <codigo>.pdf })`.
- Excel/CSV continuam no backend (sem mudança).
- Atualizar `gravarExecucao({ formato: 'pdf' })` para refletir geração client-side (campo `arquivo` preenchido com o nome local).
- Remover botão "PDF" desabilitado do toolbar (já feito na Onda 5) — agora o **"Imprimir / PDF"** abre o dialog que já tem ambos.

### 3. Adapters extras do engine

- Criar `adapters/etiquetaAdapter.ts` (esqueleto) para futuros relatórios estilo etiqueta/código de barras — placeholder documentado, sem implementação detalhada nesta onda.
- Documentar em `src/lib/relatorios/print/README.md` como criar um novo adapter (passos: input → `PrintDocumentBuilder` → blocos → `PrintRenderer`).

### 4. Aposentadoria controlada do motor legado da OP

- Manter `OpPrintSheet` e `OpPrintBatch` no repositório, mas:
  - Marcar com banner `@deprecated` no JSDoc.
  - Trocar o checkbox admin de "Usar novo motor" para **"Reverter para motor legado (em remoção)"**, com tooltip alertando que será removido na Onda 7.
- Centralizar logs: ao usar o legado, gravar em `error_logs` (módulo `impressao-op`, nível info) o motivo informado pelo admin — opcional, em um pequeno textarea inline.

### 5. Validação / QA

- Comparar visualmente OP individual e lote (novo × legado) em 3 OPs de tamanhos diferentes: 1 página, 3 páginas, 1 página + desenhos.
- Gerar PDF de um relatório SQL publicado (`relatorios`) com paginação, totalizadores e agrupamento; conferir cabeçalho/rodapé e quebras de página.
- Conferir que `relatorio_execucoes` registra `formato='pdf'` corretamente.

### Detalhes técnicos

- Nenhuma migração de banco nesta onda. Tabelas `relatorio_*` já comportam o necessário desde a Onda 2.
- Sem novos secrets ou edge functions.
- Arquivos novos:
  - `src/lib/relatorios/print/adapters/etiquetaAdapter.ts` (esqueleto).
  - `src/lib/relatorios/print/README.md`.
- Arquivos editados:
  - `src/pages/producao/ImpressaoOrdemProducaoPage.tsx` — botão Exportar PDF + label do checkbox.
  - `src/components/relatorios/ReportPreview.tsx` — `exportar('pdf')` client-side.
  - `src/components/producao/OpPrintSheet.tsx`, `OpPrintBatch.tsx` — JSDoc `@deprecated`.

### Fora de escopo (fica para a Onda 7)

- Remoção definitiva de `OpPrintSheet`/`OpPrintBatch`.
- PDF server-side com headless browser.
- Templates visuais por módulo no construtor de relatórios.