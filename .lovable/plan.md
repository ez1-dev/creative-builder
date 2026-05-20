## Objetivo

Aplicar a direção "Enterprise high-density grid" no header e card de filtros da tela `/producao/impressao-op`, com agrupamento visual dos botões (Consultar destacado, trio Visualizar/Imprimir/Gerar PDF dentro de um container com borda, Limpar separado como destructive). Apenas frontend/presentation.

## Arquivo

- `src/pages/producao/ImpressaoOrdemProducaoPage.tsx` (linhas 707–871, bloco do return inicial).

## Mudanças

### Header
- Container: `max-w-[1400px]` no lugar de `max-w-7xl`.
- Breadcrumb: separadores como pontos (`h-1 w-1 rounded-full bg-muted-foreground/40`) em vez de `/`.
- Título: `text-2xl font-bold` (remover responsivo `md:text-3xl` para densidade enterprise).

### Action bar
- `Consultar`: botão primário sólido, `rounded-md px-5 py-2 shadow-sm`.
- Grupo secundário (`Visualizar`, `Imprimir`, `Gerar PDF`): envolvidos por `<div class="flex items-center gap-1 rounded-md border border-border bg-card p-1 shadow-sm">`, cada um `variant="ghost" size="sm"` com `h-8 rounded px-3 text-muted-foreground hover:bg-muted hover:text-foreground` e ícone `opacity-60`.
- `Limpar`: separado, `variant="outline" border-destructive/30 text-destructive hover:bg-destructive/10`.
- Remover o divisor vertical `<div class="mx-1 h-8 w-px bg-border" />`.

### Card de filtros
- Layout: `grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-x lg:divide-y-0 divide-border/60` (estrutura mais explícita que `flex-wrap`).
- Cada grupo: `flex flex-col gap-5 p-6`, label de grupo `text-xs font-bold uppercase tracking-widest text-muted-foreground` com bolinha `h-1.5 w-1.5` (azul `bg-primary` no grupo 1, `bg-muted-foreground/40` nos outros).
- Grupo 1 (Origem e Destino): reorganizar para Empresa em linha inteira no topo, e Pedido + Relatório de Produção numa subgrid 2 colunas abaixo (proporção mais equilibrada com os outros grupos).
- Grupo 3 (Refinamento): manter Centro / Componentes; `Imprimir desenhos da OP` vira label simples (sem caixa com borda extra). Botão "Testar diagnóstico" ganha destaque azul leve: `h-9 border-primary/30 bg-primary/5 text-primary font-bold uppercase`.
- Mover checkbox "Quebrar uma página por operação / centro de recurso" para um **rodapé do card** (`border-t border-border/60 bg-muted/30 px-6 py-4`), fora da coluna Refinamento. Mais visibilidade e simetria entre as três colunas.

### Tokens
- Apenas tokens semânticos (`bg-primary`, `border-border`, `text-muted-foreground`, `text-destructive`, `bg-muted/30`, `border-destructive/30`, `bg-primary/5`). Sem azul/slate hardcoded.

## Fora de escopo

- `OpPrintSheet`, `op-print.css`, layout de impressão, grid de OPs (linhas 874+), modal de diagnóstico, fetch/API, componentes shadcn (apenas consumidos com classes adicionais).
