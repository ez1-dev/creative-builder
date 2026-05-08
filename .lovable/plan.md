## Objetivo
Dar acesso total (visualizar + editar + gerenciar compartilhamento) à página `/passagens-aereas` apenas para **MAIANE.SAURIN@EZORTEA.COM.BR**, sem torná-la administradora do sistema e sem afetar os demais usuários do perfil "Compras".

## Estado atual
- Profile: `maiane.saurin@ezortea.com.br` (id `773d24a4…`), `erp_user = MAIANE.SAURIN@EZORTEA.COM.BR`
- Vínculo atual em `user_access`: perfil **Compras** (`a433425a-…`)
- Perfis de acesso (`access_profiles`) são compartilhados entre usuários, então não dá para simplesmente editar "Compras".

## Passos (somente dados, sem mudança de schema)

1. **Criar novo perfil de acesso dedicado**
   - `INSERT INTO access_profiles (name, description)` → nome: `Passagens Aéreas - Acesso Total (Maiane)`.

2. **Configurar `profile_screens` desse novo perfil**
   - Inserir uma linha para `/passagens-aereas` com `can_view = true` e `can_edit = true`.
   - (Apenas essa tela — nada mais é liberado por esse perfil.)

3. **Vincular o perfil novo ao login da Maiane em `user_access`**
   - `INSERT INTO user_access (user_login, profile_id)` com `user_login = 'MAIANE.SAURIN@EZORTEA.COM.BR'`.
   - Ela mantém o vínculo "Compras" existente; o sistema soma as permissões das duas linhas.

4. **Habilitar criação de links de compartilhamento para não-admins (se ainda não estiver)**
   - A função `can_manage_passagens_share` exige `app_settings.passagens_share_allow_non_admin = 'true'` + `can_edit` na tela.
   - Verificar/`UPSERT` em `app_settings` a chave `passagens_share_allow_non_admin = 'true'` para que ela também consiga gerar links de compartilhamento. Como esse setting já vale para qualquer usuário com `can_edit` em `/passagens-aereas`, confirmo com você antes de aplicar — se preferir manter restrito só a admins, pulamos este passo.

## Validação
- Logar como Maiane → menu mostra Passagens Aéreas, botões de novo/editar/excluir habilitados.
- Outros usuários do perfil "Compras" continuam **sem** edição em Passagens Aéreas.
- Ela **não** ganha acesso a nenhuma outra tela administrativa.

## Pergunta antes de executar
Quer que eu também ative o `passagens_share_allow_non_admin` (passo 4) para que ela consiga **gerar/gerenciar links de compartilhamento públicos**? Ou manter isso restrito a admins?