## Objetivo

Permitir que usuários **não-administradores** também possam criar e gerenciar links de compartilhamento de Passagens Aéreas, controlado por uma nova opção em **Configurações**.

Hoje, mesmo que o perfil tenha `can_edit` em `/passagens-aereas`, a criação falha porque:
- A RLS da tabela `passagens_aereas_share_links` exige `is_admin(auth.uid())`.
- A função `create_passagens_share_link` também valida `is_admin` internamente.

## Como vai funcionar

1. Em **Configurações → Permissões / Acessos**, aparece um novo bloco:
   > **Compartilhamento de Passagens Aéreas**
   > [ ] Permitir que usuários não-administradores criem e gerenciem links de compartilhamento

2. Quando ativado:
   - Qualquer usuário com `can_edit` na tela `/passagens-aereas` vê o botão **Compartilhar** (já vê hoje) e consegue criar/revogar links.
   - Administradores continuam tendo acesso total (independente da flag).

3. Quando desativado (padrão atual): só admins criam/revogam links.

A configuração é global (não por usuário), salva em `app_settings` com a chave `passagens_share_allow_non_admin`.

## Mudanças

### Banco de dados

- **Migração** criando função helper `can_manage_passagens_share(_uid uuid)` (`SECURITY DEFINER`), que retorna `true` se:
  - `is_admin(_uid)` **OU**
  - `app_settings.passagens_share_allow_non_admin = 'true'` **E** o usuário tem `can_edit` em `/passagens-aereas` no `profile_screens`.
- Atualizar RLS da tabela `passagens_aereas_share_links`: trocar `is_admin(auth.uid())` por `can_manage_passagens_share(auth.uid())`.
- Atualizar `create_passagens_share_link`: substituir o `IF NOT public.is_admin(...)` por `IF NOT public.can_manage_passagens_share(auth.uid())`.
- Inserir setting padrão `passagens_share_allow_non_admin = 'false'` em `app_settings` (só se não existir).

### Frontend

- **`src/pages/ConfiguracoesPage.tsx`** — adicionar, na aba de Permissões/Perfis, um card com `Switch` que lê/escreve a chave `passagens_share_allow_non_admin` em `app_settings` (somente admin enxerga e altera).
- **`src/pages/PassagensAereasPage.tsx`** — sem mudança lógica: o botão "Compartilhar" já depende de `canEdit('/passagens-aereas')`, que admins e usuários com permissão de edição já recebem.
- **`src/components/passagens/ShareLinksDialog.tsx`** — sem alteração (já usa a RPC `create_passagens_share_link`).

## Segurança

- A função helper é `SECURITY DEFINER` com `search_path = public`, evita recursão de RLS e não vaza dados.
- A senha dos links continua como hoje (token efetivo SHA-256 + sentinela `'protected'`).
- Auditoria: `created_by = auth.uid()` continua sendo gravado pela RPC.

## Arquivos

- Migração SQL nova (helper + update da RPC + update das policies + seed do setting).
- `src/pages/ConfiguracoesPage.tsx` — novo bloco UI.
