## Remover alertas de divergência de usuário no Razão

Hoje, quando o backend marca `usuario_origem_difere=true`, a UI mostra:

1. Linha do grid pintada de âmbar (`!bg-amber-100/60`) com barra lateral âmbar.
2. Badge "Diferente do lançamento" ao lado do usuário de origem.
3. Ícone `AlertTriangle` âmbar na célula do usuário de lançamento, com sublinhado pontilhado e tooltip.
4. Caixa de alerta "Divergência de usuário — Documento emitido por X, lançado por Y" no topo do modal de detalhe.
5. Chip amarelo "DIFERE" no cabeçalho da seção "Rastreabilidade da origem" (linhas ~1097/1194) e o texto explicativo âmbar da linha 1264.

O usuário quer o Razão limpo: sem realce amarelo, sem ícones de alerta e sem a mensagem "Divergência de usuário".

### Mudanças em `src/components/dre-studio/DrillDrawer.tsx`

- Remover as classes de destaque âmbar/sky da `TableRow` (linhas 847–848), mantendo apenas o zebrado (`i % 2 === 1 && "bg-muted/20"`) e hover padrão.
- Remover o sublinhado, o `AlertTriangle` e o Tooltip da célula "Usuário Lcto." (linhas 1004–1029): exibir sempre `usuarioLancamentoDisplay` como texto simples.
- Remover o badge "Diferente do lançamento" (linhas 983–987).
- Remover a caixa "Divergência de usuário" no modal (linhas 1168–~1180).
- Remover o chip âmbar "DIFERE" no header do modal (linhas 1097–1099) e o chip equivalente na seção Rastreabilidade (linha 1194).
- Remover o texto âmbar explicativo (linha 1264) que descreve a divergência.
- Manter os campos "Usuário Origem" e "Usuário Lcto." exibidos normalmente (sem cor/aviso) — a informação continua visível, sem destaque.
- Manter o chip "Vários documentos" (ambiguo) — não é sobre divergência de usuário, é sobre múltiplos documentos casarem por número; útil e não é o que o usuário pediu para remover. (Confirmar se deve manter — vou manter por padrão; se quiser remover também, avise.)
- Remover import `AlertTriangle` de `lucide-react` se ficar sem uso.

### Fora do escopo

- Contrato do endpoint drill-lancamentos (o campo `usuario_origem_difere` continua sendo recebido, apenas não afeta mais o visual).
- Export Excel (não usa realce visual).
- Outros indicadores da grid (badge Documento/Lote, chip Vários documentos, badge Rateio).
