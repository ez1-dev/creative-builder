

# Mostrar usuários aprovados na atribuição de perfil

## Problema
Atualmente, o diálogo "Atribuir Perfil a Usuário" usa um campo de texto livre para digitar o login ERP. O ideal é mostrar uma lista dos usuários já aprovados para seleção.

## Solução

### Alteração em `src/pages/ConfiguracoesPage.tsx`

1. **Buscar usuários aprovados** — No `fetchData`, adicionar uma query para buscar perfis com `approved = true` e que tenham `erp_user` preenchido:
   ```sql
   profiles.select('id, email, display_name, erp_user').eq('approved', true).not('erp_user', 'is', null)
   ```

2. **Novo state** — `approvedUsers` para armazenar a lista de usuários aprovados.

3. **Substituir Input por Select** — No diálogo de atribuição, trocar o campo de texto "Login do Usuário (ERP)" por um `Select` que lista os usuários aprovados, mostrando `display_name` ou `email` como label e usando `erp_user` como valor.

4. **Filtrar já atribuídos** — Opcionalmente, filtrar da lista os usuários que já possuem um perfil atribuído, para evitar duplicatas.

