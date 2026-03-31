

# Configurar "renato" como Administrador

O perfil "Administrador" já existe no banco (id: `1ac1e556-5a9f-44a6-93fb-e8beb407637f`). Faltam dois passos:

## 1. Vincular usuário "renato" ao perfil Administrador
Inserir na tabela `user_access` o login "renato" apontando para o perfil Administrador.

## 2. Criar permissões de telas para o perfil Administrador
Inserir na tabela `profile_screens` as permissões de todas as telas do sistema (incluindo `/configuracoes`) com `can_view = true` e `can_edit = true`.

Telas a cadastrar:
- `/estoque`, `/onde-usa`, `/bom`, `/compras-produto`, `/painel-compras`, `/engenharia-producao`, `/auditoria-tributaria`, `/notas-recebimento`, `/numero-serie`, `/configuracoes`

Após isso, quando "renato" fizer login, o hook `useUserPermissions` encontrará suas permissões e o menu Configurações aparecerá no sidebar.

