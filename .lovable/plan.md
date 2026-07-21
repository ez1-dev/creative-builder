## Objetivo
Impedir que nomes longos de Centro de Custo (e da coluna "Obs.") "vazem" sobre colunas vizinhas no grid do Razão (drill DRE/Balanço).

## Alteração
Arquivo único: `src/components/dre-studio/DrillDrawer.tsx`

1. **Coluna "Centro de Custo"** na linha de lançamento:
   - Envolver o conteúdo em um `<div>` com largura máxima fixa (`max-w-[220px]`), `truncate`, `whitespace-nowrap`, `overflow-hidden`, `text-ellipsis`.
   - Usar `truncateLabel` de `@/lib/textTruncate` para o texto exibido (limite ~40 chars) e manter o valor completo em `title` (tooltip nativo) + no `TooltipContent` já existente quando houver "Vários (N)"/fonte.
   - Aplicar também no `<TableHead>` com `w-[220px]` para travar a largura da coluna.

2. **Coluna "Obs." (histórico)**:
   - Mesmo tratamento: `max-w-[260px]` + `truncate` + `title` com o texto completo, para evitar sobreposição visível na captura enviada.

3. **Coluna "Conta Contábil"**:
   - Aplicar `max-w-[260px] truncate` na descrição, mantendo código visível.

Não alterar: exportação Excel (mantém texto integral), lógica de dados, modal de detalhe (mostra texto completo).

## Validação
- Abrir drill da linha 411020002 (screenshot) e conferir que "655 - E-655 Rocha Terminais Portuários..." fica truncado com "…" e não invade a coluna "Obs.".
- Hover mostra o nome completo.
- Excel exportado continua com texto integral.