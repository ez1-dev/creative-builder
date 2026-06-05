# Tema dinâmico por unidade — /bi/comercial

Aplicar tema visual (fundo + cor primária/accent + borda dos cards) que muda conforme a unidade selecionada no filtro principal, **sem alterar o tema global** nem outras páginas.

## Escopo

- Apenas `src/pages/bi/ComercialPage.tsx` e um pequeno helper de tema.
- Sem alterar `index.css`, `tailwind.config.ts`, nem qualquer componente compartilhado da biblioteca BI.

## Mudanças

### 1. Novo arquivo `src/pages/bi/comercialTheme.ts`
Exporta o objeto `unidadeThemes` (GENIUS / ESTRUTURAL ZORTEA / CONSOLIDADO) exatamente com os valores fornecidos pelo usuário (gradient, primary, accent, cardBorder) e um helper `getUnidadeTheme(unidade)`.

### 2. `src/pages/bi/ComercialPage.tsx`

- Resolver `const theme = getUnidadeTheme(filters.unidade_negocio)`.
- Envelopar o conteúdo retornado em um `<div>` raiz com:
  - `style={{ background: theme.pageBackground }}`
  - CSS vars locais: `['--bi-primary']: theme.primary`, `['--bi-accent']: theme.accent`, `['--bi-card-border']: theme.cardBorder`
  - `className="min-h-full -m-4 p-4 md:-m-6 md:p-6 transition-colors duration-300"` (compensa o padding do layout pai para o gradient ocupar toda a área da página).
- Injetar um `<style>` escopado (via id único no root div, seletor `[data-bi-comercial-theme] ...`) que aplica:
  - Em todos os `.bi-grid > *` (cards/blocos do dashboard) e `WidgetFrame` raiz: `background: rgba(255,255,255,0.88); backdrop-filter: blur(8px); border-color: var(--bi-card-border);`
  - No chip de unidade ativa, botão "Aplicar", abas/tabs ativos do header, badges de drill ativos: cor de fundo/texto derivada de `var(--bi-primary)`.
- Atualizar o `style.chip` (chip da unidade no header) para também usar inline-style com `backgroundColor: theme.primary + '22'; color: theme.primary` em vez das classes hardcoded atuais.
- Para a "linha principal" dos gráficos: passar `theme.primary` como prop `color`/`seriesColor` apenas onde já existe esse parâmetro nos widgets de Comercial (Area/Line/Bar principais). Se um widget não aceita override, fica no padrão — não vamos mexer em componentes da biblioteca.

### 3. Garantias / não-mexer

- **NÃO** alterar tokens HSL globais nem tema do shadcn.
- **NÃO** tocar em `DashboardPage`, `PageHeader`, `FilterBar`, `WidgetFrame` ou qualquer arquivo de `src/components/bi/**`.
- Modo Editar Dashboard, drag-drop, salvar layout, AiChartGenerator e widgets salvos continuam intactos — só ganham o fundo translúcido por CSS escopado.

## Critérios de aceite

- Selecionar GENIUS → fundo gradiente laranja claro, chip/botões/destaques em laranja.
- Selecionar ESTRUTURAL ZORTEA → fundo azul claro, destaques em azul.
- Selecionar CONSOLIDADO → fundo neutro, accent roxo discreto.
- Demais páginas (`/biblioteca-bi`, `/producao/*`, etc.) inalteradas.
- Editar Dashboard, salvar e Gerar gráfico com IA seguem funcionando; blocos continuam contendo os componentes salvos.
