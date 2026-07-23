## Nova página: Fluxo de Caixa (Tesouraria)

Criar `/contabilidade/fluxo-caixa` com 3 abas + Análise IA (streaming) + Export Excel, seguindo o mesmo padrão da tela de Indicadores Contábeis.

### Arquivos novos

**API layer** — `src/lib/contabil/fluxoCaixaApi.ts`
- Tipos: `ProjecaoResponse`, `DiretoResponse`, `IndiretoResponse` conforme JSON do backend
- `fetchProjecao({ codemp, codfil?, horizonte_dias, granularidade, data_base?, saldo_inicial? })`
- `fetchDireto({ codemp, codfil?, anomes_ini, anomes_fim })`
- `fetchIndireto({ codemp, codfil?, anomes_ini, anomes_fim })`
- `streamFluxoCaixaAnalise(params, { onMeta, onDelta, onDone, onErro, signal })` — reusar padrão de `indicadoresApi.streamIndicadoresAnalise` (fetch + ReadableStream SSE, header Authorization)
- `exportFluxoCaixaXlsx(params)` — fetch blob autenticado, download com `URL.createObjectURL`
- Base URL `VITE_API_BASE_URL` + timeout 60s (projeção/direto/indireto), 90s (análise stream sem timeout duro)

**Narrativa** — reutilizar `indicadoresNarrativa.ts` (`normalizarNarrativa`, `narrativaTruncada`).

**Página** — `src/pages/contabilidade/FluxoCaixaPage.tsx`
- Header: título "Fluxo de Caixa", período (anomes_ini/fim), filial, botões "Atualizar" e "Exportar Excel"
- Tabs: **Projeção** (padrão) · **Realizado — Direto** · **Realizado — Indireto**
- Card "Análise (IA)" full-width no rodapé com botão "Gerar análise" (streaming)

#### Aba Projeção (destaque)
- Controles: `horizonte_dias` (30/60/90/120/180), `granularidade` (mês/semana), `data_base` (date input), `saldo_inicial` (input editável — placeholder = valor contábil retornado)
- Card "Saldo inicial": mostra `saldo_inicial` + fonte (`saldo_inicial_fonte`); input para override → refetch
- Card "Vencidos" destacado: `vencidos.receber` (verde/atenção) e `vencidos.pagar` (vermelho), com nota "não entram na curva"
- Card "Menor saldo do horizonte": valor + período
- Alertas: banners amarelos com `alertas[]`
- **Gráfico principal** (recharts ComposedChart):
  - Linha `saldo_projetado` por `periodo` — marcar ponto do menor saldo com dot destacado
  - Barras `entradas` (verde) e `saidas` (vermelho) empilhadas/paralelas
  - Área vermelha nos períodos com `saldo_projetado < 0` (via ReferenceArea ou segment coloring)
- Tabela abaixo: periodo · entradas · saidas · fluxo_liquido · saldo_projetado

#### Aba Realizado — Direto
- Cards: caixa_inicial · caixa_final · variação · selo "Conciliado" (verde se `conciliado: true`, com residual)
- Tabela por categoria: categoria · atividade (badge) · entradas · saídas · líquido
- Tesouraria: badge/tooltip com `obs`, destaque visual no líquido

#### Aba Realizado — Indireto
- Cards: caixa_inicial · caixa_final · variação calculada vs real · selo conciliado
- 3 seções colapsáveis (Operacional / Investimento / Financiamento):
  - Lista de itens (descricao · valor) com formatação positivo/negativo
  - Subtotal destacado
- Rodapé: `observacoes[]` em texto pequeno

#### Análise IA (rodapé, full-width, mesmo padrão de Indicadores)
- Botão "Gerar análise" → abre stream SSE
- Renderização markdown progressiva via `normalizarNarrativa`
- Botão "Cancelar" durante geração (AbortController)
- Alerta amarelo "Gerar novamente" se `narrativaTruncada` detectar corte
- Metadata footer (modelo, chars, tempo)

#### Exportar Excel
- Botão no header → `exportFluxoCaixaXlsx` (fetch blob + Authorization), nome `fluxo-caixa-{anomes_ini}-{anomes_fim}.xlsx`

### Registro

- `src/App.tsx`: adicionar `<Route path="/contabilidade/fluxo-caixa" element={<FluxoCaixaPage />} />`
- `src/config/menuCatalog.ts`: adicionar item **Fluxo de Caixa** logo abaixo de **Indicadores Contábeis** em "Financeiro e Contábil", ícone `Waves` ou `TrendingUp`
- Central de Liberações: adicionar rota ao catálogo de permissões

### Padrões respeitados
- Tokens semânticos do design system (sem cores hardcoded — usar `text-success`, `text-destructive`, etc.)
- Header `ngrok-skip-browser-warning: true` + `Authorization: Bearer`
- Formatação BR (`Intl.NumberFormat`)
- Loading skeletons + error states com botão retry
