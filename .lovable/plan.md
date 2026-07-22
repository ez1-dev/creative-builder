## Problema

No **Mapa de Acessos**, os nomes das colunas (telas/funcionalidades) aparecem cortados como `Esto…`, `Sug…`, `Ond…`, etc. porque o `<div>` rotacionado (-70°) está com `max-w-[130px] truncate` dentro de uma célula de apenas 34px — o flex encolhe o texto e o `truncate` corta antes da rotação.

## Ajuste

Em `src/components/configuracoes/MapaAcessosPanel.tsx`, header da tabela (~linhas 396–403):

1. Aumentar a altura do header de `140px` para `180px` (mais espaço para o texto rotacionado).
2. No `<div>` rotacionado:
   - Adicionar `w-[170px]` explícito (para não ser espremido pelo flex de 34px).
   - Trocar `truncate` por `overflow-visible`.
   - Aumentar fonte de `text-[11px]` para `text-xs` e deixar levemente mais escuro (`text-foreground/80`) para leitura.
   - Manter rotação `-70deg` e o tooltip com nome completo (já existe).
3. Aumentar a largura mínima de cada coluna de `w-[34px]` para `w-[36px]` para dar respiro visual.
4. Ajustar o `min-w` da célula "Usuário" se necessário (mantém `220px`).

Sem mudanças de lógica, dados ou export.
