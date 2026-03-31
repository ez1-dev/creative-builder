

# Exigir Perfil de Acesso na Aprovação

## Problema
Hoje o admin aprova o usuário sem vincular a um Perfil de Acesso. O usuário fica aprovado mas sem permissões até que alguém vá na aba "Usuários" atribuir manualmente.

## Solução

### Alterar a aba Aprovações em `src/pages/ConfiguracoesPage.tsx`

1. **Adicionar state** `pendingProfileSelections: Record<string, string>` para armazenar o perfil selecionado por usuário pendente.

2. **Adicionar coluna "Perfil de Acesso"** na tabela de aprovações com um `Select` dropdown listando os perfis existentes (`profiles` state).

3. **Desabilitar botão "Aprovar"** enquanto nenhum perfil estiver selecionado para aquele usuário.

4. **Atualizar `handleApproveUser`** para, além de aprovar e preencher `erp_user`, também inserir um registro na tabela `user_access` com o `profile_id` selecionado e `user_login` = email uppercase:
   - `profiles.update({ approved: true, erp_user: email.toUpperCase() })`
   - `user_access.insert({ user_login: email.toUpperCase(), profile_id: selectedProfileId })`

### Resultado
- Admin seleciona o perfil e clica "Aprovar" — o usuário já sai aprovado E com permissões funcionais
- Elimina a necessidade de ir na aba "Usuários" depois da aprovação

