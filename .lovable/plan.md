## Objetivo

Hoje o botão **"Editar dashboard"** do BI Comercial só libera quando o usuário é **Administrador** ou está em **"Minha versão"** (pessoal). A regra ignora a permissão `can_edit` configurada em **Configurações → Permissões por tela**, então mesmo usuários explicitamente autorizados a editar `/bi/comercial` ficam bloqueados.

A solução é tornar a edição do dashboard oficial governada pela permissão por tela já existente (`can_edit` do caminho da página), sem mexer em backend nem em outras lógicas.

## Mudanças

### `src/pages/bi/ComercialPage.tsx`
- Ler `canEdit` de `useUserPermissions()` (já importado/disponível).
- Trocar:
  ```ts
  const canEditDashboard = layout.isPersonal || isAdmin;
  ```
  por:
  ```ts
  const canEditOfficial = isAdmin || canEdit('/bi/comercial');
  const canEditDashboard = layout.isPersonal || canEditOfficial;
  ```
- Ajustar o `title` do botão para refletir o novo motivo do bloqueio:
  - Se `!canEditDashboard`: "Sem permissão para editar este dashboard. Ative 'Minha versão' ou solicite permissão de edição em /bi/comercial."
- Manter o bloqueio do toggle "Minha versão ↔ Oficial" enquanto em edição (sem alteração).

### Nenhuma mudança em
- `PermissionsContext`, `useUserPermissions`, `screenCatalog` (já expõem `can_edit` por tela e a entrada `/bi/comercial` já existe).
- Layout, drafts, salvamento, fork pessoal, fluxo de admin.
- Outras páginas BI (apenas Comercial tem esse botão hoje — verificado por busca; quando novas páginas BI ganharem o botão, aplicar o mesmo padrão).

## Comportamento resultante

| Cenário                                                      | Pode editar oficial? | Pode editar pessoal? |
|--------------------------------------------------------------|----------------------|----------------------|
| Administrador                                                | Sim                  | Sim                  |
| Perfil com `can_edit` em `/bi/comercial`                     | **Sim (novo)**       | Sim                  |
| Perfil só com `can_view` em `/bi/comercial`                  | Não                  | Sim (Minha versão)   |
| Sem permissões cadastradas (modo preview / hasPermissions=false) | Sim (já era)     | Sim                  |

Assim, o administrador configura quem pode editar cada dashboard via tela de **Permissões por tela**, marcando "Editar" para `/bi/comercial` (ou futuras telas BI) no perfil desejado.