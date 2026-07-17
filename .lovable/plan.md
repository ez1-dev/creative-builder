# Ocultar descrição técnica do BI Comercial

## Onde aparece
`src/pages/bi/ComercialPage.tsx`, linha 1230. O `PageHeader` exibe para admins a descrição: *"Faturamento comercial validado (fonte_acao = VM_FATURAMENTO)."*.

## Alteração
- Remover a prop `description` do `PageHeader` (definir `undefined` para todos os usuários), eliminando a linha condicional `isAdmin ? "…" : undefined`.

## Fora de escopo
- Nenhuma outra alteração de comportamento, permissões ou dados.
- Constantes `VM_FATURAMENTO`/`fonte_acao` continuam existindo no restante do sistema.
