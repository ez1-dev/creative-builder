## Problema

Inspecionei o PDF gerado e identifiquei três defeitos no exportador `src/lib/pdf/relatorioSemanalObraPdf.ts`:

1. **Baixa nitidez** — `html2canvas` está com `scale: 2`, mas o gráfico em tela tem só ~600px de largura e é embutido como imagem de 160mm no PDF. Resulta em texto granulado e linhas borradas (visível em todas as 7 páginas).
2. **Layout sobreposto** — a tabela é desenhada começando em `startY: imgY` (mesma altura do topo da imagem) e o cabeçalho “Salvar / Meta:” do card é capturado dentro da imagem do gráfico Meta. Em telas mais largas a área disponível para a tabela fica espremida e a leitura piora.
3. **Meta de Entrega Semanal incompleto** — o `data-chart-id="meta-entrega"` está apenas no card *semanal*, então o card **mensal** não entra no PDF. Além disso, no print atual aparece o input “Salvar” do admin dentro da imagem.

## Correções

### 1. `src/lib/pdf/relatorioSemanalObraPdf.ts`
- Subir `html2canvas` para `scale: 3` e `windowWidth = node.scrollWidth`, garantindo render em alta resolução.
- Antes de capturar, **clonar o nó** num container off-screen com largura fixa (ex.: `1400px`) para forçar o gráfico a renderizar maior, depois capturar e remover. Isso resolve nitidez sem mexer na UI.
- Ajustar o **layout das páginas de gráfico**:
  - Gráfico ocupa a largura útil (≈ 273mm) com altura ≈ 110mm.
  - Tabela vai **abaixo** do gráfico (`startY = imgY + imgH + 4`), não ao lado. Isso elimina sobreposição e permite tabelas largas (todas as colunas visíveis).
- Adicionar tratamento especial para o gráfico **Meta de Entrega Semanal**:
  - Capturar **dois cards separados** (`meta-entrega-semanal` e `meta-entrega-mensal`).
  - Gerar **duas seções** no PDF: “Meta de Entrega Semanal” e “Meta de Entrega Mensal”, cada uma com seu gráfico + tabela (Semana/Peso/Meta/Atingiu? e Mês/Peso/Meta/Atingiu?).
  - Ocultar temporariamente o input “Salvar” / Badge da meta durante a captura (via classe `pdf-hide` aplicada nos botões de ação).

### 2. `src/pages/producao/MetaEntregaSemanalChart.tsx`
- Renomear `data-chart-id="meta-entrega"` para `data-chart-id="meta-entrega-semanal"` no card semanal.
- Adicionar `data-chart-id="meta-entrega-mensal"` no card mensal.
- Adicionar classe `pdf-hide` no bloco do `<Input> + <Button>Salvar</Button>` e no `<Badge>` de meta, para que sumam na captura.
- Exportar as funções `groupWeeklyPeso` e `groupMonthlyPeso` para o gerador do PDF montar as tabelas corretamente (com colunas Meta e Atingiu?).

### 3. `src/lib/pdf/relatorioSemanalObraPdf.ts` (cont.)
- Adicionar utilitário `withHiddenPdfElements(node, fn)` que adiciona `style.visibility=hidden` em todos os `.pdf-hide` antes do `html2canvas` e restaura depois.
- Ler a meta semanal de `app_settings` (`producao.relatorio_semanal_obra.meta_semanal_kg`) para preencher as colunas “Meta” / “Atingiu?” nas tabelas das duas novas seções.

## Resultado esperado

- Imagens dos 8 gráficos nítidas (sem aliasing, texto legível).
- Sem sobreposição entre gráfico e tabela.
- Sem botão “Salvar” aparecendo na imagem do Meta de Entrega.
- O gráfico **Meta de Entrega Mensal** passa a aparecer no PDF (faltava).
- Tabelas de Meta com colunas: Semana/Mês, Peso entregue (kg), Meta (kg), Atingiu? (Sim/Não).

## Arquivos alterados

- `src/lib/pdf/relatorioSemanalObraPdf.ts` (refatoração da captura + layout)
- `src/pages/producao/MetaEntregaSemanalChart.tsx` (novos `data-chart-id`, classes `pdf-hide`, exportar helpers)

Sem novas dependências.