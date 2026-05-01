# Plano: Fallback de login em `/gestao-sgu-usuarios`

## Objetivo
Quando um usuário acessar `/gestao-sgu-usuarios` sem estar autenticado (ou sem permissão), em vez de ser redirecionado silenciosamente para `/login` ou `/estoque`, exibir uma página explicativa com:
- mensagem clara de que é necessário fazer login;
- botão "Entrar com Microsoft" (vai para `/login`);
- botão "Voltar ao dashboard" (vai para `/estoque`).

Também corrigir o problema reportado anteriormente: a tela não aparece em **Configurações → Perfis de Acesso** porque está faltando no array `ALL_SCREENS`.

## Mudanças

### 1. Nova rota pública de fallback no `App.tsx`
Hoje `/gestao-sgu-usuarios` está dentro de `<AppLayout />`, que força redirect para `/login` quando não autenticado. Para que o fallback apareça, vamos:

- Manter a rota protegida normal `/gestao-sgu-usuarios` (acesso autenticado e com permissão → renderiza `GestaoSguUsuariosPage`).
- Dentro de `ProtectedRoute` / `AppLayout`, em vez de redirecionar, deixar o componente decidir o conteúdo. Abordagem mais simples: criar um componente novo `GestaoSguUsuariosGate` que:
  - usa `useAuth()` e `useUserPermissions()`;
  - se `!isAuthenticated` ou `!approved` → renderiza `<GestaoSguUsuariosFallback />`;
  - se autenticado mas sem `canView('/gestao-sgu-usuarios')` → renderiza fallback variante "sem permissão";
  - caso contrário → renderiza `<GestaoSguUsuariosPage />`.
- Registrar a rota fora do `AppLayout` autenticado (rota pública), igual a `/passagens-aereas/compartilhado`, para não cair no redirect global de `AppLayout`. Assim o fallback aparece mesmo deslogado.

### 2. Novo componente `src/pages/GestaoSguUsuariosFallback.tsx`
Página simples, sem sidebar, com:
- ícone de cadeado (`Lock` do lucide);
- título: "Acesso restrito";
- subtítulo: "Você precisa estar autenticado para acessar **Gestão SGU - Usuários ERP Senior**.";
- variante "sem permissão": "Sua conta não tem permissão para esta tela. Solicite ao administrador a liberação em Perfis de Acesso.";
- botão primário **Entrar com Microsoft** → `navigate('/login')`;
- botão secundário **Voltar ao dashboard** → `navigate('/estoque')`;
- usa tokens semânticos do design system (sem cores hardcoded).

### 3. Registrar a tela em `ConfiguracoesPage.tsx`
Adicionar no array `ALL_SCREENS`:
```ts
{ path: '/gestao-sgu-usuarios', name: 'Gestão SGU - Usuários ERP Senior' },
```
Sem isso, a tela não aparece na lista de permissões e nenhum perfil consegue marcá-la, mantendo o item invisível na sidebar.

### 4. Sidebar (`AppSidebar.tsx`)
Já existe entrada para `/gestao-sgu-usuarios`. Após o passo 3 e marcar a permissão no perfil Admin, o item aparece automaticamente. Sem alteração de código aqui.

## Arquivos afetados
- `src/App.tsx` — mover rota `/gestao-sgu-usuarios` para fora de `AppLayout` (ou usar gate próprio) e apontar para o novo gate.
- `src/pages/GestaoSguUsuariosFallback.tsx` — **novo**.
- `src/pages/GestaoSguUsuariosPage.tsx` — passar a usar o gate no topo (ou criar wrapper separado em `App.tsx`).
- `src/pages/ConfiguracoesPage.tsx` — adicionar entrada em `ALL_SCREENS`.

## Pós-implementação (ação do usuário)
1. Ir em **Configurações → Perfis de Acesso**.
2. Editar o perfil Admin (ou o desejado).
3. Marcar **"Gestão SGU - Usuários ERP Senior"** como visível.
4. Salvar e recarregar — item aparece na sidebar; acesso direto à URL deslogado mostra o fallback.

Aprova para eu implementar?
