## Objetivo
Nos gráficos e no dashboard do Painel de Compras, exibir **nomes de fornecedores e projetos abreviados e em CAIXA ALTA**.

## Regras de formatação
- **Caixa alta**: aplicar `toLocaleUpperCase('pt-BR')` (mantém acentuação correta).
- **Abreviação**:
  - Truncar por comprimento máximo (padrão: 22 caracteres nos eixos horizontais/barras verticais; 32 em barras horizontais).
  - Remover sufixos jurídicos redundantes antes de truncar: `LTDA`, `LTDA.`, `S/A`, `S.A.`, `SA`, `EIRELI`, `ME`, `EPP`, `CIA`, `INDUSTRIA`, `INDÚSTRIA`, `COMERCIO`, `COMÉRCIO`, `IMPORTACAO`, `IMPORTAÇÃO`, `EXPORTACAO`, `EXPORTAÇÃO` (quando aparecerem no fim ou como palavras isoladas ao final).
  - Colapsar espaços múltiplos.
  - Se ainda exceder o limite, cortar e acrescentar `…`.
- **Tooltip** continua mostrando o **nome completo original** (só a label do eixo/barra é abreviada).

## Onde aplicar
Somente frontend/apresentação. Nada de mudança em endpoints, filtros ou agregação.

1. `src/lib/format.ts` — adicionar helpers:
   - `formatFornecedorLabel(nome, max?)`
   - `formatProjetoLabel(nomeOuCodigoProjeto, max?)`
   - `toUpperPt(str)` interno
   - `stripLegalSuffixes(str)` interno
2. `src/pages/PainelComprasPage.tsx` — aplicar nos datasets/labels dos gráficos:
   - Top Fornecedores (barras horizontais) → label abreviada; `name` completo no tooltip.
   - Top 10 Projetos (barras horizontais) → idem.
   - Drill/agrupamentos que exibem fornecedor/projeto em eixo de gráfico.
   - Tooltip customizado (`ChartMoneyTooltip`) recebe o nome completo.
3. `src/components/compras/PainelDrillView.tsx` — nas células de tabela do drill, exibir fornecedor/projeto em CAIXA ALTA (sem truncar, pois é tabela; truncamento fica só nos gráficos).
4. Widgets do catálogo `src/lib/bi/comprasWidgetCatalog.ts` que renderizam fornecedor/projeto — usar mesmos helpers na função de label.

## Fora do escopo
- KPIs numéricos, filtros, endpoints, Lista Detalhada (mantém nomes originais em tabela — apenas caixa alta se pedido depois).
- Outras dimensões (centro de custo, família, origem) — permanecem como estão.
- Biblioteca BI Comercial / demais páginas.

## Verificação
- Abrir `/painel-compras`, conferir Top Fornecedores e Top 10 Projetos: labels curtas em CAIXA ALTA, tooltip com nome completo.
- Conferir drill: colunas Fornecedor/Projeto em caixa alta.
