## Objetivo

Nos 8 dashboards de RH (`ResumoFolha`, `QuadroColaboradores`, `ContratoExperiencia`, `Ferias`, `Turnover`, `Absenteismo`, `Formularios`, `RelatorioGerencial`), trocar o auto-save por um fluxo explícito **Editar layout → alterar → Salvar edição / Cancelar**. Toda alteração feita em modo edição (arrastar, redimensionar, ocultar/reexibir, configurar gráfico, adicionar widget da Biblioteca BI, excluir widget) só é persistida ao clicar em "Salvar edição". "Cancelar" descarta e volta ao estado do servidor.

## Situação atual

- `useRhModuleLayout` grava direto no Cloud a cada mudança (`saveGeometries`, `hideWidget`, `showWidget`, `configureWidget`, `addWidget`, `deleteWidget`). O toggle "Editar layout / Concluir" só habilita/desabilita o drag no `RhDashboardGrid`.
- Usuário relata que as edições não estão sendo respeitadas e pede um botão explícito para salvar.

## Mudanças

### 1. `src/hooks/useRhModuleLayout.ts` — modo edição bufferizado

Adicionar estado de rascunho ativo quando `editing === true`:

- `pendingItems: Map<type, RhSaveLayoutItem>` — mudanças a persistir (layout/hidden/config/title/position).
- `pendingDeletes: Set<string>` — widgets a excluir no commit (por `id` real).
- `snapshotRef` — cópia de `widgets` + `dashboardId` no momento em que entrou em edição, para permitir cancelar.
- `hasPendingChanges` — derivado, exposto para a toolbar habilitar/desabilitar botões.

Comportamento novo das mutações:

- Quando `editing === true`: `saveGeometries`, `hideWidget`, `showWidget`, `configureWidget`, `addWidget`, `deleteWidget` **apenas** atualizam o estado local (`setWidgets`) e registram intenção no `pendingItems` / `pendingDeletes`. Nenhuma chamada ao banco.
- Quando `editing === false`: comportamento atual (auto-save) preservado, para não quebrar telas que ainda dependam disso.

Novas ações expostas:

- `beginEdit()` (chamado por `setEditing(true)`): tira snapshot, limpa pendentes.
- `commitEdits()`: promise. Executa `runSave(Array.from(pendingItems.values()))` seguido dos deletes (por id) em paralelo; em sucesso, `setEditing(false)`, limpa pendentes e recarrega silencioso; em erro, mantém `editing` verdadeiro e faz `toast.error`.
- `cancelEdits()`: `setWidgets(snapshot.widgets)`, limpa pendentes, `setEditing(false)`, `await load({ silent: true })` para garantir sincronia.
- `setEditing`: normalizado — `setEditing(true)` chama `beginEdit`; `setEditing(false)` sem passar pelos botões força `cancelEdits` (protege navegação/teste). A toolbar sempre usará `commitEdits`/`cancelEdits`.

Retorno atualiza para incluir: `commitEdits, cancelEdits, hasPendingChanges`.

### 2. `src/components/rh/RhLayoutToolbar.tsx` — botões Salvar/Cancelar

- Novas props: `onCommit: () => Promise<void>`, `onCancel: () => Promise<void>`, `hasPendingChanges: boolean`, `saving: boolean` (opcional; toolbar gerencia com `useState`).
- Quando `editing === true`, substituir o botão "Concluir" por:
  - `Cancelar` (variant `outline`, ícone `X`) → chama `onCancel`.
  - `Salvar edição` (variant `default`, ícone `Save`) → chama `onCommit`; desabilitado quando `!hasPendingChanges && !saving` (não trava se o usuário quer só sair sem mudar — nesse caso ele usa Cancelar; regra: habilitado sempre que houver pendências, ou permitir clicar sempre e fechar sem salvar? — habilitar sempre que houver pendências; caso contrário, mostrar tooltip "Nenhuma alteração para salvar" e o usuário sai por Cancelar).
- Botão "Editar layout" (fora do modo edição) mantém-se igual.
- "Resetar layout" e "Adicionar da Biblioteca BI" continuam disponíveis dentro do modo edição.
- Se `hasPendingChanges && !saving`, ao clicar em "Cancelar" abrir `AlertDialog` de confirmação ("Descartar alterações não salvas?").

### 3. Wiring nas 8 páginas RH

Cada página precisa apenas repassar as novas props para a `RhLayoutToolbar`. Nenhuma outra mudança de layout / grid é necessária (drag/hide/configure já funcionam via `RhDashboardGrid`).

Arquivos:

- `src/pages/rh/ResumoFolhaPage.tsx`
- `src/pages/rh/QuadroColaboradoresPage.tsx`
- `src/pages/rh/ContratoExperienciaPage.tsx`
- `src/pages/rh/ProgramacaoFeriasPage.tsx`
- `src/pages/rh/TurnoverPage.tsx`
- `src/pages/rh/AbsenteismoPage.tsx`
- `src/pages/rh/FormulariosPage.tsx`
- `src/pages/rh/RelatorioGerencialPage.tsx`

Em cada `<RhLayoutToolbar ... />` acrescentar:

```
onCommit={layout.commitEdits}
onCancel={layout.cancelEdits}
hasPendingChanges={layout.hasPendingChanges}
```

## Validação

1. `/rh/quadro-colaboradores` → Editar layout → arrastar bloco, ocultar bloco, trocar componente pela engrenagem, adicionar widget da Biblioteca BI.
2. Confirmar: recarregar a página **antes** de salvar → todas as mudanças descartadas.
3. Repetir e clicar em "Salvar edição" → recarregar → mudanças permanecem.
4. Repetir e clicar em "Cancelar" → tela volta ao estado do servidor imediatamente.
5. Rodar mesmos passos nas outras 7 páginas RH.
6. Verificar que fora do modo edição não é possível arrastar (comportamento atual do `RhDashboardGrid`).