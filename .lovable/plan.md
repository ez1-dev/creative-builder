## Objetivo

Em Manutenção de Frota, restringir a exclusão de registros (individual e "Excluir todos") a usuários explicitamente autorizados, através de um novo flag `can_delete` por tela em Configurações > Permissões.

## Mudanças

### 1. Banco

- Adicionar coluna `can_delete boolean not null default false` em `public.profile_screens`.
- Criar função `public.can_delete_frota(_uid uuid)` (security definer) que retorna `true` se:
  - `is_admin(_uid)` ou
  - existe um `profile_screens` com `screen_path = '/frota' AND can_delete = true` para algum perfil ligado ao usuário via `user_access` / `profiles.erp_user`.
- Substituir a policy `Editors can delete manutencao_frota` em `public.manutencao_frota` por uma que use `can_delete_frota(auth.uid())`.
- Insert/Update permanecem com `can_edit_frota` (sem mudança).

### 2. Contexto de permissões (frontend)

- `src/contexts/PermissionsContext.tsx`: incluir `can_delete` em `ScreenPermission`, no `select` de `profile_screens`, no `merge` (OR entre perfis) e no `shallowEqualPerms`.
- `src/hooks/useUserPermissions.ts`: adicionar `canDelete(path)` (true se `isAdmin` ou `perm.can_delete`).

### 3. UI de Permissões

- `src/components/configuracoes/PermissoesPorTelaPanel.tsx`: adicionar coluna/switch "Excluir" ao lado de "Visualizar" e "Editar"; suportar o campo na função de toggle e nos modos em massa (clear-all mantém false; view-all/edit-all não ativam can_delete por padrão — exclusão só com toggle explícito).

### 4. Manutenção de Frota (`src/pages/ManutencaoFrotaPage.tsx`)

- Obter `canDelete('/frota')` do hook.
- `onDelete={canDelete('/frota') ? setDeleteId : undefined}` (não mostra mais o botão de lixeira na tabela para quem só edita).
- Botão "Excluir todos" passa a depender de `canDelete('/frota')` em vez de `isAdmin` (admin continua coberto porque `canDelete` retorna true para admin).

## Critérios de aceite

- Usuário com `can_edit` mas sem `can_delete` em `/frota` não vê os botões de lixeira nem "Excluir todos", e qualquer tentativa direta falha no banco (RLS).
- Usuário com `can_delete` (ou admin) consegue excluir normalmente.
- Visualizar e Editar continuam funcionando exatamente como hoje para todos os perfis.
- Toggle "Excluir" aparece em Configurações > Permissões e persiste em `profile_screens`.

## Fora do escopo

- Outros módulos (Manutenção de Máquinas, Passagens, etc.) continuam com a regra atual; podemos estender o mesmo padrão depois se quiser.
