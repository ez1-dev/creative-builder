## Objetivo

Reverter o redirecionamento forçado para `/login` em `/biblioteca-bi` e, em vez disso, expor a tela em **Configurações → Permissões por Tela**, para que admins possam liberar/restringir o acesso por perfil — comportamento idêntico às demais telas do ERP.

## Mudanças

### 1. `src/App.tsx` (linhas 85–86)
Remover `<ProtectedRoute>` de `/bi-components-demo` e `/biblioteca-bi`, voltando a:
```tsx
<Route path="/bi-components-demo" element={<BiComponentsDemoPage />} />
<Route path="/biblioteca-bi" element={<BiComponentsDemoPage />} />
```
Assim a página fica acessível mesmo sem login (para preview/exploração do catálogo). O insert em `bi_user_widgets` continua exigindo sessão pelo RLS — o próprio dialog já mostra o aviso amarelo "Faça login" quando deslogado, comportamento que mantemos.

### 2. `src/pages/ConfiguracoesPage.tsx` (linha 26, `ALL_SCREENS`)
Adicionar a entrada da Biblioteca BI ao catálogo de telas:
```ts
{ path: '/biblioteca-bi', name: 'Biblioteca BI (Catálogo de Componentes)' },
```
Isso faz a tela aparecer na aba **Permissões por Tela** de cada perfil, podendo ser marcada como Ver/Editar.

### 3. `src/pages/BiComponentsDemoPage.tsx`
Aplicar gate "soft" usando `useUserPermissions()`:
- Se o usuário **está autenticado** e possui permissões carregadas (`hasPermissions === true`) **e** `canView('/biblioteca-bi') === false` → renderizar tela de "Sem acesso à Biblioteca BI" com botão para voltar a `/estoque` (mesma UX de `ProtectedRoute`, mas inline).
- Se **não está autenticado** ou `hasPermissions === false` (perfil novo/sem cadastro) → renderizar normalmente o catálogo (modo público de exploração). O dialog "Aplicar componente" continua bloqueando o save sem login.

Esse comportamento atende ao pedido: a tela não exige login para abrir, mas admins têm controle granular via Configurações para esconder/restringir do perfil quando quiserem.

### 4. `src/lib/screenCatalog.ts`
Adicionar entrada para que logs de navegação registrem nome correto:
```ts
'/biblioteca-bi': { codigo: 'BIBLIO_BI', nome: 'Biblioteca BI' },
```

### 5. `src/components/AppSidebar.tsx`
Verificar se o link da Biblioteca BI no menu lateral respeita `canView('/biblioteca-bi')` — se hoje está sempre visível, manter assim (já que a tela é pública); se está oculto sob permissão, garantir que apareça por padrão quando o perfil ainda não tem regra.

## Resultado

- `/biblioteca-bi` abre sem exigir login (catálogo navegável por qualquer um).
- Admin pode entrar em **Configurações → Perfis de Acesso → Permissões por Tela** e desmarcar "Ver" para o perfil X → usuários daquele perfil verão a tela de "Sem acesso".
- Aplicar componente continua exigindo sessão (RLS de `bi_user_widgets` inalterado), e o dialog já comunica isso com o banner amarelo.

Sem mudanças de schema ou RLS.
