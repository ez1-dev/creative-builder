## Problema

No BI Comercial em smartphone/tablet, dois sintomas claros:

1. **Widgets fora do lugar / cortados**: o grid (`PassagensLayoutGrid`) só empilha quando a largura é `< 768px`. Em tablet (768–1023px) ele ainda renderiza com `cols=12` fixos, então gráficos que ocupam `w=4` viram colunas estreitíssimas e tabelas/cards vazam horizontalmente.
2. **"Trava ao navegar" (scroll preso)**: cada bloco do grid usa `overflow-auto` no wrapper. No mobile, quando o dedo encosta dentro do widget, o gesto vira scroll interno do widget (muitas vezes sem conteúdo extra para rolar) e a página principal não rola mais — o usuário precisa achar a "borda" entre blocos para conseguir descer. Some-se a barra de header com 10+ botões e o usuário fica preso.

## Mudanças

### 1. `src/components/passagens/PassagensLayoutGrid.tsx` — empilhar também em tablet e liberar scroll
- Subir o breakpoint compacto de `< 768` para `< 1024` (`isCompact = window.innerWidth < 1024`). Tablets também passam a empilhar 1 widget por linha — única forma de manter os blocos legíveis sem reformular toda a lógica de drag/resize.
- Atualizar o listener `resize` para o mesmo limiar.
- No render compacto (empilhado), trocar o wrapper de cada bloco para `overflow-visible` (ou nenhum overflow), de forma que o scroll do dedo bole a **página** e não fique preso ao widget.
- No render desktop (grid editável) manter `overflow-auto` como hoje.
- Manter banner "Edição de layout disponível em telas maiores" no modo compacto e desabilitar drag/resize (já é o comportamento atual quando `isCompact`).

### 2. `src/pages/bi/ComercialPage.tsx` — header e filtros mais enxutos no mobile
- Ações do header: hoje só "Biblioteca BI" e os 3 sincronizadores ficam `hidden md:inline-flex`. Mover também os botões "Adicionar bloco", "Restaurar padrão" e "Cor de fundo" para dentro de um `DropdownMenu` "Mais ações" visível só `< md`. Em `≥ md` continua exatamente igual.
- Sempre visíveis (qualquer largura): chip da unidade, "Editar dashboard" (ou Cancelar/Salvar quando `editing`), "Atualizar".
- Ajustar o `<div className="flex flex-wrap items-center justify-end gap-2">` para `justify-start sm:justify-end` para não criar "buracos" estranhos quando quebra linha no celular.
- Bloco "Gerar gráfico com IA" e bloco "Filtros": adicionar `data-no-drag` não é necessário (já não estão dentro do grid), mas garantir que o `Popover` da paleta de cores feche em mobile (`modal={true}` no `Popover`) para não bloquear toques.
- Cabeçalho de filtros já está OK desde a iteração anterior — sem mudança.

### 3. `src/components/AppLayout.tsx` — verificação rápida
- `main` usa `overflow-auto`. Não muda — esse é o container principal que precisa rolar. Apenas confirmar que nada interno consome o gesto (problema corrigido no item 1).

### 4. Validação
- `preview_ui--set_preview_device_viewport` em `mobile` (375px) e `tablet` (820px) na rota `/bi/comercial`:
  - widgets empilhados ocupando largura total, sem corte horizontal;
  - scroll vertical da página fluido ao tocar em qualquer widget;
  - header com 4–5 botões visíveis + menu "Mais ações" agrupando o resto;
  - filtros e chips quebram linha sem overflow.

## Fora de escopo

- Não muda dados, drill, IA, sincronizações nem layout salvo do usuário no desktop.
- Não mexe em outros dashboards (Passagens, Programação herdam a melhoria do grid de graça).
