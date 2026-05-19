## Problema

A tela **Demonstrativo de Compras e Recebimentos** (`/demonstrativo-compras-recebimentos`) já existe como rota e tem `ProtectedRoute`, mas não aparece na lista de telas em **Configurações → Perfis de Acesso**, então não é possível liberar a permissão para nenhum perfil (apenas admins conseguem acessar).

## Causa

O array `ALL_SCREENS` em `src/pages/ConfiguracoesPage.tsx` (linhas 26–58) — que alimenta a UI de permissões por perfil — não contém a entrada dessa rota. Outros catálogos (`screenCatalog.ts`, `AppSidebar`) já estão corretos.

## Correção

**`src/pages/ConfiguracoesPage.tsx`** — adicionar uma entrada em `ALL_SCREENS`, agrupada perto das demais telas analíticas/gerenciais:

```ts
{ path: '/demonstrativo-compras-recebimentos', name: 'Demonstrativo de Compras e Recebimentos' },
```

Posição sugerida: logo após `/painel-compras` ou junto do bloco de "compras/recebimentos" para ficar próximo de telas relacionadas.

## Fora do escopo

- Nenhuma alteração de backend, schema, RLS ou migração.
- Nenhuma alteração visual/layout da tela do Demonstrativo.
- Não mexer em `screenCatalog.ts`, `AppSidebar`, rotas ou `ProtectedRoute` (já corretos).

## Como validar

1. Entrar em **Configurações → Perfis de Acesso**, selecionar um perfil não-admin.
2. Confirmar que **"Demonstrativo de Compras e Recebimentos"** aparece na lista.
3. Marcar `can_view`, salvar, logar com usuário desse perfil e abrir `/demonstrativo-compras-recebimentos` — deve carregar normalmente em vez de cair em `NoAccessScreen`.
