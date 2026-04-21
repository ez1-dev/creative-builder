
## Estoque Min/Max não aparece no menu

### Diagnóstico
O item já existe em `src/components/AppSidebar.tsx`, mas a sidebar filtra entradas com `useUserPermissions().canView('/estoque-min-max')`. Quando o usuário tem `hasPermissions = true` e nenhuma linha em `profile_screens` para esse path, o item é ocultado.

A migration anterior tentou inserir permissões, mas perfis criados depois (ou perfis sem o registro) continuam sem acesso, então o link some do menu.

### Correção

**1. Migration SQL idempotente**
Garantir `screen_path = '/estoque-min-max'` com `can_view = true` para **todos** os perfis em `access_profiles`:
- `INSERT ... SELECT id FROM access_profiles ... ON CONFLICT (profile_id, screen_path) DO UPDATE SET can_view = true`.

**2. Configurações > Matriz de permissões**
Verificar `src/pages/ConfiguracoesPage.tsx` e garantir que a lista de telas conhecidas inclua `/estoque-min-max` com rótulo "Estoque Min/Max", para que admins consigam alternar a permissão de novos perfis pela UI.

### Sem alterações em
Lógica de `useUserPermissions`, `AppSidebar` (item já está lá), rotas, autenticação, demais módulos.
