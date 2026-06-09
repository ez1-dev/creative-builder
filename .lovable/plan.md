# Refinar wizard do Relatório Executivo de Faturamento

Aplicar o layout selecionado (cards por seção + presets segmented + cards de blocos) somente na **etapa wizard** de `src/pages/bi/RelatorioExecutivoFaturamentoPage.tsx`. Lógica, hooks e etapa de preview ficam intactas.

## Mudanças (apenas frontend/UI)

**`src/pages/bi/RelatorioExecutivoFaturamentoPage.tsx`** — reescrever o bloco `if (etapa === 'wizard')` (linhas 151–262):

- Remover o `PageHeader` (substituído por header próprio dentro do card).
- Card único (`Card`) com:
  - **Header** interno: título "Relatório Executivo de Faturamento" + descrição curta. Usar tokens (`text-foreground`, `text-muted-foreground`, `border-b`).
  - **Seção 1 — Período**: cabeçalho com ícone Calendar em chip `bg-primary/10 text-primary`. Container `bg-muted/30 border border-border rounded-lg p-4` com:
    - Segmented control para presets (`inline-flex p-1 bg-muted rounded-lg`, botão ativo com `bg-background shadow-sm`). Detectar preset ativo comparando ini/fim atual.
    - Inputs Início/Fim AAAAMM lado a lado.
  - **Seção 2 — Filtros**: ícone Filter. Grid `grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4` com 5 campos (Unidade, Cliente, Revenda, Estado, Produto).
  - **Seção 3 + 4 lado a lado** em `grid md:grid-cols-12 gap-8`:
    - `md:col-span-4` Nível de detalhe (ícone FileText): dois `<label>` cards radio com título + subtítulo; ativo com `border-primary bg-primary/5`.
    - `md:col-span-8` Blocos do relatório (ícone LayoutGrid): grid `grid-cols-2 gap-3` com 6 cards toggleáveis (ícone + label + bolinha check). Ativo: `border-primary/40 ring-1 ring-primary/10`, ícone em `bg-primary/10 text-primary`, check `bg-primary`. Inativo: `border-border`, ícone em `bg-muted text-muted-foreground`, círculo vazio. Ícones por bloco: `Gauge` (KPIs), `TrendingUp` (Evolução), `BarChart3` (Rankings), `Percent` (Margem), `Sparkles` (IA), `Table` (Tabela).
  - **Footer sticky-like**: `border-t bg-muted/30 px-6 py-4 flex justify-end gap-3` com Cancelar (ghost) + Gerar relatório (primário com `Sparkles`).
- Container externo: `max-w-5xl mx-auto`.

### Padrões obrigatórios

- Somente tokens semânticos do design system: `hsl(var(--primary))`, `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-muted`, `border-border`, `bg-primary/5`, `border-primary/40`, `ring-primary/10`. **Nenhum `slate-*`, `blue-*`, `zinc-*`, `text-white`, `bg-black`** do protótipo.
- Reusar componentes shadcn já importados (`Card`, `Input`, `Select`, `Label`, `Button`) — substituir apenas a estrutura visual.
- Manter `RadioGroup`/`Checkbox` por trás (como `<input>` invisível ou usando o componente shadcn dentro do label), preservando acessibilidade e os handlers existentes (`setNivel`, `toggleBloco`, `setFiltros`, `aplicarPreset`).
- Ícones via `lucide-react` (adicionar imports: `Calendar`, `Filter`, `FileText`, `LayoutGrid`, `Gauge`, `TrendingUp`, `BarChart3`, `Percent`, `Table`, `Check`).

### Fora de escopo

- Etapa `preview` (documento impresso) — não alterar.
- Lógica de dados, hooks, IA, exportação PDF/PPTX.
- `relatorio.css` e CSS de impressão.
- Outras telas BI.

## Validação

1. `/bi/faturamento/relatorio-executivo` (etapa wizard) → visual igual ao protótipo aprovado, em tons azul corporativo do design system.
2. Presets selecionam o segmento certo (Mês atual / Anterior / Trimestre / YTD / 12m) e atualizam ini/fim.
3. Filtros, nível, blocos continuam editáveis e propagam para o estado.
4. "Gerar relatório" leva para a preview existente sem regressão.
5. Tema escuro continua legível (tokens semânticos).
