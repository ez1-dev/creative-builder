

## Corrigir warnings de ref no KpiDeepSheet (Auditoria Apontamento Genius)

### Diagnóstico
A mensagem `[object Object],[object Object]` que você colou é uma explicação genérica de IA — **não está acontecendo na tela**. O que existe de fato no console hoje, na rota `/auditoria-apontamento-genius`, são dois warnings de React:

```
Warning: Function components cannot be given refs.
  Check the render method of `AuditoriaApontamentoGeniusPage`.
  → KpiDeepSheet
Warning: Function components cannot be given refs.
  Check the render method of `KpiDeepSheet`.
  → Dialog (Radix Sheet)
```

Causa: `KpiDeepSheet` é declarado como `export function KpiDeepSheet(...)` (sem `forwardRef`) e é usado dentro de um contexto onde algum ancestral (Radix Tooltip/Sheet/Provider) tenta encaminhar uma ref para ele. O segundo warning é a propagação do mesmo problema para o `Dialog` interno do `Sheet`.

Não quebra a tela, mas suja o console e atrapalha debug real.

### Correção

**Arquivo:** `src/pages/AuditoriaApontamentoGeniusPage.tsx`

1. Trocar a assinatura de `KpiDeepSheet` para usar `React.forwardRef`:
   - De: `export function KpiDeepSheet({ ...props }: KpiDeepSheetProps) { ... }`
   - Para: `export const KpiDeepSheet = React.forwardRef<HTMLDivElement, KpiDeepSheetProps>(({ ...props }, ref) => { ... });` + `KpiDeepSheet.displayName = 'KpiDeepSheet';`
2. Encaminhar a `ref` para o nó raiz interno do componente (provavelmente o `<Sheet>` envolve um `SheetContent` — passar o ref para um `<div ref={ref}>` que envolve o conteúdo, ou diretamente para `SheetContent` se aceitar).
3. Verificar se há outros componentes-função no mesmo arquivo recebendo ref implícito (ex.: subcomponentes usados dentro de `Tooltip`/`Popover`) e aplicar o mesmo padrão se necessário.

### Validação
- Recarregar `/auditoria-apontamento-genius`.
- Console deve ficar limpo dos dois warnings de `forwardRef`.
- Abrir um KPI (clicar num card) → o `Sheet` do drill-down deve continuar abrindo normalmente, com filtros, busca, ordenação e drawer de OP funcionando como antes.

### Fora de escopo
- Mudanças visuais ou de comportamento.
- Refatorar outros componentes-função do projeto.
- Qualquer ajuste em backend ou em dados (a API e o render dos dados estão corretos — não há `[object Object]` real na UI).

### Resultado
Os warnings de ref desaparecem do console, sem alterar nenhum comportamento visível da tela.

