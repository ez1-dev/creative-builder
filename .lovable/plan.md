## Diagnóstico
Conferi no banco e a permissão está correta para **MAIANE.SAURIN@EZORTEA.COM.BR**:

| Perfil | screen_path | can_view | can_edit |
|---|---|---|---|
| Compras | /passagens-aereas | true | true |
| Passagens Aéreas - Acesso Total (Maiane) | /passagens-aereas | true | true |

Ou seja, os dois perfis vinculados a ela já têm `can_edit = true` em `/passagens-aereas`. O hook `useUserPermissions` faz `OR` entre os perfis, então `canEdit('/passagens-aereas')` deve retornar `true` e `editAllowed` em `PassagensAereasPage` deve mostrar os botões "Novo / Editar / Excluir".

## Causa provável
A Maiane está com a sessão antiga em cache. O hook `useUserPermissions` só busca permissões quando `erpUser` muda (no login). Mudanças em `user_access` / `profile_screens` feitas com a sessão dela aberta **não disparam refetch automaticamente**.

## Ação recomendada (sem código)
1. Pedir para a Maiane fazer **logout e login novamente** (ou hard refresh `Ctrl+Shift+R`). Isso por si só deve fazer o botão Editar aparecer.

## Se mesmo após relogin não aparecer
Investigar e corrigir um dos pontos abaixo:
- **`erpUser` no AuthContext** pode estar com case/trim diferente do `user_login` em `user_access`. A consulta `ilike(user_login, erpUser)` funciona, mas vale logar `erpUser` no console dela e comparar.
- **Realtime de permissões**: opcional adicionar uma assinatura ou um botão "Atualizar permissões" que rechame `fetchPerms`. Hoje não existe; só recarrega no login.

## Plano de código (somente se relogin não resolver)
- Adicionar refetch no `useUserPermissions` quando a aba volta ao foco (`visibilitychange`) **ou**
- Forçar logout dela via `force_user_logout(_user_id)` (já existe a function) para garantir nova sessão.

## Próximo passo
Confirmar com você: ela já tentou logout/login? Se sim, capturar no console dela o valor de `erpUser` e o array `permissions` retornado pelo hook para irmos direto na causa.