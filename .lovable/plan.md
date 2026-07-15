## Objetivo

Melhorar a tabela **Limite Férias** em `/rh/programacao-ferias` para dar hierarquia visual, sinalizar urgência e reduzir o ruído das células vazias.

## Problemas hoje

- Tabela ocupa muito espaço com dezenas de "-" repetidos (ruído visual).
- Não há distinção entre um limite **vencido** (ano < atual) e um **futuro** (ano ≥ atual) — todos os "1" aparecem em azul primário.
- Sem realce do mês atual nem totais por coluna.
- Ordem cronológica dos anos oculta os casos mais críticos (mais antigos).
- Coluna TOTAL não comunica gravidade.

## O que vai mudar (apenas UI do card `pivot-ferias`)

### 1. Densidade e legibilidade
- Célula vazia deixa de mostrar `-` — vira espaço discreto (`text-muted-foreground/30 · "·"`).
- Larguras fixas por mês (`w-14`) e tabulação numérica; linha compacta (`h-9`).
- Coluna Ano ganha destaque tipográfico e ícone de status.

### 2. Sinalização por urgência (semântica)
- **Vencido** (ano < ano atual): badge vermelho suave `bg-[hsl(var(--destructive)/0.12)]`, texto destructive; ícone `AlertTriangle` na coluna Ano.
- **Vence este ano** (ano == atual): badge amber; ícone `Clock`.
- **Futuro** (ano > atual): badge azul/primary neutro; sem ícone.
- Célula com valor recebe fundo tonal (não só texto colorido) para facilitar leitura em telas grandes.

### 3. Ordenação e resumo
- Ordenar por urgência (vencidos primeiro, depois anos crescentes) por padrão; toggle discreto "Ordenar por ano".
- Linha `TableFooter` com **totais por mês** e total geral (destaque na cor do agregado dominante).
- Coluna do **mês atual** com fundo `bg-muted/40` para localização rápida.

### 4. Cabeçalho do card
- Título "Limite Férias" ganha subtítulo com o total geral e contagem de vencidos, ex.: `12 no total · 5 vencidos · 4 vencem em 2026`.
- Badge do ano atual como âncora visual.

### 5. Estados
- Skeleton mantém formato (linhas com blocos de mês), sem flash — reaproveita padrão anti-flicker já implementado.
- Empty state amigável ("Nenhum limite de férias no período") em vez de "Sem dados".

## Fora do escopo

- Não altera API, tipos (`LimiteFeriasPivotRow`), filtros, KPIs, PDF, nem a segunda tabela ("Programação Próximos 90 Dias").
- Cliques nas células continuam abrindo o drawer existente (`openPivotCell` / `openPivotTotal`).

## Arquivos

Editados:
- `src/pages/rh/ProgramacaoFeriasPage.tsx` — apenas o bloco `pivot-ferias` (~40 linhas), imports de ícones e helpers locais.

Nenhum arquivo novo.