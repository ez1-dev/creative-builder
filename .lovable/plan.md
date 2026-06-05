## Problema
No BI Comercial, em **Editar dashboard**, o botão **Salvar Dashboard** só habilita quando o usuário redimensiona/move um bloco (atualiza `layoutDraft`). Mudanças no diálogo **Configurar bloco** (variante, título, cor/negrito do título, componente da Biblioteca BI, séries) e ações de **ocultar/excluir** já gravam direto no Cloud, então o botão Salvar nunca reflete essas mudanças — fica desabilitado mesmo quando há alterações.

## Objetivo
Toda alteração feita em modo edição passa por um **rascunho local** e o botão **Salvar Dashboard** habilita sempre que houver qualquer mudança pendente — não só ajustes de tamanho/posição.

## Mudanças em `src/pages/bi/ComercialPage.tsx`

### 1. Estado de rascunho unificado
Substituir o `layoutDraft` atual por dois estados:
- `layoutDraft: { type: string; layout: WidgetLayout }[] | null` (já existe — mantém para drag/resize).
- `configDraft: Map<string, Partial<SaveLayoutItem>> | null` — alterações pendentes por bloco (variant, componentId, mapping, options, customTitle, series, titleColor, titleBold, hidden).
- `pendingDeletes: Set<string> | null` — blocos marcados para exclusão.

Derivar `dirty = !!layoutDraft || (configDraft && configDraft.size > 0) || (pendingDeletes && pendingDeletes.size > 0)`.
Botão: `disabled={!dirty}`.

### 2. Handlers em modo edição passam a usar drafts
- `handleConfigApply` → escreve no `configDraft` (merge sobre `prev.get(type)`), **não** chama `layout.saveLayout`. Fecha o diálogo.
- `handleConfigReset` → escreve no `configDraft` os campos zerados (não persiste).
- `handleHide` → grava `{ hidden: true }` no `configDraft`.
- `handleDelete` → adiciona em `pendingDeletes` (mantém `confirm`). Fora do `configDraft`.
- `handleLayoutChange` → continua atualizando `layoutDraft`.
- `handleAdd` (Adicionar bloco) → continua persistindo direto (operação cria registro novo, mais simples manter imediato), mas marca dirty=false porque já está salvo.

### 3. Merge para preview imediato
Computar `effectiveWidgets` a partir de `layout.widgets`:
- aplica overrides do `configDraft` em cada widget;
- remove os de `pendingDeletes`;
- aplica posições/tamanhos do `layoutDraft`.

Usar `effectiveWidgets` em vez de `visibleWidgets` na renderização (`blocks`, `ComercialDashboardGrid`, `widgetsContentKey`). Isso dá feedback visual imediato sem persistir.

### 4. `handleSaveDashboard`
Monta a lista única para `layout.saveLayout([...])` combinando:
- todos os tipos com mudança em `configDraft` (com `layout` atual ou do `layoutDraft`);
- todos os tipos com mudança em `layoutDraft` (sem campos de config se não houver);
- chama `layout.deleteWidget(type)` para cada item de `pendingDeletes`.
Toast de sucesso/erro. Em erro, mantém drafts (não limpa) para o usuário tentar de novo. Em sucesso, limpa os três drafts e sai do modo edição.

### 5. `handleCancelEdit`
Limpa `layoutDraft`, `configDraft`, `pendingDeletes` e sai do modo edição (descartando alterações — `effectiveWidgets` volta a refletir o estado do banco).

### 6. `handleEnterEdit`
Garante drafts vazios ao entrar.

## Fora de escopo
- Outros dashboards (Passagens, Frota, Máquinas) — esta entrega é só BI Comercial.
- Histórico/undo granular além de Cancelar.
- Persistência incremental (continua tudo-ou-nada ao salvar).