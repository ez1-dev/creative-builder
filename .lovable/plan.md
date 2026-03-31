

# Fix: Usuário aprovado não aparece na aba Usuários

## Problema
O usuário `stank.renato@gmail.com` está aprovado, mas seu campo `erp_user` está vazio (`NULL`). O dropdown de atribuição de perfil filtra apenas usuários com `erp_user` preenchido, por isso ele não aparece.

## Causa raiz
Na tela de Aprovações, quando um admin aprova o usuário, o campo `erp_user` não é preenchido automaticamente. Se o admin não preencher manualmente, o usuário fica aprovado mas sem `erp_user`.

## Solução

### 1. Permitir atribuição sem `erp_user` — Alterar `ConfiguracoesPage.tsx`

Atualizar a query de `approvedUsers` para buscar **todos** os usuários aprovados (não apenas os que têm `erp_user`):
- Remover o filtro `.not('erp_user', 'is', null)`
- Usar o `email` como identificador quando `erp_user` estiver vazio
- No dropdown, mostrar `display_name || email` como label
- Na atribuição (`handleAddUser`), usar `erp_user` se disponível, senão usar `email` como `user_login`

### 2. Alternativa: Exigir preenchimento de `erp_user` na aprovação

Adicionar um campo obrigatório de `erp_user` na tela de aprovação, garantindo que todo usuário aprovado tenha esse campo preenchido. Isso manteria a lógica atual do dropdown intacta.

**Recomendação**: A alternativa 2 é mais robusta, pois o campo `erp_user` é usado em todo o sistema de permissões (`useUserPermissions`, `is_admin`). Sem ele, o usuário aprovado não teria permissões funcionais mesmo com perfil atribuído.

### Implementação recomendada (alternativa 2)

No `ConfiguracoesPage.tsx`, na seção de Aprovações:
- Adicionar um campo `Input` para `erp_user` ao lado do botão Aprovar
- Torná-lo obrigatório antes de permitir a aprovação
- Salvar o `erp_user` junto com `approved = true` no `handleApprove`

