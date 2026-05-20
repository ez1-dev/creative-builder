## Objetivo
Aplicar a direção visual "Modern enterprise portal" à tela `/producao/impressao-op`, focada no header (breadcrumb + título + barra de ações) e no card de filtros (três grupos). Tipografia mais hierárquica, campos com mais respiro e responsivos ao tamanho da coluna, centralização da página, mantendo tokens semânticos do design system (sem cores hardcoded). Sem mudanças funcionais.

## Arquivo único
`src/pages/producao/ImpressaoOrdemProducaoPage.tsx` (apenas o JSX nos blocos do header/command bar e do card de filtros — linhas ~707–870 — e o helper `Field` no fim do arquivo).

## Mudanças

### 1. Container e largura
- Envelopar o conteúdo principal em `mx-auto w-full max-w-7xl` para centralizar em telas grandes (viewport atual 2052px exibe os filtros muito esticados).

### 2. Header (linhas 710–754)
- Breadcrumb: `uppercase tracking-wider text-[11px] font-medium`, último crumb `text-primary`.
- Título: subir para `text-2xl md:text-3xl font-bold tracking-tight`.
- Separador vertical antes dos botões secundários (`h-8 w-px bg-border`).
- Botão "Consultar": principal, `px-5 py-2.5 rounded-lg font-semibold shadow-sm` (variante default do shadcn já é primary).
- Demais botões (Visualizar/Imprimir/Gerar PDF): `variant="outline"`, `rounded-lg`, ícone em `text-muted-foreground`.
- "Limpar": fundo suave destrutivo (`bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15`), mantendo `rounded-lg`.

### 3. Card de filtros (linhas 756–870)
- Card: `rounded-xl border-border shadow-sm` (já tem `overflow-hidden`).
- Trocar `divide-border` por `divide-border/60` para divisores mais sutis entre os 3 grupos.
- Padding de cada grupo: `p-6` (hoje é `p-4`).
- Espaçamento interno entre campos: `space-y-4` (hoje `space-y-3`) e `gap-4` no grid interno.
- Remover o `bg-muted/30` exclusivo do grupo 1 — manter fundo neutro uniforme nos três (a direção escolhida não tinge o primeiro grupo).
- Cabeçalho de cada grupo: `mb-5`, bolinha do grupo 1 em `bg-primary`, demais em `bg-muted-foreground/40` (mantém), label `text-[11px] font-bold uppercase tracking-widest text-muted-foreground`.

### 4. Field (linhas 1229–1236)
- Label: `text-xs font-semibold text-foreground/80` para mais hierarquia.
- Gap: `gap-1.5`.
- Wrapper: `min-w-0` para evitar que rótulos longos estourem em colunas estreitas.
- Adicionar `truncate` ao Label (`<Label className="... truncate">`), garantindo que rótulos como "Ordem de Produção" não quebrem layout em colunas estreitas.

### 5. Subgrupo "Incluir desenhos" + "Testar diagnóstico" (linhas 825–853)
- Reorganizar para coluna `flex-col gap-2`: o checkbox "Imprimir desenhos da OP" ocupa a linha inteira (`w-full`) e o botão "Testar diagnóstico" fica abaixo com `w-full` também, evitando truncamento em larguras médias.
- Manter ícones e textos. Checkbox label: `text-xs font-medium text-foreground/80`.

### 6. Checkbox "Quebrar uma página por operação..." (linhas 859–865)
- Em vez de cápsula com borda, transformar em linha mais leve dentro de uma "trilha" separadora: `flex items-center gap-3 pt-3 mt-1 border-t border-border/60`, sem border-box. Mais legível e alinhado com a direção.

### 7. Helper text (linha ~1056)
- Mudar para `text-sm font-medium text-muted-foreground` com "Consultar" em `text-foreground` (já existe — apenas reforçar tipografia).

## Fora de escopo
- `OpPrintSheet`, `op-print.css`, layout de impressão.
- Grid de OPs (linhas 872+) e modal de diagnóstico — não foram cobertos pela direção visual escolhida.
- Lógica de fetch/estado e qualquer alteração de comportamento.
- Componentes `SelectBuscavel`, `OpAutocomplete`, `Button`, `Card` do shadcn — só consumidos com classes adicionais, não modificados.
