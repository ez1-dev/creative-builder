## Objetivo

Adicionar, na tela **Relatório Semanal Obra**, um botão **"Exportar PDF"** que gere um PDF com **todos os gráficos de barras** da página + **tabelas de valores** correspondentes a cada gráfico (dados que alimentaram cada barra).

## O que será incluído no PDF

Capa com:
- Título "Relatório Semanal Obra"
- Período (Data inicial / Data final dos filtros)
- Filtros aplicados (Obra, Projeto, Peso mín/máx)
- Data/hora de geração e usuário
- KPIs (Total Obras, Projetos, Cargas, Peças, Peso Total)

Para cada gráfico, uma seção com **gráfico (imagem) + tabela de valores** logo abaixo:
1. Top 10 Obras por Peso (kg) — barras horizontais + tabela (Obra, Peso kg)
2. Top 10 Obras por Peças — barras + tabela (Obra, Peças)
3. Top 10 Obras por Cargas — barras + tabela (Obra, Cargas)
4. Evolução Semanal — linhas + tabela (Semana, Peso, Peças, Cargas)
5. Peso Médio por Carga (Top 10) — barras + tabela (Obra, kg/carga)
6. Participação por Cliente (Peso) — pizza + tabela (Cliente, Peso, %)
7. Meta de Entrega Semanal (do `MetaEntregaSemanalChart`) — gráfico + tabela

## Abordagem técnica

**Captura dos gráficos:** usar **`html2canvas`** para serializar cada `<Card>` Recharts já renderizado em PNG, depois embutir no PDF com **`jspdf`**. Esse par é leve, roda 100% no client e dispensa backend.

**Geração do PDF:** `jspdf` (paisagem A4) + `jspdf-autotable` para as tabelas de valores formatadas.

**Cálculo dos dados das tabelas:** reutilizar exatamente as mesmas funções de agregação já usadas em `RelatorioSemanalObraCharts.tsx` (`topByMetric`, `groupByWeek`, `clientShare`, peso médio/carga). Vou **exportar essas funções** do arquivo de charts para evitar duplicação.

**Onde plugar o botão:** na `PageHeader` da `RelatorioSemanalObraPage.tsx`, ao lado do botão "Exportar Excel" existente, novo botão `Exportar PDF` (variant outline, ícone `FileDown`).

**Estado de origem dos dados:** usar `consolidatedRows` (já contém todas as páginas consolidadas para alimentar os gráficos) + `kpiTotals` + `filters`.

## Arquivos

**Novo:**
- `src/lib/pdf/relatorioSemanalObraPdf.ts` — função `gerarRelatorioSemanalObraPdf({ rows, kpis, filters, chartContainer })`. Faz a captura dos gráficos via `html2canvas`, monta capa, percorre cada gráfico capturando o `<Card>` correspondente (lookup por `data-chart-id`) e renderiza tabelas com `autoTable`.
- `src/components/erp/ExportPdfButton.tsx` — botão genérico com loading, recebe um callback `onExport: () => Promise<void>`.

**Editado:**
- `src/components/erp/__tests__/ExportPdfButton.test.tsx` — teste mínimo de render + click invocando o callback.
- `src/pages/producao/RelatorioSemanalObraCharts.tsx`:
  - Adicionar `data-chart-id="<key>"` em cada `ChartCard` (peso, pecas, cargas, evolucao, pesoMedioCarga, clientes).
  - Exportar as funções helper `topByMetric`, `groupByWeek`, `clientShare`, `obraLabel` para reuso no gerador de PDF.
  - Envolver o grid em um `ref` (`chartsContainerRef`) opcional, ou expor via `forwardRef`.
- `src/pages/producao/MetaEntregaSemanalChart.tsx`: adicionar `data-chart-id="meta-entrega"` no card raiz.
- `src/pages/producao/RelatorioSemanalObraPage.tsx`:
  - Criar `chartsRef = useRef<HTMLDivElement>(null)` envolvendo a área dos gráficos.
  - Adicionar `<ExportPdfButton>` na `PageHeader actions`, junto ao Excel.
  - Handler `handleExportPdf` chama `gerarRelatorioSemanalObraPdf` passando rows/kpis/filtros/ref.
  - Botão fica desabilitado se `consolidatedRows.length === 0`.

**Dependências a instalar:** `jspdf`, `jspdf-autotable`, `html2canvas`.

## Comportamento

- Se ainda não houver consulta executada, botão desabilitado com tooltip "Consulte primeiro".
- Durante geração: spinner + toast "Gerando PDF…"; ao concluir: download `relatorio-semanal-obra-AAAA-MM-DD.pdf` + toast sucesso.
- Se a consolidação ainda estiver em andamento (`kpiLoading`), o PDF usa o snapshot atual de `consolidatedRows` e exibe aviso "Dados parciais — consolidação em andamento" no rodapé da capa.
- Erros de captura são logados via `errorLogger` (módulo `relatorio-semanal-obra-pdf`).

## Fora de escopo

- Exportação PDF para outras telas de produção (pode ser replicado depois reutilizando `ExportPdfButton` + função genérica).
- Mudanças no backend FastAPI.
- Personalização de estilo/branding do PDF além do cabeçalho padrão.
