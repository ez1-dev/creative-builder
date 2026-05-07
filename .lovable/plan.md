
## Objetivo

Refinar o visual da página `/biblioteca-bi` (Biblioteca BI — Componentes) sem alterar funcionalidades.

## Mudanças (apenas estética em `src/pages/BiComponentsDemoPage.tsx`)

1. **Header**
   - Acrescentar gradiente sutil ao fundo do header e um ícone decorativo grande à esquerda do título (`Sparkles`/`Library`).
   - Adicionar contadores resumo em badges (Nº de componentes, seções).

2. **Sidebar de catálogo (desktop)**
   - Aumentar largura para `w-60`, fundo em gradiente `from-card to-card/60`, sombra leve.
   - Item ativo com barra lateral à esquerda + gradiente horizontal + ícone colorido.
   - Cabeçalho da sidebar com badge contendo a quantidade de seções.

3. **Nav mobile**
   - Sticky no topo com blur, ícones nos botões.

4. **DemoBlock**
   - Cada bloco vira um card real (`rounded-xl border bg-card/50`) com hover que destaca borda e adiciona sombra.
   - Nome do componente em badge azul (`bg-primary/10`).
   - Linha tracejada separando o cabeçalho do conteúdo.

5. **WithApply** — botão "Aplicar" só fica 100% opaco no hover do gráfico.

6. **Seções** — `DashboardSection` ganha espaçamento maior entre seções (`space-y-12`).

Sem alteração de lógica, dados, rotas ou registries. Apenas classes Tailwind/tokens semânticos do design system (sem cores hardcoded).
