

# Restringir Configurações apenas para Administradores

## Abordagem

Usar o sistema de permissões já existente nas tabelas `user_access` e `profile_screens` para controlar quem vê o menu "Configurações". O usuário logado (via `erp_user`) será verificado contra o banco de dados.

## Alterações

### 1. Criar hook `useUserPermissions`
Novo arquivo `src/hooks/useUserPermissions.ts`:
- Busca no Supabase as permissões do usuário logado (`user_access` → `profile_screens`)
- Retorna: lista de telas permitidas e flag `isAdmin` (tem acesso a `/configuracoes`)
- Usa o `usuario` do `AuthContext` para fazer a consulta

### 2. Atualizar `AppSidebar.tsx`
- Importar `useUserPermissions` e `useAuth`
- Filtrar a lista `modules` para esconder "Configurações" se o usuário não tiver permissão de visualização para `/configuracoes`

### 3. Proteger a rota `/configuracoes` em `App.tsx`
- Criar componente wrapper `AdminRoute` que verifica permissão
- Se o usuário não tem acesso, redireciona para `/estoque`

### 4. (Opcional) Aplicar filtro de permissões a TODAS as telas
- Além de Configurações, o sidebar pode ocultar qualquer tela que o perfil do usuário não tenha `can_view`
- As rotas também podem ser protegidas

## Fluxo
```text
Login ERP → usuario = "JOAO.SILVA"
         → consulta user_access WHERE user_login = "JOAO.SILVA"
         → busca profile_screens do perfil vinculado
         → filtra sidebar e rotas conforme can_view
```

## Nota de segurança
A verificação no frontend é apenas visual. A proteção real dos dados depende das RLS policies no banco. Como as tabelas de configuração já têm RLS aberto (`true`), recomenda-se futuramente restringir o acesso apenas a admins.

