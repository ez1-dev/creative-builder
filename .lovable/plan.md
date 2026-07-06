Em `src/pages/rh/ResumoFolhaPage.tsx`:

1. Remover o aviso técnico (linhas 573-579): bloco com `<Info />` + texto "Indicadores retornados pela API...".
2. Remover a seção Diagnóstico Técnico (linhas 612-692): todo o bloco `{!indisponivel && !semDados && isAdmin && ... <Collapsible>...</Collapsible> ... }`.

Nenhuma outra mudança.