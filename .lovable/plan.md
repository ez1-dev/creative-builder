# Corrigir piscadas e loops de renderização

## Problema
Console mostra `[Auth] profile loaded`, `[Auth] erp api ok` e `[useUserPermissions] ready` repetindo várias vezes — indica que `fetchProfile` roda em loop. Geolocation é disparada sem clique do usuário. Restam alguns formulários sem `<Label>` associado.

## Causa raiz identificada

1. **AuthContext** — `onAuthStateChange` dispara em todo refresh de token (a cada ~50min ou em foco de aba), e o handler chama `fetchProfile` novamente, refazendo login na API ERP e recarregando permissões. Além disso `setSession`/`setUser` são chamados mesmo quando o id do usuário não mudou, causando re-render em cascata em todos os consumidores.
2. **useUserPermissions** — depende de `erpUser` (string), o que é estável, mas é re-disparado toda vez que `AuthContext` re-renderiza criando novo objeto de contexto (porque o value do Provider é recriado a cada render sem `useMemo`).
3. **HeaderInfo** — chama `navigator.geolocation.getCurrentPosition` dentro de `useEffect` no mount, violando a regra do navegador (precisa de gesto do usuário).
4. **Labels** — alguns formulários (a confirmar via varredura) ainda não têm `<Label htmlFor>` ou `aria-label`.

## Mudanças

### 1. `src/contexts/AuthContext.tsx`
- Carregar profile **apenas quando o `user.id` mudar de fato**. Guardar `lastLoadedUserIdRef = useRef<string | null>(null)` e, dentro do handler de `onAuthStateChange` + do `getSession` inicial, só chamar `fetchProfile(id)` se `id !== lastLoadedUserIdRef.current`. Ignorar eventos `TOKEN_REFRESHED` e `USER_UPDATED` para fins de recarga de profile/ERP.
- Não chamar `setSession`/`setUser` se o id for igual ao atual (comparar por id, não objeto inteiro).
- Memoizar o `value` do `AuthContext.Provider` com `useMemo` dependendo apenas dos campos primitivos (`session?.user?.id`, `displayName`, `erpUser`, `erpConnected`, `approved`, `loading`).
- `fetchProfile` deixa de ser dependência de `useEffect` — usar `useRef` para função estável (ou marcar `eslint-disable` no array `[]`), evitando re-subscribe do listener.
- Remover console.log `[Auth] profile loaded` / `[Auth] erp api ok` ou rebaixar para `import.meta.env.DEV` para reduzir ruído.

### 2. `src/hooks/useUserPermissions.ts`
- Já depende só de `erpUser`. Adicionar guard `loadedForUserRef = useRef<string | null>(null)`: se `loadedForUserRef.current === erpUser` e dados já carregados, não refazer fetch.
- Comparar resultado novo com estado atual antes de `setPermissions` (shallow compare por tamanho + paths) para evitar setState idempotente.
- Rebaixar `console.log('[useUserPermissions] ready', ...)` para DEV-only.

### 3. `src/components/HeaderInfo.tsx`
- **Remover** o `useEffect` que chama `navigator.geolocation.getCurrentPosition` automaticamente.
- Iniciar `location` com o fallback do timezone (já há `getTimezoneFallback`).
- Adicionar pequeno botão/ícone "Usar minha localização" (ícone `MapPin` clicável com `aria-label`) que dispara `getCurrentPosition` apenas no `onClick`. Cachear o resultado em `localStorage` para não pedir de novo a cada visita.

### 4. Labels de formulário restantes
- Rodar varredura em `src/` por `<Input` / `<Textarea` / `<Select` sem `id`/`aria-label`/`<Label htmlFor>` próximo. Corrigir pontualmente os que sobrarem (o patch base nos componentes shadcn já gera fallback de id, mas o aviso "No label associated" só some com `<Label htmlFor>` explícito ou `aria-label`).
- Foco esperado: filtros em páginas que não usam os wrappers de `src/components/bi/filters/`.

### 5. Fora de escopo
- Erro `postMessage` em `lovable.js:26` é do iframe do preview do Lovable — não tocar.
- Não mexer em regra de negócio de BI/ERP.

## Validação
- Abrir app, fazer login, navegar entre 3 páginas → `[Auth] profile loaded` deve aparecer **uma única vez** no console.
- Trocar foco da aba e voltar → não deve recarregar profile.
- Recarregar a página (F5) → carrega 1x.
- Não deve haver prompt automático de geolocation; só após clicar em "Usar minha localização".
- Console do navegador limpo de "No label associated with a form field" e "Only request geolocation information in response to a user gesture".
