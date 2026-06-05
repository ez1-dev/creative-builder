## Objetivo

Adicionar, no diálogo **Aplicar componente** da Biblioteca BI, um seletor de **Unidade de Negócio** (GENIUS / ESTRUTURAL ZORTEA / CONSOLIDADO) — apenas para páginas comerciais — que sobrepõe o filtro ativo da página para aquele widget específico.

## Páginas comerciais (escopo)

Páginas cujo `pageKey` é considerado comercial e que exibirão o seletor:
- `bi-comercial`
- `faturamento-genius`
- `metas-faturamento` (se estiver no registry; senão ignorar)
- `faturamento-validacao` (idem)

Marcaremos isso via uma flag no `pageRegistry.ts` (`supportsUnidadeNegocio: true`) para não usar lista hardcoded no diálogo.

## Mudanças

### 1. `src/lib/bi/pageRegistry.ts`
- Adicionar campo opcional `supportsUnidadeNegocio?: boolean` em `BiPageDef`.
- Marcar `true` em `bi-comercial` e `faturamento-genius` (e nos demais comerciais existentes no registry).

### 2. `src/components/bi/runtime/ApplyComponentDialog.tsx`
- Logo abaixo do seletor de **Bloco da página**, renderizar um bloco **Unidade de Negócio** somente quando `page?.supportsUnidadeNegocio === true`.
- UI no mesmo estilo dos cards de bloco: 3 radio-cards horizontais (GENIUS, ESTRUTURAL ZORTEA, CONSOLIDADO), com ícone, label e o subtítulo "Sobrepõe o filtro ativo da página".
- Estado local `unidadeNegocio: UnidadeNegocio` com default `'CONSOLIDADO'` (ou o valor atual do `liveCtx?.filtros?.unidade_negocio`, se existir).
- Resetar/inicializar junto com os demais estados no `useEffect(open)`.
- No resumo da pré-visualização (coluna direita), mostrar linha **Unidade:** `<valor>` com badge destacando que é override.
- No `save()`, incluir em `options`: `{ unidade_negocio: unidadeNegocio }`. Nenhum outro campo do payload muda.

### 3. Aplicação do override no runtime do widget
- Atualizar o ponto que renderiza widgets de usuário (ex.: `useDashboardBlocks`/runtime que injeta widgets) para, quando `widget.options.unidade_negocio` existir e a página suportar, mesclar esse valor sobre `ctx.filtros.unidade_negocio` antes de chamar `def.render`. Sem isso o override fica só como metadado.
- Confirmaremos o arquivo exato em build mode (provavelmente em `src/components/bi/runtime/...`), mas o ajuste é localizado: clonar o `ctx`, sobrescrever `filtros.unidade_negocio` e repassar.

## Fora de escopo

- Não alterar `componentRegistry`, `useUserWidgets`, FastAPI, ETL ou Cloud (a coluna `options` em `bi_user_widgets` já é JSON livre).
- Não adicionar Unidade em páginas não-comerciais.
- Não mudar o filtro global da página — o override é por widget.

## Critérios de aceitação

- Em `BI Comercial` e `Faturamento Genius`, o diálogo mostra o seletor de Unidade com 3 cards.
- Em outras páginas (Compras, Produção, Passagens, etc.) o seletor não aparece.
- Salvar persiste `options.unidade_negocio` no widget.
- Ao renderizar o widget, a unidade salva sobrepõe a unidade ativa da página alvo.
- Resumo da pré-visualização mostra a unidade escolhida.
