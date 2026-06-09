## Relatório Executivo de Faturamento

Nova página dentro do módulo BI Comercial onde o diretor monta o relatório em 3 passos (Filtros → Blocos → Gerar) e exporta em **PDF** e **PPTX**, com **comentários da IA**.

### Rota e navegação
- Nova rota `/bi/faturamento/relatorio-executivo` (lazy).
- Item no `AppSidebar` dentro de "BI / Comercial" → "Relatório Executivo".
- Botão "Gerar relatório executivo" no topo de `/bi/comercial` (atalho).

### Fluxo (wizard em 3 passos numa única tela)

**Passo 1 — Filtros**
- Período: presets (Mês atual, Mês anterior, Trimestre, YTD, 12 meses, Personalizado) + date range.
- Comparativos (toggles): `Ano anterior`, `Meta`.
- Multi-select com busca: Revenda, Cliente, Produto, Estado (UF). Reutiliza fontes já usadas no drill comercial.
- Nível de detalhe (radio): `Executivo curto` (KPIs + 2 gráficos + 1 ranking + comentários IA) ou `Completo` (todos os blocos + tabela analítica).

**Passo 2 — Blocos** (checkboxes, todos marcados por padrão no modo Completo)
- KPIs do topo (Faturado, Líquido, Impostos, Devolução, Ticket médio, vs Meta %, vs Ano anterior %).
- Evolução mensal (linha/área) + Meta vs Realizado.
- Rankings: Revenda, Cliente, Produto, Estado (top 10 cada, barras horizontais + tabela).
- Margem e impostos (% imposto sobre bruto, devolução %, líquido por categoria).
- Comentários automáticos por IA (3 seções: Destaques, Alertas, Recomendações).
- Tabela analítica final (paginada).

**Passo 3 — Pré-visualizar / Exportar**
- Renderiza o relatório em uma tela HTML A4-paisagem (tokens BI atuais, identidade azul corporativa).
- Botões: `Exportar PDF`, `Exportar PPTX`, `Imprimir`.

### Dados (reaproveitando camada BI existente)
- Hook novo `useRelatorioExecutivoFaturamento(filtros, blocos)` que orquestra chamadas já existentes:
  - KPIs e séries mensais: `comercialApi` + `comercialMetrics` (mesmas funções que `ComercialPage`).
  - Meta vs Realizado: `metasFaturamentoApi` (`bi_meta_faturamento`).
  - Rankings: usa o contrato de drill já documentado (`comercialDrillApi` níveis REVENDA/CLIENTE/PRODUTO/ESTADO) limitando top N.
  - Tabela analítica final: query paginada sobre `bi_faturamento` (mesma usada no drill DETALHES).
- Cache em memória durante a sessão para não refazer chamadas ao trocar blocos.

### Comentários por IA
- Edge function nova `relatorio-executivo-ia` (Supabase) que recebe o pacote de KPIs/rankings/series já calculados e retorna JSON `{ destaques: string[], alertas: string[], recomendacoes: string[] }`.
- Modelo: `google/gemini-3-flash-preview` via Lovable AI Gateway (sem chave do usuário).
- Frontend chama a função e renderiza as 3 listas no bloco "Comentários".

### Exportação

**PDF (no browser, sem dependência nova)**
- Estilo `@media print` na página do relatório: `@page { size: A4 landscape; margin: 12mm }`, `page-break-after: always` entre seções.
- Botão "Exportar PDF" dispara `window.print()` (usuário escolhe "Salvar como PDF"). Sem libs extras.

**PPTX (cliente)**
- Adicionar dependência `pptxgenjs`.
- Função `gerarPptx(dados)` monta:
  - Slide 1: Capa (logo/título/período/filtros aplicados).
  - Slide 2: KPIs (6 cards grandes).
  - Slide 3: Evolução mensal + Meta vs Realizado (chart como imagem PNG capturada do DOM com `html-to-image` — já leve, ~15kB).
  - Slides 4-7: Rankings (1 por dimensão).
  - Slide 8: Margem e impostos.
  - Slide 9: Comentários da IA (3 colunas).
  - Slide 10+: Tabela analítica (se modo Completo).
- Download direto pelo browser.

### Componentes novos
```
src/pages/bi/RelatorioExecutivoFaturamentoPage.tsx     # wizard + preview
src/components/bi/relatorio-executivo/
  FiltrosStep.tsx
  BlocosStep.tsx
  PreviewRelatorio.tsx        # layout HTML A4 paisagem
  blocos/KpisBloco.tsx
  blocos/EvolucaoMensalBloco.tsx
  blocos/RankingBloco.tsx     # genérico por dimensão
  blocos/MargemImpostosBloco.tsx
  blocos/ComentariosIaBloco.tsx
  blocos/TabelaAnaliticaBloco.tsx
  exportPptx.ts
src/hooks/useRelatorioExecutivoFaturamento.ts
supabase/functions/relatorio-executivo-ia/index.ts
docs/relatorio-executivo-faturamento.md                 # contrato e exemplos
```

### Fora do escopo
- Agendamento por e-mail / envio automático (pode virar fase 2).
- Edição livre do layout (drag-drop). O usuário escolhe blocos via checkbox, sem reposicionar.
- Novos endpoints no FastAPI — tudo via camada BI já existente e Lovable AI Gateway.

### Critérios de aceite
1. Em `/bi/faturamento/relatorio-executivo`, o usuário escolhe período/filtros/blocos e vê preview com dados reais.
2. "Exportar PDF" gera PDF paisagem legível com todos os blocos marcados.
3. "Exportar PPTX" baixa `.pptx` válido (abre no PowerPoint/Keynote/Google Slides) com 1 ideia por slide.
4. Bloco "Comentários IA" mostra 3 listas geradas pela edge function.
5. Modo `Executivo curto` cabe em 1 página PDF / 4 slides PPTX.
