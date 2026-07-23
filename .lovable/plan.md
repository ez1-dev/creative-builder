# Drill-down na tela Fluxo de Caixa

O restante do prompt (Projeção com gráfico + saldo editável, cards de Vencidos, Direto conciliado, Indireto em 3 blocos, IA via SSE e exportação Excel) já está implementado em `src/pages/contabilidade/FluxoCaixaPage.tsx` e `src/lib/contabil/fluxoCaixaApi.ts`. Esta iteração cobre apenas o que é novo no prompt de 23/07: **drill-down** a partir de cada visão.

## O que muda

### 1. `src/lib/contabil/fluxoCaixaApi.ts` — novos endpoints
- `fetchDiretoDrill({ origem, anomes_ini, anomes_fim, codemp, codfil?, limite? })` → `GET /api/contabil/fluxo-caixa/direto/drill`. Tipos: `lancamentos[]` (lancamento, data, conta_caixa, tipo, valor, historico, usuario), `total_lancamentos`, `truncado`.
- `fetchProjecaoDrill({ tipo:'receber'|'pagar', venc_ini, venc_fim, vencidos?, codemp, codfil? })` → `GET /api/contabil/fluxo-caixa/projecao/drill`. Tipos: `titulos[]` (titulo, parceiro_codigo, parceiro, vencimento, valor_aberto), `total`, `total_titulos`.
- Ampliar tipos existentes para incluir campos opcionais `drill` vindos do backend:
  - `DiretoCategoria.drill?: { origem: string; params?: Record<string, unknown> }`
  - `CurvaPonto.drill?: { receber?: {...}; pagar?: {...} }`
  - `ProjecaoResponse.vencidos.drill?: { receber?: {...}; pagar?: {...} }`
  - `IndiretoItem.drill?: { tipo:'aglutinador'|'razao'; codagl?: number; contas?: string[]; params?: Record<string, unknown> }`

### 2. Novo componente `src/components/contabil/FluxoCaixaDrillDrawer.tsx`
Drawer único que renderiza três modos conforme o tipo do drill acionado:
- **Modo `direto`**: tabela de lançamentos (data, conta caixa, tipo E/S com badge, valor, histórico truncado com tooltip, usuário). Badge "truncado" + botão "Aumentar limite" (dobra `limite`, refaz fetch) quando `truncado:true`. Rodapé com `total_lancamentos` e soma.
- **Modo `projecao`**: tabela de títulos (título, parceiro, vencimento, valor_aberto), agrupável por parceiro (toggle). Cabeçalho mostra período/balde e se é `vencidos=true` (badge âmbar "Vencidos").
- **Modo `indireto→aglutinador`**: reaproveita `DrillAglutinadorTree` já existente (via `DrillIndicadorDrawer` ou renderizando a árvore direto passando `codagl`).
- **Modo `indireto→razao`**: reaproveita `DrillDrawer` (razão) já existente por conta.

Estado (`loading`, `erro`, `dados`) e cancelamento via `AbortController`.

### 3. `src/pages/contabilidade/FluxoCaixaPage.tsx` — tornar números clicáveis
- **Aba Projeção**:
  - Cards `Vencidos.receber` e `Vencidos.pagar` viram botões → abrem drawer modo `projecao` com `vencidos=true`.
  - Gráfico: onClick num ponto/mês da curva → menu com "Ver a receber" / "Ver a pagar" para o período correspondente (calcular `venc_ini`/`venc_fim` a partir do `periodo` — mês `AAAA-MM` ou semana `AAAA-Www`).
  - Tabela auxiliar da curva: colunas Entradas/Saídas viram links.
- **Aba Direto**: cada linha da tabela de categorias com `drill` → clique abre drawer modo `direto` usando `drill.origem` e o período já selecionado.
- **Aba Indireto**: cada `IndiretoItem` com `drill` vira link → abre drawer no modo apropriado (aglutinador ou razão), passando pelos componentes já existentes.

### 4. UX geral
- Cursor pointer + hover destacado apenas em números com `drill` presente (não forçar clique quando o backend não expõe ponteiro).
- Drawer largura ~880px, com header "Detalhe — <contexto>" e botão "Exportar" só quando o backend disponibilizar (fora do escopo desta iteração se não houver endpoint dedicado).
- Todos os valores usam `formatCurrency`; datas via `formatDate` já existente.

## Fora de escopo
- Alterações no fluxo de IA, no gráfico base, na exportação Excel ou nos endpoints principais — permanecem como estão.
- Não mexer em `DrillAglutinadorTree`, `DrillIndicadorDrawer` nem `DrillDrawer` (razão) além de importá-los.

## Verificação
- `tsgo` limpo.
- Smoke manual: abrir /contabilidade/fluxo-caixa → clicar em card Vencidos, em uma categoria do Direto e em um item do Indireto, confirmando que cada drawer carrega os dados corretos.
