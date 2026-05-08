## Diagnóstico atualizado da MAIANE

Verifiquei o banco e ela **não tem mais problema de permissão**:

- Tem 3 perfis incluindo `Administrador`.
- `can_view = true` em todas as 35 telas, inclusive `/estoque` e `/painel-compras`.
- Os 404 em `/api/fornecedores` que aparecem no log NÃO causam tela branca — `useFornecedores` engole o erro silenciosamente.

Como ela vê branco **tanto no app desktop quanto no navegador**, e sempre **depois do callback Microsoft**, o fix do `firstAllowedPath` (rodada anterior) já resolveu o caso "redireciona pra rota proibida". O que sobra é uma das duas coisas:

1. Algum ponto do app que retorna `null` durante `loading` e **trava nesse estado** (rede lenta, falha em fetch do perfil, profile fetch que nunca completa para um caso específico).
2. Algum erro silencioso depois do login que não estoura no `ErrorBoundary` global (só hooks travados), deixando a tela vazia.

Como você pediu mudanças defensivas (sem print do console dela disponível), vou blindar todos os pontos onde hoje a app pode mostrar branco indefinidamente.

## O que vamos mudar

Tudo é frontend. Nenhuma regra de negócio, nenhum schema.

### 1. Trocar todo `return null` de loading por um `LoadingScreen` com timeout

Hoje 4 lugares mostram literalmente nada enquanto carregam:

- `src/components/AppLayout.tsx` — `if (loading) return null;`
- `src/components/ProtectedRoute.tsx` — `if (loading) return null;` (no `ProtectedRoute` e no `PostLoginRedirect`)
- `src/pages/AuthCallback.tsx` — já tem spinner ✓ (manter)

Criar `src/components/AppLoadingScreen.tsx`:
- Mostra spinner + texto "Carregando…" no mesmo gradiente azul do login (consistência visual + zero chance de "branco").
- Recebe um `timeoutMs` (padrão 12 s). Após o timeout, mostra:
  - Mensagem "Estamos demorando mais do que o normal."
  - Botão **Recarregar** (`window.location.reload()`).
  - Botão **Sair** (limpa Supabase auth + `localStorage` e força ir pra `/login`).
- Usa só tokens semânticos do design system.

Substituir os 3 `return null` acima por `<AppLoadingScreen />`.

### 2. Endurecer o `AuthContext.fetchProfile` contra travar

Em `src/contexts/AuthContext.tsx`:

- Envolver `fetchProfile` num `try/catch/finally` real (hoje só tem `try/finally` e qualquer throw silencioso continua até o `finally`, mas a query interna do `app_settings` ou `user_access` pode rejeitar e cair fora do `setLoading(false)` se a Promise nunca resolver — adicionar **timeout de 8 s por query** com `Promise.race`).
- Se o profile não vier (`data == null`) → ainda assim `setApproved(false)`, `setLoading(false)` e logar `console.warn`.
- O `api.login` ERP já é não-fatal (try/catch interno), manter.
- Adicionar log claro no console (`[Auth] profile loaded`, `[Auth] erp api ok/fail`, `[Auth] permissions ready`) pra próximo print do DevTools dela render diagnóstico em segundos.

### 3. Endurecer o `useUserPermissions`

Em `src/hooks/useUserPermissions.ts`:

- Adicionar timeout (8 s) nas duas queries.
- Se uma query falhar, NÃO deixar `loading=true` para sempre — `setLoading(false)` + `permissions=[]`.
- Se `firstAllowedPath` ficou `null` E `isAdmin=true` (caso da MAIANE) → fallback para `/estoque` (admin sempre tem acesso a tudo na regra `is_admin`, inclusive RLS, não faz sentido mostrar "sem acesso").

### 4. Limpar estado stale do ERP no boot

Na entrada do `AuthProvider` (uma única vez no mount), antes de `getSession`, remover chaves antigas que podem quebrar:

- `localStorage.removeItem('erp_token')` se existir e estiver expirado / com formato inválido.
- Manter `erp_is_admin` (escrito pelo próprio fluxo).

Isso ajuda quem instalou o app desktop antigo: caso traga lixo do localStorage que faz `api.get` falhar antes do login automático.

### 5. ErrorBoundary mais útil

Em `src/components/ErrorBoundary.tsx`, adicionar um terceiro botão **Sair** que faz `supabase.auth.signOut()` + `localStorage.clear()` + redireciona para `/login`. Caso algum erro de render trave o app pós-login, o usuário consegue se livrar sem reinstalar.

## Detalhes técnicos

- Arquivos editados: `src/contexts/AuthContext.tsx`, `src/components/AppLayout.tsx`, `src/components/ProtectedRoute.tsx`, `src/hooks/useUserPermissions.ts`, `src/components/ErrorBoundary.tsx`.
- Arquivo novo: `src/components/AppLoadingScreen.tsx`.
- Não tocar em `vite.config.ts`, Electron, Supabase client, `.env`, edge functions ou backend FastAPI.
- Não mexer no fluxo do Microsoft callback em si (`/auth/callback`) — já tem spinner próprio.
- Continuar usando tokens semânticos (`bg-card`, `text-foreground`, `bg-gradient-...` já existente do login).

## Como isso resolve o caso da MAIANE

- Se ela travar no carregamento (rede ruim no momento exato), em vez de tela branca eterna ela **vê o spinner** e em ≤12 s aparece **botão Sair / Recarregar**.
- Se algum erro silencioso quebrar render, o `ErrorBoundary` agora oferece **Sair** sem reinstalar.
- Se a query de permissões retornar vazia transitoriamente para uma admin, o fallback manda para `/estoque` em vez da tela "Sem acesso liberado".
- Os `console.log` adicionados permitem diagnosticar em 5 s se ela mandar print do DevTools.

## Fora do escopo

- Backend FastAPI / `/api/fornecedores` (não causa branco).
- Mudanças no Supabase auth ou no fluxo OAuth Microsoft.
- Build novo do Electron (já temos o fix `base: './'` da rodada anterior — seguir distribuindo o instalador atualizado).
