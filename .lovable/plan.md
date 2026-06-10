## Problema

Quando você adiciona um card da Biblioteca BI (ex.: "Faturamento — Realizado/Meta/Diferença"), ele aparece no dashboard mas **sem o cabeçalho cinza de arrastar e sem os botões de redimensionar/configurar/excluir/ocultar**, mesmo em modo de edição. Os blocos canônicos (ex.: Tabela mensal) continuam com a barra completa.

## Investigação

Pela leitura do código (`PassagensLayoutGrid.tsx`), a barra de edição é renderizada quando `editing === true`, e os botões de configurar/excluir já tratam `w.type.startsWith('custom-')`. Em teoria deveria funcionar — então há um bug que só aparece em runtime. Suspeitas principais:

1. O wrapper do react-grid-layout não está incluindo o novo widget na lista `orderedWidgets` no primeiro render (por causa do filtro `blocks[w.type] && !w.hidden`), e ele acaba caindo num `<div>` fora do grid (sem chrome).
2. O `layout` do novo widget vem com `w`/`h` zerados ou ausentes, fazendo o grid colapsar o item.
3. O Card interno (`KpiTriStackCard` com `h-full`) está sobrepondo a barra de chrome por algum z-index/overflow.

## Plano

1. **Reproduzir em build mode** abrindo `/bi/comercial` no preview, entrando em modo Editar, adicionando o card "Faturamento — Realizado/Meta/Diferença" pela aba "Da Biblioteca BI" e inspecionando:
   - O HTML do widget recém-adicionado (existe o wrapper com `pt-11` e a `.drag-handle`?).
   - O objeto salvo em `dashboard_widgets` (campos `layout`, `hidden`, `type`).

2. **Corrigir conforme a causa real**, em uma das seguintes frentes (escolhida após o passo 1):
   - Garantir que `AddBiWidgetDialog` sempre crie o widget com um `layout` válido `{x:0, y:Infinity, w:6, h:4}` (já é feito hoje — confirmar).
   - Em `useComercialLayout.mergeWithDefaults`, garantir que widgets `custom-*` recém-criados entrem no array final com layout normalizado.
   - Em `PassagensLayoutGrid`, ajustar para não filtrar widgets sem layout válido — usar fallback antes do filtro.
   - Se for sobreposição visual, ajustar z-index/overflow do wrapper para a barra ficar acima do `KpiTriStackCard`.

3. **Validar** que após adicionar o card:
   - Barra cinza de arrastar aparece (com o título do card).
   - Botões de largura, altura, ⚙ configurar, 🗑 excluir e × ocultar funcionam.
   - Arrastar reposiciona o card e o "Salvar" persiste a nova posição.
   - Recarregar a página mantém o card editável.

## Escopo

- Apenas o BI Comercial (`/bi/comercial`) e o grid compartilhado `PassagensLayoutGrid`.
- Sem alterações em backend/ETL.
- Sem alterar visual interno do `KpiTriStackCard` (só o wrapper do grid, se necessário).
