## Problema

No toggle de arredondamento de números do BI (botões **Sem decimais**, **Abreviado**, **Milhões (MI)** e o botão **Usar padrão**), as escolhas parecem aplicar na hora, mas ao recarregar a página o valor volta para o anterior. Ou seja: a persistência em `user_preferences.bi_display_prefs` não está acontecendo (ou falha silenciosamente).

### Causa raiz

Em `src/hooks/useBiDisplayPrefs.ts`, a função `persist()` faz upsert mas:

1. **Engole o erro** num `try/catch` com apenas `console.warn`. Se o upsert for rejeitado (RLS, payload inválido, sessão expirada, etc.) o usuário nunca vê — a UI fica otimista até dar refresh, então o valor "some".
2. **Não checa `{ error }`** retornado pelo `supabase.from('user_preferences').upsert(...)`. PostgREST/Supabase não lança em erro de RLS — devolve `error` no objeto. Sem ler isso, nada é detectado.
3. **Race com a carga inicial**: o botão "Usar padrão" (e o `ToggleGroup` durante alguns ms entre montagem e o fim do `reload()`) podem ser clicados antes de `userIdRef.current` estar preenchido. O `persist()` faz `if (!uid) return` e descarta o save silenciosamente. O `ToggleGroup` tem `disabled={loading}`, mas o botão "Usar padrão" **não**.
4. **Sem re-leitura após salvar**, qualquer divergência entre estado otimista e o que ficou no banco só aparece em outro mount.

## Solução

Apenas no hook `src/hooks/useBiDisplayPrefs.ts` e, complementar, no `NumberRoundingToggle.tsx` para travar o botão "Usar padrão" enquanto carrega.

### Mudanças

**1. `src/hooks/useBiDisplayPrefs.ts`**

- `persist(next)`:
  - Se `userIdRef.current` for `null`, aguardar `supabase.auth.getUser()` uma vez antes de desistir — só sai com erro se realmente não houver sessão.
  - Capturar `{ error }` do `upsert` (em vez de só `try/catch`). Em caso de erro:
    - Reverter `setPrefs` para o valor anterior (snapshot tirado antes do `setPrefs(next)`).
    - Mostrar `toast.error('Não foi possível salvar a preferência de números. Tente novamente.')` com a mensagem do erro no `description`.
    - `console.error` para diagnóstico.
  - Em caso de sucesso, sem toast (mudança é frequente, ruído indesejado).
- Trocar o `console.warn` mudo por log estruturado.

**2. `src/components/bi/runtime/NumberRoundingToggle.tsx`**

- Passar `disabled={loading}` também no botão "Usar padrão" (hoje só o `ToggleGroup` está bloqueado durante o load).

### Fora de escopo

- Não mexer em RLS, migrations ou na coluna `bi_display_prefs` (a política `Users can update own preferences` já permite o upsert e foi validada na migration `20260605045949...`).
- Não mexer no `numberFormatMode` singleton nem nos formatadores.
- Não tocar em outros consumidores de `useBiDisplayPrefs` (página Biblioteca BI).

## Validação

1. Logar como admin, abrir `/bi/comercial`.
2. Trocar para "Sem decimais" → recarregar a página → continuar em "Sem decimais".
3. Trocar para "Abreviado" → recarregar → continuar.
4. Trocar para "Milhões (MI)" → recarregar → continuar.
5. Clicar "Usar padrão" → recarregar → toggle exibe o padrão global e o botão "Usar padrão" some.
6. Simular falha (DevTools → bloquear `user_preferences`) e confirmar que aparece toast de erro e o toggle volta para o estado anterior.
