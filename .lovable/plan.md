

# Simplificar aprovação: auto-preencher erp_user com email

## Problema
O campo "Login ERP" na aprovação é confuso e desnecessário quando não há um ERP externo. Ele serve apenas como chave de ligação entre o usuário e a tabela de permissões.

## Solução

### Alterar `src/pages/ConfiguracoesPage.tsx`

1. **Remover o campo de input "Login ERP"** da seção de Aprovações
2. **No `handleApproveUser`**, preencher `erp_user` automaticamente com o email do usuário (em uppercase, para compatibilidade com `.ilike`):
   ```ts
   .update({ approved: true, erp_user: userEmail.toUpperCase() })
   ```
3. **Remover o state `pendingErpUsers`** que não será mais necessário
4. **Remover a condição de disabled** do botão Aprovar (voltará a funcionar com um clique)

### Resultado
- Admin clica "Aprovar" e pronto — o `erp_user` é preenchido automaticamente com o email
- O usuário aparecerá imediatamente no dropdown da aba Usuários para atribuição de perfil

