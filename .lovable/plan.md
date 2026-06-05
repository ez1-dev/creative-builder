## Objetivo
Eliminar o erro `Cannot convert undefined or null to object` na rota `/bi/comercial` aplicando normalização defensiva em widgets, blocos, layouts e nos pontos que usam `Object.keys/values/entries` ou spread sobre objetos potencialmente nulos. Adicionar Error Boundary local para que um widget quebrado não derrube a tela inteira.

## Escopo dos arquivos

### 1. Normalizadores compartilhados (novo)
`src/lib/bi/normalize.ts`
- `normalizeWidget(widget)` — garante `options`, `config`, `data[]`, `series[]`, `filtros`, `layout`, `bloco_id`.
- `normalizeBlock(block)` — garante `id`, `titulo`, `layout`, `options`, `widgets[]`.
- `normalizeVisual(options)` — retorna `{ visual, legenda, rotulos, eixos, card }` todos com fallback `{}`.
- `normalizeLayoutResponse(resp)` — `{ blocks: [], widgets: [] }` quando nulos.

### 2. Error Boundary local
`src/components/bi/runtime/WidgetErrorBoundary.tsx` (novo)
- Captura erros de render de um widget.
- Mostra cartão amigável: "Não foi possível carregar este componente do dashboard. Verifique a configuração do widget."
- Mantém o restante do dashboard funcional.

### 3. `src/pages/bi/ComercialPage.tsx`
- Envolver render de cada widget/bloco com `WidgetErrorBoundary`.
- Passar blocos/widgets pelo normalizador antes de renderizar.
- Tratar widgets sem `bloco_id` movendo para `"bloco-principal"`.

### 4. `src/hooks/useComercialLayout.ts`
- Aplicar `normalizeLayoutResponse` na resposta da API.
- Garantir arrays mesmo quando backend retorna `null`.

### 5. `src/components/bi/runtime/UserWidgetsSlot.tsx` e `UserWidgetFrame.tsx`
- Normalizar widget antes de extrair `options`, `options.visual`, `filtros`.
- Trocar todo `{...widget.options}` por `{...(widget.options ?? {})}`.

### 6. `src/components/bi/runtime/ApplyComponentDialog.tsx`
- Linha 169: `Object.entries(f ?? {})`.
- Garantir `options`, `options.visual` com fallback ao montar payload.

### 7. `src/components/bi/runtime/ConfigureBiWidgetDialog.tsx` (editor visual)
- Aplicar padrão:
  ```ts
  const visual = widget?.options?.visual ?? {};
  const legenda = visual?.legenda ?? {};
  const rotulos = visual?.rotulos ?? {};
  const eixos = visual?.eixos ?? {};
  const card = visual?.card ?? {};
  ```

### 8. `src/components/bi/ai/AiChartGenerator.tsx`
- Linha 209: `Object.entries(result?.filtros ?? {})`.
- `const series = Array.isArray(chart?.series) ? chart.series : [];`
- `const filtros = chart?.filtros ?? {};`

### 9. `src/components/bi/runtime/SeriesEditor.tsx`, `AddBiWidgetDialog.tsx`
- Adicionar `?? {}` em `Object.values(COMERCIAL_METRICS ?? {})` / `COMERCIAL_WIDGETS` por segurança (estes são imports estáticos, mas mantém o padrão).

### 10. `src/components/passagens/PassagensLayoutGrid.tsx`
- Mesmo tratamento defensivo em qualquer `Object.keys/values/entries` e spread.

## Critérios de aceite
- `/bi/comercial` não exibe tela branca.
- Widgets com `options`, `visual`, `series`, `layout`, `config` nulos não quebram.
- Componentes inválidos mostram cartão de fallback amigável.
- Erro `Cannot convert undefined or null to object` deixa de aparecer.
- Editor de dashboard e "Gerar gráfico com IA" continuam funcionando.

## Riscos
- Mudar shape de widget pode afetar `ConfigureBiWidgetDialog` ao salvar — manter spread `{...(widget ?? {}), options: ...}` para preservar campos extras.
- Error Boundary precisa de `key` estável por widget para não congelar estado de erro entre renders.