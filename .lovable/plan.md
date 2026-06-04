## Causa raiz do pisca-pisca em "Editar Dashboard"

`PassagensLayoutGrid` (usado por Passagens, Frota, Máquinas e BI Comercial via `ComercialDashboardGrid`) chama `onLayoutChange` continuamente durante drag/resize do `react-grid-layout`. Para Passagens/Frota/Máquinas isso é inofensivo (acumula em `pendingLayout` e só persiste no botão Salvar). Já em **`src/pages/bi/ComercialPage.tsx` (handleLayoutChange, linha 451)** cada disparo executa `layout.saveLayout(next)`, que:

1. Faz N requests `UPDATE dashboard_widgets` (um por widget) — durante o arrasto isso vira dezenas por segundo;
2. Ao final chama `load()` em `useComercialLayout` que `setLoading(true)` → `setWidgets(...)` com nova identidade;
3. `loading=true` troca o grid por `<LoadingState>` e depois remonta os cards → flash visual e remount de todos os Recharts.

Soma-se isso a `blocks` ser reconstruído sempre que `layout.widgets` muda de identidade (dep array em `ComercialPage` linha 446) — todo card recebe `ReactNode` novo e remonta.

## Mudanças (sem alterar regra de negócio)

### 1. `src/components/passagens/PassagensLayoutGrid.tsx`
- **Parar de emitir durante o drag/resize.** Em `handleLayoutChange` continuar atualizando apenas o `localLayout` (visual), mas **não chamar `emit(next)`**.
- Manter `emit` apenas em `handleStop` (onDragStop/onResizeStop) e em `stepResize` (botões +/-/setas), que já são "commits" naturais.
- Efeito colateral positivo: Passagens/Frota/Máquinas recebem `pendingLayout` somente no fim do gesto (menos re-renders do toolbar de Salvar/Cancelar). Sem mudança de UX nem de API do componente.

### 2. `src/pages/bi/ComercialPage.tsx`
- Trocar `handleLayoutChange` por uma versão **debounced (700 ms)** que apenas agenda o save; salvar imediatamente já não é necessário porque o grid passa a comitar só no stop. O debounce serve de blindagem caso o usuário faça vários movimentos seguidos.
- Garantir que, durante a edição, o grid mantenha o layout local mesmo se chegar um `load()` em background (já protegido pelo efeito `widgetGeometryKey + editing`).

### 3. `src/hooks/useComercialLayout.ts`
- `saveLayout`: deixar de chamar `setLoading(true)` em `load()` quando for um reload pós-save. Solução cirúrgica: extrair `load()` em duas variantes ou adicionar parâmetro `silent` → faz o refetch e o `setWidgets` sem alternar `loading`, evitando troca para `<LoadingState>` no meio da edição. Não mexe em endpoints nem RLS.
- Adicionalmente, `setWidgets` com **igualdade rasa via JSON.stringify** das linhas relevantes para não mudar identidade quando nada efetivo mudou (evita rebuild do `blocks` em `ComercialPage`).

### 4. Memoizar render do bloco no grid (defensivo)
- Em `PassagensLayoutGrid`, envolver o wrapper `<div key={w.type}>...{blocks[w.type]}</div>` em um `React.memo` interno que recebe `{ widget, isEditing, child }`. Como `key={w.type}` já é estável, isso reduz re-render dos cards quando só o `localLayout` muda.

### 5. Não tocado de propósito
- Não alterar Passagens/Frota/Máquinas (já usam pendingLayout + botão Salvar — comportamento correto).
- Não alterar Recharts/`ResponsiveContainer` (já usam `width="100%" height="100%"` dentro de container com altura controlada pelo grid). Se após 1–4 ainda houver flicker em algum chart específico, atacamos pontualmente.
- Não alterar `useEffect`s de carregamento (`load()` só roda em `enabled` ou troca de `dashboardId`).
- Não mexer em `loadProfile`/`loadPermissions` (já corrigidos em iteração anterior).

## Validação
- Em `/bi/comercial`, entrar em modo edição, redimensionar/arrastar um card: console não deve mostrar `UPDATE` repetido e a tela não pode trocar para skeleton. Soltar o mouse → ocorre 1 save.
- Em `/passagens-aereas`, `/manutencao-frota`, `/manutencao-maquinas` → comportamento de "Salvar/Cancelar" permanece idêntico, apenas com menos atualizações intermediárias de estado.
