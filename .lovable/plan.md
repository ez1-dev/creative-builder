# Eliminar pisca no resize/drag do BI Comercial

## Objetivo
Ao redimensionar/mover cards em `/bi/comercial` no modo edição:
- Sem `LoadingState`/skeleton.
- Sem UPDATE no banco durante o gesto.
- Soltar o mouse não dispara save.
- Persistência **somente** ao clicar em **Salvar Dashboard**.
- Sem remount dos Recharts.

## Causa raiz remanescente
Hoje o ciclo é: `onResizeStop → handleLayoutChange (debounce 700ms) → layout.saveLayout → load({silent:true}) → setWidgets (com nova geometria, identidade nova) → useMemo de blocks recomputa → ComercialDashboardGrid recebe novo objeto blocks → Recharts remontam`.

Mesmo silencioso, o reload do banco logo após cada gesto provoca novo `setWidgets` (geometria realmente mudou), o que invalida o `useMemo` de `blocks` e remonta os gráficos.

## Mudanças

### 1. `src/pages/bi/ComercialPage.tsx` — draft de layout em modo edição
- Substituir o debounce automático por **draft local**:
  - `const [layoutDraft, setLayoutDraft] = useState<{type;layout}[] | null>(null)`.
  - Ao entrar em edição (`setEditing(true)`): `setLayoutDraft(null)` (zera draft).
  - Ao sair sem salvar (Cancelar/`setEditing(false)`): `setLayoutDraft(null)` e descarta alterações visuais (o `PassagensLayoutGrid` já reseta `localLayout` a partir do banco quando `editing` vira false).
- `handleLayoutChange` passa a **apenas** atualizar `layoutDraft` em memória — **nunca** chama `layout.saveLayout`. Remover `pendingLayoutRef`, `saveTimerRef` e o `setTimeout` de 700ms.
- Novo botão/ação **Salvar Dashboard** (já existe o ícone `Save`/`editing`): ao clicar, faz `await layout.saveLayout(layoutDraft.map(...))`, limpa o draft, sai do modo edição.
- Novo botão **Cancelar**: descarta `layoutDraft` e sai do modo edição.
- As demais ações (`handleHide`, `handleDelete`, `handleConfigApply`, `handleConfigReset`, `handleAdd`, `handleResetLayout`) continuam salvando imediatamente — não envolvem gesto de drag/resize.

### 2. `src/pages/bi/ComercialPage.tsx` — estabilizar `blocks`
- Tirar `layout.widgets` das deps do `useMemo` de `blocks`. Trocar por uma chave estável que representa só o que de fato muda o conteúdo dos blocos:
  - `widgetsContentKey = layout.widgets.map(w => `${w.type}|${w.hidden?1:0}|${w.componentId??''}|${w.variant??''}|${w.customTitle??''}|${JSON.stringify(w.mapping??null)}|${JSON.stringify(w.options??null)}|${JSON.stringify(w.series??null)}`).join('~')`.
- Geometria (`layout.x/y/w/h`) **não** entra nessa chave — quem cuida dela é o `PassagensLayoutGrid` via `localLayout`. Assim resize/drag nunca recompõe `blocks`.
- Manter as demais deps (`kpis, mensal, ...`).

### 3. `src/hooks/useComercialLayout.ts` — `saveLayout` não recarrega durante edição
- Atualmente `saveLayout` chama `load({ silent: true })` no final. Manter o reload (preciso para refletir IDs novos em `add`/`hide`/`delete`), mas garantir que `load` só faz `setWidgets` quando o conteúdo realmente difere — a comparação `JSON.stringify` atual já cobre isso e os dados voltam idênticos ao que acabou de ser enviado, então `setWidgets` permanece com a mesma referência. Sem mudança de código, só validação.
- Adicionar guarda extra: em `mergeWithDefaults`, preservar a ordem/objetos atuais quando o item retornado for byte-a-byte igual ao já presente (evita nova identidade de array). Implementar comparando por tipo+layout+config e reaproveitando o objeto anterior quando coincidirem.

### 4. Pequenos ajustes de UX no header de edição
- Em `editing=true`, mostrar: `[Adicionar bloco] [Restaurar padrão] [Cancelar] [Salvar Dashboard]`.
- Em `editing=false`, mostrar: `[Editar]`.
- `Salvar Dashboard` fica desabilitado se `layoutDraft == null` (nada para salvar).

## Fora de escopo
- Sem mudanças no `PassagensLayoutGrid` (já está correto: emite só em `onDragStop`/`onResizeStop`).
- Sem mudanças nas queries de dados (`useQuery` continuam iguais; resize não dispara refetch).
- Sem mudanças na API/banco.

## Verificação
1. Abrir `/bi/comercial`, clicar Editar.
2. Arrastar e redimensionar vários cards — confirmar via Network que **nenhum** `PATCH/UPDATE dashboard_widgets` é disparado.
3. Confirmar visualmente: sem skeleton, sem flicker, gráficos não remontam.
4. Clicar **Salvar Dashboard** — único `update` no banco; recarrega silencioso; tela permanece estável.
5. Clicar **Cancelar** após mover algo — layout volta ao estado salvo.
